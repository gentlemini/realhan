const NOTION_API = 'https://api.notion.com/v1';
const DB_ID = process.env.NOTION_REQUEST_DB_ID;

export async function POST(req) {
  try {
    const { name, phone, email, propertyType, transaction, location, price, area, memo } = await req.json();
    if (!name || !phone) {
      return Response.json({ error: '이름과 연락처는 필수입니다.' }, { status: 400 });
    }

    const addR = (v) => ({ rich_text: [{ text: { content: v ? String(v) : '-' } }] });
    const addS = (v) => v ? { select: { name: String(v) } } : undefined;

    const properties = {
      '의뢰인이름': { title: [{ text: { content: String(name) } }] },
      '연락처':     addR(phone),
      '이메일':     addR(email),
      '소재지':     addR(location),
      '희망가격':   addR(price),
      '면적':       addR(area),
      '추가내용':   addR(memo),
      '처리상태':   { select: { name: '미확인' } },
    };
    if (propertyType) properties['매물종류'] = addS(propertyType);
    if (transaction)  properties['거래종류'] = addS(transaction);

    const res = await fetch(`${NOTION_API}/pages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parent: { database_id: DB_ID }, properties }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json({ error: err.message || '저장 실패' }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
