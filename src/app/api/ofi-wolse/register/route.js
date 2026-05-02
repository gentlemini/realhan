import { buildFields } from '../buildFields';

const NOTION_API = 'https://api.notion.com/v1';
const DB_ID = '351972da7fdc4677a80719166531b1d6';

export async function POST(request) {
  try {
    const data = await request.json();
    const fields = buildFields(data);

    const res = await fetch(`${NOTION_API}/pages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parent: { database_id: DB_ID }, properties: fields }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Notion ${res.status}: ${JSON.stringify(err)}`);
    }

    const page = await res.json();
    return Response.json({ id: page.id }, { status: 201 });
  } catch (err) {
    console.error('[ofi-wolse/register]', err);
    return Response.json({ error: err.message || '저장 실패' }, { status: 500 });
  }
}
