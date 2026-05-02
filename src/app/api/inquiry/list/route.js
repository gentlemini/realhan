const NOTION_API = 'https://api.notion.com/v1';
const DB_ID = process.env.NOTION_INQUIRY_DB_ID;

export async function GET() {
  try {
    const res = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sorts: [{ timestamp: 'created_time', direction: 'descending' }], page_size: 100 }),
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`Notion ${res.status}`);
    const data = await res.json();

    const gR = (f) => f?.rich_text?.[0]?.plain_text || '';
    const gS = (f) => f?.select?.name || '';
    const gT = (f) => f?.title?.[0]?.plain_text || '';

    const items = data.results.map(page => ({
      id:           page.id,
      name:         gT(page.properties['이름']),
      phone:        gR(page.properties['연락처']),
      email:        gR(page.properties['이메일']),
      type:         gS(page.properties['관심매물종류']),
      budget:       gR(page.properties['예산']),
      message:      gR(page.properties['문의내용']),
      status:       gS(page.properties['처리상태']),
      created_time: page.created_time,
    }));

    return Response.json(items);
  } catch (e) {
    return Response.json([], { status: 200 });
  }
}
