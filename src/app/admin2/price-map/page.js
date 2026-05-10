'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../properties/properties.module.css';
import localStyles from '../map/map.module.css';
import modalStyles from '../../page.module.css';

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

const TX_BG = { '매매': '#b85c2c', '전세': '#1d4ed8', '월세': '#15803d' };

const TYPES = ['전체', '아파트', '오피스텔', '단독주택', '다가구', '다세대', '원룸', '상가', '오피스', '공장/창고', '빌딩', '토지', '재개발', '분양'];
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

function formatPriceLabel(item) {
  const { transaction, sale_price, jeonse_price, deposit, monthly_rent, maintenance } = item;
  const c = maintenance || 0;
  if (transaction === '매매' && sale_price)
    return c ? `${fmtMan(sale_price)} / 관${fmtMan(c)}` : fmtMan(sale_price);
  if (transaction === '전세' && jeonse_price)
    return c ? `${fmtMan(jeonse_price)} / 관${fmtMan(c)}` : fmtMan(jeonse_price);
  if (transaction === '월세') {
    const d = deposit || 0;
    const m = monthly_rent || 0;
    if (d || m) return c
      ? `${fmtMan(d) || '0'} / ${fmtMan(m) || '0'} / 관${fmtMan(c)}`
      : `${fmtMan(d) || '0'} / ${fmtMan(m) || '0'}`;
  }
  return null;
}

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
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

const geoKey = addr => `geo_v1_${addr}`;
function tryGetCache(addr) {
  try { const v = sessionStorage.getItem(geoKey(addr)); return v ? JSON.parse(v) : null; } catch { return null; }
}
function trySetCache(addr, c) {
  try { sessionStorage.setItem(geoKey(addr), JSON.stringify(c)); } catch {}
}

function makePriceDiv(item, onClick) {
  const priceText = formatPriceLabel(item);
  if (!priceText) return null;
  const bg = TX_BG[item.transaction] || '#78716c';
  const div = document.createElement('div');
  div.style.cssText = [
    `background:${bg}`,
    'color:#fff',
    'border-radius:14px',
    'padding:4px 11px 5px',
    'font-size:12px',
    'font-weight:700',
    'white-space:nowrap',
    'cursor:pointer',
    'box-shadow:0 2px 8px rgba(0,0,0,0.38)',
    'line-height:1.3',
    'pointer-events:auto',
    'user-select:none',
    'text-align:center',
    'border:1.5px solid rgba(255,255,255,0.4)',
    'transition:transform 0.12s',
  ].join(';');
  div.innerHTML = `<div style="font-size:9px;opacity:0.78;margin-bottom:1px;">${item.category || ''}</div><div>${priceText}</div>`;
  div.addEventListener('mouseenter', () => { div.style.transform = 'scale(1.1)'; });
  div.addEventListener('mouseleave', () => { div.style.transform = ''; });
  div.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return div;
}

// ── Cluster / region helpers (mirrors KakaoMap.js) ──────────────────────────
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildClusters(items, radiusM) {
  const assigned = new Set();
  const clusters = [];
  items.forEach((seed, i) => {
    if (assigned.has(i)) return;
    assigned.add(i);
    const group = [seed];
    items.forEach((other, j) => {
      if (assigned.has(j)) return;
      if (haversineM(seed.lat, seed.lng, other.lat, other.lng) <= radiusM) { group.push(other); assigned.add(j); }
    });
    const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
    clusters.push({ lat, lng, items: group });
  });
  return clusters;
}

function extractGu(address) {
  const m = address.match(/([가-힣]+(?:구|군))(?:\s|$)/);
  return m ? m[1] : null;
}

const FULL_CITY_MAP = {
  '서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시',
  '인천': '인천광역시', '광주': '광주광역시', '대전': '대전광역시',
  '울산': '울산광역시', '세종': '세종특별자치시',
  '경기': '경기도', '강원': '강원도',
  '충북': '충청북도', '충남': '충청남도',
  '전북': '전라북도', '전남': '전라남도',
  '경북': '경상북도', '경남': '경상남도', '제주': '제주특별자치도',
};

function extractFullCity(address) {
  if (!address) return null;
  for (const full of Object.values(FULL_CITY_MAP)) {
    if (address.startsWith(full)) return full;
  }
  for (const [short, full] of Object.entries(FULL_CITY_MAP)) {
    if (address.startsWith(short)) return full;
  }
  const m = address.match(/^([가-힣]+(?:특별시|광역시|특별자치시|도|특별자치도))/);
  return m ? m[1] : null;
}

function groupByCity(geocoded) {
  const groups = {};
  geocoded.forEach(item => {
    const addr = item.prop.address || item.prop.location || '';
    const key = extractFullCity(addr) || item.regionName || '기타';
    if (!groups[key]) groups[key] = { items: [], lats: [], lngs: [] };
    groups[key].items.push(item);
    groups[key].lats.push(item.lat);
    groups[key].lngs.push(item.lng);
  });
  return groups;
}

function groupBy(geocoded, keyFn) {
  const groups = {};
  geocoded.forEach(item => {
    const addr = item.prop.address || item.prop.location || '';
    const key = keyFn(addr) || '기타';
    if (!groups[key]) groups[key] = { items: [], lats: [], lngs: [] };
    groups[key].items.push(item);
    groups[key].lats.push(item.lat);
    groups[key].lngs.push(item.lng);
  });
  return groups;
}

function getClusterMode(level) {
  if (level >= 10) return 'city';
  if (level >= 7)  return 'gu';
  return 'cluster';
}

const MODE_STYLE = {
  cluster: { single: 'rgba(193,154,107,0.90)', multi: 'rgba(168,123,81,0.95)' },
  gu:      { bg: 'rgba(168,123,81,0.95)',  border: '#fff' },
  city:    { bg: 'rgba(110,72,34,0.97)',   border: 'rgba(255,255,255,0.9)' },
};

function makeLabelDiv(label, count, style, onClick) {
  const div = document.createElement('div');
  div.style.cssText = [
    `background:${style.bg}`,
    `border:2px solid ${style.border}`,
    'border-radius:20px',
    'box-shadow:0 2px 10px rgba(0,0,0,0.3)',
    'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
    'color:#fff', 'font-weight:700', 'cursor:pointer', 'pointer-events:auto',
    'padding:5px 14px', 'white-space:nowrap', 'min-width:64px', 'text-align:center',
  ].join(';');
  div.innerHTML = `<span style="font-size:12px;line-height:1.4;">${label}</span><span style="font-size:18px;line-height:1.3;">${count}</span>`;
  div.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return div;
}
// ─────────────────────────────────────────────────────────────────────────────

function makePinDiv(onClick) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;width:16px;height:16px;';
  const dot = document.createElement('div');
  dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#ef4444;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);transition:transform 0.12s;';
  dot.addEventListener('mouseenter', () => { dot.style.transform = 'scale(1.25)'; });
  dot.addEventListener('mouseleave', () => { dot.style.transform = ''; });
  wrap.appendChild(dot);
  wrap.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return wrap;
}

function PreviewMap({ lat, lng }) {
  const mapRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk().then(() => {
      if (cancelled || !mapRef.current) return;
      const center = new window.kakao.maps.LatLng(lat, lng);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
      map.setZoomable(false);
      new window.kakao.maps.Marker({ position: center, map });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lng]);
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

function PreviewModal({ item, onClose }) {
  const catStyle = CATEGORY_COLORS[item.category] || { bg: '#f3f4f6', color: '#374151' };
  const txStyle  = TX_COLORS[item.transaction]    || { bg: '#f3f4f6', color: '#374151' };
  const [detail, setDetail]         = useState(null);
  const [detLoading, setDetLoading] = useState(true);

  useEffect(() => {
    setDetLoading(true);
    fetch(`/api/property-detail/${item.id}`)
      .then(r => r.json()).then(d => setDetail(d)).catch(() => setDetail(null)).finally(() => setDetLoading(false));
  }, [item.id]);

  const imageUrls = detail?.imageUrls?.length ? detail.imageUrls
                  : (detail?.imageUrl || item.imageUrl) ? [detail?.imageUrl || item.imageUrl] : [];
  const youtubeId = getYouTubeId(detail?.youtube_url || item.youtube_url);
  const slides = [
    ...(youtubeId ? [{ type: 'youtube', id: youtubeId }] : []),
    ...imageUrls.map(url => ({ type: 'photo', url })),
  ];
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => { setSlideIdx(0); }, [item.id]);
  const currentSlide = slides[slideIdx];

  const hasMap     = (detail?.map_lat ?? item.map_lat) && (detail?.map_lng ?? item.map_lng);
  const mapLat     = detail?.map_lat ?? item.map_lat;
  const mapLng     = detail?.map_lng ?? item.map_lng;
  const titleRow   = detail?.rows?.find(r => r.label === '매물 특징');
  const modalTitle = titleRow?.value || item.building_name || '';

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
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
                      <button onClick={() => setSlideIdx(i => (i - 1 + slides.length) % slides.length)} className={modalStyles.pvSlidePrev}>&#8249;</button>
                      <button onClick={() => setSlideIdx(i => (i + 1) % slides.length)} className={modalStyles.pvSlideNext}>&#8250;</button>
                      <div className={modalStyles.pvSlideCount}>{slideIdx + 1} / {slides.length}</div>
                    </>
                  )}
                </>
              ) : (
                <div className={modalStyles.pvPhotoArea}>
                  <span className={modalStyles.pvPhotoGhost}>사진위치</span>
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
              {hasMap ? <PreviewMap lat={mapLat} lng={mapLng} /> : <span className={modalStyles.pvMapPlaceholder}>지도 위치 미등록</span>}
            </div>
            <div className={modalStyles.pvDataScroll}>
              <div className={modalStyles.pvDataHeader}>
                <div className={modalStyles.pvHeaderSub}>
                  <span className={modalStyles.fBadge} style={{ background: catStyle.bg, color: catStyle.color }}>{item.category}</span>
                  <span className={modalStyles.fBadge} style={{ background: txStyle.bg,  color: txStyle.color  }}>{item.transaction}</span>
                </div>
                <div className={modalStyles.pvTitle}>{modalTitle || <span className={modalStyles.pvTitleEmpty}>매물제목 미입력</span>}</div>
              </div>
              {detLoading ? (
                <div className={modalStyles.pvDetailLoading}><div className={modalStyles.spinner} /></div>
              ) : (() => {
                const rows = detail?.rows || [];
                const sections = [];
                for (const r of rows) {
                  const sec = r.section || '기타';
                  if (!sections.length || sections[sections.length - 1].title !== sec) sections.push({ title: sec, rows: [] });
                  sections[sections.length - 1].rows.push(r);
                }
                return sections.map(sec => (
                  <div key={sec.title}>
                    <div className={modalStyles.pvRowSection}>{sec.title}</div>
                    {sec.rows.map(r => (
                      <div key={r.label} className={`${modalStyles.pvRow} ${r.isPrice ? modalStyles.pvRowHighlight : ''}`}>
                        <div className={modalStyles.pvLabel}>{r.label}</div>
                        <div className={`${modalStyles.pvValue} ${r.isPrivate ? modalStyles.pvPrivate : ''}`}>
                          {r.isPrice ? <span className={modalStyles.pvPriceBadge}>{r.value}</span> : r.value}
                        </div>
                      </div>
                    ))}
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

function PriceMapCanvas({ filtered, onPropertyClick, onClusterClick, onBoundsChange, centerLatLng = null, myLocationLatLng = null, mapPins = [], onMapRightClick = null, onPinClick = null }) {
  const mapRef              = useRef(null);
  const mapInstanceRef      = useRef(null);
  const mapReadyRef         = useRef(false);
  const myLocOverlayRef     = useRef(null);
  const pinOverlaysRef      = useRef([]);
  const geocacheRef         = useRef({});
  const overlaysRef         = useRef([]);
  const filteredRef         = useRef(filtered);
  const geocodedRef         = useRef([]);
  const onPropertyClickRef  = useRef(onPropertyClick);
  const onClusterClickRef   = useRef(onClusterClick);
  const onBoundsChangeRef   = useRef(onBoundsChange);
  const onMapRightClickRef  = useRef(onMapRightClick);
  const onPinClickRef       = useRef(onPinClick);
  const centerLatLngRef     = useRef(centerLatLng);
  filteredRef.current         = filtered;
  onPropertyClickRef.current  = onPropertyClick;
  onClusterClickRef.current   = onClusterClick;
  onBoundsChangeRef.current   = onBoundsChange;
  onMapRightClickRef.current  = onMapRightClick;
  onPinClickRef.current       = onPinClick;
  centerLatLngRef.current     = centerLatLng;

  function clearOverlays() {
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];
  }

  function clearPinOverlays() {
    pinOverlaysRef.current.forEach(o => o.setMap(null));
    pinOverlaysRef.current = [];
  }

  function renderPinOverlays(pins) {
    clearPinOverlays();
    if (!mapInstanceRef.current || !pins?.length) return;
    pins.forEach(pin => {
      const div = makePinDiv(() => {
        if (onPinClickRef.current) onPinClickRef.current(pin);
      });
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(pin.lat, pin.lng),
        content: div,
        map: mapInstanceRef.current,
        zIndex: 20,
        xAnchor: 0.5,
        yAnchor: 1.2,
      });
      pinOverlaysRef.current.push(overlay);
    });
  }

  function renderAll(geocoded) {
    const map = mapInstanceRef.current;
    if (!map || geocoded.length === 0) { clearOverlays(); return; }
    clearOverlays();

    const level  = map.getLevel();
    const bounds = map.getBounds();
    const visible = geocoded.filter(({ lat, lng }) =>
      bounds.contain(new window.kakao.maps.LatLng(lat, lng))
    );
    if (visible.length === 0) return;

    // level ≤ 5 (≈ 500m) → individual price labels for visible items
    if (level <= 5) {
      visible.forEach(({ lat, lng, prop }) => {
        const div = makePriceDiv(prop, () => onPropertyClickRef.current(prop));
        if (!div) return;
        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(lat, lng),
          content: div, map, zIndex: 10, xAnchor: 0.5, yAnchor: 1.3,
        });
        div.addEventListener('mouseenter', () => overlay.setZIndex(50));
        div.addEventListener('mouseleave', () => overlay.setZIndex(10));
        overlaysRef.current.push(overlay);
      });
      return;
    }

    // level 6+ → cluster / gu / city (use all geocoded for grouping, visible for clusters)
    const mode = getClusterMode(level);
    if (mode === 'cluster') {
      const clusters = buildClusters(visible, 100);
      clusters.forEach(cluster => {
        const count = cluster.items.length;
        const pos   = new window.kakao.maps.LatLng(cluster.lat, cluster.lng);
        const size  = count >= 10 ? 48 : count >= 5 ? 44 : 38;
        const bg    = count > 1 ? MODE_STYLE.cluster.multi : MODE_STYLE.cluster.single;
        const div   = document.createElement('div');
        div.style.cssText = `width:${size}px;height:${size}px;background:${bg};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${count >= 10 ? 15 : 14}px;font-weight:700;cursor:pointer;pointer-events:auto;`;
        div.textContent = count;
        div.addEventListener('click', e => {
          e.stopPropagation();
          if (onClusterClickRef.current) onClusterClickRef.current(cluster.items.map(it => it.prop));
        });
        overlaysRef.current.push(new window.kakao.maps.CustomOverlay({
          position: pos, content: div, map, zIndex: 10, xAnchor: 0.5, yAnchor: 0.5,
        }));
      });
      return;
    }

    // gu / city — group all geocoded (not just visible) so label appears even if center is off-screen
    const style  = MODE_STYLE[mode] || MODE_STYLE.city;
    const groups = mode === 'city' ? groupByCity(geocoded) : groupBy(geocoded, extractGu);
    Object.entries(groups).forEach(([label, { items, lats, lngs }]) => {
      const lat = lats.reduce((s, v) => s + v, 0) / lats.length;
      const lng = lngs.reduce((s, v) => s + v, 0) / lngs.length;
      const div = makeLabelDiv(label, items.length, style, () => {
        if (onClusterClickRef.current) onClusterClickRef.current(items.map(it => it.prop));
      });
      overlaysRef.current.push(new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(lat, lng),
        content: div, map, zIndex: 10, xAnchor: 0.5, yAnchor: 0.5,
      }));
    });
  }

  function geocodeAndRender(props) {
    if (!mapInstanceRef.current || !props) return;
    const geocoded    = [];
    const needsGeocode = [];

    props.forEach(p => {
      if (p.map_lat && p.map_lng) {
        geocoded.push({ lat: p.map_lat, lng: p.map_lng, prop: p });
      } else {
        const addr = p.address || p.location || '';
        if (!addr) return;
        const cached = geocacheRef.current[addr] || tryGetCache(addr);
        if (cached) {
          geocacheRef.current[addr] = cached;
          geocoded.push({ lat: cached.lat, lng: cached.lng, prop: p });
        } else {
          needsGeocode.push({ prop: p, addr });
        }
      }
    });

    geocodedRef.current = geocoded;
    renderAll(geocoded);

    if (needsGeocode.length === 0) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    let resolved = 0;
    needsGeocode.forEach(({ prop, addr }, i) => {
      setTimeout(() => {
        geocoder.addressSearch(addr, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const c = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
            trySetCache(addr, c);
            geocacheRef.current[addr] = c;
            geocoded.push({ lat: c.lat, lng: c.lng, prop });
          }
          resolved++;
          if (resolved === needsGeocode.length) {
            geocodedRef.current = geocoded;
            renderAll(geocoded);
          }
        });
      }, i * 250);
    });
  }

  useEffect(() => {
    loadKakaoSdk().then(() => {
      if (!mapRef.current) return;
      const cl = centerLatLngRef.current;
      const initCenter = cl
        ? new window.kakao.maps.LatLng(cl.lat, cl.lng)
        : new window.kakao.maps.LatLng(35.1336, 129.1010);
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: initCenter,
        level: 7,
      });
      mapInstanceRef.current = map;
      mapReadyRef.current    = true;
      map.setLevel(7);
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.setLevel(7); }, 200);
      new ResizeObserver(() => map.relayout()).observe(mapRef.current);

      window.kakao.maps.event.addListener(map, 'idle', () => {
        if (geocodedRef.current.length === 0) return;
        renderAll(geocodedRef.current);
        if (onBoundsChangeRef.current) {
          const b = map.getBounds();
          const visibleProps = geocodedRef.current
            .filter(({ lat, lng }) => b.contain(new window.kakao.maps.LatLng(lat, lng)))
            .map(it => it.prop);
          onBoundsChangeRef.current(visibleProps);
        }
      });

      // PC 우클릭
      window.kakao.maps.event.addListener(map, 'rightclick', (e) => {
        if (onMapRightClickRef.current) {
          onMapRightClickRef.current({ lat: e.latLng.getLat(), lng: e.latLng.getLng() });
        }
      });

      // 모바일 롱프레스
      let touchTimer = null;
      let touchMoved = false;
      let savedTouch = null;
      const onTouchStart = (e) => {
        touchMoved = false;
        savedTouch = e.touches[0];
        touchTimer = setTimeout(() => {
          if (!touchMoved && savedTouch && mapInstanceRef.current) {
            const rect = mapRef.current.getBoundingClientRect();
            const proj = mapInstanceRef.current.getProjection();
            const point = new window.kakao.maps.Point(
              savedTouch.clientX - rect.left,
              savedTouch.clientY - rect.top
            );
            const latlng = proj.coordsFromPoint(point);
            if (onMapRightClickRef.current) {
              onMapRightClickRef.current({ lat: latlng.getLat(), lng: latlng.getLng() });
            }
          }
        }, 600);
      };
      const onTouchMove = () => { touchMoved = true; clearTimeout(touchTimer); };
      const onTouchEnd = () => clearTimeout(touchTimer);
      mapRef.current.addEventListener('touchstart', onTouchStart, { passive: true });
      mapRef.current.addEventListener('touchmove', onTouchMove, { passive: true });
      mapRef.current.addEventListener('touchend', onTouchEnd);
      mapRef.current.addEventListener('contextmenu', (e) => e.preventDefault());

      geocodeAndRender(filteredRef.current);
      renderPinOverlays(mapPins);
    }).catch(() => {});
    return () => { clearOverlays(); clearPinOverlays(); };
  }, []);

  useEffect(() => {
    if (!mapReadyRef.current) return;
    geocodeAndRender(filtered);
  }, [filtered]);

  useEffect(() => {
    if (!mapReadyRef.current) return;
    renderPinOverlays(mapPins);
  }, [mapPins]);

  useEffect(() => {
    if (!centerLatLng || !mapReadyRef.current || !mapInstanceRef.current) return;
    const latlng = new window.kakao.maps.LatLng(centerLatLng.lat, centerLatLng.lng);
    mapInstanceRef.current.setLevel(centerLatLng.level ?? 7);
    mapInstanceRef.current.setCenter(latlng);
  }, [centerLatLng]);

  useEffect(() => {
    if (!myLocationLatLng || !mapInstanceRef.current) return;
    const pos = new window.kakao.maps.LatLng(myLocationLatLng.lat, myLocationLatLng.lng);
    if (myLocOverlayRef.current) {
      myLocOverlayRef.current.setPosition(pos);
    } else {
      if (!document.getElementById('my-loc-pulse-style')) {
        const s = document.createElement('style');
        s.id = 'my-loc-pulse-style';
        s.textContent = '@keyframes myLocPulse{0%{transform:scale(1);opacity:.6}70%{transform:scale(2.8);opacity:0}100%{transform:scale(1);opacity:0}}';
        document.head.appendChild(s);
      }
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:18px;height:18px;pointer-events:none;';
      const pulse = document.createElement('div');
      pulse.style.cssText = 'position:absolute;inset:-5px;border-radius:50%;background:rgba(66,133,244,0.35);animation:myLocPulse 2s ease-out infinite;';
      const dot = document.createElement('div');
      dot.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#4285f4;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);';
      wrap.appendChild(pulse);
      wrap.appendChild(dot);
      myLocOverlayRef.current = new window.kakao.maps.CustomOverlay({
        position: pos,
        content: wrap,
        map: mapInstanceRef.current,
        zIndex: 15,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });
    }
  }, [myLocationLatLng]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
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
  if (floorText)          chips.push(floorText);
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

function PriceMapInner() {
  const [properties,    setProperties]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedType,  setSelectedType]  = useState('전체');
  const [selectedTx,    setSelectedTx]    = useState('전체');
  const [keyword,       setKeyword]       = useState('');
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [viewMode,      setViewMode]      = useState('list');
  const [mapSheetItems, setMapSheetItems] = useState(null);
  const [boundsProps,   setBoundsProps]   = useState(null);
  const [listPage,      setListPage]      = useState(1);
  const [myLocation,    setMyLocation]    = useState(null);
  const [myLocDot,      setMyLocDot]      = useState(null);
  const [locDotVisible, setLocDotVisible] = useState(false);
  const [pins,          setPins]          = useState([]);
  const [pinListOpen,   setPinListOpen]   = useState(false);
  const watchIdRef = useRef(null);
  const hasInitRef = useRef(false);
  const LIST_PAGE_SIZE = 10;

  useEffect(() => {
    fetch('/api/map-pins?page=금액지도')
      .then(r => r.json())
      .then(data => setPins(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleAddPin = useCallback(async ({ lat, lng }) => {
    try {
      const res = await fetch('/api/map-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '핀', lat, lng, page: '금액지도' }),
      });
      const data = await res.json();
      if (data.ok) {
        setPins(prev => [...prev, { id: data.id, name: '핀', lat, lng }]);
      }
    } catch {}
  }, []);

  const handleDeletePin = useCallback(async (pin) => {
    try {
      await fetch(`/api/map-pins/${pin.id}`, { method: 'DELETE' });
      setPins(prev => prev.filter(p => p.id !== pin.id));
    } catch {}
  }, []);

  const handlePinClick = useCallback((pin) => {
    if (window.confirm(`"${pin.name}" 핀을 삭제할까요?`)) {
      handleDeletePin(pin);
    }
  }, [handleDeletePin]);

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

  useEffect(() => {
    fetch('/api/listings')
      .then(r => r.json())
      .then(data => setProperties(Array.isArray(data) ? data : []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = useCallback((item) => { setSelectedItem(item); }, []);
  const handleClose     = useCallback(() => setSelectedItem(null), []);

  useEffect(() => { setBoundsProps(null); }, [selectedType, selectedTx, keyword]);

  const filtered = useMemo(() => properties.filter(p => {
    if (p.contract_status === '계약완료') return false;
    if (!matchCategory(p.category, selectedType)) return false;
    if (selectedTx !== '전체' && p.transaction !== selectedTx) return false;
    if (keyword && !p.building_name?.includes(keyword) && !p.location?.includes(keyword) && !p.title?.includes(keyword)) return false;
    return true;
  }), [properties, selectedType, selectedTx, keyword]);

  const listItems = boundsProps ?? filtered;

  useEffect(() => { setListPage(1); }, [selectedType, selectedTx, keyword, boundsProps]);

  return (
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
            onClick={() => { setViewMode('map'); setMapSheetItems(null); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            지도보기
          </button>
        </div>

        <div className={styles.layout}>
          {/* 지도 — 가격 라벨 표시 */}
          <div className={styles.mapPane}>
            <PriceMapCanvas
              filtered={filtered}
              centerLatLng={myLocation}
              myLocationLatLng={locDotVisible ? myLocDot : null}
              mapPins={pins}
              onMapRightClick={handleAddPin}
              onPinClick={handlePinClick}
              onPropertyClick={setSelectedItem}
              onClusterClick={props => setMapSheetItems(props)}
              onBoundsChange={props => setBoundsProps(props)}
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
                {pins.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                    우클릭으로 핀 추가
                  </div>
                ) : pins.map((pin, idx) => (
                  <div key={pin.id} className={localStyles.pinListItem}>
                    <span
                      className={localStyles.pinListName}
                      onClick={() => setMyLocation({ lat: pin.lat, lng: pin.lng, level: 5 })}
                    >📍 {idx + 1}</span>
                    <button
                      className={localStyles.pinListDelete}
                      onClick={() => handleDeletePin(pin)}
                      title="삭제"
                    >🗑</button>
                  </div>
                ))}
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


        {viewMode === 'map' && !mapSheetItems && listItems.length > 0 && (
          <div className={styles.mapBoundsBar} onClick={() => setMapSheetItems(listItems)}>
            <span>💰 금액지도 매물 {listItems.length}건</span>
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
  );
}

export default function PriceMapPage() {
  return (
    <Suspense fallback={null}>
      <PriceMapInner />
    </Suspense>
  );
}
