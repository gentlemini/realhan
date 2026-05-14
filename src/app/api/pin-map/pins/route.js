import { createPinPin, listPinPins } from '@/lib/notionMaps';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return Response.json({ error: 'sessionId 필요' }, { status: 400 });
    const pins = await listPinPins(sessionId);
    return Response.json(pins);
  } catch (err) {
    console.error('[pin-map/pins GET]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.sessionId) return Response.json({ error: 'sessionId 필요' }, { status: 400 });
    const out = await createPinPin(body);
    return Response.json(out);
  } catch (err) {
    console.error('[pin-map/pins POST]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
