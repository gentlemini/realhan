const NOTION_API = 'https://api.notion.com/v1';

const HEADERS = () => ({
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
});

async function notion(path, init = {}) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: HEADERS(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Notion ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

const text = (s) => (s == null ? '' : String(s));
const rich = (s) => ({ rich_text: [{ text: { content: text(s).slice(0, 2000) } }] });
const title = (s) => ({ title: [{ text: { content: text(s).slice(0, 2000) } }] });
const num = (n) => ({ number: typeof n === 'number' ? n : null });
const sel = (s) => (s ? { select: { name: s } } : { select: null });
const multi = (arr) => ({ multi_select: (arr || []).filter(Boolean).map((name) => ({ name })) });
const phone = (s) => ({ phone_number: text(s) || null });
const rel = (id) => ({ relation: id ? [{ id }] : [] });

const getTitle = (p, k) => p?.[k]?.title?.[0]?.plain_text || '';
const getText = (p, k) => p?.[k]?.rich_text?.[0]?.plain_text || '';
const getNum = (p, k) => (typeof p?.[k]?.number === 'number' ? p[k].number : null);
const getSel = (p, k) => p?.[k]?.select?.name || '';
const getMulti = (p, k) => (p?.[k]?.multi_select || []).map((o) => o.name);
const getPhone = (p, k) => p?.[k]?.phone_number || '';
const getRel = (p, k) => (p?.[k]?.relation || []).map((r) => r.id);

const AD_SESS_DB = () => process.env.NOTION_AD_VACANCY_SESSIONS_DB_ID;
const AD_PIN_DB = () => process.env.NOTION_AD_VACANCY_PINS_DB_ID;
const AD_MEMO_DB = () => process.env.NOTION_AD_VACANCY_MEMOS_DB_ID;
const PM_SESS_DB = () => process.env.NOTION_PIN_MAP_SESSIONS_DB_ID;
const PM_PIN_DB = () => process.env.NOTION_PIN_MAP_PINS_DB_ID;

function requireDb(dbId, envName) {
  if (!dbId) {
    throw new Error(
      `환경변수 ${envName} 가 설정되지 않았습니다. .env.local 에 노션 DB ID 를 추가하고 dev 서버를 재시작해주세요.`
    );
  }
}

async function queryDB(dbId, body = {}) {
  if (!dbId) return { results: [] };
  return notion(`/databases/${dbId}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 100, ...body }),
  });
}

async function createPage(dbId, properties, envName) {
  requireDb(dbId, envName);
  return notion('/pages', {
    method: 'POST',
    body: JSON.stringify({ parent: { database_id: dbId }, properties }),
  });
}

async function patchPage(pageId, properties) {
  return notion(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

async function archivePage(pageId) {
  return notion(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true }),
  });
}

// ── 광고예정 세션 ─────────────────────────────────────
export async function listAdSessions() {
  const data = await queryDB(AD_SESS_DB(), {
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
  });
  return data.results.map((p) => ({
    id: p.id,
    name: getTitle(p.properties, '이름'),
    centerLat: getNum(p.properties, '중심위도'),
    centerLng: getNum(p.properties, '중심경도'),
    zoom: getNum(p.properties, '줌'),
    createdAt: p.created_time,
  }));
}

export async function createAdSession({ name, centerLat, centerLng, zoom }) {
  const page = await createPage(
    AD_SESS_DB(),
    {
      이름: title(name),
      중심위도: num(centerLat),
      중심경도: num(centerLng),
      줌: num(zoom),
    },
    'NOTION_AD_VACANCY_SESSIONS_DB_ID'
  );
  return { id: page.id };
}

export async function updateAdSession(id, { name, centerLat, centerLng, zoom }) {
  const props = {};
  if (name !== undefined) props['이름'] = title(name);
  if (centerLat !== undefined) props['중심위도'] = num(centerLat);
  if (centerLng !== undefined) props['중심경도'] = num(centerLng);
  if (zoom !== undefined) props['줌'] = num(zoom);
  await patchPage(id, props);
  return { ok: true };
}

export async function deleteAdSession(id) {
  // 세션에 속한 핀/메모 먼저 아카이브
  const [pins, memos] = await Promise.all([listAdPins(id), listAdMemos(id)]);
  await Promise.all([
    ...pins.map((p) => archivePage(p.id)),
    ...memos.map((m) => archivePage(m.id)),
  ]);
  await archivePage(id);
  return { ok: true };
}

// ── 광고예정 핀 ───────────────────────────────────────
export async function listAdPins(sessionId) {
  const data = await queryDB(AD_PIN_DB(), {
    filter: { property: '세션', relation: { contains: sessionId } },
    sorts: [{ property: '번호', direction: 'ascending' }],
  });
  return data.results.map((p) => ({
    id: p.id,
    building: getTitle(p.properties, '건물명'),
    sessionId: getRel(p.properties, '세션')[0] || '',
    number: getNum(p.properties, '번호'),
    lat: getNum(p.properties, '위도'),
    lng: getNum(p.properties, '경도'),
    address: getText(p.properties, '주소'),
    priceText: getText(p.properties, '가격원문'),
    statusTags: getMulti(p.properties, '상태태그'),
    phone: getPhone(p.properties, '전화'),
    rawText: getText(p.properties, '원본텍스트'),
    userMemo: getText(p.properties, '사용자메모'),
  }));
}

export async function createAdPin(pin) {
  const props = {
    건물명: title(pin.building || '(건물명 없음)'),
    세션: rel(pin.sessionId),
    위도: num(pin.lat),
    경도: num(pin.lng),
    주소: rich(pin.address),
    가격원문: rich(pin.priceText),
    상태태그: multi(pin.statusTags || []),
    전화: phone(pin.phone),
    원본텍스트: rich(pin.rawText),
    사용자메모: rich(pin.userMemo || ''),
  };
  if (typeof pin.number === 'number') props['번호'] = num(pin.number);
  const page = await createPage(AD_PIN_DB(), props, 'NOTION_AD_VACANCY_PINS_DB_ID');
  return { id: page.id };
}

export async function updateAdPin(id, patch) {
  const props = {};
  if (patch.building !== undefined) props['건물명'] = title(patch.building);
  if (patch.number !== undefined) props['번호'] = num(patch.number);
  if (patch.lat !== undefined) props['위도'] = num(patch.lat);
  if (patch.lng !== undefined) props['경도'] = num(patch.lng);
  if (patch.address !== undefined) props['주소'] = rich(patch.address);
  if (patch.priceText !== undefined) props['가격원문'] = rich(patch.priceText);
  if (patch.statusTags !== undefined) props['상태태그'] = multi(patch.statusTags);
  if (patch.phone !== undefined) props['전화'] = phone(patch.phone);
  if (patch.rawText !== undefined) props['원본텍스트'] = rich(patch.rawText);
  if (patch.userMemo !== undefined) props['사용자메모'] = rich(patch.userMemo);
  await patchPage(id, props);
  return { ok: true };
}

export async function deleteAdPin(id) {
  await archivePage(id);
  return { ok: true };
}

// ── 광고예정 메모 핀 ────────────────────────────────
function memoTitleFromText(memo, fallback) {
  const firstLine = String(memo || '').split('\n').find(Boolean) || '';
  return firstLine.slice(0, 30) || fallback || '메모';
}

export async function listAdMemos(sessionId) {
  const data = await queryDB(AD_MEMO_DB(), {
    filter: { property: '세션', relation: { contains: sessionId } },
  });
  return data.results.map((p) => ({
    id: p.id,
    title: getTitle(p.properties, '제목'),
    sessionId: getRel(p.properties, '세션')[0] || '',
    lat: getNum(p.properties, '위도'),
    lng: getNum(p.properties, '경도'),
    memo: getText(p.properties, '메모'),
    searchAddress: getText(p.properties, '검색주소'),
    createMethod: getSel(p.properties, '생성수단'),
    createdAt: p.created_time,
  }));
}

export async function createAdMemo(memo) {
  const titleText = memoTitleFromText(memo.memo, memo.searchAddress);
  const page = await createPage(
    AD_MEMO_DB(),
    {
      제목: title(titleText),
      세션: rel(memo.sessionId),
      위도: num(memo.lat),
      경도: num(memo.lng),
      메모: rich(memo.memo || ''),
      검색주소: rich(memo.searchAddress || ''),
      생성수단: sel(memo.createMethod || '우클릭'),
    },
    'NOTION_AD_VACANCY_MEMOS_DB_ID'
  );
  return { id: page.id };
}

export async function updateAdMemo(id, patch) {
  const props = {};
  if (patch.memo !== undefined) {
    props['메모'] = rich(patch.memo);
    props['제목'] = title(memoTitleFromText(patch.memo, patch.searchAddress));
  }
  if (patch.searchAddress !== undefined) props['검색주소'] = rich(patch.searchAddress);
  if (patch.lat !== undefined) props['위도'] = num(patch.lat);
  if (patch.lng !== undefined) props['경도'] = num(patch.lng);
  await patchPage(id, props);
  return { ok: true };
}

export async function deleteAdMemo(id) {
  await archivePage(id);
  return { ok: true };
}

// ── 핀맵 세션 (임장/기타 공용) ──────────────────────
export async function listPinSessions(kind) {
  const filter = kind
    ? { property: '종류', select: { equals: kind } }
    : undefined;
  const data = await queryDB(PM_SESS_DB(), {
    filter,
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
  });
  return data.results.map((p) => ({
    id: p.id,
    name: getTitle(p.properties, '이름'),
    kind: getSel(p.properties, '종류'),
    centerLat: getNum(p.properties, '중심위도'),
    centerLng: getNum(p.properties, '중심경도'),
    zoom: getNum(p.properties, '줌'),
    createdAt: p.created_time,
  }));
}

export async function createPinSession({ name, kind, centerLat, centerLng, zoom }) {
  const page = await createPage(
    PM_SESS_DB(),
    {
      이름: title(name),
      종류: sel(kind),
      중심위도: num(centerLat),
      중심경도: num(centerLng),
      줌: num(zoom),
    },
    'NOTION_PIN_MAP_SESSIONS_DB_ID'
  );
  return { id: page.id };
}

export async function updatePinSession(id, { name, centerLat, centerLng, zoom }) {
  const props = {};
  if (name !== undefined) props['이름'] = title(name);
  if (centerLat !== undefined) props['중심위도'] = num(centerLat);
  if (centerLng !== undefined) props['중심경도'] = num(centerLng);
  if (zoom !== undefined) props['줌'] = num(zoom);
  await patchPage(id, props);
  return { ok: true };
}

export async function deletePinSession(id) {
  const pins = await listPinPins(id);
  await Promise.all(pins.map((pin) => archivePage(pin.id)));
  await archivePage(id);
  return { ok: true };
}

// ── 핀맵 핀 ────────────────────────────────────────
export async function listPinPins(sessionId) {
  const data = await queryDB(PM_PIN_DB(), {
    filter: { property: '세션', relation: { contains: sessionId } },
  });
  return data.results.map((p) => ({
    id: p.id,
    title: getTitle(p.properties, '제목'),
    sessionId: getRel(p.properties, '세션')[0] || '',
    lat: getNum(p.properties, '위도'),
    lng: getNum(p.properties, '경도'),
    memo: getText(p.properties, '메모'),
    searchAddress: getText(p.properties, '검색주소'),
    createMethod: getSel(p.properties, '생성수단'),
    createdAt: p.created_time,
  }));
}

function pinTitleFromMemo(memo, fallback) {
  const firstLine = String(memo || '').split('\n').find(Boolean) || '';
  return firstLine.slice(0, 30) || fallback || '핀';
}

export async function createPinPin(pin) {
  const titleText = pinTitleFromMemo(pin.memo, pin.searchAddress);
  const page = await createPage(
    PM_PIN_DB(),
    {
      제목: title(titleText),
      세션: rel(pin.sessionId),
      위도: num(pin.lat),
      경도: num(pin.lng),
      메모: rich(pin.memo || ''),
      검색주소: rich(pin.searchAddress || ''),
      생성수단: sel(pin.createMethod || '우클릭'),
    },
    'NOTION_PIN_MAP_PINS_DB_ID'
  );
  return { id: page.id };
}

export async function updatePinPin(id, patch) {
  const props = {};
  if (patch.memo !== undefined) {
    props['메모'] = rich(patch.memo);
    props['제목'] = title(pinTitleFromMemo(patch.memo, patch.searchAddress));
  }
  if (patch.searchAddress !== undefined) props['검색주소'] = rich(patch.searchAddress);
  if (patch.lat !== undefined) props['위도'] = num(patch.lat);
  if (patch.lng !== undefined) props['경도'] = num(patch.lng);
  await patchPage(id, props);
  return { ok: true };
}

export async function deletePinPin(id) {
  await archivePage(id);
  return { ok: true };
}
