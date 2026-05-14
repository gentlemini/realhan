'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadKakaoSdk } from '@/lib/kakaoSdk';
import { makeMyLocContent } from './myLocOverlay';
import styles from './PinNoteMap.module.css';

const DEFAULT_CENTER = { lat: 35.1796, lng: 129.0756, zoom: 5 };

function PinNoteMap(
  {
    pins,
    initialView,
    myLocation = null,
    onMapRightClick,
    onPinClick,
    onMemoExpand,
    expandedId,
    onViewChange,
  },
  ref
) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef(new Map());
  const myLocOverlayRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const pinsRef = useRef(pins);
  const expandedIdRef = useRef(expandedId);
  const onMapRightClickRef = useRef(onMapRightClick);
  const onPinClickRef = useRef(onPinClick);
  const onMemoExpandRef = useRef(onMemoExpand);
  const onViewChangeRef = useRef(onViewChange);
  pinsRef.current = pins;
  expandedIdRef.current = expandedId;
  onMapRightClickRef.current = onMapRightClick;
  onPinClickRef.current = onPinClick;
  onMemoExpandRef.current = onMemoExpand;
  onViewChangeRef.current = onViewChange;

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
    panTo(lat, lng, zoom) {
      if (!mapRef.current) return;
      const kakao = window.kakao;
      if (typeof zoom === 'number') mapRef.current.setLevel(zoom);
      mapRef.current.setCenter(new kakao.maps.LatLng(lat, lng));
    },
    fitToPins() {
      if (!mapRef.current || !pinsRef.current?.length) return;
      const kakao = window.kakao;
      const b = new kakao.maps.LatLngBounds();
      pinsRef.current.forEach((p) => b.extend(new kakao.maps.LatLng(p.lat, p.lng)));
      mapRef.current.setBounds(b, 60);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let cleanupFns = [];
    loadKakaoSdk()
      .then((kakao) => {
        if (cancelled || !mapDivRef.current) return;
        const c0 = initialView?.centerLat
          ? new kakao.maps.LatLng(initialView.centerLat, initialView.centerLng)
          : new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        const map = new kakao.maps.Map(mapDivRef.current, {
          center: c0,
          level: initialView?.zoom || DEFAULT_CENTER.zoom,
        });
        mapRef.current = map;
        new ResizeObserver(() => map.relayout()).observe(mapDivRef.current);

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
        let touchTimer = null;
        let touchMoved = false;
        let savedTouch = null;
        const onTouchStart = (e) => {
          if (e.touches.length !== 1) return;
          touchMoved = false;
          savedTouch = e.touches[0];
          touchTimer = setTimeout(() => {
            if (touchMoved || !savedTouch || !mapRef.current) return;
            const rect = mapDivRef.current.getBoundingClientRect();
            const proj = mapRef.current.getProjection();
            const point = new kakao.maps.Point(
              savedTouch.clientX - rect.left,
              savedTouch.clientY - rect.top
            );
            const latlng = proj.coordsFromPoint(point);
            if (onMapRightClickRef.current) {
              onMapRightClickRef.current({
                lat: latlng.getLat(),
                lng: latlng.getLng(),
              });
            }
          }, 700);
        };
        const onTouchMove = () => {
          touchMoved = true;
          clearTimeout(touchTimer);
        };
        const onTouchEnd = () => clearTimeout(touchTimer);
        const onCtxMenu = (e) => e.preventDefault();
        const targetEl = mapDivRef.current;
        targetEl.addEventListener('touchstart', onTouchStart, { passive: true });
        targetEl.addEventListener('touchmove', onTouchMove, { passive: true });
        targetEl.addEventListener('touchend', onTouchEnd);
        targetEl.addEventListener('contextmenu', onCtxMenu);
        cleanupFns.push(() => {
          targetEl.removeEventListener('touchstart', onTouchStart);
          targetEl.removeEventListener('touchmove', onTouchMove);
          targetEl.removeEventListener('touchend', onTouchEnd);
          targetEl.removeEventListener('contextmenu', onCtxMenu);
        });

        kakao.maps.event.addListener(map, 'idle', () => {
          if (onViewChangeRef.current) {
            const c = map.getCenter();
            onViewChangeRef.current({
              centerLat: c.getLat(),
              centerLng: c.getLng(),
              zoom: map.getLevel(),
            });
          }
        });

        setReady(true);
      })
      .catch((err) => setError(err.message));
    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
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

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    const existing = overlaysRef.current;
    const incomingIds = new Set(pins.map((p) => p.id));

    for (const [id, item] of existing.entries()) {
      if (!incomingIds.has(id)) {
        item.overlay.setMap(null);
        existing.delete(id);
      }
    }

    pins.forEach((pin) => {
      const expanded = pin.id === expandedIdRef.current;
      const memoText = String(pin.memo || '').trim();
      const item = existing.get(pin.id);
      if (item) {
        updateLabelContent(item.labelEl, memoText, expanded);
        item.overlay.setPosition(new kakao.maps.LatLng(pin.lat, pin.lng));
        return;
      }

      const wrap = document.createElement('div');
      wrap.className = styles.markerWrap;

      const labelEl = document.createElement('div');
      labelEl.className = styles.label;
      labelEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onMemoExpandRef.current) onMemoExpandRef.current(pin.id);
      });
      updateLabelContent(labelEl, memoText, expanded);
      wrap.appendChild(labelEl);

      const dot = document.createElement('div');
      dot.className = styles.dot;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onPinClickRef.current) onPinClickRef.current(pin.id);
      });
      wrap.appendChild(dot);

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(pin.lat, pin.lng),
        content: wrap,
        map,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 6,
      });
      existing.set(pin.id, { overlay, labelEl });
    });
  }, [pins, ready]);

  useEffect(() => {
    if (!ready) return;
    pins.forEach((pin) => {
      const item = overlaysRef.current.get(pin.id);
      if (!item) return;
      updateLabelContent(item.labelEl, String(pin.memo || '').trim(), pin.id === expandedId);
    });
  }, [expandedId, pins, ready]);

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

function updateLabelContent(labelEl, memoText, expanded) {
  const lines = memoText ? memoText.split('\n') : [];
  const overflow = lines.length > 3;
  const display = (expanded || !overflow) ? lines : lines.slice(0, 3);
  labelEl.innerHTML = '';
  if (lines.length === 0) {
    labelEl.classList.add(styles.emptyLabel);
    labelEl.textContent = '(메모 없음)';
    return;
  }
  labelEl.classList.remove(styles.emptyLabel);
  display.forEach((line) => {
    const div = document.createElement('div');
    div.className = styles.labelLine;
    div.textContent = line;
    labelEl.appendChild(div);
  });
  if (overflow) {
    const more = document.createElement('div');
    more.className = styles.labelMore;
    more.textContent = expanded ? '▴ 접기' : `▾ +${lines.length - 3}줄 더보기`;
    labelEl.appendChild(more);
  }
}

export default forwardRef(PinNoteMap);
