'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import SessionBar from './SessionBar';
import { geocodeAddress, coord2Address } from '@/lib/kakaoSdk';
import styles from './PinMapPage.module.css';

const PinNoteMap = dynamic(() => import('./PinNoteMap'), { ssr: false });

// 임장/기타 공용 페이지 컴포넌트 — kind={'임장'|'기타'} 만 다름
export default function PinMapPage({ kind, title }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [pins, setPins] = useState([]);
  const [pendingView, setPendingView] = useState(null);
  const [expandedId, setExpandedId] = useState(null);   // 메모 전체 펼치기 상태
  const [editingId, setEditingId] = useState(null);     // 메모 편집 중인 핀
  const [editDraft, setEditDraft] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [pinModal, setPinModal] = useState(null);       // {lat, lng, memo} 신규 핀
  const [myLocation, setMyLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const currentViewRef = useRef(null);
  const mapRef = useRef(null);
  const fitOnLoadRef = useRef(false);

  const handleLocate = useCallback(() => {
    if (myLocation) {
      setMyLocation(null);
      return;
    }
    if (!navigator.geolocation) {
      alert('이 브라우저에서 현재 위치를 지원하지 않습니다.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        mapRef.current?.panTo?.(loc.lat, loc.lng, 4);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert('현재 위치 조회 실패: ' + (err.message || '권한을 허용해주세요'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [myLocation]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/pin-map/sessions?kind=${encodeURIComponent(kind)}`);
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch (err) {
      console.error(err);
    }
  }, [kind]);

  const loadPins = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/pin-map/pins?sessionId=${sessionId}`);
      const data = await res.json();
      if (Array.isArray(data)) setPins(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 최초 1회: 세션 목록이 로드되면 가장 최근 세션 자동 선택
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (!sessions.length) return;
    autoSelectedRef.current = true;
    handleSelectSession(sessions[0].id);
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectSession = useCallback(async (id) => {
    const sess = sessions.find((s) => s.id === id);
    setActiveSessionId(id);
    setExpandedId(null);
    setEditingId(null);
    if (sess && sess.centerLat != null) {
      setPendingView({
        centerLat: sess.centerLat,
        centerLng: sess.centerLng,
        zoom: sess.zoom || 5,
      });
    }
    fitOnLoadRef.current = true;
    await loadPins(id);
  }, [sessions, loadPins]);

  // 세션 선택 후 핀이 로드되면 그 핀들 위치로 fitBounds
  useEffect(() => {
    if (!fitOnLoadRef.current) return;
    if (pins.length === 0) {
      fitOnLoadRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      mapRef.current?.fitToPins?.();
      fitOnLoadRef.current = false;
    }, 80);
    return () => clearTimeout(t);
  }, [pins]);

  const handleSaveNewSession = useCallback(async (name) => {
    try {
      const view = currentViewRef.current;
      const res = await fetch('/api/pin-map/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          kind,
          centerLat: view?.centerLat ?? null,
          centerLng: view?.centerLng ?? null,
          zoom: view?.zoom ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      await loadSessions();
      setActiveSessionId(data.id);
      setPins([]);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  }, [kind, loadSessions]);

  const handleRenameSession = useCallback(async (id, name) => {
    try {
      await fetch(`/api/pin-map/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      await loadSessions();
    } catch (err) {
      alert('이름 변경 실패');
    }
  }, [loadSessions]);

  const handleDeleteSession = useCallback(async (id) => {
    try {
      await fetch(`/api/pin-map/sessions/${id}`, { method: 'DELETE' });
      if (id === activeSessionId) {
        setActiveSessionId(null);
        setPins([]);
      }
      await loadSessions();
    } catch (err) {
      alert('삭제 실패');
    }
  }, [activeSessionId, loadSessions]);

  // ── 주소 검색 → 마커 추가 ─────────────────────────
  const handleSearch = useCallback(async () => {
    const q = searchQ.trim();
    if (!q) return;
    if (!activeSessionId) {
      alert('먼저 상단에서 지도 이름을 저장하거나 세션을 선택해주세요.');
      return;
    }
    setSearching(true);
    try {
      const geo = await geocodeAddress(q);
      setPinModal({
        lat: geo.lat,
        lng: geo.lng,
        memo: '',
        searchAddress: geo.matched,
        createMethod: '검색',
      });
    } catch (err) {
      alert('주소를 찾을 수 없습니다.');
    } finally {
      setSearching(false);
    }
  }, [searchQ, activeSessionId]);

  // ── 지도 우클릭/롱프레스 → 모달 ─────────────────
  const handleMapRightClick = useCallback(async ({ lat, lng }) => {
    if (!activeSessionId) {
      alert('먼저 상단에서 지도 이름을 저장해주세요.');
      return;
    }
    // 모달 먼저 띄우고(주소 조회 중), 비동기로 주소 채우기
    setPinModal({ lat, lng, memo: '', searchAddress: '', createMethod: '우클릭', loadingAddress: true });
    try {
      const addr = await coord2Address(lat, lng);
      setPinModal((m) => (m && m.lat === lat && m.lng === lng
        ? { ...m, searchAddress: addr, loadingAddress: false }
        : m));
    } catch {
      setPinModal((m) => (m && m.lat === lat && m.lng === lng
        ? { ...m, loadingAddress: false }
        : m));
    }
  }, [activeSessionId]);

  // 모달에서 저장
  const handleSavePinModal = useCallback(async () => {
    if (!pinModal) return;
    const memo = (pinModal.memo || '').trim();
    if (!memo) {
      alert('메모를 입력해주세요.');
      return;
    }
    try {
      const body = {
        sessionId: activeSessionId,
        lat: pinModal.lat,
        lng: pinModal.lng,
        memo,
        searchAddress: pinModal.searchAddress || '',
        createMethod: pinModal.createMethod || '우클릭',
      };
      const res = await fetch('/api/pin-map/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'create failed');
      setPins((prev) => [...prev, { id: data.id, ...body }]);
      setPinModal(null);
      setSearchQ('');
    } catch (err) {
      alert('핀 저장 실패: ' + err.message);
    }
  }, [pinModal, activeSessionId]);

  // 메모 수정
  const startEdit = useCallback((pin) => {
    setEditingId(pin.id);
    setEditDraft(pin.memo || '');
    setExpandedId(pin.id);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const memo = editDraft.trim();
    try {
      await fetch(`/api/pin-map/pins/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });
      setPins((prev) => prev.map((p) => (p.id === editingId ? { ...p, memo } : p)));
      setEditingId(null);
    } catch (err) {
      alert('수정 실패');
    }
  }, [editingId, editDraft]);

  const deletePin = useCallback(async (id) => {
    if (!confirm('이 핀을 삭제할까요?')) return;
    try {
      await fetch(`/api/pin-map/pins/${id}`, { method: 'DELETE' });
      setPins((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) setEditingId(null);
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      alert('삭제 실패');
    }
  }, [editingId, expandedId]);

  const editingPin = useMemo(() => pins.find((p) => p.id === editingId), [pins, editingId]);

  return (
    <div className={styles.wrap}>
      <div className={styles.mapCol}>
        <PinNoteMap
          ref={mapRef}
          pins={pins}
          initialView={pendingView}
          myLocation={myLocation}
          expandedId={expandedId}
          onMapRightClick={handleMapRightClick}
          onPinClick={(id) => setExpandedId((prev) => (prev === id ? null : id))}
          onMemoExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
          onViewChange={(v) => { currentViewRef.current = v; }}
        />

        <button
          type="button"
          className={`${styles.locateBtn} ${myLocation ? styles.locateBtnActive : ''}`}
          onClick={handleLocate}
          disabled={locating}
          title={myLocation ? '현재 위치 끄기' : '현재 위치 보기'}
          aria-label="현재 위치"
        >
          {locating ? '⟳' : '📍'}
        </button>
      </div>

      <div className={styles.sideCol}>
        <SessionBar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={handleSelectSession}
          onSaveNew={handleSaveNewSession}
          onRename={handleRenameSession}
          onDelete={handleDeleteSession}
        />

        <div className={styles.searchBox}>
          <div className={styles.searchTitle}>{title} 사용법</div>
          <ul className={styles.tipList}>
            <li>주소 검색 → 마커 추가</li>
            <li>PC: 지도 우클릭 → 메모 추가</li>
            <li>모바일: 화면 길게 터치(0.7초)</li>
            <li>마커 클릭 시 메모 전체 펼치기</li>
          </ul>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              placeholder="주소 또는 장소명"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <button
              className={styles.searchBtn}
              onClick={handleSearch}
              disabled={searching || !activeSessionId}
            >
              {searching ? '...' : '검색'}
            </button>
          </div>
        </div>

        <div className={styles.listHeader}>
          <span className={styles.listHeaderTitle}>등록 핀</span>
          <span className={styles.listHeaderCount}>{pins.length}건</span>
        </div>

        <div className={styles.listScroll}>
          {!activeSessionId ? (
            <div className={styles.disabledNotice}>
              상단에서 지도 이름을 저장하거나 기존 지도를 선택해주세요.
            </div>
          ) : pins.length === 0 ? (
            <div className={styles.empty}>아직 등록된 핀이 없습니다.</div>
          ) : (
            pins.map((pin) => (
              <div key={pin.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.itemTitleText}>
                    {pin.searchAddress || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}
                  </span>
                  <span className={styles.itemTagBadge}>{pin.createMethod || ''}</span>
                </div>
                {editingId === pin.id ? (
                  <>
                    <textarea
                      className={styles.memoEdit}
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                    />
                    <div className={styles.itemActions}>
                      <button className={styles.btnPrimarySm} onClick={saveEdit}>저장</button>
                      <button onClick={() => setEditingId(null)}>취소</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.memoPreview}>
                      {pin.memo || '(메모 없음)'}
                    </div>
                    <div className={styles.itemActions}>
                      <button onClick={() => startEdit(pin)}>✎ 메모 수정</button>
                      <button className={styles.btnDel} onClick={() => deletePin(pin.id)}>🗑 삭제</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {pinModal && (
        <PinCreateModal
          modal={pinModal}
          onChange={(memo) => setPinModal((m) => ({ ...m, memo }))}
          onCancel={() => setPinModal(null)}
          onSave={handleSavePinModal}
        />
      )}
    </div>
  );
}

function PinCreateModal({ modal, onChange, onCancel, onSave }) {
  return (
    <>
      <div className={styles.modalBg} onClick={onCancel} />
      <div className={styles.modalBox}>
        <div className={styles.modalTitle}>
          새 핀 메모
          <span className={styles.modalMethod}>· {modal.createMethod}</span>
        </div>
        {modal.loadingAddress ? (
          <div className={styles.modalAddr}>📍 주소 조회 중...</div>
        ) : modal.searchAddress ? (
          <div className={styles.modalAddr}>📍 {modal.searchAddress}</div>
        ) : (
          <div className={styles.modalAddr} style={{ color: '#999' }}>
            📍 {modal.lat.toFixed(5)}, {modal.lng.toFixed(5)} (주소 없음)
          </div>
        )}
        <textarea
          className={styles.modalTextarea}
          autoFocus
          placeholder="이 위치에 대한 메모 (Enter로 줄바꿈)"
          value={modal.memo}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className={styles.modalBtns}>
          <button className={styles.modalCancelBtn} onClick={onCancel}>취소</button>
          <button className={styles.modalSaveBtn} onClick={onSave}>저장</button>
        </div>
      </div>
    </>
  );
}
