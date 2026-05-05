export const runtime = 'edge';

const VWORLD_NED  = 'https://api.vworld.kr/ned/data/getLandCharacteristics';
const VWORLD_DATA = 'https://api.vworld.kr/req/data';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sigunguCd = searchParams.get('sigunguCd') || '';
  const bjdongCd  = searchParams.get('bjdongCd')  || '';
  const bun       = String(searchParams.get('bun') || '0').padStart(4, '0');
  const ji        = String(searchParams.get('ji')  || '0').padStart(4, '0');

  if (!sigunguCd || !bjdongCd) {
    return Response.json({ error: '주소 코드 없음' }, { status: 400 });
  }

  const key     = process.env.VWORLD_LAND_KEY || '';
  const siteUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3100').replace(/\/$/, '');

  async function tryNed(platGbCd) {
    const pnu = sigunguCd + bjdongCd + platGbCd + bun + ji;
    const url = `${VWORLD_NED}?pnu=${pnu}&key=${key}&format=json&numOfRows=1&pageNo=1&domain=${encodeURIComponent(siteUrl)}`;
    try {
      const text = await (await fetch(url, { cache: 'no-store' })).text();
      let data; try { data = JSON.parse(text); } catch { return { item: null, pnu, rawText: text.slice(0,200) }; }
      return { item: extractItem(data), pnu, rawData: data };
    } catch (e) { return { item: null, pnu, _error: String(e) }; }
  }

  async function tryReqData(platGbCd) {
    const pnu = sigunguCd + bjdongCd + platGbCd + bun + ji;
    const url = `${VWORLD_DATA}?request=GetFeature&data=LT_C_LHBLPN&key=${key}&domain=${encodeURIComponent(siteUrl)}&crs=EPSG:4326&attrFilter=pnu:=:${pnu}&format=json&numOfRows=1&pageNo=1`;
    try {
      const text = await (await fetch(url, { cache: 'no-store' })).text();
      let data; try { data = JSON.parse(text); } catch { return { item: null, pnu, rawText: text.slice(0,200) }; }
      const item = data?.response?.result?.featureCollection?.features?.[0]?.properties || null;
      return { item, pnu, rawData: data };
    } catch (e) { return { item: null, pnu, _error: String(e) }; }
  }

  // NED API 먼저 시도, 실패 시 /req/data 시도
  for (const platGbCd of ['0', '1']) {
    const r = await tryNed(platGbCd);
    if (r.item) return Response.json({ landData: r.item, pnu: r.pnu, src: 'ned' });
  }
  for (const platGbCd of ['0', '1']) {
    const r = await tryReqData(platGbCd);
    if (r.item) return Response.json({ landData: r.item, pnu: r.pnu, src: 'req' });
  }

  // 모두 실패 시 디버그
  const [n0, n1, d0, d1] = await Promise.all([tryNed('0'), tryNed('1'), tryReqData('0'), tryReqData('1')]);
  return Response.json({
    landData: null,
    _debug: {
      ned0: n0.rawData ?? n0.rawText ?? n0._error,
      ned1: n1.rawData ?? n1.rawText ?? n1._error,
      req0: d0.rawData ?? d0.rawText ?? d0._error,
      req1: d1.rawData ?? d1.rawText ?? d1._error,
    },
  });
}

function extractItem(data) {
  const body = data?.response ?? data;
  // getLandCharacteristics 응답
  const lc = body?.landCharacteristicVOList ?? body?.landCharacteristics;
  if (lc) {
    const raw = lc?.landCharacteristicVOList ?? lc?.landCharacteristics ?? lc?.field ?? lc;
    if (raw) return (Array.isArray(raw) ? raw[0] : raw) || null;
  }
  // ladfrlList 구조 fallback
  const list = body?.ladfrlVOList ?? body?.ladfrlList;
  const raw  = list?.ladfrlVOList ?? list?.ladfrlList ?? list?.ladfrl ?? list?.field;
  if (!raw) return null;
  return (Array.isArray(raw) ? raw[0] : raw) || null;
}
