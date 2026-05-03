'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import styles from './properties.module.css';
import modalStyles from '../page.module.css';

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

// 필터 레이블 → 실제 Notion 매물분류 값 매핑 (서브타입 포함)
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

function formatPrice(item) {
  const { transaction, sale_price, jeonse_price, deposit, monthly_rent, maintenance } = item;
  if (transaction === '매매' && sale_price)
    return `매매 ${sale_price.toLocaleString()}만원`;
  if (transaction === '전세' && jeonse_price)
    return `전세 ${jeonse_price.toLocaleString()}만원`;
  if (transaction === '월세') {
    const d = deposit      || 0;
    const m = monthly_rent || 0;
    const c = maintenance  || 0;
    return `월세 ${d.toLocaleString()} / ${m.toLocaleString()} / ${c.toLocaleString()}만원`;
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
    if (existing) {
      if (window.kakao) { poll(); return; }
      existing.addEventListener('load', poll, { once: true });
      return;
    }
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
      const map = new kakao.maps.Map(mapRef.current, { center, level: 5 });
      map.setZoomable(false);
      if (!radius || radius === 0) {
        new kakao.maps.Marker({ position: center, map });
      } else {
        new kakao.maps.Circle({ center, radius, strokeWeight: 2, strokeColor: '#a87b51', strokeOpacity: 0.8, fillColor: '#c19a6b', fillOpacity: 0.15, map });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lng, radius]);
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
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
  const imageUrl  = imageUrls[0] || '';

  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => { setPhotoIdx(0); }, [item.id]);
  const currentPhoto = imageUrls[photoIdx] || '';
  const prevPhoto = () => setPhotoIdx(i => (i - 1 + imageUrls.length) % imageUrls.length);
  const nextPhoto = () => setPhotoIdx(i => (i + 1) % imageUrls.length);

  const hasMap    = (detail?.map_lat ?? item.map_lat) && (detail?.map_lng ?? item.map_lng);
  const mapLat    = detail?.map_lat    ?? item.map_lat;
  const mapLng    = detail?.map_lng    ?? item.map_lng;
  const mapRadius = detail?.map_radius ?? item.map_radius ?? 0;

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

  return (
    <div className={modalStyles.pvOverlay} onClick={onClose}>
      <div className={modalStyles.pvBox} onClick={e => e.stopPropagation()}>

        <button className={modalStyles.pvClose} onClick={onClose}>✕</button>

        <a
          href="http://pf.kakao.com/_QaxliG/chat"
          target="_blank"
          rel="noopener noreferrer"
          className={modalStyles.pvKakaoBtn}
        >
          <img
            src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png"
            alt="카카오톡 상담"
            className={modalStyles.pvKakaoIcon}
          />
          <span>카카오톡 상담</span>
        </a>

        <div className={modalStyles.pvLayout}>
          <div className={modalStyles.pvPhotoCol} style={{ position: 'relative' }}>
            {currentPhoto ? (
              <>
                <img src={currentPhoto} alt={`사진 ${photoIdx + 1}`} className={modalStyles.pvPhotoImg} />
                {imageUrls.length > 1 && (
                  <>
                    <button onClick={prevPhoto} className={modalStyles.pvSlidePrev} aria-label="이전">&#8249;</button>
                    <button onClick={nextPhoto} className={modalStyles.pvSlideNext} aria-label="다음">&#8250;</button>
                    <div className={modalStyles.pvSlideDots}>
                      {imageUrls.map((_, i) => (
                        <span
                          key={i}
                          className={modalStyles.pvSlideDot}
                          style={{ background: i === photoIdx ? '#5a3e28' : 'rgba(255,255,255,0.6)' }}
                          onClick={() => setPhotoIdx(i)}
                        />
                      ))}
                    </div>
                    <div className={modalStyles.pvSlideCount}>{photoIdx + 1} / {imageUrls.length}</div>
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

          <div className={modalStyles.pvDataCol}>
            {/* 데스크탑 지도 */}
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
                </div>
                <div className={modalStyles.pvTitle}>
                  {modalTitle || <span className={modalStyles.pvTitleEmpty}>매물제목 미입력</span>}
                </div>
              </div>

              {/* 모바일 전용 지도 (헤더 아래, 스크롤 영역 내) */}
              {!detLoading && hasMap && (
                <div className={modalStyles.pvMobileMap}>
                  <PreviewMap lat={mapLat} lng={mapLng} radius={mapRadius} />
                </div>
              )}

              {detLoading ? (
                <div className={modalStyles.pvDetailLoading}>
                  <div className={modalStyles.spinner} />
                </div>
              ) : detail?.rows?.map(r => {
                const catStyle = CATEGORY_COLORS[r.value] || { bg: '#f3f4f6', color: '#374151' };
                const txStyle  = TX_COLORS[r.value]       || { bg: '#f3f4f6', color: '#374151' };
                return (
                  <div key={r.label} className={`${modalStyles.pvRow} ${r.isPrice ? modalStyles.pvRowHighlight : ''}`}>
                    <div className={modalStyles.pvLabel}>{r.label}</div>
                    <div className={`${modalStyles.pvValue} ${r.isPrivate ? modalStyles.pvPrivate : ''}`}>
                      {r.isCategory && (
                        <span className={modalStyles.pvBadge} style={{ background: catStyle.bg, color: catStyle.color }}>
                          {r.value}
                        </span>
                      )}
                      {r.isTransaction && (
                        <span className={modalStyles.pvBadge} style={{ background: txStyle.bg, color: txStyle.color }}>
                          {r.value}
                        </span>
                      )}
                      {r.isPrice && (
                        <span className={modalStyles.pvPriceBadge}>{r.value}</span>
                      )}
                      {!r.isCategory && !r.isTransaction && !r.isPrice && r.value}
                    </div>
                  </div>
                );
              })}

              <div className={modalStyles.pvAgentCard}>
                <img src="/profile.png" alt="한민희" className={modalStyles.pvAgentAvatar} />
                <div className={modalStyles.pvAgentInfo}>
                  <div className={modalStyles.pvAgentName}>친절한 공인중개사 한민희 부장</div>
                  <div className={modalStyles.pvAgentRole}>부동산 전담 매니저</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AreaMeta({ property: p }) {
  const chips = [];

  // 면적 — 있는 것만
  if (p.supply_area)    chips.push(`공급 ${p.supply_area}㎡`);
  if (p.exclusive_area) chips.push(`전용 ${p.exclusive_area}㎡`);
  if (p.contract_area)  chips.push(`임대 ${p.contract_area}㎡`);
  if (p.land_area)      chips.push(`대지 ${p.land_area}㎡`);
  if (p.build_area)     chips.push(`건축 ${p.build_area}㎡`);
  if (p.total_area)     chips.push(`연면적 ${p.total_area}㎡`);
  if (p.expected_area)  chips.push(`예상 ${p.expected_area}㎡`);

  // 층 / 방향
  const floorText = p.curr_floor
    ? (p.total_floors ? `${p.curr_floor}/${p.total_floors}층` : `${p.curr_floor}층`)
    : null;
  if (floorText)    chips.push(floorText);
  if (p.direction)  chips.push(`${p.direction}향`);
  if (p.rooms)      chips.push(`방 ${p.rooms}개`);

  if (chips.length === 0) return null;

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '4px 6px',
      marginTop: 4,
      borderTop: '1px solid #f0ebe4', paddingTop: 6,
    }}>
      {chips.map(c => (
        <span key={c} style={{
          fontSize: '0.7rem', color: '#78716c',
          background: '#f5f2ee', borderRadius: 4,
          padding: '2px 6px',
        }}>{c}</span>
      ))}
    </div>
  );
}

function PropertyItem({ property, onClick }) {
  const catStyle = CATEGORY_COLORS[property.category] || { bg: '#f3f4f6', color: '#374151' };
  const txStyle  = TX_COLORS[property.transaction]    || { bg: '#f3f4f6', color: '#374151' };
  const price    = formatPrice(property);

  const badgeBase = {
    fontSize: '0.72rem', fontWeight: 700,
    padding: '3px 8px', borderRadius: 5,
  };

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardThumb}>
        {property.imageUrl ? (
          <img src={property.imageUrl} alt="" className={styles.cardImg} />
        ) : (
          <div className={styles.cardImgFallback} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f5f2ee', fontSize: '2.4rem',
          }}>🏠</div>
        )}

        {/* 좌상단: 매물분류 + 거래종류 */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
          <span style={{ ...badgeBase, background: catStyle.bg, color: catStyle.color }}>
            {property.category}
          </span>
          <span style={{ ...badgeBase, background: txStyle.bg, color: txStyle.color }}>
            {property.transaction}
          </span>
        </div>

        {/* 우상단: 매물번호 + 추천 */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {property.property_id && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              background: 'rgba(0,0,0,0.45)', color: '#fff',
              padding: '2px 7px', borderRadius: 100,
            }}>No.{property.property_id}</span>
          )}
          {property.recommended && <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>⭐</span>}
        </div>

        {/* 좌하단: 소재지 */}
        {property.location && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '18px 10px 8px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
          }}>
            <span style={{
              fontSize: '0.72rem', color: '#fff',
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            }}>📍 {property.location}</span>
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        {property.building_name && (
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1c1917', margin: 0 }}>{property.building_name}</p>
        )}
        <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#a87b51', margin: 0 }}>
          {price || '가격 미등록'}
        </p>
        <AreaMeta property={property} />
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

function PropertiesPageInner() {
  const searchParams = useSearchParams();
  const initCategory = searchParams.get('category') || '전체';
  const [properties,   setProperties]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedType, setSelectedType] = useState(initCategory);
  const [selectedTx,   setSelectedTx]   = useState('전체');
  const [keyword,      setKeyword]      = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [clusterProps, setClusterProps] = useState(null);
  const [boundsProps,  setBoundsProps]  = useState(null);
  const [mapBounds,    setMapBounds]    = useState(null);
  const [geocodedIds,  setGeocodedIds]  = useState(new Set());
  const [filterOpen,    setFilterOpen]   = useState(false);
  const [viewMode,      setViewMode]     = useState('list');
  const [mapSheetItems, setMapSheetItems] = useState(null);

  useEffect(() => { setClusterProps(null); setBoundsProps(null); setMapBounds(null); setGeocodedIds(new Set()); }, [selectedType, selectedTx, keyword]);

  useEffect(() => {
    fetch('/api/listings')
      .then(r => r.json())
      .then(data => setProperties(Array.isArray(data) ? data : []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = useCallback((item) => {
    const newCount = (item.view_count || 0) + 1;
    setSelectedItem({ ...item, view_count: newCount });
    fetch('/api/view-count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: item.id, newCount }),
    }).catch(() => {});
  }, []);

  const handleClose = useCallback(() => setSelectedItem(null), []);

  const filtered = useMemo(() => {
    return properties.filter(p => {
      const matchType = matchCategory(p.category, selectedType);
      const matchTx   = selectedTx   === '전체' || p.transaction === selectedTx;
      const matchKw   = !keyword ||
        p.building_name?.includes(keyword) ||
        p.location?.includes(keyword) ||
        p.title?.includes(keyword);
      return matchType && matchTx && matchKw;
    });
  }, [properties, selectedType, selectedTx, keyword]);

  const mapProps = useMemo(() => filtered.filter(p => !p.map_hidden), [filtered]);

  const listItems = useMemo(() => {
    if (clusterProps) return clusterProps;

    const dedup = (arr) => {
      const seen = new Set();
      return arr.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    };

    if (boundsProps !== null) {
      const boundsIds = new Set(boundsProps.map(p => p.id));
      const inBounds = filtered.filter(p => !p.map_hidden && boundsIds.has(p.id));
      // Items that couldn't be geocoded have no map position — always include them
      const ungeocoded = filtered.filter(p => !p.map_hidden && !geocodedIds.has(p.id));
      const hiddenInBounds = mapBounds
        ? filtered.filter(p =>
            p.map_hidden &&
            p.map_lat != null && p.map_lng != null &&
            p.map_lat >= mapBounds.swLat && p.map_lat <= mapBounds.neLat &&
            p.map_lng >= mapBounds.swLng && p.map_lng <= mapBounds.neLng)
        : [];
      return dedup([...inBounds, ...ungeocoded, ...hiddenInBounds]);
    }

    return dedup(filtered);
  }, [clusterProps, boundsProps, mapBounds, filtered, geocodedIds]);

  return (
    <div className={styles.page}>
      {/* 모바일 전용 목록/지도 탭 토글 */}
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
        <div className={styles.mapPane}>
          <KakaoMap
            properties={mapProps}
            onGeocodedIds={ids => setGeocodedIds(ids)}
            onClusterClick={props => { setClusterProps(props); setMapSheetItems(props); }}
            onBoundsChange={(props, bounds) => { setClusterProps(null); setBoundsProps(props); setMapBounds(bounds); setMapSheetItems(null); }}
          />
        </div>

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
                    <button
                      key={t}
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
                    <button
                      key={t}
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
                  <button
                    className={styles.resetBtn}
                    onClick={() => { setSelectedType('전체'); setSelectedTx('전체'); setKeyword(''); }}
                  >필터 초기화</button>
                )}
              </div>
            ) : (
              listItems.map(prop => (
                <PropertyItem key={prop.id} property={prop} onClick={() => handleCardClick(prop)} />
              ))
            )}
          </div>
        </div>
      </div>

      {selectedItem && <PreviewModal item={selectedItem} onClose={handleClose} />}

      {/* 지도 모드: 범위 내 매물 알림 바 */}
      {viewMode === 'map' && !mapSheetItems && boundsProps !== null && listItems.length > 0 && (
        <div className={styles.mapBoundsBar} onClick={() => setMapSheetItems(listItems)}>
          <span>📍 이 지역 매물 {listItems.length}건</span>
          <span className={styles.mapBoundsBarArrow}>목록 보기 →</span>
        </div>
      )}

      {/* 지도 모드: 하단 시트 */}
      {viewMode === 'map' && mapSheetItems && (
        <BottomSheet
          items={mapSheetItems}
          onClose={() => setMapSheetItems(null)}
          onCardClick={handleCardClick}
        />
      )}
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={null}>
      <PropertiesPageInner />
    </Suspense>
  );
}
