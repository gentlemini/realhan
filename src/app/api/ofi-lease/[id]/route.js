import { buildFields } from '../buildFields';

const NOTION_API = 'https://api.notion.com/v1';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const fields = buildFields(data);

    const res = await fetch(`${NOTION_API}/pages/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties: fields }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Notion ${res.status}: ${JSON.stringify(err)}`);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[ofi-lease/PATCH]', err);
    return Response.json({ error: err.message || '수정 실패' }, { status: 500 });
  }
}
