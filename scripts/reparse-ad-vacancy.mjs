// 광고예정 핀의 priceText·statusTags 를 원본텍스트(rawText)로 재파싱하는 일회성 스크립트
// 파서가 개선되었을 때, 이전에 잘못 분류된 항목을 일괄 보정한다.
//
// 사용법:
//   node scripts/reparse-ad-vacancy.mjs                  # 전체 세션 미리보기 (변경 없음)
//   node scripts/reparse-ad-vacancy.mjs --apply          # 전체 세션 실제 적용
//   node scripts/reparse-ad-vacancy.mjs --session=<id>   # 특정 세션만 미리보기
//   node scripts/reparse-ad-vacancy.mjs --session=<id> --apply

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.local');

// parse.js (src) 를 그대로 임포트 — Node 22+ 가 ESM 문법 자동 감지
const PARSE_URL = pathToFileURL(path.join(ROOT, 'src/app/admin2/ad-vacancy/parse.js')).href;
const { parseListing } = await import(PARSE_URL);

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// ── .env.local 로더 ────────────────────────────────
function loadEnvLocal() {
  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(`.env.local 파일이 없습니다: ${ENV_FILE}`);
  }
  const txt = fs.readFileSync(ENV_FILE, 'utf8');
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

async function notion(token, pathStr, init = {}) {
  const res = await fetch(`${NOTION_API}${pathStr}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Notion ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return json;
}

// ── Notion 도우미 ──────────────────────────────────
const getText = (p, k) => p?.[k]?.rich_text?.[0]?.plain_text || '';
const getMulti = (p, k) => (p?.[k]?.multi_select || []).map((o) => o.name);
const getTitle = (p, k) => p?.[k]?.title?.[0]?.plain_text || '';
const getRel = (p, k) => (p?.[k]?.relation || []).map((r) => r.id);

async function listAllPins(token, dbId, sessionId) {
  const results = [];
  let cursor = undefined;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    if (sessionId) body.filter = { property: '세션', relation: { contains: sessionId } };
    const data = await notion(token, `/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    results.push(...(data.results || []));
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return results;
}

async function patchPin(token, pageId, priceText, statusTags) {
  return notion(token, `/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: {
        '가격원문': { rich_text: [{ text: { content: String(priceText || '').slice(0, 2000) } }] },
        '상태태그': { multi_select: (statusTags || []).filter(Boolean).map((name) => ({ name })) },
      },
    }),
  });
}

// 배열 동등 비교 (순서 무관)
function arraysEqualSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = new Set(a); const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

// ── main ──────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const sessionArg = args.find((a) => a.startsWith('--session='));
  const sessionId = sessionArg ? sessionArg.slice('--session='.length) : null;

  const env = loadEnvLocal();
  const token = env.NOTION_API_KEY;
  const dbId = env.NOTION_AD_VACANCY_PINS_DB_ID;
  if (!token) throw new Error('.env.local 에 NOTION_API_KEY 가 없습니다');
  if (!dbId) throw new Error('.env.local 에 NOTION_AD_VACANCY_PINS_DB_ID 가 없습니다');

  console.log(`[모드] ${apply ? '실제 적용' : '미리보기 (dry-run)'}${sessionId ? ` · 세션=${sessionId}` : ' · 전체 세션'}`);
  console.log('핀 조회 중...');

  const pages = await listAllPins(token, dbId, sessionId);
  console.log(`핀 ${pages.length}건 발견`);

  let scanned = 0;
  let changed = 0;
  let applied = 0;
  let skippedNoRaw = 0;

  for (const p of pages) {
    scanned++;
    const props = p.properties;
    const rawText = getText(props, '원본텍스트');
    const currentPrice = getText(props, '가격원문');
    const currentTags = getMulti(props, '상태태그');
    const building = getTitle(props, '건물명');

    if (!rawText) { skippedNoRaw++; continue; }

    const parsed = parseListing(rawText);
    const newPrice = parsed.price || '';
    const newTags = parsed.status || [];

    const priceDiff = newPrice !== currentPrice;
    const tagsDiff = !arraysEqualSet(currentTags, newTags);
    if (!priceDiff && !tagsDiff) continue;

    changed++;
    console.log(`\n[변경] ${building || '(건물명 없음)'}  (page=${p.id})`);
    if (priceDiff) console.log(`  가격원문: "${currentPrice}"  →  "${newPrice}"`);
    if (tagsDiff) console.log(`  상태태그: [${currentTags.join(', ')}]  →  [${newTags.join(', ')}]`);

    if (apply) {
      try {
        await patchPin(token, p.id, newPrice, newTags);
        applied++;
        await new Promise((r) => setTimeout(r, 120)); // Notion rate limit 여유
      } catch (err) {
        console.error(`  ❌ PATCH 실패: ${err.message}`);
      }
    }
  }

  console.log('\n────────────────────────────');
  console.log(`스캔: ${scanned}건 / 변경필요: ${changed}건 / 적용: ${applied}건 / rawText없음: ${skippedNoRaw}건`);
  if (!apply && changed > 0) {
    console.log('\n👉 실제 적용하려면 --apply 옵션을 붙여 다시 실행하세요.');
  }
}

main().catch((err) => {
  console.error('실패:', err);
  process.exit(1);
});
