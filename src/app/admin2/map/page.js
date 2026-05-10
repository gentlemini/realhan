'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import styles from '../../properties/properties.module.css';
import localStyles from './map.module.css';
import modalStyles from '../../page.module.css';

const KakaoMap = dynamic(() => import('@/components/KakaoMap'), { ssr: false });

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '';

const CATEGORY_COLORS = {
  '아파트':      { bg: '#e8f0fe', color: '#1a56db' },
  '오피스텔':    { bg: '#fef3c7', color: '#92400e' },
  '단독주택':    { bg: '#d1fae5', color: '#065f46' },
  '다가구':      { bg: '#ede9fe', color: '#5b21b6' },
  '다세대':      { bg: '#fce7f3', color: '#9d174d' },
  '상가':        { bg: '#fee2e2', color: '#991b1b' },
  '토지':        { bg: '#ecfdf5', color: '#047857' },
  '빌딩':        { bg: '#f0f9ff', color: '#0369a1' },
  '오피스':      { bg: '#f5f3ff', color: '#6d28d9' },
  '공장/창고':   { bg: '#fff7ed', color: '#c2410c' },
  '원룸/고시원': { bg: '#fdf4ff', color: '#86198f' },
  '재개발':      { bg: '#f0fdf4', color: '#166534' },
  '분양':        { bg: '#fffbeb', color: '#b45309' },
};

const TX_COLORS = {
  '매매': { bg: '#fff7ed', color: '#c2410c' },
  '전세': { bg: '#eff6ff', color: '#1d4ed8' },
  '월세': { bg: '#f0fdf4', color: '#15803d' },
};

const TYPES = ['전체', '아파트', '오피스텔', '단독주택', '다가구', '다세대', '원룸', '투룸', '쓰리룸', '상가', '오피스', '공장/창고', '빌딩', '토지', '재개발', '분양'];
const TX_TYPES = ['전체', '매매', '전세', '월세'];

const CATEGORY_GROUP = {
  '상가':        ['일반상가', '단지내상가', '복합상가'],
  '오피스':      ['대형사무실', '중소형사무실', '지식산업센터'],
  '빌딩':        ['빌딩', '빌딩건물기타', '펜션', '상가건물', '기타'],
  '원룸/고시원': ['원룸', '투룸', '쓰리룸'],
  '다세대':      ['다세대', '연립', '빌라', '상가주택'],
  '분양':        ['분양권'],
};

function matchCategory(category, selectedType) {
  if (selectedType === '전체') return true;
  if (category === selectedType) return true;
  const group = CATEGORY_GROUP[selectedType];
  return group ? group.includes(category) : false;
}

function fmtMan(v) {
  if (!v && v !== 0) return '';
  if (v < 10000) return `${v.toLocaleString()}만`;
  const eok = Math.floor(v / 10000);
  const rem = v % 10000;
  if (rem === 0) return `${eok}억`;
  const cheon = Math.floor(rem / 1000);
  const man = rem % 1000;
  let s = `${eok}억`;
  if (cheon > 0) s += `${cheon}천`;
  if (man > 0) s += `${man}`;
  return s;
}

function formatPrice(item) {
  const { transaction, sale_price, jeonse_price, deposit, monthly_rent, maintenance } = item;
  if (transaction === '매매' && sale_price)
    return `매매 ${fmtMan(sale_price)}`;
  if (transaction === '전세' && jeonse_price)
    return `전세 ${fmtMan(jeonse_price)} / ${maintenance ? fmtMan(maintenance) : '-'}`;
  if (transaction === '월세') {
    const d = deposit      || 0;
    const m = monthly_rent || 0;
    const c = maintenance  || 0;
    return `월세 ${fmtMan(d)} / ${fmtMan(m)} / ${fmtMan(c)}`;
  }
  return '';
}

let _kakaoPromise = null;

function loadKakaoSdk() {
  if (_kakaoPromise) return _kakaoPromise;
  _kakaoPromise = new Promise((resolve, reject) => {
    if (typeof window.kakao?.maps?.LatLng === 'function') { resolve(); return; }
    function poll() {
      let n = 0;
      const t = setInterval(() => {
        if (typeof window.kakao?.maps?.LatLng === 'function') { clearInterval(t); resolve(); }
        else if (++n > 100) { clearInterval(t); reject(new Error('timeout')); }
      }, 100);
    }
    if (window.kakao?.maps) { poll(); return; }
    const existing = document.getElementById('kakao-map-sdk');
    if (existing) { if (window.kakao) { poll(); return; } existing.addEventListener('load', poll, { once: true }); return; }
    if (!KAKAO_APP_KEY) { reject(new Error('no key')); return; }
    const s = document.createElement('script');
    s.id = 'kakao-map-sdk';
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;
    s.onload = () => window.kakao.maps.load(resolve);
    s.onerror = () => reject(new Error('load error'));
    document.head.appendChild(s);
  });
  _kakaoPromise.catch(() => { _kakaoPromise = null; });
  return _kakaoPromise;
}

function PreviewMap({ lat, lng, radius }) {
  const mapRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk().then(() => {
      if (cancelled || !mapRef.current) return;
      if (!mapRef.current.offsetWidth && !mapRef.current.offsetHeight) return;
      const { kakao } = window;
      const center = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(mapRef.current, { center, level: 3 });
      map.setZoomable(false);
      new kakao.maps.Marker({ position: center, map });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lng, radius]);
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function PreviewModal({ item, onClose }) {
  const catStyle = CATEGORY_COLORS[item.category] || { bg: '#f3f4f6', color: '#374151' };
  const txStyle  = TX_COLORS[item.transaction]    || { bg: '#f3f4f6', color: '#374151' };

  const [detail,     setDetail]     = useState(null);
  const [detLoading, setDetLoading] = useState(true);

  useEffect(() => {
    setDetLoading(true);
    fetch(`/api/property-detail/${item.id}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetLoading(false));
  }, [item.id]);

  const imageUrls = detail?.imageUrls?.length ? detail.imageUrls
                  : (detail?.imageUrl || item.imageUrl) ? [detail?.imageUrl || item.imageUrl] : [];

  const youtubeUrl = detail?.youtube_url || item.youtube_url || null;
  const youtubeId  = getYouTubeId(youtubeUrl);
  const slides = [
    ...(youtubeId ? [{ type: 'youtube', id: youtubeId }] : []),
    ...imageUrls.map(url => ({ type: 'photo', url })),
  ];

  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => { setSlideIdx(0); }, [item.id]);
  const currentSlide = slides[slideIdx] || null;
  const prevSlide = () => setSlideIdx(i => (i - 1 + slides.length) % slides.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % slides.length);

  const hasMap    = (detail?.map_lat ?? item.map_lat) && (detail?.map_lng ?? item.map_lng);
  const mapLat    = detail?.map_lat    ?? item.map_lat;
  const mapLng    = detail?.map_lng    ?? item.map_lng;
  const mapRadius = 0;

  const titleRow   = detail?.rows?.find(r => r.label === '매물 특징');
  const modalTitle = titleRow?.value || item.building_name || '';

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className={modalStyles.pvOverlay} onClick={onClose}>
      <div className={modalStyles.pvBox} onClick={e => e.stopPropagation()}>

        <button className={modalStyles.pvClose} onClick={onClose}>✕</button>

        <div className={modalStyles.pvLayout}>
          <div className={modalStyles.pvPhotoCol}>
            <div className={modalStyles.pvPhotoMain}>
              {currentSlide ? (
                <>
                  {currentSlide.type === 'youtube' ? (
                    <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <iframe
                        key={currentSlide.id}
                        src={`https://www.youtube.com/embed/${currentSlide.id}?rel=0`}
                        title="매물 영상"
                        style={{ width: '100%', aspectRatio: '16/9', maxHeight: '100%', border: 'none', display: 'block' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <img src={currentSlide.url} alt={`사진 ${slideIdx + 1}`} className={modalStyles.pvPhotoImg} />
                  )}
                  {slides.length > 1 && (
                    <>
                      <button onClick={prevSlide} className={modalStyles.pvSlidePrev} aria-label="이전">&#8249;</button>
                      <button onClick={nextSlide} className={modalStyles.pvSlideNext} aria-label="다음">&#8250;</button>
                      <div className={modalStyles.pvSlideCount}>{slideIdx + 1} / {slides.length}</div>
                    </>
                  )}
                </>
              ) : (
                <div className={modalStyles.pvPhotoArea}>
                  <span className={modalStyles.pvPhotoGhost}>사진위치</span>
                  <div className={modalStyles.pvPhotoFallback}>
                    <p className={modalStyles.pvFallbackSub}>사진 첨부 없을시 아래 내용</p>
                    <p className={modalStyles.pvFallbackName}>"공인중개사 한민희"</p>
                    <p className={modalStyles.pvFallbackPhone}>"010-4706-8253"</p>
                  </div>
                </div>
              )}
            </div>
            {slides.length > 1 && (
              <div className={modalStyles.pvThumbs}>
                {slides.map((s, i) => (
                  <div key={i} className={`${modalStyles.pvThumb} ${i === slideIdx ? modalStyles.pvThumbActive : ''}`} onClick={() => setSlideIdx(i)}>
                    <img src={s.type === 'youtube' ? `https://img.youtube.com/vi/${s.id}/mqdefault.jpg` : s.url} alt={`${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={modalStyles.pvDataCol}>
            <div className={modalStyles.pvMapBox}>
              {hasMap ? (
                <PreviewMap lat={mapLat} lng={mapLng} radius={mapRadius} />
              ) : (
                <span className={modalStyles.pvMapPlaceholder}>지도 위치 미등록</span>
              )}
            </div>

            <div className={modalStyles.pvDataScroll}>
              <div className={modalStyles.pvDataHeader}>
                <div className={modalStyles.pvHeaderSub}>
                  <span className={modalStyles.fBadge} style={{ background: catStyle.bg, color: catStyle.color }}>{item.category}</span>
                  <span className={modalStyles.fBadge} style={{ background: txStyle.bg,  color: txStyle.color  }}>{item.transaction}</span>
                  {item.map_hidden && (
                    <span className={modalStyles.fBadge} style={{ background: '#fee2e2', color: '#991b1b' }}>🔒 위치숨김</span>
                  )}
                </div>
                <div className={modalStyles.pvTitle}>
                  {modalTitle || <span className={modalStyles.pvTitleEmpty}>매물제목 미입력</span>}
                </div>
              </div>

              {!detLoading && hasMap && (
                <div className={modalStyles.pvMobileMap}>
                  <PreviewMap lat={mapLat} lng={mapLng} radius={mapRadius} />
                </div>
              )}

              {detLoading ? (
                <div className={modalStyles.pvDetailLoading}>
                  <div className={modalStyles.spinner} />
                </div>
              ) : (() => {
                const rows = detail?.rows || [];
                const sections = [];
                for (const r of rows) {
                  const sec = r.section || '기타';
                  if (!sections.length || sections[sections.length - 1].title !== sec)
                    sections.push({ title: sec, rows: [] });
                  sections[sections.length - 1].rows.push(r);
                }
                return sections.map(sec => (
                  <div key={sec.title}>
                    <div className={modalStyles.pvRowSection}>{sec.title}</div>
                    {sec.rows.map(r => {
                      const cs = CATEGORY_COLORS[r.value] || { bg: '#f3f4f6', color: '#374151' };
                      const ts = TX_COLORS[r.value]       || { bg: '#f3f4f6', color: '#374151' };
                      return (
                        <div key={r.label} className={`${modalStyles.pvRow} ${r.isPrice ? modalStyles.pvRowHighlight : ''}`}>
                          <div className={modalStyles.pvLabel}>{r.label}</div>
                          <div className={`${modalStyles.pvValue} ${r.isPrivate ? modalStyles.pvPrivate : ''}`}>
                            {r.isCategory    && <span className={modalStyles.pvBadge} style={{ background: cs.bg, color: cs.color }}>{r.value}</span>}
                            {r.isTransaction && <span className={modalStyles.pvBadge} style={{ background: ts.bg, color: ts.color }}>{r.value}</span>}
                            {r.isPrice       && <span className={modalStyles.pvPriceBadge}>{r.value}</span>}
                            {!r.isCategory && !r.isTransaction && !r.isPrice && r.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PropertyItem({ property, onClick }) {
  const cs = CATEGORY_COLORS[property.category] || { bg: '#f3f4f6', color: '#374151' };
  const ts = TX_COLORS[property.transaction]    || { bg: '#f3f4f6', color: '#374151' };
  const price = formatPrice(property);
  const chips = [];
  if (property.supply_area)    chips.push(`공급 ${property.supply_area}㎡`);
  if (property.exclusive_area) chips.push(`전용 ${property.exclusive_area}㎡`);
  if (property.contract_area)  chips.push(`임대 ${property.contract_area}㎡`);
  if (property.land_area)      chips.push(`대지 ${property.land_area}㎡`);
  if (property.build_area)     chips.push(`건축 ${property.build_area}㎡`);
  if (property.total_area)     chips.push(`연면적 ${property.total_area}㎡`);
  if (property.expected_area)  chips.push(`예상 ${property.expected_area}㎡`);
  const floorText = property.curr_floor ? (property.total_floors ? `${property.curr_floor}/${property.total_floors}층` : `${property.curr_floor}층`) : null;
  if (floorText)         chips.push(floorText);
  if (property.direction) chips.push(`${property.direction}향`);
  if (property.rooms)     chips.push(`방 ${property.rooms}개`);

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardThumb}>
        {property.imageUrl
          ? <img src={property.imageUrl} alt="" className={styles.cardImg} />
          : <div className={styles.cardPlaceholder}>🏠</div>}
        <div className={styles.cardBadges}>
          <span className={styles.cardBadge} style={{ background: cs.bg, color: cs.color }}>{property.category}</span>
          <span className={styles.cardBadge} style={{ background: ts.bg, color: ts.color }}>{property.transaction}</span>
          {property.map_hidden && <span className={styles.cardBadge} style={{ background: 'rgba(30,30,30,0.7)', color: '#fff' }}>🔒</span>}
        </div>
        {property.property_id && (
          <div className={styles.cardPropId}>{property.property_id}</div>
        )}
        {property.location && (
          <div className={styles.cardLocOverlay}>
            <span className={styles.cardLocPin}>📍</span> {property.location}
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardName}>
          {property.title || property.building_name || property.location || null}
        </p>
        {price && <p className={styles.cardPrice} style={{ color: ts.color }}>{price}</p>}
        {chips.length > 0 && (
          <div className={styles.cardChips}>
            {chips.map(c => <span key={c} className={styles.cardChip}>{c}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function BottomSheet({ items, onClose, onCardClick }) {
  return (
    <div className={styles.bottomSheet}>
      <div className={styles.bottomSheetHandle} />
      <div className={styles.bottomSheetHeader}>
        <span className={styles.bottomSheetTitle}>매물 {items.length}건</span>
        <button className={styles.bottomSheetClose} onClick={onClose}>✕</button>
      </div>
      <div className={styles.bottomSheetBody}>
        {items.map(prop => (
          <PropertyItem key={prop.id} property={prop} onClick={() => onCardClick(prop)} />
        ))}
      </div>
    </div>
  );
}

function AdminMapInner() {
  const [properties,    setProperties]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedType,  setSelectedType]  = useState('전체');
  const [selectedTx,    setSelectedTx]    = useState('전체');
  const [keyword,       setKeyword]       = useState('');
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [clusterProps,  setClusterProps]  = useState(null);
  const [boundsProps,   setBoundsProps]   = useState(null);
  const [mapBounds,     setMapBounds]     = useState(null);
  const [geocodedIds,   setGeocodedIds]   = useState(new Set());
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [viewMode,      setViewMode]      = useState('list');
  const [mapSheetItems, setMapSheetItems] = useState(null);
  const [listPage,      setListPage]      = useState(1);
  const [myLocation,    setMyLocation]    = useState(null);
  const [myLocDot,      setMyLocDot]      = useState(null);
  const [locDotVisible, setLocDotVisible] = useState(false);
  const [allPins,       setAllPins]       = useState([]);
  const [viewSession,   setViewSession]   = useState('');
  const [sessions,      setSessions]      = useState([]);
  const [pinListOpen,   setPinListOpen]   = useState(false);
  const [showSaveInput,  setShowSaveInput]  = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [savingSession,  setSavingSession]  = useState(false);
  const [renamingSession,setRenamingSession]= useState(false);
  const [renameValue,    setRenameValue]    = useState('');
  const [renamingSaving, setRenamingSaving] = useState(false);
  const [pendingPin,     setPendingPin]     = useState(null);
  const [pinLabelInput,  setPinLabelInput]  = useState('');
  const [editingPinId,   setEditingPinId]   = useState(null);
  const [editingPinVal,  setEditingPinVal]  = useState('');
  const watchIdRef = useRef(null);
  const hasInitRef = useRef(false);
  const LIST_PAGE_SIZE = 10;

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocDot(loc);
        if (!hasInitRef.current) {
          hasInitRef.current = true;
          setMyLocation({ ...loc, level: 7 });
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  const goToMyLocation = useCallback(() => {
    if (!myLocDot) return;
    setLocDotVisible(true);
    setMyLocation({ ...myLocDot, level: 7 });
  }, [myLocDot]);

  const loadPins = useCallback(() => {
    fetch('/api/map-pins?page=매물지도')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setAllPins(list);
        const saved = [...new Set(list.map(p => p.memo || '').filter(Boolean))];
        setSessions(saved);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadPins(); }, [loadPins]);

  const pins = useMemo(
    () => allPins.filter(p => (p.memo || '') === viewSession),
    [allPins, viewSession]
  );

  const handleAddPin = useCallback(({ lat, lng }) => {
    setPendingPin({ lat, lng });
    setPinLabelInput('');
  }, []);

  const confirmAddPin = useCallback(async () => {
    if (!pendingPin) return;
    const label = pinLabelInput.trim();
    const { lat, lng } = pendingPin;
    setPendingPin(null);
    try {
      const res = await fetch('/api/map-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, lat, lng, page: '매물지도', memo: '' }),
      });
      const data = await res.json();
      if (data.ok) {
        setAllPins(prev => [...prev, { id: data.id, name: label, lat, lng, memo: '' }]);
        setViewSession('');
      }
    } catch {}
  }, [pendingPin, pinLabelInput]);

  const handleDeletePin = useCallback(async (pin) => {
    try {
      await fetch(`/api/map-pins/${pin.id}`, { method: 'DELETE' });
      setAllPins(prev => prev.filter(p => p.id !== pin.id));
    } catch {}
  }, []);

  const handlePinClick = useCallback((pin) => {
    if (window.confirm('이 핀을 삭제할까요?')) handleDeletePin(pin);
  }, [handleDeletePin]);

  const handleSaveSession = useCallback(async () => {
    const name = newSessionName.trim();
    if (!name) return;
    setSavingSession(true);
    try {
      await fetch('/api/map-pins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: '매물지도', toSession: name }),
      });
      setAllPins(prev => prev.map(p => p.memo === '' ? { ...p, memo: name } : p));
      setSessions(prev => [...new Set([...prev, name])]);
      setViewSession(name);
      setShowSaveInput(false);
      setNewSessionName('');
    } catch {}
    setSavingSession(false);
  }, [newSessionName]);

  const handleRenameSession = useCallback(async () => {
    const name = renameValue.trim();
    if (!name || name === viewSession) { setRenamingSession(false); return; }
    setRenamingSaving(true);
    try {
      await fetch('/api/map-pins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: '매물지도', fromSession: viewSession, toSession: name }),
      });
      setAllPins(prev => prev.map(p => p.memo === viewSession ? { ...p, memo: name } : p));
      setSessions(prev => prev.map(s => s === viewSession ? name : s));
      setViewSession(name);
      setRenamingSession(false);
      setRenameValue('');
    } catch {}
    setRenamingSaving(false);
  }, [viewSession, renameValue]);

  const handleUpdatePinName = useCallback(async (pin) => {
    const name = editingPinVal.trim();
    setEditingPinId(null);
    try {
      await fetch(`/api/map-pins/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setAllPins(prev => prev.map(p => p.id === pin.id ? { ...p, name } : p));
    } catch {}
  }, [editingPinVal]);

  const handleDeleteSession = useCallback(async () => {
    if (!window.confirm(`"${viewSession}" 세션의 핀을 모두 삭제할까요?`)) return;
    try {
      await fetch('/api/map-pins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: '매물지도', session: viewSession }),
      });
      setAllPins(prev => prev.filter(p => p.memo !== viewSession));
      setSessions(prev => prev.filter(s => s !== viewSession));
      setViewSession('');
    } catch {}
  }, [viewSession]);

  useEffect(() => { setClusterProps(null); setBoundsProps(null); setMapBounds(null); setGeocodedIds(new Set()); }, [selectedType, selectedTx, keyword]);
  useEffect(() => { setListPage(1); }, [selectedType, selectedTx, keyword, boundsProps, clusterProps]);

  useEffect(() => {
    fetch('/api/listings')
      .then(r => r.json())
      .then(data => setProperties(Array.isArray(data) ? data : []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = useCallback((item) => {
    setSelectedItem(item);
  }, []);

  const handleClose = useCallback(() => setSelectedItem(null), []);

  const filtered = useMemo(() => {
    return properties.filter(p => {
      if (p.contract_status === '계약완료') return false;
      const matchType     = matchCategory(p.category, selectedType);
      const matchTx       = selectedTx === '전체' || p.transaction === selectedTx;
      const matchKw       = !keyword ||
        p.building_name?.includes(keyword) ||
        p.location?.includes(keyword) ||
        p.title?.includes(keyword);
      return matchType && matchTx && matchKw;
    });
  }, [properties, selectedType, selectedTx, keyword]);

  // 관리자: 숨김 구분 없이 전체 매물을 지도에 표시
  const mapProps = useMemo(() => filtered, [filtered]);

  const listItems = useMemo(() => {
    if (clusterProps) return clusterProps;
    const dedup = (arr) => {
      const seen = new Set();
      return arr.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    };
    if (boundsProps !== null) {
      const boundsIds = new Set(boundsProps.map(p => p.id));
      const inBounds  = filtered.filter(p => boundsIds.has(p.id));
      const ungeocoded = filtered.filter(p => !geocodedIds.has(p.id));
      return dedup([...inBounds, ...ungeocoded]);
    }
    return dedup(filtered);
  }, [clusterProps, boundsProps, filtered, geocodedIds]);

  return (
    <>
    <div className={localStyles.wrap}>
      <div className={styles.page}>

        {/* 모바일 목록/지도 탭 */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewTab} ${viewMode === 'list' ? styles.viewTabActive : ''}`}
            onClick={() => setViewMode('list')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            목록보기
          </button>
          <button
            className={`${styles.viewTab} ${viewMode === 'map' ? styles.viewTabActive : ''}`}
            onClick={() => setViewMode('map')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            지도보기
          </button>
        </div>

        <div className={styles.layout}>
          {/* 지도 */}
          <div className={styles.mapPane}>
            <KakaoMap
              properties={mapProps}
              adminMode={true}
              centerLatLng={myLocation}
              myLocationLatLng={locDotVisible ? myLocDot : null}
              mapPins={pins}
              onMapRightClick={handleAddPin}
              onPinClick={handlePinClick}
              onGeocodedIds={ids => setGeocodedIds(ids)}
              onClusterClick={props => { setClusterProps(props); setMapSheetItems(props); }}
              onBoundsChange={(props, bounds) => { setClusterProps(null); setBoundsProps(props); setMapBounds(bounds); setMapSheetItems(null); }}
            />
            <button
              className={`${styles.myLocBtn} ${myLocDot ? styles.myLocBtnActive : ''}`}
              onClick={goToMyLocation}
              title="현재 위치"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z"/>
              </svg>
            </button>
            {/* 핀 목록 토글 */}
            <button
              className={`${localStyles.pinListToggle} ${pinListOpen ? localStyles.pinListToggleActive : ''}`}
              onClick={() => setPinListOpen(v => !v)}
              title="핀 마커 목록"
            >
              📍 {pins.length}
            </button>
            {/* 핀 목록 패널 */}
            {pinListOpen && (
              <div className={localStyles.pinListPanel}>
                <div className={localStyles.pinListHeader}>
                  <span>📍 핀 마커</span>
                  <button className={localStyles.pinListClose} onClick={() => setPinListOpen(false)}>✕</button>
                </div>

                {/* 세션 선택 */}
                <div className={localStyles.pinSessionWrap}>
                  <select
                    className={localStyles.pinSessionSelect}
                    value={viewSession}
                    onChange={e => { setViewSession(e.target.value); setShowSaveInput(false); }}
                  >
                    <option value="">현재 (미저장)</option>
                    {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* 핀 목록 */}
                {pins.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                    {viewSession === '' ? '우클릭으로 핀 추가' : '핀 없음'}
                  </div>
                ) : pins.map((pin, idx) => (
                  <div key={pin.id} className={localStyles.pinListItem}>
                    {editingPinId === pin.id ? (
                      <>
                        <input
                          value={editingPinVal}
                          onChange={e => setEditingPinVal(e.target.value)}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleUpdatePinName(pin); if (e.key === 'Escape') setEditingPinId(null); }}
                          style={{ flex: 1, fontSize: '12px', padding: '3px 6px', border: '1.5px solid #ef4444', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
                        />
                        <button className={localStyles.pinListDelete} style={{ color: '#22c55e' }} onClick={() => handleUpdatePinName(pin)} title="저장">✓</button>
                        <button className={localStyles.pinListDelete} onClick={() => setEditingPinId(null)} title="취소">✕</button>
                      </>
                    ) : (
                      <>
                        <span
                          className={localStyles.pinListName}
                          style={{ flexShrink: 0, paddingRight: 2 }}
                          onClick={() => setMyLocation({ lat: pin.lat, lng: pin.lng, level: 5 })}
                          title="지도 이동"
                        >📍</span>
                        <span
                          className={localStyles.pinListName}
                          onClick={() => { setEditingPinId(pin.id); setEditingPinVal(pin.name || ''); }}
                          title="클릭하여 내용 수정"
                          style={{ color: pin.name ? '#374151' : '#9ca3af' }}
                        >{pin.name || `핀 ${idx + 1}`}</span>
                        <button className={localStyles.pinListDelete} onClick={() => handleDeletePin(pin)} title="삭제">🗑</button>
                      </>
                    )}
                  </div>
                ))}

                {/* 액션 버튼 */}
                {viewSession === '' && !showSaveInput && (
                  <div className={localStyles.pinActions}>
                    <button
                      className={`${localStyles.pinActionBtn} ${localStyles.pinActionBtnPrimary}`}
                      onClick={() => setShowSaveInput(true)}
                      disabled={pins.length === 0}
                    >💾 저장하기</button>
                  </div>
                )}
                {viewSession === '' && showSaveInput && (
                  <div className={localStyles.pinSaveRow}>
                    <input
                      className={localStyles.pinSaveInput}
                      value={newSessionName}
                      onChange={e => setNewSessionName(e.target.value)}
                      placeholder="이름 입력 (예: 김손님)"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveSession(); if (e.key === 'Escape') setShowSaveInput(false); }}
                    />
                    <div className={localStyles.pinActions} style={{ padding: 0, borderTop: 'none' }}>
                      <button className={localStyles.pinActionBtn} onClick={() => { setShowSaveInput(false); setNewSessionName(''); }}>취소</button>
                      <button
                        className={`${localStyles.pinActionBtn} ${localStyles.pinActionBtnPrimary}`}
                        onClick={handleSaveSession}
                        disabled={!newSessionName.trim() || savingSession}
                      >{savingSession ? '저장중...' : '저장'}</button>
                    </div>
                  </div>
                )}
                {viewSession !== '' && !renamingSession && (
                  <div className={localStyles.pinActions}>
                    <button className={localStyles.pinActionBtn} onClick={() => { setRenamingSession(true); setRenameValue(viewSession); }}>✏️ 이름변경</button>
                    <button className={localStyles.pinActionBtn} style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={handleDeleteSession}>🗑 삭제</button>
                    <button className={localStyles.pinActionBtn} onClick={() => { setViewSession(''); setShowSaveInput(false); }}>➕ 새로 찍기</button>
                  </div>
                )}
                {viewSession !== '' && renamingSession && (
                  <div className={localStyles.pinSaveRow}>
                    <input
                      className={localStyles.pinSaveInput}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameSession(); if (e.key === 'Escape') setRenamingSession(false); }}
                    />
                    <div className={localStyles.pinActions} style={{ padding: 0, borderTop: 'none' }}>
                      <button className={localStyles.pinActionBtn} onClick={() => setRenamingSession(false)}>취소</button>
                      <button className={`${localStyles.pinActionBtn} ${localStyles.pinActionBtnPrimary}`} onClick={handleRenameSession} disabled={renamingSaving}>{renamingSaving ? '저장중...' : '저장'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 지도보기 모드 상단 검색+필터 오버레이 */}
          {viewMode === 'map' && (
            <div className={localStyles.mapFilterBar}>
              <div className={styles.searchRow}>
                <div className={styles.searchWrap}>
                  <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="건물명, 위치 검색"
                    className={styles.searchInput}
                  />
                </div>
                <span className={styles.countBadge}>{listItems.length}건</span>
                <button
                  className={`${styles.filterToggleBtn} ${(selectedType !== '전체' || selectedTx !== '전체') ? styles.filterToggleBtnActive : ''}`}
                  onClick={() => setFilterOpen(v => !v)}
                >
                  필터{(selectedType !== '전체' || selectedTx !== '전체') ? ' ●' : ''} {filterOpen ? '▲' : '▼'}
                </button>
              </div>
              <div className={`${styles.filterContent} ${filterOpen ? styles.filterContentOpen : ''}`}>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>건물유형</span>
                  <div className={styles.filterRow}>
                    {TYPES.map(t => (
                      <button key={t}
                        className={`${styles.filterTab} ${selectedType === t ? styles.filterTabActive : ''}`}
                        onClick={() => setSelectedType(t)}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>거래유형</span>
                  <div className={styles.filterRow}>
                    {TX_TYPES.map(t => (
                      <button key={t}
                        className={`${styles.filterTab} ${selectedTx === t ? styles.filterTabActive : ''}`}
                        onClick={() => setSelectedTx(t)}
                      >{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 우측 목록 패널 */}
          <div className={`${styles.listPane} ${viewMode === 'map' ? styles.listPaneHidden : ''}`}>
            <div className={styles.filterBar}>
              <div className={styles.searchRow}>
                <div className={styles.searchWrap}>
                  <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="건물명, 위치 검색"
                    className={styles.searchInput}
                  />
                </div>
                <span className={styles.countBadge}>{listItems.length}건</span>
                <button
                  className={`${styles.filterToggleBtn} ${(selectedType !== '전체' || selectedTx !== '전체') ? styles.filterToggleBtnActive : ''}`}
                  onClick={() => setFilterOpen(v => !v)}
                >
                  필터{(selectedType !== '전체' || selectedTx !== '전체') ? ' ●' : ''} {filterOpen ? '▲' : '▼'}
                </button>
              </div>
              <div className={`${styles.filterContent} ${filterOpen ? styles.filterContentOpen : ''}`}>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>건물유형</span>
                  <div className={styles.filterRow}>
                    {TYPES.map(t => (
                      <button key={t}
                        className={`${styles.filterTab} ${selectedType === t ? styles.filterTabActive : ''}`}
                        onClick={() => setSelectedType(t)}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>거래유형</span>
                  <div className={styles.filterRow}>
                    {TX_TYPES.map(t => (
                      <button key={t}
                        className={`${styles.filterTab} ${selectedTx === t ? styles.filterTabActive : ''}`}
                        onClick={() => setSelectedTx(t)}
                      >{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {clusterProps && (
              <div className={styles.clusterBanner}>
                <span>반경 100m 내 {clusterProps.length}개 매물</span>
                <button className={styles.clusterClear} onClick={() => setClusterProps(null)}>전체 보기 ✕</button>
              </div>
            )}
            {!clusterProps && boundsProps && (
              <div className={styles.boundsBanner}>
                📍 지도 범위 내 {listItems.length}개 매물
              </div>
            )}

            <div className={styles.listBody}>
              {loading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner} />
                  <p>매물 불러오는 중...</p>
                </div>
              ) : listItems.length === 0 ? (
                <div className={styles.empty}>
                  <span>🔍</span>
                  <p>{boundsProps ? '이 지역에 매물이 없습니다.' : '검색 조건에 맞는 매물이 없습니다.'}</p>
                  {!boundsProps && (
                    <button className={styles.resetBtn}
                      onClick={() => { setSelectedType('전체'); setSelectedTx('전체'); setKeyword(''); }}
                    >필터 초기화</button>
                  )}
                </div>
              ) : (
                <>
                  {listItems.slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE).map(prop => (
                    <PropertyItem key={prop.id} property={prop} onClick={() => handleCardClick(prop)} />
                  ))}
                  {Math.ceil(listItems.length / LIST_PAGE_SIZE) > 1 && (
                    <div className={styles.listPagination}>
                      <button className={styles.listPageBtn} onClick={() => setListPage(p => Math.max(1, p - 1))} disabled={listPage === 1}>이전</button>
                      {Array.from({ length: Math.ceil(listItems.length / LIST_PAGE_SIZE) }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === Math.ceil(listItems.length / LIST_PAGE_SIZE) || Math.abs(p - listPage) <= 1)
                        .reduce((acc, p, i, arr) => { if (i > 0 && arr[i-1] !== p-1) acc.push('…'); acc.push(p); return acc; }, [])
                        .map((p, i) => p === '…'
                          ? <span key={`d${i}`} className={styles.listPageDots}>…</span>
                          : <button key={p} className={`${styles.listPageBtn} ${p === listPage ? styles.listPageBtnActive : ''}`} onClick={() => setListPage(p)}>{p}</button>
                        )}
                      <button className={styles.listPageBtn} onClick={() => setListPage(p => Math.min(Math.ceil(listItems.length / LIST_PAGE_SIZE), p + 1))} disabled={listPage === Math.ceil(listItems.length / LIST_PAGE_SIZE)}>다음</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {selectedItem && <PreviewModal item={selectedItem} onClose={handleClose} />}


        {viewMode === 'map' && !mapSheetItems && boundsProps !== null && listItems.length > 0 && (
          <div className={styles.mapBoundsBar} onClick={() => setMapSheetItems(listItems)}>
            <span>📍 이 지역 매물 {listItems.length}건</span>
            <span className={styles.mapBoundsBarArrow}>목록 보기 →</span>
          </div>
        )}

        {viewMode === 'map' && mapSheetItems && (
          <BottomSheet
            items={mapSheetItems}
            onClose={() => setMapSheetItems(null)}
            onCardClick={handleCardClick}
          />
        )}
      </div>
    </div>

    {/* 핀 추가 팝업 */}
    {pendingPin && typeof document !== 'undefined' && createPortal(
      <>
        <div className={localStyles.pinPopupBg} onClick={() => setPendingPin(null)} />
        <div className={localStyles.pinPopup}>
          <p className={localStyles.pinPopupTitle}>📍 메모 입력 (선택사항)</p>
          <textarea
            className={localStyles.pinPopupInput}
            value={pinLabelInput}
            onChange={e => setPinLabelInput(e.target.value)}
            placeholder="내용 없으면 비워두세요&#10;Enter로 줄바꿈"
            rows={3}
            autoFocus
            style={{ resize: 'none', height: '80px' }}
            onKeyDown={e => { if (e.key === 'Escape') setPendingPin(null); }}
          />
          <div className={localStyles.pinPopupBtns}>
            <button className={localStyles.pinPopupCancel} onClick={() => setPendingPin(null)}>취소</button>
            <button className={localStyles.pinPopupSave} onClick={confirmAddPin}>확인</button>
          </div>
        </div>
      </>,
      document.body
    )}
    </>
  );
}

export default function AdminMapPage() {
  return (
    <Suspense fallback={null}>
      <AdminMapInner />
    </Suspense>
  );
}
