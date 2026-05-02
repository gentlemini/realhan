const NOTION_API = 'https://api.notion.com/v1';

export async function POST(request) {
  try {
    const { pageId, newCount } = await request.json();
    if (!pageId || typeof newCount !== 'number') {
      return Response.json({ error: 'invalid' }, { status: 400 });
    }
    const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { '조회수': { number: newCount } },
      }),
    });
    if (!res.ok) return Response.json({ error: 'notion error' }, { status: 500 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
