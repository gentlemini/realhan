import { updatePinPin, deletePinPin } from '@/lib/notionMaps';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const out = await updatePinPin(id, body);
    return Response.json(out);
  } catch (err) {
    console.error('[pin-map/pins/[id] PATCH]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const out = await deletePinPin(id);
    return Response.json(out);
  } catch (err) {
    console.error('[pin-map/pins/[id] DELETE]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
