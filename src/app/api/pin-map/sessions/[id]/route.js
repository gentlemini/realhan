import { updatePinSession, deletePinSession, listPinPins } from '@/lib/notionMaps';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const pins = await listPinPins(id);
    return Response.json({ pins });
  } catch (err) {
    console.error('[pin-map/sessions/[id] GET]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const out = await updatePinSession(id, body);
    return Response.json(out);
  } catch (err) {
    console.error('[pin-map/sessions/[id] PATCH]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const out = await deletePinSession(id);
    return Response.json(out);
  } catch (err) {
    console.error('[pin-map/sessions/[id] DELETE]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
