// 새 API(영문 필드)를 UI가 기대하는 한글 필드로 정규화
function normalizeItem(item) {
  // 새 API 응답 (영문 필드): aptNm, excluUseAr, floor, dealAmount, dealYear/Month/Day
  if ('aptNm' in item) {
    return {
      '아파트':   item.aptNm     || '',
      '동':       String(item.aptDong ?? '').trim(),
      '전용면적': item.excluUseAr != null ? String(item.excluUseAr) : '',
      '층':       item.floor      != null ? String(item.floor)      : '',
      '거래금액': item.dealAmount || '',
      '년':       item.dealYear   || '',
      '월':       item.dealMonth  || '',
      '일':       item.dealDay    || '',
    };
  }
  // 구 API 응답 (한글 필드): 그대로 반환
  return item;
}

async function fetchTrades(apiUrl, key, lawdCd, dealYmd) {
  try {
    // operation name = 'get' + service basename (e.g. RTMSDataSvcAptTradeDev → getRTMSDataSvcAptTradeDev)
    const serviceName = apiUrl.split('/').pop();
    const fullUrl = `${apiUrl}/get${serviceName}`;
    const params = new URLSearchParams({
      serviceKey: key,
      LAWD_CD: lawdCd,
      DEAL_YMD: dealYmd,
      numOfRows: '100',
      pageNo: '1',
      _type: 'json',
    });
    const res = await fetch(`${fullUrl}?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!items) return [];
    const raw = Array.isArray(items) ? items : [items];
    return raw.map(normalizeItem);
  } catch {
    return [];
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lawdCd  = searchParams.get('lawdCd') || '';
  const txn     = searchParams.get('txn') || '매매';
  const aptName = searchParams.get('aptName') || '';

  if (!lawdCd) return Response.json([], { status: 400 });

  const key = process.env.MOLIT_APT_TRADE_KEY || '';
  const apiUrl = txn === '매매'
    ? (process.env.MOLIT_APT_TRADE_URL || 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev')
    : (process.env.MOLIT_APT_RENT_URL  || 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent');

  // Fetch last 3 months
  const now = new Date();
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const allData = (await Promise.all(months.map(m => fetchTrades(apiUrl, key, lawdCd, m)))).flat();

  // 실거래 DB 이름(짧음)과 건축물대장 bldNm(긴 경우 있음)의 불일치 대응:
  // ① trade 이름이 aptName을 포함하거나 (완전 일치 / trade가 더 긴 경우)
  // ② aptName이 trade 이름으로 시작하는 경우 (bldNm='국제아파트', trade='국제')
  const filtered = aptName
    ? allData.filter(item => {
        const t = item['아파트'] || '';
        return t.includes(aptName) || (t.length >= 2 && aptName.startsWith(t));
      })
    : allData;

  filtered.sort((a, b) => {
    const da = `${a['년'] || ''}${String(a['월'] || '').padStart(2, '0')}${String(a['일'] || '').padStart(2, '0')}`;
    const db = `${b['년'] || ''}${String(b['월'] || '').padStart(2, '0')}${String(b['일'] || '').padStart(2, '0')}`;
    return db.localeCompare(da);
  });

  return Response.json(filtered.slice(0, 30));
}
