import { updateAdPin, deleteAdPin } from '@/lib/notionMaps';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const out = await updateAdPin(id, body);
    return Response.json(out);
  } catch (err) {
    console.error('[ad-vacancy/pins/[id] PATCH]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const out = await deleteAdPin(id);
    return Response.json(out);
  } catch (err) {
    console.error('[ad-vacancy/pins/[id] DELETE]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
