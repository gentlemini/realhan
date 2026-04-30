'use client';

import { useEffect, useRef, useState } from 'react';

const geoKey = (addr) => `geo_v1_${addr}`;
function tryGetCache(addr) {
  try { const v = sessionStorage.getItem(geoKey(addr)); return v ? JSON.parse(v) : null; } catch { return null; }
}
function trySetCache(addr, c) {
  try { sessionStorage.setItem(geoKey(addr), JSON.stringify(c)); } catch {}
}

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
      if (haversineM(seed.lat, seed.lng, other.lat, other.lng) <= radiusM) {
        group.push(other);
        assigned.add(j);
      }
    });
    const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
    clusters.push({ lat, lng, items: group });
  });
  return clusters;
}

// 동 추출: "부산광역시 남구 대연동 ..." → "대연동"
function extractDong(address) {
  const m = address.match(/([가-힣]+(?:동|가|읍|면|리))(?:\s|$|\d)/);
  return m ? m[1] : null;
}

// 구/군 추출: "부산광역시 남구 ..." → "남구"
function extractGu(address) {
  const m = address.match(/([가-힣]+(?:구|군))(?:\s|$)/);
  return m ? m[1] : null;
}

// 시/도 추출 (단축): "부산광역시 ..." 또는 "부산 ..." → "부산"
const CITY_SHORT = {
  '부산광역시': '부산', '서울특별시': '서울', '인천광역시': '인천',
  '대구광역시': '대구', '대전광역시': '대전', '광주광역시': '광주',
  '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원도': '강원', '강원특별자치도': '강원',
  '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전북특별자치도': '전북', '전라남도': '전남',
  '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주',
};
// 단축 시/도명 목록 (노션 주소가 "부산 남구..." 형식인 경우)
const CITY_SHORT_PREFIXES = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];
function extractCity(address) {
  for (const [full, short] of Object.entries(CITY_SHORT)) {
    if (address.startsWith(full)) return short;
  }
  for (const short of CITY_SHORT_PREFIXES) {
    if (address.startsWith(short + ' ')) return short;
  }
  const m = address.match(/^([가-힣]+(?:시|도|특별시|광역시|자치시|자치도))/);
  return m ? m[1] : '기타';
}

// level → 표시 모드
// level 4: 100m (minLevel, cluster)
// level 5~6: 500m~1km → 동
// level 7~8: 2km~4km → 구
// level 9+: 8km+ → 지역
function getMode(level) {
  if (level >= 9) return 'city';
  if (level >= 7) return 'gu';
  if (level >= 5) return 'dong';
  return 'cluster';
}

// 모드별 스타일 (사이트 골드 계열)
const MODE_STYLE = {
  cluster: { single: 'rgba(193,154,107,0.90)', multi: 'rgba(168,123,81,0.95)' },
  dong:    { bg: 'rgba(193,154,107,0.93)', border: '#fff' },
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
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'color:#fff',
    'font-weight:700',
    'cursor:pointer',
    'pointer-events:auto',
    'padding:5px 14px',
    'white-space:nowrap',
    'min-width:64px',
    'text-align:center',
  ].join(';');
  div.innerHTML = `<span style="font-size:12px;line-height:1.4;">${label}</span><span style="font-size:18px;line-height:1.3;">${count}</span>`;
  div.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return div;
}

function groupBy(geocoded, keyFn) {
  const groups = {};
  geocoded.forEach(item => {
    const key = keyFn(item.prop.address) || '기타';
    if (!groups[key]) groups[key] = { items: [], lats: [], lngs: [] };
    groups[key].items.push(item);
    groups[key].lats.push(item.lat);
    groups[key].lngs.push(item.lng);
  });
  return groups;
}

export default function KakaoMap({ address, radius = 20, level = 5, properties = null, onPropertyClick, onClusterClick, onBoundsChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapReadyRef = useRef(false);
  const propertiesRef = useRef(properties);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const circlesRef = useRef([]);
  const geocodedRef = useRef([]);
  const prevModeRef = useRef(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  propertiesRef.current = properties;

  const [error, setError] = useState(false);
  const isMulti = !!properties;

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!apiKey) { setError(true); return; }

    const onLoad = () => {
      if (!window.kakao) { setError(true); return; }
      window.kakao.maps.load(() => {
        if (isMulti) initMultiMap();
        else initSingleMap();
      });
    };

    const existing = document.getElementById('kakao-map-sdk');
    if (existing) {
      if (window.kakao) { onLoad(); return; }
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', () => setError(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = onLoad;
    script.onerror = () => setError(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapReadyRef.current || !isMulti) return;
    prevModeRef.current = null;
    updateMarkers(properties);
  }, [properties]);

  function initMultiMap() {
    if (!mapRef.current || mapRef.current.offsetHeight === 0) {
      setTimeout(initMultiMap, 100);
      return;
    }
    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(35.1336, 129.1010),
      level: 5,
      minLevel: 4,
    });
    mapInstanceRef.current = map;
    mapReadyRef.current = true;
    new ResizeObserver(() => map.relayout()).observe(mapRef.current);

    window.kakao.maps.event.addListener(map, 'idle', () => {
      const mode = getMode(map.getLevel());
      if (mode !== prevModeRef.current && geocodedRef.current.length > 0) {
        prevModeRef.current = mode;
        renderOverlays(geocodedRef.current);
      }
      if (!onBoundsChangeRef.current || geocodedRef.current.length === 0) return;
      const bounds = map.getBounds();
      const visible = geocodedRef.current
        .filter(item => bounds.contain(new window.kakao.maps.LatLng(item.lat, item.lng)))
        .map(item => item.prop);
      onBoundsChangeRef.current(visible);
    });

    updateMarkers(propertiesRef.current);
  }

  function clearOverlays() {
    overlaysRef.current.forEach(o => o.setMap(null));
    circlesRef.current.forEach(c => c.setMap(null));
    overlaysRef.current = [];
    circlesRef.current = [];
  }

  function clearMapObjects() {
    markersRef.current.forEach(m => m.setMap(null));
    clearOverlays();
    markersRef.current = [];
    geocodedRef.current = [];
  }

  function renderOverlays(geocoded) {
    const map = mapInstanceRef.current;
    if (!map || geocoded.length === 0) return;
    clearOverlays();

    const mode = getMode(map.getLevel());

    if (mode === 'cluster') {
      const clusters = buildClusters(geocoded, 100);
      clusters.forEach(cluster => {
        const pos = new window.kakao.maps.LatLng(cluster.lat, cluster.lng);
        const count = cluster.items.length;
        const isMultiCluster = count > 1;
        const size = count >= 10 ? 48 : count >= 5 ? 44 : 38;
        const bg = isMultiCluster ? MODE_STYLE.cluster.multi : MODE_STYLE.cluster.single;
        const div = document.createElement('div');
        div.style.cssText = `width:${size}px;height:${size}px;background:${bg};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${count >= 10 ? 15 : 14}px;font-weight:700;cursor:pointer;pointer-events:auto;`;
        div.textContent = count;
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onClusterClick) onClusterClick(cluster.items.map(it => it.prop));
        });
        const overlay = new window.kakao.maps.CustomOverlay({
          position: pos, content: div, map, zIndex: 10, xAnchor: 0.5, yAnchor: 0.5,
        });
        overlaysRef.current.push(overlay);
      });
      return;
    }

    // 동/구/지역 그룹핑
    const keyFn = mode === 'dong' ? extractDong : mode === 'gu' ? extractGu : extractCity;
    const style = MODE_STYLE[mode];
    const groups = groupBy(geocoded, keyFn);

    Object.entries(groups).forEach(([label, { items, lats, lngs }]) => {
      const lat = lats.reduce((s, v) => s + v, 0) / lats.length;
      const lng = lngs.reduce((s, v) => s + v, 0) / lngs.length;
      const pos = new window.kakao.maps.LatLng(lat, lng);
      const div = makeLabelDiv(label, items.length, style, () => {
        if (onClusterClick) onClusterClick(items.map(it => it.prop));
      });
      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos, content: div, map, zIndex: 10, xAnchor: 0.5, yAnchor: 0.5,
      });
      overlaysRef.current.push(overlay);
    });
  }

  function updateMarkers(props) {
    const map = mapInstanceRef.current;
    if (!map || !props) return;
    clearMapObjects();

    const geocoder = new window.kakao.maps.services.Geocoder();
    const todo = props.filter(p => p.address);
    if (todo.length === 0) return;

    const geocoded = [];
    let resolved = 0;

    const finalize = () => {
      if (geocoded.length === 0) return;
      geocodedRef.current = geocoded;
      prevModeRef.current = getMode(map.getLevel());
      renderOverlays(geocoded);
      const bounds = new window.kakao.maps.LatLngBounds();
      geocoded.forEach(item => bounds.extend(new window.kakao.maps.LatLng(item.lat, item.lng)));
      try { map.setBounds(bounds, 80); } catch {}
    };

    todo.forEach((prop, i) => {
      const cached = tryGetCache(prop.address);
      if (cached) {
        geocoded.push({ lat: cached.lat, lng: cached.lng, prop });
        resolved++;
        if (resolved === todo.length) finalize();
        return;
      }
      setTimeout(() => {
        geocoder.addressSearch(prop.address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const c = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
            trySetCache(prop.address, c);
            geocoded.push({ lat: c.lat, lng: c.lng, prop });
          }
          resolved++;
          if (resolved === todo.length) finalize();
        });
      }, i * 250);
    });
  }

  function initSingleMap() {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address || '부산광역시 남구 대연동', (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK) { setError(true); return; }
      const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

      // 동 단위 주소 감지: 동/읍/면/리 뒤에 번지 없음
      const isDongLevel = /[가-힣]+(?:동|가|읍|면|리)\s*$/.test((address || '').trim());

      if (isDongLevel) {
        // 500m 축척 고정
        const map = new window.kakao.maps.Map(mapRef.current, { center: coords, level: 5 });
        map.setMinLevel(5);
        map.setMaxLevel(5);
        new ResizeObserver(() => map.relayout()).observe(mapRef.current);

        // 베이지 불투명 사각형 오버레이
        const dongName = extractDong(address) || address;
        const div = document.createElement('div');
        div.style.cssText = [
          'background:#c8a97e',
          'border-radius:8px',
          'padding:9px 18px',
          'color:#fff',
          'font-size:13px',
          'font-weight:800',
          'pointer-events:none',
          'box-shadow:0 3px 12px rgba(0,0,0,0.22)',
          'white-space:nowrap',
          'letter-spacing:-0.02em',
          'border:2px solid rgba(255,255,255,0.55)',
        ].join(';');
        div.textContent = dongName;
        new window.kakao.maps.CustomOverlay({
          position: coords, content: div, map, xAnchor: 0.5, yAnchor: 0.5,
        });
      } else {
        // 전체 주소: 정확한 핀 표시
        const map = new window.kakao.maps.Map(mapRef.current, { center: coords, level: 3 });
        new ResizeObserver(() => map.relayout()).observe(mapRef.current);
        new window.kakao.maps.Marker({ map, position: coords });
      }
    });
  }

  if (error) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#f4f0ec', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#888', fontSize: '0.9rem' }}>
        <span style={{ fontSize: '2rem' }}>🗺️</span>
        <p style={{ fontSize: '0.8rem' }}>지도를 불러올 수 없습니다</p>
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
