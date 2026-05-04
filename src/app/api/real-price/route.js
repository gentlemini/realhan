async function fetchTrades(apiUrl, key, lawdCd, dealYmd) {
  try {
    const params = new URLSearchParams({
      serviceKey: key,
      LAWD_CD: lawdCd,
      DEAL_YMD: dealYmd,
      numOfRows: '100',
      pageNo: '1',
      _type: 'json',
    });
    const res = await fetch(`${apiUrl}?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
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

  const filtered = aptName
    ? allData.filter(item => (item['아파트'] || '').includes(aptName))
    : allData;

  filtered.sort((a, b) => {
    const da = `${a['년'] || ''}${String(a['월'] || '').padStart(2, '0')}${String(a['일'] || '').padStart(2, '0')}`;
    const db = `${b['년'] || ''}${String(b['월'] || '').padStart(2, '0')}${String(b['일'] || '').padStart(2, '0')}`;
    return db.localeCompare(da);
  });

  return Response.json(filtered.slice(0, 30));
}
