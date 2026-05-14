import { createAdMemo, listAdMemos } from '@/lib/notionMaps';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return Response.json({ error: 'sessionId 필요' }, { status: 400 });
    const memos = await listAdMemos(sessionId);
    return Response.json(memos);
  } catch (err) {
    console.error('[ad-vacancy/memos GET]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.sessionId) return Response.json({ error: 'sessionId 필요' }, { status: 400 });
    const out = await createAdMemo(body);
    return Response.json(out);
  } catch (err) {
    console.error('[ad-vacancy/memos POST]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
