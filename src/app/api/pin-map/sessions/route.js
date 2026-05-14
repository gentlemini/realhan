import { listPinSessions, createPinSession } from '@/lib/notionMaps';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind') || undefined;
    if (kind && kind !== '임장' && kind !== '기타') {
      return Response.json({ error: 'kind 는 임장 또는 기타' }, { status: 400 });
    }
    const data = await listPinSessions(kind);
    return Response.json(data);
  } catch (err) {
    console.error('[pin-map/sessions GET]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, kind, centerLat, centerLng, zoom } = body || {};
    if (!name) return Response.json({ error: '이름 필요' }, { status: 400 });
    if (kind !== '임장' && kind !== '기타') {
      return Response.json({ error: 'kind 는 임장 또는 기타' }, { status: 400 });
    }
    const out = await createPinSession({ name, kind, centerLat, centerLng, zoom });
    return Response.json(out);
  } catch (err) {
    console.error('[pin-map/sessions POST]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
