import { NextResponse } from 'next/server';

/* ── 설정 ── */
const WINDOW_MS   = 60_000;  // 1분 윈도우
const MAX_PER_WIN = 60;      // IP당 분당 최대 요청 수

const ALLOWED_ORIGINS = [
  'https://realhan.vercel.app',
  'http://localhost:3100',
  'http://localhost:3000',
];

const BLOCKED_UA = [
  'python-requests', 'python-urllib', 'scrapy',
  'wget/', 'libwww-perl', 'lwp-', 'go-http-client',
  'java/', 'okhttp', 'node-fetch',
];

/* ── 인메모리 Rate-Limit 카운터 ── */
const store = new Map();

function checkRateLimit(ip) {
  const window = Math.floor(Date.now() / WINDOW_MS);
  const key = `${ip}:${window}`;
  const count = (store.get(key) || 0) + 1;
  store.set(key, count);
  if (store.size > 3000) {
    for (const k of store.keys()) {
      if (parseInt(k.split(':').pop(), 10) < window - 1) store.delete(k);
    }
  }
  return count;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) return NextResponse.next();

  /* 제외 경로 */
  const exempt = [
    '/api/upload', '/api/setup/', '/api/inquiry',
    '/api/property-request', '/api/update-contract-status',
    '/api/address-search',
  ];
  if (exempt.some(p => pathname.startsWith(p))) return NextResponse.next();

  /* 1. 스크래퍼 User-Agent 차단 */
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (BLOCKED_UA.some(b => ua.includes(b))) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /* 2. 외부 도메인 직접 접근 차단 */
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(JSON.stringify({ error: '접근이 거부되었습니다.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /* 3. Rate Limiting */
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'anon';

  const count = checkRateLimit(ip);
  if (count > MAX_PER_WIN) {
    return new NextResponse(
      JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Limit': String(MAX_PER_WIN),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Remaining', String(MAX_PER_WIN - count));
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
