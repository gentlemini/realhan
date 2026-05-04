export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  if (!q.trim()) return Response.json([]);

  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=10`,
    {
      headers: {
        Authorization: `KakaoAK ${key}`,
        KA: 'sdk/2.0.0 os/web origin/localhost',
      },
      cache: 'no-store',
    }
  );
  if (!res.ok) return Response.json([]);
  const data = await res.json();

  return Response.json(
    (data.documents || []).map(doc => {
      const a = doc.address;
      const r = doc.road_address;
      return {
        addressName: doc.address_name,
        roadAddress: r?.address_name || doc.address_name,
        sigunguCd: a?.b_code?.slice(0, 5) || '',
        bjdongCd: a?.b_code?.slice(5, 10) || '',
        bun: a?.main_address_no || '0',
        ji: a?.sub_address_no || '0',
        lat: parseFloat(doc.y) || 0,
        lng: parseFloat(doc.x) || 0,
      };
    })
  );
}
