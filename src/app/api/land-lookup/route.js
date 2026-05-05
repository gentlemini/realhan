export const runtime = 'edge';

const VWORLD_BASE = 'https://api.vworld.kr/ned/data/ladfrlList';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sigunguCd = searchParams.get('sigunguCd') || '';
  const bjdongCd  = searchParams.get('bjdongCd')  || '';
  const bun       = String(searchParams.get('bun') || '0').padStart(4, '0');
  const ji        = String(searchParams.get('ji')  || '0').padStart(4, '0');

  if (!sigunguCd || !bjdongCd) {
    return Response.json({ error: '주소 코드 없음' }, { status: 400 });
  }

  const key = process.env.VWORLD_LAND_KEY || '';

  async function tryPnu(platGbCd) {
    const pnu = sigunguCd + bjdongCd + platGbCd + bun + ji;
    const siteUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3100').replace(/\/$/, '');
    const url = `${VWORLD_BASE}?pnu=${pnu}&key=${key}&format=json&numOfRows=1&pageNo=1&domain=${encodeURIComponent(siteUrl)}`;
    try {
      const res  = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Referer': siteUrl + '/',
          'Origin': siteUrl,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { return { item: null, pnu, rawText: text.slice(0, 300) }; }
      const item = extractItem(data);
      return { item, pnu, rawData: data };
    } catch (e) {
      return { item: null, pnu, _error: String(e) };
    }
  }

  const r0 = await tryPnu('0');
  if (r0.item) return Response.json({ landData: r0.item, pnu: r0.pnu });

  const r1 = await tryPnu('1');
  if (r1.item) return Response.json({ landData: r1.item, pnu: r1.pnu });

  return Response.json({
    landData: null,
    _debug: {
      keyLength: key.length,
      domain: process.env.NEXTAUTH_URL || '(없음)',
      pnu0: r0.pnu, raw0: r0.rawData ?? r0.rawText ?? r0._error ?? '(없음)',
      pnu1: r1.pnu, raw1: r1.rawData ?? r1.rawText ?? r1._error ?? '(없음)',
    },
  });
}

function extractItem(data) {
  // 응답이 { response: { ladfrlVOList: ... } } 또는 { ladfrlVOList: ... } 형태
  const body = data?.response ?? data;
  const list = body?.ladfrlVOList ?? body?.ladfrlList;
  const raw  = list?.ladfrlVOList ?? list?.ladfrlList ?? list?.ladfrl ?? list?.field;
  if (!raw) return null;
  const item = Array.isArray(raw) ? raw[0] : raw;
  return item || null;
}
