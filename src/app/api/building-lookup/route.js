const BLD_BASE = 'https://apis.data.go.kr/1613000/BldRgstHubService';

async function callMolit(endpoint, params) {
  try {
    const url = `${BLD_BASE}/${endpoint}?${new URLSearchParams(params)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { items: [], totalCount: 0 };
    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    const totalCount = data?.response?.body?.totalCount || 0;
    if (!items) return { items: [], totalCount };
    return { items: Array.isArray(items) ? items : [items], totalCount };
  } catch {
    return { items: [], totalCount: 0 };
  }
}

// Fetches all pages using totalCount (MOLIT caps each page at 100 rows)
async function callMolitAll(endpoint, params) {
  const PAGE_SIZE = 100;
  let page = 1;
  const all = [];
  let reportedTotal = Infinity;

  while (all.length < reportedTotal) {
    const { items, totalCount } = await callMolit(endpoint, { ...params, numOfRows: String(PAGE_SIZE), pageNo: String(page) });
    if (page === 1) reportedTotal = parseInt(totalCount) || 0;
    if (items.length === 0) break;
    all.push(...items);
    page++;
    if (page > 50) break; // safety cap: max 5,000 rows
  }
  return { items: all, totalCount: reportedTotal };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sigunguCd = searchParams.get('sigunguCd') || '';
  const bjdongCd  = searchParams.get('bjdongCd') || '';
  const bun       = String(searchParams.get('bun') || '0').padStart(4, '0');
  const ji        = String(searchParams.get('ji') || '0').padStart(4, '0');
  const dong      = searchParams.get('dong') || '';
  const ho        = searchParams.get('ho') || '';
  const action    = searchParams.get('action') || ''; // 'units' to fetch unit list only

  if (!sigunguCd || !bjdongCd) {
    return Response.json({ error: '주소 코드 없음' }, { status: 400 });
  }

  const key = process.env.MOLIT_BLD_KEY || '';
  const base = {
    serviceKey: key, sigunguCd, bjdongCd,
    platGbCd: '0', bun, ji,
    _type: 'json', numOfRows: '100', pageNo: '1',
  };

  if (action === 'units') {
    // Fetch all unit rows for the dong (paginated) — omit dongNm when empty
    const unitsParams = { ...base, hoNm: '' };
    if (dong) unitsParams.dongNm = dong;
    const { items: allUnitData, totalCount } = await callMolitAll('getBrExposPubuseAreaInfo', unitsParams);
    const exclusiveUnits = allUnitData.filter(u => u.exposPubuseGbCdNm === '전유');
    const unitOptions = [...new Set(exclusiveUnits.map(u => u.hoNm).filter(Boolean))].sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, '') || '0');
      const nb = parseInt(b.replace(/\D/g, '') || '0');
      return na - nb;
    });
    return Response.json({ unitOptions, _debug: { totalCount, rawRows: allUnitData.length, exclusiveRows: exclusiveUnits.length } });
  }

  if (ho) {
    // Step 1: try exact match with dongNm + hoNm
    const unitParams = { ...base, hoNm: ho };
    if (dong) unitParams.dongNm = dong;
    let { items: unitData } = await callMolit('getBrExposPubuseAreaInfo', unitParams);

    // Step 2: dong 있는데 결과 없으면 dongNm 없이 재시도 (동명칭 없음 건물)
    if (unitData.length === 0 && dong) {
      ({ items: unitData } = await callMolit('getBrExposPubuseAreaInfo', { ...base, hoNm: ho }));
    }

    // Step 3: 여전히 없으면 전체 전유부 조회 후 클라이언트 필터링
    // (hoNm 저장 형식 차이: "304" vs "304호" 등 대응)
    if (unitData.length === 0) {
      const { items: allUnits } = await callMolitAll('getBrExposPubuseAreaInfo', { ...base });
      const hoNum = ho.replace(/\D/g, '');
      unitData = allUnits.filter(u => {
        if (!u.hoNm) return false;
        const uHoNum = u.hoNm.replace(/\D/g, '');
        return u.hoNm === ho || u.hoNm === ho + '호' || (hoNum && uHoNum === hoNum);
      });
      // dong 있으면 추가 필터
      if (dong && unitData.length > 0) {
        const dongNum = dong.replace(/\D/g, '');
        const filtered = unitData.filter(u => {
          if (!u.dongNm) return true;
          const uDongNum = u.dongNm.replace(/\D/g, '');
          return u.dongNm === dong || u.dongNm === dong + '동' || (dongNum && uDongNum === dongNum);
        });
        if (filtered.length > 0) unitData = filtered;
      }
    }

    return Response.json({ unitData });
  }

  // Fetch both title endpoints in parallel
  const [{ items: titleDataItems }, { items: recapItems }] = await Promise.all([
    callMolit('getBrTitleInfo', base),
    callMolit('getBrRecapTitleInfo', base),
  ]);

  const titleRows = titleDataItems.length > 0 ? titleDataItems : recapItems;

  // For 집합건축물, pick the row with the most above-ground floors as the representative row
  (titleRows || []).sort((a, b) => (parseInt(b.grndFlrCnt) || 0) - (parseInt(a.grndFlrCnt) || 0));

  // Parking fields: prefer recap title (총괄표제부) for 집합건축물
  const parkingSource = recapItems[0] || titleRows[0] || {};
  const parkingData = {
    indrAutoUtcnt: parseInt(parkingSource.indrAutoUtcnt) || 0,
    oudrAutoUtcnt: parseInt(parkingSource.oudrAutoUtcnt) || 0,
    indrMechUtcnt: parseInt(parkingSource.indrMechUtcnt) || 0,
    oudrMechUtcnt: parseInt(parkingSource.oudrMechUtcnt) || 0,
  };
  const hasParking = Object.values(parkingData).some(v => v > 0);

  return Response.json({ titleData: titleRows || [], parkingData: hasParking ? parkingData : null });
}
