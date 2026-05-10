const NOTION_API = 'https://api.notion.com/v1';

const headers = {
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { name } = await request.json();
    const res = await fetch(`${NOTION_API}/pages/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ properties: { 이름: { title: [{ text: { content: name } }] } } }),
    });
    if (!res.ok) throw new Error(`Notion ${res.status}`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[map-pins/id/PATCH]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const res = await fetch(`${NOTION_API}/pages/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ archived: true }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Notion ${res.status}: ${JSON.stringify(err)}`);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[map-pins/DELETE]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
