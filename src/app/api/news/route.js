// 네이버 뉴스 부동산 RSS + 노션 칼럼 통합 API

// 순서대로 시도 — 앞이 실패하면 다음 URL 사용
const RSS_URLS = [
  'https://www.hankyung.com/feed/realestate', // 한국경제 부동산 (주력)
  'https://www.hankyung.com/feed/all-news',   // 한국경제 전체 (백업)
];

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
};

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const get = (tag) => {
      const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`);
      const plainRe  = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
      const m = cdataRe.exec(block) || plainRe.exec(block);
      return m ? m[1].trim() : '';
    };

    const title       = decodeHtml(get('title'));
    const description = decodeHtml(get('description')).replace(/<[^>]+>/g, '');
    const pubDate     = get('pubDate');

    // link는 CDATA 처리된 get() 사용
    const link = get('link');

    if (!title) continue;

    // ID: 제목 기반 해시 (중복 방지)
    const idSrc = title.slice(0, 30) + pubDate;
    const id = `rss-${Buffer.from(idSrc).toString('base64').slice(0, 16)}`;

    items.push({
      id,
      source:  'rss',
      title,
      summary: description.slice(0, 150),
      link:    link || null,
      date:    pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
  }

  return items;
}

async function fetchRSS() {
  for (const url of RSS_URLS) {
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRSS(xml);
      if (items.length > 0) return items;
    } catch {
      // 다음 URL 시도
    }
  }
  return [];
}

async function getNotionNews() {
  const dbId = process.env.NOTION_NEWS_DB_ID;
  if (!dbId) return [];

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: '공개', checkbox: { equals: true } },
        sorts: [{ property: '날짜', direction: 'descending' }],
        page_size: 50,
      }),
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();

    return data.results
      .map((page) => {
        const p     = page.properties;
        const title = p['제목']?.title?.[0]?.plain_text || '';
        if (!title) return null;
        return {
          id:      page.id,
          source:  'column',
          title,
          summary: p['요약']?.rich_text?.[0]?.plain_text || '',
          link:    p['링크']?.url || null,
          date:    p['날짜']?.date?.start
            ? new Date(p['날짜'].date.start).toISOString()
            : new Date(page.created_time).toISOString(),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [rssItems, notionItems] = await Promise.all([
      fetchRSS(),
      getNotionNews(),
    ]);

    const merged = [...notionItems, ...rssItems].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return Response.json(merged);
  } catch {
    return Response.json([]);
  }
}
