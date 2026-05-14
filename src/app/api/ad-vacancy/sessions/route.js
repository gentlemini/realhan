import { listAdSessions, createAdSession } from '@/lib/notionMaps';

export async function GET() {
  try {
    const data = await listAdSessions();
    return Response.json(data);
  } catch (err) {
    console.error('[ad-vacancy/sessions GET]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, centerLat, centerLng, zoom } = body || {};
    if (!name) return Response.json({ error: '이름 필요' }, { status: 400 });
    const out = await createAdSession({ name, centerLat, centerLng, zoom });
    return Response.json(out);
  } catch (err) {
    console.error('[ad-vacancy/sessions POST]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
