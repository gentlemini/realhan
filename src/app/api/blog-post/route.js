import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { platform, title, content, tistory_blog, tistory_token, wp_url, wp_user, wp_pass } = await request.json();

    if (platform === 'tistory') {
      if (!tistory_blog || !tistory_token) {
        return NextResponse.json({ error: '티스토리 블로그명과 액세스 토큰이 필요합니다.' }, { status: 400 });
      }

      const params = new URLSearchParams({
        access_token: tistory_token,
        output: 'json',
        blogName: tistory_blog,
        title,
        content,
        visibility: '3',
        category: '0',
        acceptComment: '1',
      });

      const res = await fetch(`https://www.tistory.com/apis/post/write?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }

      if (!res.ok || data.tistory?.status !== '200') {
        const msg = data.tistory?.error_message || data.tistory?.status || `HTTP ${res.status}`;
        return NextResponse.json({ error: `티스토리 오류: ${msg}` }, { status: 400 });
      }

      const postUrl = data.tistory?.item?.url || `https://${tistory_blog}.tistory.com`;
      return NextResponse.json({ url: postUrl });
    }

    if (platform === 'wordpress') {
      if (!wp_url || !wp_user || !wp_pass) {
        return NextResponse.json({ error: 'WordPress 사이트 주소, 사용자명, 비밀번호가 필요합니다.' }, { status: 400 });
      }

      const base = wp_url.replace(/\/$/, '');
      const auth = Buffer.from(`${wp_user}:${wp_pass}`).toString('base64');

      const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({ title, content, status: 'publish' }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || data.code || `HTTP ${res.status}`;
        return NextResponse.json({ error: `WordPress 오류: ${msg}` }, { status: 400 });
      }

      return NextResponse.json({ url: data.link || base });
    }

    return NextResponse.json({ error: '지원하지 않는 플랫폼입니다.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
