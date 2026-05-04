'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AdminMapField.module.css';

const RADIUS_OPTIONS = [0, 50, 100, 200, 300, 500];

function loadKakaoSdk(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window.kakao?.maps?.LatLng === 'function') { resolve(); return; }
    if (window.kakao?.maps && typeof window.kakao.maps.load === 'function') {
      window.kakao.maps.load(resolve); return;
    }
    const existingAny = document.querySelector('script[src*="dapi.kakao.com/v2/maps"]');
    if (existingAny) {
      existingAny.addEventListener('load', () => window.kakao.maps.load(resolve));
      return;
    }
    const existing = document.getElementById('kakao-sdk');
    if (existing) {
      if (window.kakao?.maps) { window.kakao.maps.load(resolve); }
      else { existing.addEventListener('load', () => window.kakao.maps.load(resolve)); }
      return;
    }
    const script = document.createElement('script');
    script.id = 'kakao-sdk';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.onload = () => window.kakao.maps.load(resolve);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function AdminMapField({ addressValue, onConfigChange, initialCoords }) {
  const mapRef    = useRef(null);
  const mapObj         = useRef(null);
  const markerRef      = useRef(null);
  const circleRef      = useRef(null);
  const rightClickFnRef = useRef(null);

  const [searchAddr, setSearchAddr] = useState('');
  const [coords, setCoords]         = useState(null);
  const [radius, setRadius]         = useState(0);
  const [mapHidden, setMapHidden]   = useState(false);
  const [status, setStatus]         = useState('');
  const [ready, setReady]           = useState(false);
  const [results, setResults]       = useState([]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!key) { setStatus('카카오 API 키 없음'); return; }
    loadKakaoSdk(key).then(() => setReady(true)).catch(() => setStatus('SDK 로드 실패'));
  }, []);

  useEffect(() => {
    rightClickFnRef.current = (mouseEvent) => {
      const latlng = mouseEvent.latLng;
      placePin(latlng.getLat(), latlng.getLng());
    };
  });

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(35.1379, 129.0513);
    mapObj.current = new kakao.maps.Map(mapRef.current, { center, level: 5 });
    mapObj.current.setZoomable(false);
    markerRef.current = new kakao.maps.Marker({ position: center, draggable: true });
    markerRef.current.setMap(null);
    kakao.maps.event.addListener(markerRef.current, 'dragend', () => {
      const pos = markerRef.current.getPosition();
      const newCoords = { lat: pos.getLat(), lng: pos.getLng() };
      setCoords(newCoords);
      updateCircle(newCoords, radius);
    });
    kakao.maps.event.addListener(mapObj.current, 'rightclick', (e) => {
      rightClickFnRef.current?.(e);
    });
  }, [ready]);

  function updateCircle(c, r) {
    const kakao = window.kakao;
    if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }
    if (r > 0 && c) {
      circleRef.current = new kakao.maps.Circle({
        center: new kakao.maps.LatLng(c.lat, c.lng), radius: r,
        strokeWeight: 2, strokeColor: '#a87b51', strokeOpacity: 0.8,
        fillColor: '#c19a6b', fillOpacity: 0.15,
      });
      circleRef.current.setMap(mapObj.current);
    }
  }

  function handleRadiusChange(r) {
    setRadius(r);
    if (coords) updateCircle(coords, r);
    if (markerRef.current) markerRef.current.setMap(r > 0 ? null : (coords ? mapObj.current : null));
    if (coords) onConfigChange?.({ lat: coords.lat, lng: coords.lng, radius: r, mapHidden });
  }

  function placePin(lat, lng) {
    const pos = new window.kakao.maps.LatLng(lat, lng);
    const newCoords = { lat, lng };
    setCoords(newCoords);
    mapObj.current.setCenter(pos);
    mapObj.current.setLevel(5);
    markerRef.current.setPosition(pos);
    if (radius === 0) markerRef.current.setMap(mapObj.current);
    updateCircle(newCoords, radius);
    onConfigChange?.({ lat, lng, radius, mapHidden });
  }

  function handleKeywordSearch(keyword) {
    if (!keyword?.trim() || !ready) return;
    setStatus('검색 중…'); setResults([]);
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(keyword, (data, status_) => {
      if (status_ === window.kakao.maps.services.Status.OK && data.length > 0) {
        if (data.length === 1) { placePin(parseFloat(data[0].y), parseFloat(data[0].x)); setStatus('✓ 위치 검색 완료'); }
        else { setResults(data); setStatus(''); }
      } else {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(keyword, (addrData, addrStatus) => {
          if (addrStatus === window.kakao.maps.services.Status.OK && addrData.length > 0) {
            if (addrData.length === 1) { placePin(parseFloat(addrData[0].y), parseFloat(addrData[0].x)); setStatus('✓ 위치 검색 완료'); }
            else { setResults(addrData.map(a => ({ place_name: a.address_name, road_address_name: a.road_address?.address_name || '', address_name: a.address?.address_name || a.address_name, x: a.x, y: a.y }))); setStatus(''); }
          } else { setStatus('검색 결과가 없어요'); }
        });
      }
    });
  }

  function handleSelectResult(item) {
    placePin(parseFloat(item.y), parseFloat(item.x));
    setResults([]); setStatus('✓ 위치 검색 완료');
  }

  const initialApplied = useRef(false);
  useEffect(() => {
    if (!ready || !initialCoords?.lat || initialApplied.current) return;
    initialApplied.current = true;
    setRadius(initialCoords.radius || 0);
    setMapHidden(initialCoords.mapHidden || false);
    placePin(initialCoords.lat, initialCoords.lng);
  }, [ready, initialCoords]);

  useEffect(() => {
    if (!addressValue || !ready) return;
    const timer = setTimeout(() => {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(addressValue, (result, status_) => {
        if (status_ === window.kakao.maps.services.Status.OK) placePin(parseFloat(result[0].y), parseFloat(result[0].x));
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [addressValue, ready]);

  return (
    <div className={styles.wrap}>
      {/* 검색 바 — 항상 표시 */}
      <div className={styles.searchBar}>
        <input className={styles.searchInput} value={searchAddr}
          onChange={e => { setSearchAddr(e.target.value); setResults([]); }}
          onKeyDown={e => e.key === 'Enter' && handleKeywordSearch(searchAddr)}
          placeholder="건물명, 주소, 지역명 검색" />
        <button className={styles.searchBtn} onClick={() => handleKeywordSearch(searchAddr)}>검색</button>
        {status && <span className={styles.status}>{status}</span>}
      </div>
      {results.length > 0 && (
        <div className={styles.resultList}>
          {results.map((item, i) => (
            <button key={i} className={styles.resultItem} onClick={() => handleSelectResult(item)}>
              <span className={styles.resultName}>{item.place_name}</span>
              <span className={styles.resultAddr}>{item.road_address_name || item.address_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 지도 — 항상 표시 */}
      <div ref={mapRef} className={styles.map} />

      {/* 설정 바 — 항상 표시 */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>공개 반경</span>
          <div className={styles.radioBtns}>
            {RADIUS_OPTIONS.map(r => (
              <button key={r} className={`${styles.radioBtn} ${radius === r ? styles.radioBtnActive : ''}`} onClick={() => handleRadiusChange(r)}>
                {r === 0 ? '정확' : `${r}m`}
              </button>
            ))}
          </div>
          <span className={styles.controlHint}>{radius === 0 ? '정확한 핀 표시' : `핀 숨김 · ${radius}m 반경 원만 표시`}</span>
        </div>
        {coords && (
          <div className={styles.coordInfo}>
            📍 {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            <span className={styles.coordHint}>핀 드래그 또는 지도 우클릭으로 위치 조정 가능</span>
          </div>
        )}
        <label className={styles.hiddenToggle}>
          <input type="checkbox" checked={mapHidden} onChange={e => {
            const v = e.target.checked; setMapHidden(v);
            onConfigChange?.({ lat: coords?.lat ?? null, lng: coords?.lng ?? null, radius, mapHidden: v });
          }} />
          <span>매물찾기 지도에서 미표시</span>
        </label>
        {mapHidden && (
          <div className={styles.hiddenNotice}>
            ℹ️ 좌표는 저장됩니다. 매물찾기 지도에 마커가 표시되지 않으며, 리스트에는 정상 노출됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
