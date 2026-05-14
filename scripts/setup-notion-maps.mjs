// 노션에 "한민희 부동산 물건장부" 페이지를 찾아 그 아래에
// 광고예정_세션, 광고예정_핀, 핀맵_세션, 핀맵_핀 4개 DB를 자동 생성하고
// .env.local 에 ID 4개를 append 한다. 이미 ID 가 있으면 건드리지 않는다.
//
// 사용:  node scripts/setup-notion-maps.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.local');
const PARENT_PAGE_NAME = '한민희 부동산 물건장부';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const ENV_KEYS = {
  AD_SESS: 'NOTION_AD_VACANCY_SESSIONS_DB_ID',
  AD_PIN:  'NOTION_AD_VACANCY_PINS_DB_ID',
  AD_MEMO: 'NOTION_AD_VACANCY_MEMOS_DB_ID',
  PM_SESS: 'NOTION_PIN_MAP_SESSIONS_DB_ID',
  PM_PIN:  'NOTION_PIN_MAP_PINS_DB_ID',
};

// ── .env.local 로더 (간이) ─────────────────────────
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
  return { env, raw: txt };
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

async function findParentPage(token, name) {
  const data = await notion(token, '/search', {
    method: 'POST',
    body: JSON.stringify({
      query: name,
      filter: { property: 'object', value: 'page' },
      page_size: 20,
    }),
  });
  const candidates = (data.results || []).filter((p) => p.object === 'page');
  if (candidates.length === 0) return null;
  // 정확히 매칭되는 제목 우선
  const matchExact = candidates.find((p) => {
    const t = (Object.values(p.properties || {})
      .find((pr) => pr.type === 'title')?.title || [])
      .map((s) => s.plain_text).join('');
    return t === name;
  });
  return matchExact || candidates[0];
}

function pageTitle(page) {
  const tp = Object.values(page.properties || {}).find((pr) => pr.type === 'title');
  return (tp?.title || []).map((s) => s.plain_text).join('') || '(제목 없음)';
}

async function createDatabase(token, parentPageId, dbName, properties) {
  const body = {
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: dbName } }],
    properties,
  };
  const created = await notion(token, '/databases', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return created.id;
}

// ── 4개 DB 스펙 ──────────────────────────────────
function adSessionProps() {
  return {
    '이름':     { title: {} },
    '중심위도': { number: {} },
    '중심경도': { number: {} },
    '줌':       { number: {} },
    '생성일':   { created_time: {} },
  };
}

function adPinProps(sessionDbId) {
  return {
    '건물명':     { title: {} },
    '세션':       { relation: { database_id: sessionDbId, single_property: {} } },
    '번호':       { number: {} },
    '위도':       { number: {} },
    '경도':       { number: {} },
    '주소':       { rich_text: {} },
    '가격원문':   { rich_text: {} },
    '상태태그':   { multi_select: { options: [] } },
    '전화':       { phone_number: {} },
    '원본텍스트': { rich_text: {} },
    '사용자메모': { rich_text: {} },
  };
}

function pinSessionProps() {
  return {
    '이름':     { title: {} },
    '종류':     {
      select: {
        options: [
          { name: '임장', color: 'blue' },
          { name: '기타', color: 'gray' },
        ],
      },
    },
    '중심위도': { number: {} },
    '중심경도': { number: {} },
    '줌':       { number: {} },
    '생성일':   { created_time: {} },
  };
}

function adMemoProps(sessionDbId) {
  return {
    '제목':     { title: {} },
    '세션':     { relation: { database_id: sessionDbId, single_property: {} } },
    '위도':     { number: {} },
    '경도':     { number: {} },
    '메모':     { rich_text: {} },
    '검색주소': { rich_text: {} },
    '생성수단': {
      select: {
        options: [
          { name: '우클릭', color: 'orange' },
        ],
      },
    },
  };
}

function pinPinProps(sessionDbId) {
  return {
    '제목':     { title: {} },
    '세션':     { relation: { database_id: sessionDbId, single_property: {} } },
    '위도':     { number: {} },
    '경도':     { number: {} },
    '메모':     { rich_text: {} },
    '검색주소': { rich_text: {} },
    '생성수단': {
      select: {
        options: [
          { name: '검색', color: 'green' },
          { name: '우클릭', color: 'orange' },
        ],
      },
    },
  };
}

// ── .env.local 에 KEY=VALUE append (이미 있는 키는 skip) ──
function appendEnvLines(rawEnv, lines) {
  let updated = rawEnv;
  if (!updated.endsWith('\n')) updated += '\n';
  let added = 0;
  for (const [key, value] of lines) {
    const re = new RegExp(`^\\s*${key}\\s*=`, 'm');
    if (re.test(updated)) continue;
    updated += `${key}=${value}\n`;
    added++;
  }
  return { updated, added };
}

// ── main ─────────────────────────────────────────
async function main() {
  const { env, raw } = loadEnvLocal();
  const token = env.NOTION_API_KEY;
  if (!token) {
    console.error('❌ .env.local 에 NOTION_API_KEY 가 없습니다.');
    process.exit(1);
  }

  console.log(`🔍 노션에서 "${PARENT_PAGE_NAME}" 페이지 검색...`);
  const parent = await findParentPage(token, PARENT_PAGE_NAME);
  if (!parent) {
    console.error('❌ 페이지를 찾을 수 없습니다.');
    console.error('   → 해당 페이지에 Integration 이 연결되어 있는지 확인해주세요.');
    process.exit(1);
  }
  console.log(`   ✓ 찾음: "${pageTitle(parent)}" (id=${parent.id})`);

  // 이미 env 에 ID 가 있으면 그 DB 는 건너뛴다 (idempotent)
  const all = Object.values(ENV_KEYS);
  const missing = all.filter((k) => !env[k]);
  if (missing.length === 0) {
    console.log('✅ 모든 환경변수가 이미 설정되어 있습니다. 작업할 게 없습니다.');
    console.log('   (특정 DB 를 다시 만들고 싶다면 .env.local 에서 해당 줄을 지우고 재실행하세요)');
    return;
  }
  console.log(`📦 생성 대상: ${missing.join(', ')}`);

  const ids = {};
  for (const k of all) if (env[k]) ids[k] = env[k];

  // 1. 광고예정_세션
  if (!ids[ENV_KEYS.AD_SESS]) {
    console.log('   광고예정_세션 생성...');
    ids[ENV_KEYS.AD_SESS] = await createDatabase(token, parent.id, '광고예정_세션', adSessionProps());
    console.log(`     ✓ ${ids[ENV_KEYS.AD_SESS]}`);
  }
  // 2. 광고예정_핀 (광고예정_세션 ID 필요)
  if (!ids[ENV_KEYS.AD_PIN]) {
    console.log('   광고예정_핀 생성...');
    ids[ENV_KEYS.AD_PIN] = await createDatabase(token, parent.id, '광고예정_핀', adPinProps(ids[ENV_KEYS.AD_SESS]));
    console.log(`     ✓ ${ids[ENV_KEYS.AD_PIN]}`);
  }
  // 3. 광고예정_메모 (광고예정_세션 ID 필요)
  if (!ids[ENV_KEYS.AD_MEMO]) {
    console.log('   광고예정_메모 생성...');
    ids[ENV_KEYS.AD_MEMO] = await createDatabase(token, parent.id, '광고예정_메모', adMemoProps(ids[ENV_KEYS.AD_SESS]));
    console.log(`     ✓ ${ids[ENV_KEYS.AD_MEMO]}`);
  }
  // 4. 핀맵_세션
  if (!ids[ENV_KEYS.PM_SESS]) {
    console.log('   핀맵_세션 생성...');
    ids[ENV_KEYS.PM_SESS] = await createDatabase(token, parent.id, '핀맵_세션', pinSessionProps());
    console.log(`     ✓ ${ids[ENV_KEYS.PM_SESS]}`);
  }
  // 5. 핀맵_핀 (핀맵_세션 ID 필요)
  if (!ids[ENV_KEYS.PM_PIN]) {
    console.log('   핀맵_핀 생성...');
    ids[ENV_KEYS.PM_PIN] = await createDatabase(token, parent.id, '핀맵_핀', pinPinProps(ids[ENV_KEYS.PM_SESS]));
    console.log(`     ✓ ${ids[ENV_KEYS.PM_PIN]}`);
  }

  // .env.local 업데이트 (이미 있는 키는 skip)
  const linesToAdd = missing.map((k) => [k, ids[k]]);
  const { updated, added } = appendEnvLines(raw, linesToAdd);
  fs.writeFileSync(ENV_FILE, updated, 'utf8');

  console.log(`\n✅ 완료. .env.local 에 ${added}개 줄 추가됨.`);
  console.log('\n──── 출력 (Vercel 등에 복붙용) ────');
  for (const [k, v] of linesToAdd) console.log(`${k}=${v}`);
  console.log('───────────────────────────');
  console.log('\n👉 이제 dev 서버를 재시작해주세요 (Ctrl+C → npm run dev).');
}

main().catch((err) => {
  console.error('\n❌ 실패:', err.message);
  process.exit(1);
});
