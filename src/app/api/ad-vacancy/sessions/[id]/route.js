import { updateAdSession, deleteAdSession, listAdPins } from '@/lib/notionMaps';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const pins = await listAdPins(id);
    return Response.json({ pins });
  } catch (err) {
    console.error('[ad-vacancy/sessions/[id] GET]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const out = await updateAdSession(id, body);
    return Response.json(out);
  } catch (err) {
    console.error('[ad-vacancy/sessions/[id] PATCH]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const out = await deleteAdSession(id);
    return Response.json(out);
  } catch (err) {
    console.error('[ad-vacancy/sessions/[id] DELETE]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
