const NOTION_API = 'https://api.notion.com/v1';

export async function queryAllPages(dbId) {
  const headers = {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  const allResults = [];
  let startCursor = undefined;

  while (true) {
    const body = {
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      page_size: 100,
    };
    if (startCursor) body.start_cursor = startCursor;

    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Notion ${res.status}`);
    const data = await res.json();
    allResults.push(...data.results);

    if (!data.has_more) break;
    startCursor = data.next_cursor;
  }

  return allResults;
}
