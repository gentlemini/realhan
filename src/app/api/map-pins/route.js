const NOTION_API = 'https://api.notion.com/v1';
const DB_ID = process.env.NOTION_MAP_PINS_DB_ID;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page'); // '매물지도' | '금액지도' | null(전체)

  try {
    const filter = page
      ? { property: '페이지', select: { equals: page } }
      : undefined;

    const res = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter, page_size: 100 }),
    });

    if (!res.ok) throw new Error(`Notion ${res.status}`);
    const data = await res.json();

    const pins = data.results.map(p => ({
      id: p.id,
      name: p.properties['이름']?.title?.[0]?.plain_text || '',
      lat: p.properties['위도']?.number ?? 0,
      lng: p.properties['경도']?.number ?? 0,
      page: p.properties['페이지']?.select?.name || '',
      memo: p.properties['메모']?.rich_text?.[0]?.plain_text || '',
    }));

    return Response.json(pins);
  } catch (err) {
    console.error('[map-pins/GET]', err);
    return Response.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const { name, lat, lng, page, memo } = await request.json();

    const res = await fetch(`${NOTION_API}/pages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: DB_ID },
        properties: {
          이름: { title: [{ text: { content: name } }] },
          위도: { number: lat },
          경도: { number: lng },
          페이지: { select: { name: page } },
          메모: { rich_text: [{ text: { content: memo || '' } }] },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Notion ${res.status}: ${JSON.stringify(err)}`);
    }

    const created = await res.json();
    return Response.json({ ok: true, id: created.id });
  } catch (err) {
    console.error('[map-pins/POST]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// 현재(미저장) 핀들을 세션 이름으로 일괄 저장
export async function PATCH(request) {
  try {
    const { page, toSession } = await request.json();

    // 1. 해당 페이지의 메모(세션)가 비어있는 핀 조회
    const queryRes = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          and: [
            { property: '페이지', select: { equals: page } },
            { property: '메모', rich_text: { is_empty: true } },
          ],
        },
        page_size: 100,
      }),
    });

    if (!queryRes.ok) throw new Error(`Notion query ${queryRes.status}`);
    const queryData = await queryRes.json();
    const ids = queryData.results.map(p => p.id);

    // 2. 각 핀의 메모를 세션 이름으로 업데이트
    await Promise.all(ids.map(id =>
      fetch(`${NOTION_API}/pages/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { 메모: { rich_text: [{ text: { content: toSession } }] } },
        }),
      })
    ));

    return Response.json({ ok: true, count: ids.length });
  } catch (err) {
    console.error('[map-pins/PATCH]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
