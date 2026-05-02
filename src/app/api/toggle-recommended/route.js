const NOTION_API = 'https://api.notion.com/v1';

export async function PATCH(request) {
  try {
    const { pageId, recommended } = await request.json();
    if (!pageId) return Response.json({ error: 'pageId 필요' }, { status: 400 });

    const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { '추천매물': { checkbox: !!recommended } },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Notion ${res.status}: ${JSON.stringify(err)}`);
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
