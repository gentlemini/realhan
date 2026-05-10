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

function extractDong(address) {
  const m = address.match(/([가-힣]+(?:동|가|읍|면|리))(?:\s|$|\d)/);
  return m ? m[1] : null;
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

function getMode(level) {
  if (level >= 10) return 'city';
  if (level >= 7)  return 'gu';
  return 'cluster';
}

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
    const addr = item.prop.address || item.prop.location || '';
    const key = keyFn(addr) || '기타';
    if (!groups[key]) groups[key] = { items: [], lats: [], lngs: [] };
    groups[key].items.push(item);
    groups[key].lats.push(item.lat);
    groups[key].lngs.push(item.lng);
  });
  return groups;
}

function ensurePulseStyle() {
  if (document.getElementById('my-loc-pulse-style')) return;
  const s = document.createElement('style');
  s.id = 'my-loc-pulse-style';
  s.textContent = '@keyframes myLocPulse{0%{transform:scale(1);opacity:.6}70%{transform:scale(2.8);opacity:0}100%{transform:scale(1);opacity:0}}';
  document.head.appendChild(s);
}

function makeMyLocContent() {
  ensurePulseStyle();
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:18px;height:18px;pointer-events:none;';
  const pulse = document.createElement('div');
  pulse.style.cssText = 'position:absolute;inset:-5px;border-radius:50%;background:rgba(66,133,244,0.35);animation:myLocPulse 2s ease-out infinite;';
  const dot = document.createElement('div');
  dot.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#4285f4;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);';
  wrap.appendChild(pulse);
  wrap.appendChild(dot);
  return wrap;
}

export default function KakaoMap({ address, radius = 20, level = 5, properties = null, hiddenProperties = null, onPropertyClick, onClusterClick, onBoundsChange, onGeocodedIds, adminMode = false, centerLatLng = null, myLocationLatLng = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapReadyRef = useRef(false);
  const myLocOverlayRef = useRef(null);
  const boundsLockedRef = useRef(false);
  const propertiesRef = useRef(properties);
  const hiddenPropertiesRef = useRef(hiddenProperties);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const circlesRef = useRef([]);
  const geocodedRef = useRef([]);
  const hiddenGeocodedRef = useRef([]);
  const geocodingDoneRef = useRef(false);
  const prevModeRef = useRef(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const onGeocodedIdsRef = useRef(onGeocodedIds);
  onGeocodedIdsRef.current = onGeocodedIds;
  const centerLatLngRef = useRef(centerLatLng);
  centerLatLngRef.current = centerLatLng;
  propertiesRef.current = properties;
  hiddenPropertiesRef.current = hiddenProperties;

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
      myLocOverlayRef.current = new window.kakao.maps.CustomOverlay({
        position: pos,
        content: makeMyLocContent(),
        map: mapInstanceRef.current,
        zIndex: 15,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });
    }
  }, [myLocationLatLng]);

  useEffect(() => {
    if (!mapReadyRef.current || !isMulti) return;
    prevModeRef.current = null;
    updateMarkers(properties);
  }, [properties]);

  useEffect(() => {
    if (!mapReadyRef.current || !isMulti) return;
    updateHiddenGeocoded(hiddenProperties || []);
  }, [hiddenProperties]);

  function initMultiMap() {
    if (!mapRef.current || mapRef.current.offsetHeight === 0) {
      setTimeout(initMultiMap, 100);
      return;
    }
    const cl = centerLatLngRef.current;
    const initCenter = cl
      ? new window.kakao.maps.LatLng(cl.lat, cl.lng)
      : new window.kakao.maps.LatLng(35.1336, 129.1010);
    const initLevel = adminMode ? 7 : 5;
    const map = new window.kakao.maps.Map(mapRef.current, {
      center: initCenter,
      level: initLevel,
    });
    mapInstanceRef.current = map;
    mapReadyRef.current = true;
    if (adminMode) boundsLockedRef.current = true;
    new ResizeObserver(() => map.relayout()).observe(mapRef.current);

    window.kakao.maps.event.addListener(map, 'idle', () => {
      const mode = getMode(map.getLevel());
      if (mode !== prevModeRef.current && geocodedRef.current.length > 0) {
        prevModeRef.current = mode;
        renderOverlays(geocodedRef.current);
      }
      if (!onBoundsChangeRef.current || !geocodingDoneRef.current) return;
      const bounds = map.getBounds();
      const visible = geocodedRef.current
        .filter(item => bounds.contain(new window.kakao.maps.LatLng(item.lat, item.lng)))
        .map(item => item.prop);
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      onBoundsChangeRef.current(visible, { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() });
    });

    updateMarkers(propertiesRef.current);
    updateHiddenGeocoded(hiddenPropertiesRef.current || []);
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
    hiddenGeocodedRef.current = [];
    geocodingDoneRef.current = false;
    boundsLockedRef.current = false;
  }

  // 숨김 매물의 카운트를 기존 버블에 합산
  function renderOverlays(geocoded) {
    const map = mapInstanceRef.current;
    if (!map || geocoded.length === 0) return;
    clearOverlays();

    const mode = getMode(map.getLevel());
    const hidden = hiddenGeocodedRef.current;

    if (mode === 'cluster') {
      const clusters = buildClusters(geocoded, 100);
      clusters.forEach(cluster => {
        // 같은 100m 반경 내 숨김 매물 수 합산
        const hiddenCount = hidden.filter(h =>
          haversineM(cluster.lat, cluster.lng, h.lat, h.lng) <= 400
        ).length;
        const displayCount = cluster.items.length + hiddenCount;
        const pos = new window.kakao.maps.LatLng(cluster.lat, cluster.lng);
        const isMultiCluster = displayCount > 1;
        const size = displayCount >= 10 ? 48 : displayCount >= 5 ? 44 : 38;
        const bg = isMultiCluster ? MODE_STYLE.cluster.multi : MODE_STYLE.cluster.single;
        const div = document.createElement('div');
        div.style.cssText = `width:${size}px;height:${size}px;background:${bg};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${displayCount >= 10 ? 15 : 14}px;font-weight:700;cursor:pointer;pointer-events:auto;`;
        div.textContent = displayCount;
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

    const style = MODE_STYLE[mode] || MODE_STYLE.city;
    const keyFn = mode === 'city' ? null : (mode === 'dong' ? extractDong : extractGu);
    const groups = mode === 'city' ? groupByCity(geocoded) : groupBy(geocoded, keyFn);
    const hiddenGroups = mode === 'city' ? groupByCity(hidden) : groupBy(hidden, keyFn);
    const mergedKeys = new Set();

    Object.entries(groups).forEach(([label, { items, lats, lngs }]) => {
      const hiddenCount = hiddenGroups[label]?.items.length || 0;
      if (hiddenCount > 0) mergedKeys.add(label);
      const displayCount = items.length + hiddenCount;
      const lat = lats.reduce((s, v) => s + v, 0) / lats.length;
      const lng = lngs.reduce((s, v) => s + v, 0) / lngs.length;
      const pos = new window.kakao.maps.LatLng(lat, lng);
      const div = makeLabelDiv(label, displayCount, style, () => {
        if (onClusterClick) onClusterClick(items.map(it => it.prop));
      });
      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos, content: div, map, zIndex: 10, xAnchor: 0.5, yAnchor: 0.5,
      });
      overlaysRef.current.push(overlay);
    });

    // 공개 매물이 없는 지역의 숨김 매물 → 독립 버블 (gu/city 단위라 위치 노출 없음)
    Object.entries(hiddenGroups).forEach(([label, { items, lats, lngs }]) => {
      if (mergedKeys.has(label)) return;
      const lat = lats.reduce((s, v) => s + v, 0) / lats.length;
      const lng = lngs.reduce((s, v) => s + v, 0) / lngs.length;
      const pos = new window.kakao.maps.LatLng(lat, lng);
      const div = makeLabelDiv(label, items.length, style, () => {});
      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos, content: div, map, zIndex: 10, xAnchor: 0.5, yAnchor: 0.5,
      });
      overlaysRef.current.push(overlay);
    });
  }

  // 숨김 매물 좌표만 수집 (오버레이 없음, 합산용)
  function updateHiddenGeocoded(hiddenProps) {
    hiddenGeocodedRef.current = [];
    if (!hiddenProps || hiddenProps.length === 0) return;

    const geocoded = [];
    const directCoords = hiddenProps.filter(p => p.map_lat && p.map_lng);
    const needsGeocode = hiddenProps.filter(p => (!p.map_lat || !p.map_lng) && (p.address || p.location));

    directCoords.forEach(p => {
      geocoded.push({ lat: p.map_lat, lng: p.map_lng, prop: p });
    });

    const finalize = () => {
      hiddenGeocodedRef.current = geocoded;
      // 좌표 수집 완료 후 현재 오버레이 재렌더 (카운트 반영)
      if (geocodedRef.current.length > 0) {
        renderOverlays(geocodedRef.current);
      }
    };

    if (needsGeocode.length === 0) { finalize(); return; }

    const geocoder = new window.kakao.maps.services.Geocoder();
    let resolved = 0;
    needsGeocode.forEach((prop, i) => {
      const addr = prop.address || prop.location || '';
      const cached = tryGetCache(addr);
      if (cached) {
        geocoded.push({ lat: cached.lat, lng: cached.lng, prop });
        resolved++;
        if (resolved === needsGeocode.length) finalize();
        return;
      }
      setTimeout(() => {
        geocoder.addressSearch(addr, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const c = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
            trySetCache(addr, c);
            geocoded.push({ lat: c.lat, lng: c.lng, prop });
          }
          resolved++;
          if (resolved === needsGeocode.length) finalize();
        });
      }, i * 250);
    });
  }

  function updateMarkers(props) {
    const map = mapInstanceRef.current;
    if (!map || !props) return;
    clearMapObjects();

    const directCoords = props.filter(p => p.map_lat && p.map_lng);
    const needsGeocode = props.filter(p => (!p.map_lat || !p.map_lng) && (p.address || p.location));

    if (directCoords.length === 0 && needsGeocode.length === 0) {
      geocodingDoneRef.current = true;
      if (onGeocodedIdsRef.current) onGeocodedIdsRef.current(new Set());
      if (onBoundsChangeRef.current) {
        const mb = map.getBounds();
        const sw = mb.getSouthWest(); const ne = mb.getNorthEast();
        onBoundsChangeRef.current([], { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() });
      }
      return;
    }

    const geocoded = [];
    directCoords.forEach(p => {
      geocoded.push({ lat: p.map_lat, lng: p.map_lng, prop: p });
    });

    const finalize = () => {
      geocodedRef.current = geocoded;
      geocodingDoneRef.current = true;
      if (onGeocodedIdsRef.current) {
        onGeocodedIdsRef.current(new Set(geocoded.map(g => g.prop.id)));
      }
      if (geocoded.length === 0) {
        if (onBoundsChangeRef.current) {
          const mb = map.getBounds();
          const sw = mb.getSouthWest(); const ne = mb.getNorthEast();
          onBoundsChangeRef.current([], { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() });
        }
        return;
      }

      const doRender = () => {
        prevModeRef.current = getMode(map.getLevel());
        renderOverlays(geocoded);
        if (!boundsLockedRef.current) {
          if (!adminMode) {
            const b = new window.kakao.maps.LatLngBounds();
            geocoded.forEach(it => b.extend(new window.kakao.maps.LatLng(it.lat, it.lng)));
            try { map.setBounds(b, 80); } catch {}
          }
          boundsLockedRef.current = true;
        }
      };

      const unknowns = geocoded.filter(it => !extractFullCity(it.prop.address || it.prop.location || ''));
      if (unknowns.length === 0) { doRender(); return; }

      const rgeo = new window.kakao.maps.services.Geocoder();
      let done2 = 0;
      unknowns.forEach((item, i) => {
        const cKey = `rgeo_${item.lat.toFixed(3)}_${item.lng.toFixed(3)}`;
        const cached = tryGetCache(cKey);
        if (cached !== null) {
          if (cached) item.regionName = cached;
          if (++done2 === unknowns.length) doRender();
          return;
        }
        setTimeout(() => {
          rgeo.coord2RegionCode(item.lng, item.lat, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK && result.length) {
              const name = result[0].region_1depth_name || '';
              item.regionName = name;
              trySetCache(cKey, name);
            } else {
              trySetCache(cKey, '');
            }
            if (++done2 === unknowns.length) doRender();
          });
        }, i * 150);
      });
    };

    if (needsGeocode.length === 0) { finalize(); return; }

    const geocoder = new window.kakao.maps.services.Geocoder();
    let resolved = 0;
    needsGeocode.forEach((prop, i) => {
      const addr = prop.address || prop.location || '';
      const cached = tryGetCache(addr);
      if (cached) {
        geocoded.push({ lat: cached.lat, lng: cached.lng, prop });
        resolved++;
        if (resolved === needsGeocode.length) finalize();
        return;
      }
      setTimeout(() => {
        geocoder.addressSearch(addr, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const c = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
            trySetCache(addr, c);
            geocoded.push({ lat: c.lat, lng: c.lng, prop });
          }
          resolved++;
          if (resolved === needsGeocode.length) finalize();
        });
      }, i * 250);
    });
  }

  function initSingleMap() {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address || '부산광역시 남구 대연동 368-1', (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK) { setError(true); return; }
      const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
      const isDongLevel = !adminMode && /[가-힣]+(?:동|가|읍|면|리)\s*$/.test((address || '').trim());

      if (isDongLevel) {
        const map = new window.kakao.maps.Map(mapRef.current, { center: coords, level: 5 });
        map.setMinLevel(5);
        map.setMaxLevel(5);
        new ResizeObserver(() => map.relayout()).observe(mapRef.current);
        const dongName = extractDong(address) || address;
        const div = document.createElement('div');
        div.style.cssText = [
          'background:#c8a97e', 'border-radius:8px', 'padding:9px 18px',
          'color:#fff', 'font-size:13px', 'font-weight:800',
          'pointer-events:none', 'box-shadow:0 3px 12px rgba(0,0,0,0.22)',
          'white-space:nowrap', 'letter-spacing:-0.02em',
          'border:2px solid rgba(255,255,255,0.55)',
        ].join(';');
        div.textContent = dongName;
        new window.kakao.maps.CustomOverlay({ position: coords, content: div, map, xAnchor: 0.5, yAnchor: 0.5 });
      } else {
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
