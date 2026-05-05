'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './BuildingLookup.module.css';

function loadKakaoSdk(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window.kakao?.maps?.LatLng === 'function') { resolve(); return; }
    if (window.kakao?.maps && typeof window.kakao.maps.load === 'function') {
      window.kakao.maps.load(resolve); return;
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

async function fetchLandDataClient(addr) {
  const key = process.env.NEXT_PUBLIC_VWORLD_LAND_KEY;
  if (!key || !addr.sigunguCd || !addr.bjdongCd) return null;
  const bun = String(addr.bun || '0').padStart(4, '0');
  const ji  = String(addr.ji  || '0').padStart(4, '0');
  const tryPnu = async (platGbCd) => {
    const pnu = addr.sigunguCd + addr.bjdongCd + platGbCd + bun + ji;
    const url = `https://api.vworld.kr/ned/data/ladfrlList?pnu=${pnu}&key=${key}&format=json&numOfRows=1&pageNo=1`;
    try {
      const data = await (await fetch(url)).json();
      const body = data?.response ?? data;
      const list = body?.ladfrlVOList ?? body?.ladfrlList;
      const raw  = list?.ladfrlVOList ?? list?.ladfrlList ?? list?.ladfrl ?? list?.field;
      if (!raw) return null;
      return (Array.isArray(raw) ? raw[0] : raw) || null;
    } catch { return null; }
  };
  return (await tryPnu('0')) || (await tryPnu('1')) || null;
}

const JIPHAP     = new Set(['아파트', '오피스텔', '다세대', '원룸', '분양권']);
const LAND_TYPES = new Set(['토지']);
// 건축물대장 + 토지대장 둘 다 조회가 필요한 종류
const NEEDS_LAND = new Set(['단독주택', '다가구', '공장', '빌딩', '재개발', '토지']);

const NAME_FIELD_MAP = {
  아파트:   'apt_name',
  오피스텔: 'ofc_name',
  분양권:   'apt_name',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).replace(/\D/g, '');
  if (s.length === 8) return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
  return String(dateStr).trim();
}

// 전유부 용도를 building_use_text에 쓸 때 변환이 필요한 경우만 매핑
// (다세대·아파트 등은 원본 그대로 사용)
const MOLIT_USE_MAP = {
  '오피스텔': '업무시설',
  '숙박시설': '숙박시설',
};

function processUnitData(unitData) {
  const exclusiveRows = unitData.filter(r => r.exposPubuseGbCdNm === '전유');
  const commonRows    = unitData.filter(r => r.exposPubuseGbCdNm === '공용');
  const exclusiveArea = exclusiveRows.reduce((s, r) => s + (parseFloat(r.area) || 0), 0);
  const commonArea    = commonRows.reduce((s, r)    => s + (parseFloat(r.area) || 0), 0);
  const supplyArea    = parseFloat((exclusiveArea + commonArea).toFixed(6));
  const first         = exclusiveRows[0];
  // etcPurps가 있으면 이미 전체 명칭 포함 ("다세대주택(도시형생활주택·원룸형)" 등)
  const rawUse        = first?.etcPurps || first?.mainPurpsCdNm || '';
  return {
    exclusiveArea:   exclusiveArea ? parseFloat(exclusiveArea.toFixed(6)) : null,
    supplyArea:      supplyArea || null,
    floorName:       first?.flrNoNm || '',
    hoNm:            first?.hoNm || '',
    bldNm:           unitData[0]?.bldNm || '',
    buildingUse:     MOLIT_USE_MAP[rawUse] || null,
    rawBuildingUse:  rawUse,
  };
}

export default function BuildingLookup({ 종류 = '아파트', 거래유형 = '매매', onApply }) {
  const [open,         setOpen]         = useState(true);
  const [sdkReady,     setSdkReady]     = useState(false);
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [selected,     setSelected]     = useState(null);   // selected address object
  const [titleData,    setTitleData]    = useState(null);   // MOLIT title row
  const [parkingData,  setParkingData]  = useState(null);  // parking counts
  const [landData,     setLandData]     = useState(null);  // Vworld 토지임야정보
  const [dong,         setDong]         = useState('');
  const [ho,           setHo]           = useState('');
  const [unitData,     setUnitData]     = useState(null);   // array from unit lookup
  const [realPrices,   setRealPrices]   = useState([]);
  const [showPrices,   setShowPrices]   = useState(false);
  const [loadingBld,   setLoadingBld]   = useState(false);
  const [loadingHo,    setLoadingHo]    = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const isJiphap     = JIPHAP.has(종류);
  const isLand       = LAND_TYPES.has(종류);
  const needsLandData = NEEDS_LAND.has(종류);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (key) loadKakaoSdk(key).then(() => setSdkReady(true));
  }, []);

  function handleKeywordSearch() {
    if (!query.trim() || !sdkReady) return;
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(query, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        setResults(data);
      } else {
        // 도로명/지번 주소 직접 검색 fallback
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(query, (addrData, addrStatus) => {
          if (addrStatus === window.kakao.maps.services.Status.OK && addrData.length > 0) {
            setResults(addrData.map(a => ({
              place_name: a.address_name,
              road_address_name: a.road_address?.address_name || '',
              address_name: a.address?.address_name || a.address_name,
              x: a.x,
              y: a.y,
            })));
          } else {
            setResults([]);
          }
        });
      }
    });
  }

  function selectPlace(item) {
    setResults([]);
    setQuery(item.place_name);
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(item.address_name || item.road_address_name, (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !result[0]) return;
      const a = result[0].address;
      selectAddress({
        addressName: item.address_name,
        roadAddress: item.road_address_name || item.address_name,
        sigunguCd: a?.b_code?.slice(0, 5) || '',
        bjdongCd:  a?.b_code?.slice(5, 10) || '',
        bun: a?.main_address_no || '0',
        ji:  a?.sub_address_no  || '0',
        lat: parseFloat(item.y) || 0,
        lng: parseFloat(item.x) || 0,
      });
    });
  }

  async function selectAddress(addr) {
    setResults([]);
    setQuery(addr.roadAddress || addr.addressName);
    setSelected(addr);
    setTitleData(null);
    setParkingData(null);
    setLandData(null);
    setHo('');
    setUnitData(null);
    setRealPrices([]);
    setDong('');

    setLoadingBld(true);
    const params = new URLSearchParams({ sigunguCd: addr.sigunguCd, bjdongCd: addr.bjdongCd, bun: addr.bun, ji: addr.ji });

    if (isLand) {
      // 순수 토지: 토지대장만 (브라우저에서 직접 Vworld 호출)
      const landItem = await fetchLandDataClient(addr);
      setLandData(landItem);
    } else {
      // 건물: 건축물대장 + (필요시) 토지대장 병렬 조회
      const [bldRes, landItem] = await Promise.all([
        fetch(`/api/building-lookup?${params}`),
        needsLandData ? fetchLandDataClient(addr) : null,
      ]);
      if (bldRes?.ok) {
        const d = await bldRes.json();
        setTitleData(d.titleData?.[0] || null);
        setParkingData(d.parkingData || null);
      }
      if (landItem) setLandData(landItem);
    }
    setLoadingBld(false);

    if (addr.sigunguCd) {
      setLoadingPrice(true);
      const p = new URLSearchParams({ lawdCd: addr.sigunguCd, txn: 거래유형 });
      const pr = await fetch(`/api/real-price?${p}`);
      if (pr.ok) setRealPrices(await pr.json());
      setLoadingPrice(false);
    }
  }

  async function fetchHoData(hoVal, dongVal) {
    const hoToUse   = (hoVal  ?? ho).trim();
    const dongToUse = (dongVal ?? dong).trim();
    if (!hoToUse || !selected) return;
    setUnitData(null);
    setLoadingHo(true);

    // Try exact dong name first; if empty result, retry with '동' suffix
    const tryFetch = async (dongNm) => {
      const params = new URLSearchParams({
        sigunguCd: selected.sigunguCd, bjdongCd: selected.bjdongCd,
        bun: selected.bun, ji: selected.ji, dong: dongNm, ho: hoToUse,
      });
      const res = await fetch(`/api/building-lookup?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.unitData?.length > 0 ? data.unitData : null;
    };

    let data = await tryFetch(dongToUse);
    // 동 입력값이 있는데 결과 없으면 → '동' 접미사 추가 재시도
    if (!data && dongToUse && !dongToUse.endsWith('동')) {
      const withSuffix = dongToUse + '동';
      data = await tryFetch(withSuffix);
      if (data) setDong(withSuffix);
    }
    // 동명칭 없는 건물: 동 입력 없거나 위 시도 모두 실패 시 dong='' 로 재시도
    if (!data && dongToUse) {
      data = await tryFetch('');
    }
    setUnitData(data || []);
    setLoadingHo(false);
  }

  function handleApply() {
    if (!selected) return;
    const fields = {};

    // ── 소재지 & 지도 (공통) ──
    const roadAddr = titleData?.newPlatPlc || titleData?.platPlc || selected.roadAddress || selected.addressName;
    if (roadAddr) fields.location = roadAddr;
    if (selected.lat && selected.lng) {
      fields.map_config = { lat: selected.lat, lng: selected.lng, radius: 0, mapHidden: false };
    }

    // ── 토지 전용 ──
    if (isLand) {
      if (landData) {
        const area = parseFloat(landData.lndpclAr);
        if (area) fields.land_area = area;
        if (landData.lndcgrCodeNm) fields.sub_category = landData.lndcgrCodeNm;
      }
      onApply?.(fields);
      return;
    }

    const t = titleData || {};

    // ── 건물명 ──
    const nameField = NAME_FIELD_MAP[종류];
    if (t.bldNm && nameField) fields[nameField] = t.bldNm;

    // ── 사용승인일 (폼에 따라 approval_date 또는 inspection_date) ──
    const approvalDate = formatDate(t.useAprDay);
    if (approvalDate) {
      fields.approval_date  = approvalDate;
      fields.inspection_date = approvalDate;
    }

    // ── 층수 ──
    const grndFlr  = parseInt(t.grndFlrCnt)  || 0;
    const ugrndFlr = parseInt(t.ugrndFlrCnt) || 0;
    if (grndFlr)  { fields.total_floors = grndFlr; fields.above_floors = grndFlr; }
    if (ugrndFlr) fields.below_floors = ugrndFlr;

    // ── 면적 (표제부 → 일반건축물·집합건물 공통) ──
    const platArea    = parseFloat(t.platArea);
    const archArea    = parseFloat(t.archArea);
    const totArea     = parseFloat(t.totArea);
    const landRegArea = needsLandData && landData ? parseFloat(landData.lndpclAr) : 0;
    // 토지대장 면적 우선, 없으면 건축물대장 platArea fallback
    if (landRegArea)  fields.land_area        = landRegArea;
    else if (platArea) fields.land_area        = Math.round(platArea * 100) / 100;
    if (archArea) fields.building_area    = Math.round(archArea * 100) / 100;
    if (totArea)  fields.total_floor_area = Math.round(totArea  * 100) / 100;

    // ── 건축물용도 — 텍스트 입력란에만 원본값 기입, select는 건드리지 않음 ──
    const rawUse = (t.mainPurpsCdNm || '') + (t.etcPurps ? `(${t.etcPurps})` : '');
    if (rawUse) {
      fields.building_use      = rawUse;
      fields.building_use_text = rawUse;
    }

    // ── 주차 ──
    if (parkingData) {
      const total = parkingData.indrAutoUtcnt + parkingData.oudrAutoUtcnt
                  + parkingData.indrMechUtcnt + parkingData.oudrMechUtcnt;
      if (total > 0) fields.total_parking = total;
    }

    // ── 집합건축물 전유부 (동·호실 조회 후) ──
    if (isJiphap && unitData && unitData.length > 0) {
      const u = processUnitData(unitData);
      if (u.exclusiveArea)  fields.exclusive_area    = u.exclusiveArea;
      if (u.supplyArea)     fields.supply_area       = u.supplyArea;
      if (u.floorName)      fields.curr_floor        = { text: u.floorName,    privacy: '공개',   adminMemo: '' };
      if (u.hoNm || ho)     fields.ho                = { text: u.hoNm || ho,   privacy: '비공개', adminMemo: '' };
      if (dong)             fields.dong              = dong;
      if (u.bldNm && nameField) fields[nameField]    = u.bldNm;
      if (u.rawBuildingUse) {
        fields.building_use      = u.rawBuildingUse;
        fields.building_use_text = u.rawBuildingUse;
      }

      // ── 상세주소: 동·호실 조합 ──
      const dongFull  = dong ? (dong.endsWith('동') ? dong : dong + '동') : '';
      const actualHo  = u.hoNm || ho;
      const hoFull    = actualHo ? (actualHo.endsWith('호') ? actualHo : actualHo + '호') : '';
      const detailTxt = [dongFull, hoFull].filter(Boolean).join(' ');
      if (detailTxt) fields.address_detail = { text: detailTxt, privacy: '노출', adminMemo: '' };
    } else if (dong || ho) {
      // 집합건물이지만 전유부 미조회 상태에서도 동·호실 입력값이 있으면 적용
      const dongFull  = dong ? (dong.endsWith('동') ? dong : dong + '동') : '';
      const hoFull    = ho   ? (ho.endsWith('호')   ? ho   : ho   + '호') : '';
      const detailTxt = [dongFull, hoFull].filter(Boolean).join(' ');
      if (detailTxt) fields.address_detail = { text: detailTxt, privacy: '노출', adminMemo: '' };
    }

    onApply?.(fields);
  }

  if (!open) {
    return (
      <div className={styles.collapsed}>
        <button className={styles.toggleBtn} onClick={() => setOpen(true)}>
          🏢 건축물대장 자동입력
        </button>
      </div>
    );
  }

  const t = titleData || {};
  const unitInfo = isJiphap && unitData && unitData.length > 0 ? processUnitData(unitData) : null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>🏢 건축물대장 자동입력</span>
        <button className={styles.closeBtn} onClick={() => setOpen(false)}>접기 ▲</button>
      </div>

      <div className={styles.body}>
        {/* 주소 검색 */}
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="건물명, 주소, 지역명 검색"
            value={query}
            onChange={e => { setQuery(e.target.value); setResults([]); }}
            onKeyDown={e => e.key === 'Enter' && handleKeywordSearch()}
          />
          <button className={styles.searchBtn} onClick={handleKeywordSearch} disabled={!sdkReady}>
            검색
          </button>
          {results.length > 0 && (
            <ul className={styles.dropdown}>
              {results.map((r, i) => (
                <li key={i} className={styles.dropdownItem} onClick={() => selectPlace(r)}>
                  <div className={styles.roadAddr}>{r.place_name}</div>
                  <div className={styles.jibunAddr}>{r.road_address_name || r.address_name}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {loadingBld && <div className={styles.loading}>{isLand ? '토지대장 조회 중...' : needsLandData ? '건축물대장·토지대장 조회 중...' : '건축물대장 조회 중...'}</div>}

        {/* 토지 정보 */}
        {isLand && landData && !loadingBld && (
          <div className={styles.infoBox}>
            <div className={styles.infoGrid}>
              {landData.lndcgrCodeNm && <div className={styles.infoItem}><span className={styles.infoLabel}>지목</span><span className={styles.infoValue}>{landData.lndcgrCodeNm}</span></div>}
              {landData.lndpclAr     && <div className={styles.infoItem}><span className={styles.infoLabel}>면적</span><span className={styles.infoValue}>{parseFloat(landData.lndpclAr).toFixed(1)}㎡</span></div>}
              {landData.posesnSeCodeNm && <div className={styles.infoItem}><span className={styles.infoLabel}>소유구분</span><span className={styles.infoValue}>{landData.posesnSeCodeNm}</span></div>}
              {landData.ldCodeNm     && <div className={styles.infoItem}><span className={styles.infoLabel}>소재지</span><span className={styles.infoValue}>{landData.ldCodeNm}</span></div>}
              {landData.mnnmSlno     && <div className={styles.infoItem}><span className={styles.infoLabel}>지번</span><span className={styles.infoValue}>{landData.mnnmSlno}</span></div>}
              {landData.regstrSeCodeNm && <div className={styles.infoItem}><span className={styles.infoLabel}>대장구분</span><span className={styles.infoValue}>{landData.regstrSeCodeNm}</span></div>}
            </div>
          </div>
        )}
        {isLand && !landData && selected && !loadingBld && (
          <div className={styles.loading}>토지대장 정보를 찾을 수 없습니다</div>
        )}

        {/* 건물 기본정보 */}
        {!isLand && titleData && !loadingBld && (
          <div className={styles.infoBox}>
            <div className={styles.infoGrid}>
              {t.bldNm         && <div className={styles.infoItem}><span className={styles.infoLabel}>건물명</span><span className={styles.infoValue}>{t.bldNm}</span></div>}
              {t.useAprDay     && <div className={styles.infoItem}><span className={styles.infoLabel}>사용승인일</span><span className={styles.infoValue}>{formatDate(t.useAprDay)}</span></div>}
              {t.grndFlrCnt    && <div className={styles.infoItem}><span className={styles.infoLabel}>총 층수</span><span className={styles.infoValue}>{t.grndFlrCnt}층</span></div>}
              {t.platArea      && <div className={styles.infoItem}><span className={styles.infoLabel}>대지면적</span><span className={styles.infoValue}>{parseFloat(t.platArea).toFixed(1)}㎡</span></div>}
              {t.totArea       && <div className={styles.infoItem}><span className={styles.infoLabel}>연면적</span><span className={styles.infoValue}>{parseFloat(t.totArea).toFixed(1)}㎡</span></div>}
              {t.mainPurpsCdNm && <div className={styles.infoItem}><span className={styles.infoLabel}>주용도</span><span className={styles.infoValue}>{t.mainPurpsCdNm}{t.etcPurps ? `(${t.etcPurps})` : ''}</span></div>}
            </div>
            {parkingData && (
              <div className={styles.parkingRow}>
                <span className={styles.infoLabel}>주차</span>
                <span className={styles.parkingValue}>
                  {(parkingData.indrAutoUtcnt > 0 || parkingData.oudrAutoUtcnt > 0) && (
                    <span>자주식 옥내 {parkingData.indrAutoUtcnt}대 · 옥외 {parkingData.oudrAutoUtcnt}대</span>
                  )}
                  {(parkingData.indrMechUtcnt > 0 || parkingData.oudrMechUtcnt > 0) && (
                    <span>기계식 옥내 {parkingData.indrMechUtcnt}대 · 옥외 {parkingData.oudrMechUtcnt}대</span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 토지대장 정보 (건물+토지 병렬 조회 폼) */}
        {!isLand && needsLandData && landData && !loadingBld && (
          <div className={styles.areaBox}>
            <span style={{fontWeight:700, color:'#5a3e28', marginRight:4}}>📋 토지대장</span>
            {landData.lndcgrCodeNm && <span>지목: {landData.lndcgrCodeNm}</span>}
            {landData.lndpclAr     && <span>면적: {parseFloat(landData.lndpclAr).toFixed(1)}㎡</span>}
            {landData.posesnSeCodeNm && <span>소유구분: {landData.posesnSeCodeNm}</span>}
            {landData.mnnmSlno     && <span>지번: {landData.mnnmSlno}</span>}
          </div>
        )}

        {/* 집합건축물 호실 입력 */}
        {isJiphap && selected && !loadingBld && (
          <div className={styles.unitSection}>
            <div className={styles.unitSectionTitle}>동·호실 입력 (전용·공급면적·층 자동입력)</div>
            <div className={styles.unitRow}>
              <div className={styles.unitInputGroup}>
                <label className={styles.unitLabel}>동</label>
                <input
                  className={styles.unitInput}
                  type="text"
                  placeholder="예: 101"
                  value={dong}
                  onChange={e => setDong(e.target.value)}
                />
              </div>
              <div className={styles.unitInputGroup}>
                <label className={styles.unitLabel}>호실</label>
                <input
                  className={styles.unitInput}
                  type="text"
                  placeholder="예: 1204"
                  value={ho}
                  onChange={e => setHo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchHoData()}
                />
              </div>
              <button
                className={styles.unitFetchBtn}
                onClick={() => fetchHoData()}
                disabled={loadingHo || !ho.trim()}
              >
                {loadingHo ? '조회 중...' : '면적·층 조회'}
              </button>
            </div>
          </div>
        )}

        {/* 전용/공급면적 표시 */}
        {unitInfo && (
          <div className={styles.areaBox}>
            {unitInfo.exclusiveArea  && <span>전용: {unitInfo.exclusiveArea}㎡</span>}
            {unitInfo.supplyArea     && <span>공급: {unitInfo.supplyArea}㎡</span>}
            {unitInfo.floorName      && <span>층: {unitInfo.floorName}</span>}
            {unitInfo.rawBuildingUse && <span>용도: {unitInfo.rawBuildingUse}</span>}
          </div>
        )}

        {/* 실거래가 */}
        {selected && (
          <div className={styles.priceSection}>
            <div className={styles.priceSectionHeader} onClick={() => setShowPrices(v => !v)}>
              <span className={styles.priceSectionTitle}>
                📊 실거래가 ({거래유형}, 최근 3개월)
                {loadingPrice ? ' — 조회 중...' : realPrices.length > 0 ? ` — ${realPrices.length}건` : ' — 없음'}
              </span>
              <span className={styles.priceSectionToggle}>{showPrices ? '▲ 접기' : '▼ 펼치기'}</span>
            </div>
            {showPrices && (
              <>
                {!loadingPrice && realPrices.length === 0 && (
                  <div className={styles.noPrice}>해당 지역 거래 내역 없음</div>
                )}
                {!loadingPrice && realPrices.length > 0 && (
                  <div className={styles.priceTable}>
                    <div className={styles.priceHeader}>
                      <span>아파트명</span>
                      <span>면적(㎡)</span>
                      <span>층</span>
                      <span>거래금액</span>
                      <span>거래일</span>
                    </div>
                    {realPrices.map((item, i) => (
                      <div key={i} className={styles.priceRow}>
                        <span>{item['아파트'] || '-'}</span>
                        <span>{item['전용면적'] || '-'}</span>
                        <span>{item['층'] || '-'}층</span>
                        <span className={styles.priceAmount}>{(item['거래금액'] || '-').trim()}만</span>
                        <span>{item['년']}.{String(item['월']).padStart(2,'0')}.{String(item['일']).padStart(2,'0')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 자동입력 적용 */}
        {(titleData || selected) && (
          <div className={styles.applyRow}>
            <button className={styles.applyBtn} onClick={handleApply}>
              ✓ 자동입력 적용
            </button>
            <span className={styles.applyHint}>
              {isLand
                ? '소재지, 지도좌표, 지목·면적을 폼에 자동입력합니다'
                : `소재지, 지도좌표${isJiphap ? ', 호실정보' : ''}, 건물정보를 폼에 자동입력합니다`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
