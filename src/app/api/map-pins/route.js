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

const notionHeaders = {
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

async function queryPinsByMemo(page, memoFilter) {
  const res = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
    method: 'POST',
    headers: notionHeaders,
    body: JSON.stringify({ filter: { and: [{ property: '페이지', select: { equals: page } }, memoFilter] }, page_size: 100 }),
  });
  if (!res.ok) throw new Error(`Notion query ${res.status}`);
  return (await res.json()).results.map(p => p.id);
}

async function patchMemo(ids, memo) {
  await Promise.all(ids.map(id =>
    fetch(`${NOTION_API}/pages/${id}`, {
      method: 'PATCH',
      headers: notionHeaders,
      body: JSON.stringify({ properties: { 메모: { rich_text: [{ text: { content: memo } }] } } }),
    })
  ));
}

// PATCH: save(미저장→세션) or rename(세션 이름 변경)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { page, toSession, fromSession } = body;

    if (fromSession !== undefined) {
      // 세션 이름 변경
      const ids = await queryPinsByMemo(page, { property: '메모', rich_text: { equals: fromSession } });
      await patchMemo(ids, toSession);
      return Response.json({ ok: true, count: ids.length });
    }

    // 미저장 핀들을 세션으로 저장
    const ids = await queryPinsByMemo(page, { property: '메모', rich_text: { is_empty: true } });
    await patchMemo(ids, toSession);
    return Response.json({ ok: true, count: ids.length });
  } catch (err) {
    console.error('[map-pins/PATCH]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: 세션 전체 핀 삭제
export async function DELETE(request) {
  try {
    const { page, session } = await request.json();
    const ids = await queryPinsByMemo(page, { property: '메모', rich_text: { equals: session } });
    await Promise.all(ids.map(id =>
      fetch(`${NOTION_API}/pages/${id}`, {
        method: 'PATCH',
        headers: notionHeaders,
        body: JSON.stringify({ archived: true }),
      })
    ));
    return Response.json({ ok: true, count: ids.length });
  } catch (err) {
    console.error('[map-pins/DELETE]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
