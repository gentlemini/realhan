'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadKakaoSdk } from '@/lib/kakaoSdk';
import { makeMyLocContent } from './myLocOverlay';
import styles from './AdVacancyMap.module.css';

const DEFAULT_CENTER = { lat: 35.1796, lng: 129.0756, zoom: 5 };

// 같은 위치(약 1m 이내)에 있는 핀들을 하나의 클러스터로 묶기 위한 좌표 키
const locKey = (p) => `${p.lat.toFixed(5)}_${p.lng.toFixed(5)}`;

function buildClusters(pins) {
  const map = new Map();
  pins.forEach((p) => {
    const k = locKey(p);
    let c = map.get(k);
    if (!c) {
      c = { key: k, lat: p.lat, lng: p.lng, pins: [] };
      map.set(k, c);
    }
    c.pins.push(p);
  });
  return Array.from(map.values());
}

function AdVacancyMap(
  {
    pins,
    memos = [],          // [{id, lat, lng, memo, ...}]
    activeIds = [],
    expandedMemoId = null,
    initialView,
    myLocation = null,
    onClusterClick,
    onBoundsChange,
    onViewChange,
    onMapRightClick,     // ({lat, lng}) => void
    onMemoClick,         // (id) => void
    onMemoExpand,        // (id) => void
  },
  ref
) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef(new Map());
  const memoOverlaysRef = useRef(new Map());
  const myLocOverlayRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const pinsRef = useRef(pins);
  const activeIdsRef = useRef(activeIds);
  const expandedMemoIdRef = useRef(expandedMemoId);
  const onClusterClickRef = useRef(onClusterClick);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onViewChangeRef = useRef(onViewChange);
  const onMapRightClickRef = useRef(onMapRightClick);
  const onMemoClickRef = useRef(onMemoClick);
  const onMemoExpandRef = useRef(onMemoExpand);
  pinsRef.current = pins;
  activeIdsRef.current = activeIds;
  expandedMemoIdRef.current = expandedMemoId;
  onClusterClickRef.current = onClusterClick;
  onBoundsChangeRef.current = onBoundsChange;
  onViewChangeRef.current = onViewChange;
  onMapRightClickRef.current = onMapRightClick;
  onMemoClickRef.current = onMemoClick;
  onMemoExpandRef.current = onMemoExpand;

  useImperativeHandle(ref, () => ({
    getView() {
      if (!mapRef.current) return null;
      const c = mapRef.current.getCenter();
      return {
        centerLat: c.getLat(),
        centerLng: c.getLng(),
        zoom: mapRef.current.getLevel(),
      };
    },
    fitToPins() {
      if (!mapRef.current || !pinsRef.current?.length) return;
      const kakao = window.kakao;
      const b = new kakao.maps.LatLngBounds();
      pinsRef.current.forEach((p) => b.extend(new kakao.maps.LatLng(p.lat, p.lng)));
      mapRef.current.setBounds(b, 60);
    },
    panTo(lat, lng, zoom) {
      if (!mapRef.current) return;
      const kakao = window.kakao;
      if (typeof zoom === 'number') mapRef.current.setLevel(zoom);
      mapRef.current.setCenter(new kakao.maps.LatLng(lat, lng));
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk()
      .then((kakao) => {
        if (cancelled || !mapDivRef.current) return;
        const center = initialView?.centerLat
          ? new kakao.maps.LatLng(initialView.centerLat, initialView.centerLng)
          : new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        const map = new kakao.maps.Map(mapDivRef.current, {
          center,
          level: initialView?.zoom || DEFAULT_CENTER.zoom,
        });
        mapRef.current = map;
        new ResizeObserver(() => map.relayout()).observe(mapDivRef.current);

        kakao.maps.event.addListener(map, 'idle', () => {
          fireBoundsChange();
          if (onViewChangeRef.current) {
            const c = map.getCenter();
            onViewChangeRef.current({
              centerLat: c.getLat(),
              centerLng: c.getLng(),
              zoom: map.getLevel(),
            });
          }
        });

        // PC 우클릭
        kakao.maps.event.addListener(map, 'rightclick', (e) => {
          if (onMapRightClickRef.current) {
            onMapRightClickRef.current({
              lat: e.latLng.getLat(),
              lng: e.latLng.getLng(),
            });
          }
        });

        // 모바일 롱프레스 (700ms)
        const targetEl = mapDivRef.current;
        let touchTimer = null;
        let touchMoved = false;
        let savedTouch = null;
        const onTouchStart = (e) => {
          if (e.touches.length !== 1) return;
          touchMoved = false;
          savedTouch = e.touches[0];
          touchTimer = setTimeout(() => {
            if (touchMoved || !savedTouch || !mapRef.current) return;
            const rect = targetEl.getBoundingClientRect();
            const proj = mapRef.current.getProjection();
            const point = new kakao.maps.Point(
              savedTouch.clientX - rect.left,
              savedTouch.clientY - rect.top
            );
            const latlng = proj.coordsFromPoint(point);
            if (onMapRightClickRef.current) {
              onMapRightClickRef.current({ lat: latlng.getLat(), lng: latlng.getLng() });
            }
          }, 700);
        };
        const onTouchMove = () => { touchMoved = true; clearTimeout(touchTimer); };
        const onTouchEnd = () => clearTimeout(touchTimer);
        const onCtxMenu = (e) => e.preventDefault();
        targetEl.addEventListener('touchstart', onTouchStart, { passive: true });
        targetEl.addEventListener('touchmove', onTouchMove, { passive: true });
        targetEl.addEventListener('touchend', onTouchEnd);
        targetEl.addEventListener('contextmenu', onCtxMenu);

        setReady(true);
      })
      .catch((err) => setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !initialView?.centerLat) return;
    const kakao = window.kakao;
    mapRef.current.setLevel(initialView.zoom || DEFAULT_CENTER.zoom);
    mapRef.current.setCenter(new kakao.maps.LatLng(initialView.centerLat, initialView.centerLng));
  }, [initialView, ready]);

  // 현재 위치 마커
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = window.kakao;
    if (!myLocation) {
      if (myLocOverlayRef.current) {
        myLocOverlayRef.current.setMap(null);
        myLocOverlayRef.current = null;
      }
      return;
    }
    const pos = new kakao.maps.LatLng(myLocation.lat, myLocation.lng);
    if (myLocOverlayRef.current) {
      myLocOverlayRef.current.setPosition(pos);
    } else {
      myLocOverlayRef.current = new kakao.maps.CustomOverlay({
        position: pos,
        content: makeMyLocContent(),
        map: mapRef.current,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 15,
      });
    }
  }, [myLocation, ready]);

  // pins / activeIds 변경 → 클러스터 단위로 오버레이 동기화
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    const existing = overlaysRef.current;

    const clusters = buildClusters(pins);
    const incomingKeys = new Set(clusters.map((c) => c.key));
    const activeSet = new Set(activeIds);

    // 제거된 클러스터의 오버레이 정리
    for (const [k, item] of existing.entries()) {
      if (!incomingKeys.has(k)) {
        item.overlay.setMap(null);
        existing.delete(k);
      }
    }

    clusters.forEach((cluster) => {
      const count = cluster.pins.length;
      const isActive = cluster.pins.some((p) => activeSet.has(p.id));
      const item = existing.get(cluster.key);

      if (item) {
        item.pinEl.textContent = String(count);
        item.pinEl.classList.toggle(styles.active, isActive);
        item.overlay.setPosition(new kakao.maps.LatLng(cluster.lat, cluster.lng));
        // 클릭 시 최신 ids 를 가져오도록 ids 만 갱신
        item.idsRef.current = cluster.pins.map((p) => p.id);
        return;
      }

      const el = document.createElement('div');
      el.className = styles.marker;
      const pinEl = document.createElement('div');
      pinEl.className = `${styles.pin} ${isActive ? styles.active : ''}`;
      pinEl.textContent = String(count);
      el.appendChild(pinEl);
      const tail = document.createElement('div');
      tail.className = styles.tail;
      el.appendChild(tail);

      // 클릭 시점에 최신 ids 를 emit 하기 위해 ref 사용
      const idsRef = { current: cluster.pins.map((p) => p.id) };
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onClusterClickRef.current) onClusterClickRef.current(idsRef.current);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(cluster.lat, cluster.lng),
        content: el,
        map,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 5,
      });
      existing.set(cluster.key, { overlay, pinEl, idsRef });
    });

    fireBoundsChange();
  }, [pins, activeIds, ready]);

  // 메모 오버레이 동기화
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    const existing = memoOverlaysRef.current;
    const incomingIds = new Set(memos.map((m) => m.id));

    for (const [id, item] of existing.entries()) {
      if (!incomingIds.has(id)) {
        item.overlay.setMap(null);
        existing.delete(id);
      }
    }

    memos.forEach((memo) => {
      const expanded = memo.id === expandedMemoIdRef.current;
      const memoText = String(memo.memo || '').trim();
      const item = existing.get(memo.id);
      if (item) {
        updateMemoLabel(item.labelEl, memoText, expanded);
        item.overlay.setPosition(new kakao.maps.LatLng(memo.lat, memo.lng));
        return;
      }

      const wrap = document.createElement('div');
      wrap.className = styles.memoMarkerWrap;

      const labelEl = document.createElement('div');
      labelEl.className = styles.memoLabel;
      labelEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onMemoExpandRef.current) onMemoExpandRef.current(memo.id);
      });
      updateMemoLabel(labelEl, memoText, expanded);
      wrap.appendChild(labelEl);

      const dot = document.createElement('div');
      dot.className = styles.memoDot;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onMemoClickRef.current) onMemoClickRef.current(memo.id);
      });
      wrap.appendChild(dot);

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(memo.lat, memo.lng),
        content: wrap,
        map,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 8,
      });
      existing.set(memo.id, { overlay, labelEl });
    });
  }, [memos, ready]);

  // 확장 상태만 변경 시 라벨 텍스트 갱신
  useEffect(() => {
    if (!ready) return;
    memos.forEach((memo) => {
      const item = memoOverlaysRef.current.get(memo.id);
      if (!item) return;
      updateMemoLabel(item.labelEl, String(memo.memo || '').trim(), memo.id === expandedMemoId);
    });
  }, [expandedMemoId, memos, ready]);

  function fireBoundsChange() {
    if (!onBoundsChangeRef.current || !mapRef.current) return;
    const kakao = window.kakao;
    const bounds = mapRef.current.getBounds();
    const visible = (pinsRef.current || []).filter((p) =>
      bounds.contain(new kakao.maps.LatLng(p.lat, p.lng))
    );
    onBoundsChangeRef.current(visible.map((p) => p.id));
  }

  if (error) {
    return (
      <div className={styles.errorBox}>
        <p>🗺️ 지도를 불러올 수 없습니다</p>
        <p style={{ fontSize: 12, marginTop: 6 }}>{error}</p>
      </div>
    );
  }

  return <div ref={mapDivRef} className={styles.mapDiv} />;
}

function updateMemoLabel(labelEl, memoText, expanded) {
  const lines = memoText ? memoText.split('\n') : [];
  const overflow = lines.length > 3;
  const display = (expanded || !overflow) ? lines : lines.slice(0, 3);
  labelEl.innerHTML = '';
  if (lines.length === 0) {
    labelEl.classList.add(styles.memoLabelEmpty);
    labelEl.textContent = '(메모 없음)';
    return;
  }
  labelEl.classList.remove(styles.memoLabelEmpty);
  display.forEach((line) => {
    const div = document.createElement('div');
    div.textContent = line;
    labelEl.appendChild(div);
  });
  if (overflow) {
    const more = document.createElement('div');
    more.className = styles.memoLabelMore;
    more.textContent = expanded ? '▴ 접기' : `▾ +${lines.length - 3}줄 더보기`;
    labelEl.appendChild(more);
  }
}

export default forwardRef(AdVacancyMap);
