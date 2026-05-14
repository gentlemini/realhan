'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { parseListing, splitListings, badgeKind } from './parse.js';
import { geocodeAddress, coord2Address } from '@/lib/kakaoSdk';
import SessionBar from '../_components/maps/SessionBar';
import styles from './page.module.css';

const AdVacancyMap = dynamic(() => import('../_components/maps/AdVacancyMap'), { ssr: false });

export default function AdVacancyPage() {
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [pins, setPins] = useState([]);          // 현재 세션 핀
  const [activeIds, setActiveIds] = useState([]); // 클러스터 클릭 시 여러 핀 활성화
  const [visibleIds, setVisibleIds] = useState(null);   // 뷰포트 내 핀 id (null=전체)
  const [filterByViewport, setFilterByViewport] = useState(true);
  const [clusterFilterIds, setClusterFilterIds] = useState(null); // 카운터 클릭 시 그 위치의 핀들만 표시
  const [pasteText, setPasteText] = useState('');
  const [progress, setProgress] = useState('');
  const [adding, setAdding] = useState(false);
  const [pendingView, setPendingView] = useState(null);   // 세션 선택 시 적용할 view
  const [myLocation, setMyLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [memos, setMemos] = useState([]);
  const [expandedMemoId, setExpandedMemoId] = useState(null);
  const [memoEditingId, setMemoEditingId] = useState(null);
  const [memoEditDraft, setMemoEditDraft] = useState('');
  const [memoModal, setMemoModal] = useState(null); // {lat, lng, memo, searchAddress, loadingAddress}
  const mapRef = useRef(null);
  const currentViewRef = useRef(null);

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

  // ── 세션 목록 로드 ───────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/ad-vacancy/sessions');
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch (err) {
      console.error('세션 목록 실패', err);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 최초 1회: 세션 목록이 로드되면 가장 최근(맨 위) 세션 자동 선택
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (!sessions.length) return;
    autoSelectedRef.current = true;
    handleSelectSession(sessions[0].id);
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  // 세션 핀 로드
  const loadPins = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/ad-vacancy/pins?sessionId=${sessionId}`);
      const data = await res.json();
      if (Array.isArray(data)) setPins(data);
    } catch (err) {
      console.error('핀 로드 실패', err);
    }
  }, []);

  const loadMemos = useCallback(async (sessionId) => {
    if (!sessionId) {
      setMemos([]);
      return;
    }
    try {
      const res = await fetch(`/api/ad-vacancy/memos?sessionId=${sessionId}`);
      const data = await res.json();
      if (Array.isArray(data)) setMemos(data);
    } catch (err) {
      console.error('메모 로드 실패', err);
    }
  }, []);

  const fitOnLoadRef = useRef(false);
  const handleSelectSession = useCallback(async (id) => {
    const sess = sessions.find((s) => s.id === id);
    setActiveSessionId(id);
    setActiveIds([]);
    setClusterFilterIds(null);
    setExpandedMemoId(null);
    setMemoEditingId(null);
    // 저장된 view 는 핀이 비어 있을 때의 폴백으로만 사용
    if (sess && sess.centerLat != null && sess.centerLng != null) {
      setPendingView({
        centerLat: sess.centerLat,
        centerLng: sess.centerLng,
        zoom: sess.zoom || 5,
      });
    }
    fitOnLoadRef.current = true;
    await Promise.all([loadPins(id), loadMemos(id)]);
  }, [sessions, loadPins, loadMemos]);

  // 세션 선택 후 핀이 로드되면 그 핀들 위치로 fitBounds
  useEffect(() => {
    if (!fitOnLoadRef.current) return;
    if (pins.length === 0) {
      fitOnLoadRef.current = false; // 핀 없으면 저장된 view 유지
      return;
    }
    const t = setTimeout(() => {
      mapRef.current?.fitToPins?.();
      fitOnLoadRef.current = false;
    }, 80);
    return () => clearTimeout(t);
  }, [pins]);

  const handleSaveNewSession = useCallback(async (name) => {
    setSessionsLoading(true);
    try {
      const view = currentViewRef.current || (mapRef.current?.getView?.() ?? null);
      const res = await fetch('/api/ad-vacancy/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          centerLat: view?.centerLat ?? null,
          centerLng: view?.centerLng ?? null,
          zoom: view?.zoom ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      await loadSessions();
      setActiveSessionId(data.id);
      // 기존 미저장 작업이 있을 경우 (= 세션 미선택 상태에서의 핀)는 폐기
      setPins([]);
      setMemos([]);
      setActiveIds([]);
      setClusterFilterIds(null);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSessionsLoading(false);
    }
  }, [loadSessions]);

  const handleRenameSession = useCallback(async (id, name) => {
    try {
      await fetch(`/api/ad-vacancy/sessions/${id}`, {
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
      await fetch(`/api/ad-vacancy/sessions/${id}`, { method: 'DELETE' });
      if (id === activeSessionId) {
        setActiveSessionId(null);
        setPins([]);
        setMemos([]);
        setActiveIds([]);
        setClusterFilterIds(null);
      }
      await loadSessions();
    } catch (err) {
      alert('삭제 실패');
    }
  }, [activeSessionId, loadSessions]);

  // ── 붙여넣기 → 파싱 → 지오코딩 → DB저장 → 핀 추가 ─────────
  const handleAdd = useCallback(async () => {
    const text = pasteText.trim();
    if (!text) {
      alert('매물 정보를 입력하세요.');
      return;
    }
    if (!activeSessionId) {
      alert('먼저 상단에서 지도 이름을 저장하거나 세션을 선택해주세요.');
      return;
    }
    const blocks = splitListings(text);
    setAdding(true);
    const failed = [];
    let ok = 0;
    let nextNumber = (pins[pins.length - 1]?.number || pins.length) + 1;

    for (let i = 0; i < blocks.length; i++) {
      setProgress(`처리 중... ${i + 1} / ${blocks.length}`);
      const parsed = parseListing(blocks[i]);
      if (!parsed.address) {
        failed.push({ idx: i + 1, reason: '주소 미인식', label: parsed.building || '(건물명 없음)' });
        continue;
      }
      try {
        const geo = await geocodeAddress(parsed.address);
        const body = {
          sessionId: activeSessionId,
          building: parsed.building || '(건물명 없음)',
          number: nextNumber,
          lat: geo.lat,
          lng: geo.lng,
          address: geo.matched || parsed.address,
          priceText: parsed.price,
          statusTags: parsed.status || [],
          phone: parsed.phone || '',
          rawText: parsed.raw,
          userMemo: '',
        };
        const res = await fetch('/api/ad-vacancy/pins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.error || '생성 실패');
        setPins((prev) => [...prev, { id: created.id, ...body }]);
        nextNumber++;
        ok++;
      } catch (err) {
        failed.push({ idx: i + 1, reason: err.message || '지오코딩 실패', label: parsed.building || parsed.address });
      }
      if (blocks.length > 1) await new Promise((r) => setTimeout(r, 150));
    }

    setProgress('');
    setAdding(false);
    if (ok > 0) setPasteText('');
    if (failed.length) {
      const msg = failed.map((f) => `  • ${f.idx}번 (${f.label}): ${f.reason}`).join('\n');
      alert(`등록: ${ok}건 / 실패: ${failed.length}건\n\n${msg}`);
    }
  }, [pasteText, activeSessionId, pins]);

  const handleDeletePin = useCallback(async (id) => {
    if (!confirm('이 매물을 삭제할까요?')) return;
    try {
      await fetch(`/api/ad-vacancy/pins/${id}`, { method: 'DELETE' });
      setPins((prev) => prev.filter((p) => p.id !== id));
      setActiveIds((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      alert('삭제 실패');
    }
  }, []);

  const handleMemoChange = useCallback((id, memo) => {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, userMemo: memo } : p)));
  }, []);

  // ── 메모 핀: 우클릭/롱프레스 → 모달 ──────────────────
  const handleMapRightClick = useCallback(async ({ lat, lng }) => {
    if (!activeSessionId) {
      alert('먼저 상단에서 지도 이름을 저장해주세요.');
      return;
    }
    setMemoModal({ lat, lng, memo: '', searchAddress: '', loadingAddress: true });
    try {
      const addr = await coord2Address(lat, lng);
      setMemoModal((m) => (m && m.lat === lat && m.lng === lng
        ? { ...m, searchAddress: addr, loadingAddress: false }
        : m));
    } catch {
      setMemoModal((m) => (m && m.lat === lat && m.lng === lng
        ? { ...m, loadingAddress: false }
        : m));
    }
  }, [activeSessionId]);

  const handleSaveMemoModal = useCallback(async () => {
    if (!memoModal) return;
    const memo = (memoModal.memo || '').trim();
    if (!memo) {
      alert('메모를 입력해주세요.');
      return;
    }
    try {
      const body = {
        sessionId: activeSessionId,
        lat: memoModal.lat,
        lng: memoModal.lng,
        memo,
        searchAddress: memoModal.searchAddress || '',
        createMethod: '우클릭',
      };
      const res = await fetch('/api/ad-vacancy/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'create failed');
      setMemos((prev) => [...prev, { id: data.id, ...body }]);
      setMemoModal(null);
    } catch (err) {
      alert('메모 저장 실패: ' + err.message);
    }
  }, [memoModal, activeSessionId]);

  const startMemoEdit = useCallback((m) => {
    setMemoEditingId(m.id);
    setMemoEditDraft(m.memo || '');
    setExpandedMemoId(m.id);
  }, []);

  const saveMemoEdit = useCallback(async () => {
    if (!memoEditingId) return;
    const memo = memoEditDraft.trim();
    try {
      await fetch(`/api/ad-vacancy/memos/${memoEditingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });
      setMemos((prev) => prev.map((m) => (m.id === memoEditingId ? { ...m, memo } : m)));
      setMemoEditingId(null);
    } catch (err) {
      alert('수정 실패');
    }
  }, [memoEditingId, memoEditDraft]);

  const deleteMemoPin = useCallback(async (id) => {
    if (!confirm('이 메모를 삭제할까요?')) return;
    try {
      await fetch(`/api/ad-vacancy/memos/${id}`, { method: 'DELETE' });
      setMemos((prev) => prev.filter((m) => m.id !== id));
      if (memoEditingId === id) setMemoEditingId(null);
      if (expandedMemoId === id) setExpandedMemoId(null);
    } catch (err) {
      alert('삭제 실패');
    }
  }, [memoEditingId, expandedMemoId]);

  // 메모 디바운스 저장
  const memoTimers = useRef(new Map());
  const handleMemoBlurOrDebounced = useCallback((id, memo) => {
    const timers = memoTimers.current;
    if (timers.has(id)) clearTimeout(timers.get(id));
    const t = setTimeout(() => {
      fetch(`/api/ad-vacancy/pins/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMemo: memo }),
      }).catch(() => {});
    }, 600);
    timers.set(id, t);
  }, []);

  // ── 우측 리스트 렌더용 필터링 ──────────────────────
  // 우선순위: 클러스터 클릭 필터 > 뷰포트 필터 > 전체
  const displayedPins = useMemo(() => {
    if (clusterFilterIds) {
      const set = new Set(clusterFilterIds);
      return pins.filter((p) => set.has(p.id));
    }
    if (!filterByViewport || visibleIds == null) return pins;
    const set = new Set(visibleIds);
    return pins.filter((p) => set.has(p.id));
  }, [pins, visibleIds, filterByViewport, clusterFilterIds]);

  // 활성 핀이 바뀌면 우측 리스트의 해당 카드로 스크롤
  const listScrollRef = useRef(null);
  useEffect(() => {
    if (!activeIds.length) return;
    const root = listScrollRef.current;
    if (!root) return;
    const firstId = activeIds[0];
    const el = root.querySelector(`[data-pin-id="${firstId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIds]);

  return (
    <div className={styles.wrap}>
      <div className={styles.mapCol}>
        <AdVacancyMap
          ref={mapRef}
          pins={pins}
          memos={memos}
          activeIds={activeIds}
          expandedMemoId={expandedMemoId}
          initialView={pendingView}
          myLocation={myLocation}
          onClusterClick={(ids) => {
            setActiveIds(ids);
            setClusterFilterIds(ids);
          }}
          onBoundsChange={(ids) => setVisibleIds(ids)}
          onViewChange={(v) => {
            currentViewRef.current = v;
            // 지도가 움직이면 클러스터 필터 해제 (= 화면 내 매물 전체 표시로 복귀)
            setClusterFilterIds(null);
            setActiveIds([]);
          }}
          onMapRightClick={handleMapRightClick}
          onMemoClick={(id) => {
            const m = memos.find((x) => x.id === id);
            if (m) startMemoEdit(m);
          }}
          onMemoExpand={(id) => setExpandedMemoId((prev) => (prev === id ? null : id))}
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
          loading={sessionsLoading}
        />

        <div className={styles.pasteArea}>
          <div className={styles.pasteTitle}>매물 정보 붙여넣기</div>
          <textarea
            className={styles.pasteInput}
            placeholder={`예)\n1,000 / 45 / 관 포함\n빌라드금양 4층 402호\n부산 남구 대연동 1732-14\n세입자있음    주인콜\n010-3856-6755`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <div className={styles.pasteBtnRow}>
            <button
              className={styles.btnPrimary}
              onClick={handleAdd}
              disabled={adding || !activeSessionId}
            >
              위치 추가
            </button>
            <button
              className={styles.btnGhost}
              onClick={() => setPasteText('')}
            >
              지우기
            </button>
          </div>
          {!activeSessionId && (
            <div className={styles.pasteHint}>※ 상단에서 지도 이름을 먼저 저장해주세요.</div>
          )}
          {activeSessionId && (
            <div className={styles.pasteHint}>여러 건은 빈 줄로 구분. Ctrl+Enter = 빠른 추가.</div>
          )}
          {progress && <div className={styles.pasteProgress}>{progress}</div>}
        </div>

        <div className={styles.listHeader}>
          <span className={styles.listHeaderTitle}>등록된 매물</span>
          <span className={styles.listHeaderRight}>
            <label className={styles.listFilterToggle}>
              <input
                type="checkbox"
                checked={filterByViewport}
                onChange={(e) => setFilterByViewport(e.target.checked)}
              />
              화면 내만
            </label>
            <span>{displayedPins.length} / {pins.length}건</span>
          </span>
        </div>
        {clusterFilterIds && (
          <div className={styles.clusterFilterHint}>
            🔎 같은 위치 {clusterFilterIds.length}건만 표시 중 · 지도 움직이면 해제
          </div>
        )}

        <div className={styles.listScroll} ref={listScrollRef}>
          {!activeSessionId ? (
            <div className={styles.disabledNotice}>
              상단에서 지도 이름을 저장하거나 기존 지도를 선택해주세요.
            </div>
          ) : displayedPins.length === 0 ? (
            <div className={styles.empty}>
              {pins.length === 0
                ? '아직 등록된 매물이 없습니다. 위에서 매물 정보를 붙여넣어 주세요.'
                : '화면 내에 표시할 매물이 없습니다.'}
            </div>
          ) : (
            displayedPins.map((pin) => {
              const idx = pins.findIndex((p) => p.id === pin.id);
              return (
                <div
                  key={pin.id}
                  data-pin-id={pin.id}
                  className={`${styles.item} ${activeIds.includes(pin.id) ? styles.active : ''}`}
                  onClick={() => setActiveIds([pin.id])}
                >
                  <div className={styles.itemHead}>
                    <span className={styles.itemNum}>{idx + 1}</span>
                    <span className={styles.itemTitle}>{pin.building || '(건물명 없음)'}</span>
                  </div>
                  {pin.priceText && (
                    <div className={styles.itemPrice}>💰 {pin.priceText}</div>
                  )}
                  <div className={styles.itemLine}>📍 {pin.address}</div>
                  {pin.statusTags?.length > 0 && (
                    <div className={styles.badges}>
                      {pin.statusTags.map((s, i) => (
                        <span key={i} className={`${styles.badge} ${badgeStyleClass(s)}`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {pin.phone && (
                    <div className={styles.itemLine}>
                      📞 <a href={`tel:${pin.phone}`} onClick={(e) => e.stopPropagation()}>{pin.phone}</a>
                    </div>
                  )}
                  <textarea
                    className={styles.memoBox}
                    placeholder="📝 메모 (자동 저장)"
                    value={pin.userMemo || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      handleMemoChange(pin.id, e.target.value);
                      handleMemoBlurOrDebounced(pin.id, e.target.value);
                    }}
                  />
                  <div className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setActiveIds([pin.id])}>📍 지도 이동</button>
                    <button className={styles.btnDel} onClick={() => handleDeletePin(pin.id)}>🗑 삭제</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {memoModal && (
        <MemoCreateModal
          modal={memoModal}
          onChange={(memo) => setMemoModal((m) => ({ ...m, memo }))}
          onCancel={() => setMemoModal(null)}
          onSave={handleSaveMemoModal}
        />
      )}

      {memoEditingId && (
        <MemoEditModal
          draft={memoEditDraft}
          onChange={setMemoEditDraft}
          onCancel={() => setMemoEditingId(null)}
          onSave={saveMemoEdit}
          onDelete={() => {
            deleteMemoPin(memoEditingId);
            setMemoEditingId(null);
          }}
        />
      )}
    </div>
  );
}

function MemoCreateModal({ modal, onChange, onCancel, onSave }) {
  return (
    <>
      <div className={styles.memoModalBg} onClick={onCancel} />
      <div className={styles.memoModalBox}>
        <div className={styles.memoModalTitle}>새 메모 핀 · 우클릭</div>
        {modal.loadingAddress ? (
          <div className={styles.memoModalAddr}>📍 주소 조회 중...</div>
        ) : modal.searchAddress ? (
          <div className={styles.memoModalAddr}>📍 {modal.searchAddress}</div>
        ) : (
          <div className={styles.memoModalAddr} style={{ color: '#999' }}>
            📍 {modal.lat.toFixed(5)}, {modal.lng.toFixed(5)} (주소 없음)
          </div>
        )}
        <textarea
          className={styles.memoModalTextarea}
          autoFocus
          placeholder="이 위치에 대한 메모 (Enter로 줄바꿈)"
          value={modal.memo}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className={styles.memoModalBtns}>
          <button className={styles.memoModalCancelBtn} onClick={onCancel}>취소</button>
          <button className={styles.memoModalSaveBtn} onClick={onSave}>저장</button>
        </div>
      </div>
    </>
  );
}

function MemoEditModal({ draft, onChange, onCancel, onSave, onDelete }) {
  return (
    <>
      <div className={styles.memoModalBg} onClick={onCancel} />
      <div className={styles.memoModalBox}>
        <div className={styles.memoModalTitle}>메모 수정</div>
        <textarea
          className={styles.memoModalTextarea}
          autoFocus
          value={draft}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className={styles.memoModalBtns}>
          <button className={styles.memoModalDelBtn} onClick={onDelete}>삭제</button>
          <button className={styles.memoModalCancelBtn} onClick={onCancel}>취소</button>
          <button className={styles.memoModalSaveBtn} onClick={onSave}>저장</button>
        </div>
      </div>
    </>
  );
}

function badgeStyleClass(s) {
  const k = badgeKind(s);
  if (k === 'warn') return styles.badgeWarn;
  if (k === 'primary') return styles.badgePrimary;
  return styles.badgeGray;
}
