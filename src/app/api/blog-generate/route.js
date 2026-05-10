import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/* ── 고정 사무소 정보 ── */
const OFFICE = {
  agentName:   '한민희',
  agentTitle:  '부장',
  agentPhone:  '010-4706-8253',
  agentEmail:  'zsaza@naver.com',
  blogName:    '친절한한부장',
  officeName:  '한결부동산공인중개사사무소',
  ceoName:     '이동한',
  officePhone: '051-612-5155',
  address:     '부산광역시 남구 대연동 368-1',
  license:     '제26290-2019-00094호',
  homepage:    'https://realhan.vercel.app',
};

/* ── 유틸 ── */
function formatPrice(v) {
  if (v == null || v === '' || v === '-') return null;
  const n = Number(v);
  if (isNaN(n) || n === 0) return null;
  if (n >= 10000) {
    const eok = Math.floor(n / 10000);
    const man = n % 10000;
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${n.toLocaleString()}만원`;
}

function stripMd(t) {
  return t
    .replace(/^#{1,6}\s+/gm, '')       // ### 제목
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **굵게**
    .replace(/\*(.+?)\*/g, '$1')       // *이탤릭*
    .replace(/__(.+?)__/g, '$1')       // __굵게__
    .replace(/_(.+?)_/g, '$1')         // _이탤릭_
    .replace(/^[\-\*]\s+/gm, '')       // - 목록
    .replace(/^\d+\.\s+/gm, '')        // 1. 번호 목록
    .replace(/`(.+?)`/g, '$1')         // `코드`
    .trim();
}

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function p_name(p)        { return p.title || p.apt_name || p.building_name || p.name || ''; }
function p_location(p)    { return p.road_address || p.location || p.address || ''; }
function p_deposit(p)     { return p.deposit || p.monthly_deposit || p.lease_deposit; }
function p_rent(p)        { return p.monthly_rent || p.rent; }
function p_jeonse(p)      { return p.jeonse_price || p.lease_price; }
function p_sale(p)        { return p.sale_price || p.price; }
function p_maintenance(p) { return p.maintenance || p.management_fee; }
function p_maint_items(p) { return p.maintenance_items || p.management_fee_items; }
function p_move_in(p)     { return p.move_in || p.move_in_date || p.available_date; }
function p_built(p)       { return p.built_year || p.use_approved; }

function buildPrices(p) {
  const tx = p.transaction;
  if (tx === '매매') return [{ label: '매매가',    value: formatPrice(p_sale(p)),    highlight: true }];
  if (tx === '전세') return [{ label: '전세보증금', value: formatPrice(p_jeonse(p)), highlight: true }];
  if (tx === '월세') return [
    { label: '보증금', value: formatPrice(p_deposit(p)) },
    { label: '월&nbsp;세', value: formatPrice(p_rent(p)), highlight: true },
  ];
  return [];
}

function buildPostTitle(p) {
  return [p.transaction, p.category, p_name(p)].filter(Boolean).join(' ');
}

function kakaoStaticMapUrl(lat, lng) {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!key || !lat || !lng) return null;
  return `https://dapi.kakao.com/v2/maps/staticmap?center=${lng},${lat}&level=3&w=720&h=260&marker=pos:${lng}%20${lat}%7Cstyle:red&appkey=${key}`;
}

/* ══════════════════════════════════════════
   Claude Haiku — 스토리 전체 생성
   지침서 규칙 완전 적용
   ══════════════════════════════════════════ */
async function generateStory(p, apiKey) {
  const name     = p_name(p);
  const location = p_location(p);
  const prices   = buildPrices(p);
  const maint    = p_maintenance(p);
  const maintItems = p_maint_items(p);
  const options  = [p.opt_ac, p.opt_general, p.opt_security, p.opt_extra, p.opt_parking].filter(v => v && v !== '-');
  const area     = p.exclusive_area ? `전용 ${p.exclusive_area}㎡` : p.supply_area ? `공급 ${p.supply_area}㎡` : '';
  const floor    = p.curr_floor ? `${p.curr_floor}층` : '';
  const desc     = p.description && p.description !== '-' ? p.description : '';
  const moveIn   = p_move_in(p) || '';
  const imageCount = Array.isArray(p.imageUrls) ? p.imageUrls.length : 0;

  const priceStr = [
    ...prices.map(pr => pr.value ? `${pr.label.replace(/&nbsp;/g,' ')} ${pr.value}` : null),
    maint && `관리비 ${formatPrice(maint) || maint+'만원'}${maintItems ? `(${maintItems} 포함)` : ''}`,
  ].filter(Boolean).join(' / ');

  const typeDescs = {
    A: '도입(분위기 중심) → 구조 설명 → 주변환경 → 실입주 느낌 → 마무리',
    B: '도입(입지 중심) → 세부 구조(방·주방·욕실) → 장단점 → 정리',
    C: '도입(스토리형) → 사진 중심 전개 → 건물 관리·편의 → 요약',
  };

  const commonRules = `## 절대 규칙
0. 사실 기반 작성 절대 원칙: 경력 연수, 거래 건수, 고객 수 등 검증할 수 없는 수치·사실 임의 생성 금지. 제공된 데이터만 활용할 것.
1. "신축", "협의입주" 단어 절대 금지
2. 단점 반드시 1개 이상 자연스럽게 포함
3. 전체 분량 1,800자 이상
4. 친근한 존댓말, 과장·광고 어투 금지
5. "한결부동산 공인중개사 한민희 부장" 정확히 1회 포함
6. "친절한한부장" 자연스럽게 1회 이상 포함
7. 위치(${location})에 맞는 고객층 표현 포함
8. 실제 현장 방문한 공인중개사 시점으로 작성
9. 채광·환기·소음·생활동선·주변 접근성 묘사 포함
10. 사진 배치는 [사진1], [사진2] 형태로 본문 자연스러운 위치에 삽입
11. 실제 주소지(${location})에 맞는 주변환경·상권·교통 설명, 해시태그도 해당 주소지 기반 생성
12. 매물 상세정보 내용이 있을 경우 적극 활용${desc ? `\n\n[매물 상세정보]\n${desc}` : ''}

## 공통 출력 규칙
- 마크다운 절대 사용 금지 (#, ##, **, __, -, * 등)
- 줄바꿈으로만 단락 구분
- 동일한 문장·표현 반복 금지 (네이버 저품질 필터 회피)
- 키워드 과도한 반복 금지 — 자연스러운 밀도 유지`;

  const propertyInfo = `## 매물 정보
- 종류: ${p.category || ''} ${p.transaction || ''}
- 제목: ${name}
- 위치: ${location}
- 가격: ${priceStr}
- 면적: ${area}
- 층수: ${floor}
- 방향: ${p.direction || ''}
- 방수/욕실: ${p.rooms ? p.rooms+'개' : ''}${p.bathrooms ? ' / '+p.bathrooms+'개' : ''}
- 주차: ${p.parking_yn || ''}
- 입주가능: ${moveIn}
- 사용승인: ${p_built(p) || ''}
- 옵션: ${options.join(', ') || '없음'}
- 사진: ${imageCount}장 있음
- 상세설명: ${desc || '없음 (매물 특징 중심으로 작성)'}`;

  /* ── 단일 플랫폼 프롬프트 ── */
  const types = ['A', 'B', 'C'];
  const typeKey = types[Math.floor(Math.random() * 3)];

  const prompt = `당신은 '한결부동산 공인중개사 한민희 부장'의 블로그 전담 작가입니다. 블로그 이름: 친절한한부장

${propertyInfo}

## 전개방식: ${typeKey}타입
${typeDescs[typeKey]}

${commonRules}

## 출력 형식 (구분자 정확히)
TITLE:
(네이버 검색 최적화 제목 1줄 — 지역명+매물종류+거래종류+핵심특징 조합, 30자 내외)

AGENT_INTRO:
(한민희 부장 + 친절한한부장 블로그 소개, 2~3문장, 매번 다르게)

INTRO:
(도입부, ${typeKey}타입 방식, 이모지 포함)

BODY:
(본문, 구조설명·현장감·장단점, [사진N] 포함, 이모지 적절히)

NEIGHBORHOOD:
(주변환경, 교통·편의시설·상권·학교, 이모지 포함)

SUMMARY:
(마무리, 장단점 정리 + 추천 고객층 + 마무리 멘트, 이모지 포함)

HASHTAGS:
(핵심 키워드 해시태그 15개 이상, 공백 구분)`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API 오류 (${res.status})`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  function extract(key, nextKey) {
    const pattern = new RegExp(`${key}:\\n([\\s\\S]*?)(?=${nextKey}:|$)`);
    const m = text.match(pattern);
    return m ? stripMd(m[1].trim()) : '';
  }

  return {
    type:          typeKey,
    title:         extract('TITLE', 'AGENT_INTRO'),
    agentIntro:    extract('AGENT_INTRO', 'INTRO'),
    intro:         extract('INTRO', 'BODY'),
    body:          extract('BODY', 'NEIGHBORHOOD'),
    neighborhood:  extract('NEIGHBORHOOD', 'SUMMARY'),
    summary:       extract('SUMMARY', 'HASHTAGS'),
    hashtags:      extract('HASHTAGS', '___END___'),
  };
}

/* ══════════════════════════════════════════
   3개 플랫폼 동시 생성 (중복 콘텐츠 방지)
   제목·도입부·마무리·해시태그만 플랫폼별 다르게
   본문·주변환경은 공유 → API 1회 호출
   ══════════════════════════════════════════ */
async function generateMultiStory(p, apiKey) {
  const name      = p_name(p);
  const location  = p_location(p);
  const prices    = buildPrices(p);
  const maint     = p_maintenance(p);
  const maintItems = p_maint_items(p);
  const options   = [p.opt_ac, p.opt_general, p.opt_security, p.opt_extra, p.opt_parking].filter(v => v && v !== '-');
  const area      = p.exclusive_area ? `전용 ${p.exclusive_area}㎡` : p.supply_area ? `공급 ${p.supply_area}㎡` : '';
  const floor     = p.curr_floor ? `${p.curr_floor}층` : '';
  const desc      = p.description && p.description !== '-' ? p.description : '';
  const moveIn    = p_move_in(p) || '';
  const imageCount = Array.isArray(p.imageUrls) ? p.imageUrls.length : 0;

  const priceStr = [
    ...prices.map(pr => pr.value ? `${pr.label.replace(/&nbsp;/g,' ')} ${pr.value}` : null),
    maint && `관리비 ${formatPrice(maint) || maint+'만원'}${maintItems ? `(${maintItems} 포함)` : ''}`,
  ].filter(Boolean).join(' / ');

  const typeDescs = {
    A: '도입(분위기 중심) → 구조 설명 → 주변환경 → 실입주 느낌 → 마무리',
    B: '도입(입지 중심) → 세부 구조(방·주방·욕실) → 장단점 → 정리',
    C: '도입(스토리형) → 사진 중심 전개 → 건물 관리·편의 → 요약',
  };

  const commonRules = `## 절대 규칙
0. 사실 기반 작성 절대 원칙: 검증할 수 없는 수치·사실 임의 생성 금지
1. "신축", "협의입주" 단어 절대 금지
2. 단점 반드시 1개 이상 자연스럽게 포함
3. 친근한 존댓말, 과장·광고 어투 금지
4. "한결부동산 공인중개사 한민희 부장" 정확히 1회 포함 (BODY에)
5. "친절한한부장" 자연스럽게 1회 이상 포함 (AGENT_INTRO에)
6. 위치(${location})에 맞는 고객층 표현 포함
7. 실제 현장 방문한 공인중개사 시점으로 작성
8. 채광·환기·소음·생활동선·주변 접근성 묘사 포함
9. 사진 배치는 [사진1], [사진2] 형태로 BODY 자연스러운 위치에 삽입
10. 실제 주소지(${location})에 맞는 주변환경·상권·교통 설명
11. 마크다운 절대 사용 금지 (#, ##, **, __ 등), 줄바꿈으로만 단락 구분
12. 동일 문장·표현 반복 금지, 키워드 과도한 반복 금지
13. 제목·본문 모두 반드시 한국어로 작성 (영어 사용 금지)${desc ? `\n\n[매물 상세정보 — 적극 활용]\n${desc}` : ''}`;

  const multiPrompt = `당신은 '한결부동산 공인중개사 한민희 부장'의 블로그 전담 작가입니다. 블로그 이름: 친절한한부장

## 매물 정보
- 종류: ${p.category || ''} ${p.transaction || ''}
- 위치: ${location}
- 가격: ${priceStr}
- 면적: ${area} / ${floor} / 방향: ${p.direction || ''}
- 방수/욕실: ${p.rooms ? p.rooms+'개' : ''}${p.bathrooms ? ' / '+p.bathrooms+'개' : ''}
- 주차: ${p.parking_yn || ''} / 입주가능: ${moveIn} / 사용승인: ${p_built(p) || ''}
- 옵션: ${options.join(', ') || '없음'}
- 사진: ${imageCount}장

${commonRules}

## 임무
아래 3개 플랫폼에 동시 발행합니다. 중복 콘텐츠 저품질 필터를 피하기 위해
제목·도입부·마무리·해시태그는 각 플랫폼마다 다른 각도로 작성하세요.
본문(BODY)과 주변환경(NEIGHBORHOOD)은 공유합니다 (1번만 작성).

## 출력 형식 (구분자 정확히, 순서 유지)

AGENT_INTRO:
(한민희 부장 + 친절한한부장 소개, 2~3문장)

BODY:
(공통 본문 — A타입: ${typeDescs.A} / [사진N] 포함 / 분량 충분히)

NEIGHBORHOOD:
(공통 주변환경 — 교통·편의시설·상권·학교, 이모지 포함)

TITLE_N:
(네이버 제목 — 지역명+매물종류+거래종류+핵심특징, 30자 내외, 검색어 중심)

INTRO_N:
(네이버 도입부 — A타입: ${typeDescs.A}, 이모지 포함)

SUMMARY_N:
(네이버 마무리 — 장단점 정리 + 추천 고객층, 이모지 포함, 문장 완성)

HASHTAGS_N:
(네이버 해시태그 15개 이상, 공백 구분)

TITLE_T:
(티스토리 제목 — 감성·정보 중심, 다른 각도, 30자 내외)

INTRO_T:
(티스토리 도입부 — B타입: ${typeDescs.B}, 이모지 포함)

SUMMARY_T:
(티스토리 마무리 — 다른 각도로 정리, 이모지 포함, 문장 완성)

HASHTAGS_T:
(티스토리 해시태그 15개 이상, 공백 구분)

TITLE_W:
(워드프레스 제목 — 구글 SEO 중심, 또 다른 각도, 30자 내외, 반드시 한국어로 작성)

INTRO_W:
(워드프레스 도입부 — C타입: ${typeDescs.C}, 이모지 포함)

SUMMARY_W:
(워드프레스 마무리 — 또 다른 각도로 정리, 이모지 포함, 문장 완성)

HASHTAGS_W:
(워드프레스 해시태그 15개 이상, 공백 구분)`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages: [{ role: 'user', content: multiPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API 오류 (${res.status})`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  function ex(key, nextKey) {
    const pattern = new RegExp(`${key}:\\n([\\s\\S]*?)(?=${nextKey}:|$)`);
    const m = text.match(pattern);
    return m ? stripMd(m[1].trim()) : '';
  }

  const shared = {
    agentIntro:   ex('AGENT_INTRO', 'BODY'),
    body:         ex('BODY', 'NEIGHBORHOOD'),
    neighborhood: ex('NEIGHBORHOOD', 'TITLE_N'),
  };

  return {
    naver: {
      type: 'A', ...shared,
      title:    ex('TITLE_N', 'INTRO_N'),
      intro:    ex('INTRO_N', 'SUMMARY_N'),
      summary:  ex('SUMMARY_N', 'HASHTAGS_N'),
      hashtags: ex('HASHTAGS_N', 'TITLE_T'),
    },
    tistory: {
      type: 'B', ...shared,
      title:    ex('TITLE_T', 'INTRO_T'),
      intro:    ex('INTRO_T', 'SUMMARY_T'),
      summary:  ex('SUMMARY_T', 'HASHTAGS_T'),
      hashtags: ex('HASHTAGS_T', 'TITLE_W'),
    },
    wordpress: {
      type: 'C', ...shared,
      title:    ex('TITLE_W', 'INTRO_W'),
      intro:    ex('INTRO_W', 'SUMMARY_W'),
      summary:  ex('SUMMARY_W', 'HASHTAGS_W'),
      hashtags: ex('HASHTAGS_W', '___END___'),
    },
  };
}

/* 기본값 (API 키 없을 때) */
function defaultStory(p) {
  const location = p_location(p);
  return {
    type:         'A',
    agentIntro:   `안녕하세요, 부산 남구 대연동 일대를 전문으로 하는 한결부동산 공인중개사 한민희 부장입니다. 저는 블로그 '친절한한부장'을 통해 직접 발로 뛰어 확인한 매물 정보를 솔직하게 전달해 드리고 있습니다.`,
    intro:        `오늘 소개드릴 매물은 ${location}에 위치한 ${p.category || ''} ${p.transaction || ''} 매물입니다. 생활 편의성과 합리적인 가격이 잘 갖춰진 물건으로 직접 확인한 내용을 솔직하게 안내해 드리겠습니다. 🏠`,
    body:         `실제로 방문해보니 전반적으로 관리 상태가 양호했습니다. ${p.direction ? p.direction + ' 방향으로 채광이 좋았고,' : ''} 내부 구조도 생활하기 편리하게 구성되어 있었습니다.\n\n[사진1]\n\n주방과 욕실 상태도 직접 눈으로 확인했는데, 사용하기 무리 없는 수준이었습니다.\n\n[사진2]\n\n단점으로는 ${p.total_floors && p.curr_floor ? `건물 규모 대비 엘리베이터 이용 시 대기가 있을 수 있다는 점` : `주차 공간이 다소 협소할 수 있다는 점`}을 미리 말씀드립니다. 그 외에는 전반적으로 만족스러운 매물이었습니다.`,
    neighborhood: `${location} 인근은 대중교통 접근성이 좋고 편의시설이 잘 갖춰진 생활권입니다. 🚌 도보권 내에 편의점·카페·마트 등이 위치해 있어 일상생활이 편리하며, 병원과 공원도 가까운 편입니다.`,
    summary:      `전반적으로 합리적인 가격에 깔끔하게 생활할 수 있는 매물입니다. 혼자 생활하는 직장인이나 대학생분들께 특히 추천드립니다. 관심 있으신 분은 언제든지 연락 주세요! 😊`,
    hashtags:     `#부산원룸 #${location.split(' ').pop()}월세 #부산월세 #남구원룸 #대연동부동산 #한결부동산 #친절한한부장 #부산부동산 #원룸월세 #즉시입주`,
  };
}

/* ══════════════════════════════════════════
   중개대상물 정보 — 전체 필드 빌더
   privacy 조건 준수, 값 있는 것만 포함
   ══════════════════════════════════════════ */
function buildInfoRows(p) {
  const rows = [];
  const add  = (label, val) => { if (val != null && val !== '' && val !== '-') rows.push({ label, value: String(val) }); };
  const addP = (label, n)   => { const v = formatPrice(n); if (v) rows.push({ label, value: v }); };
  const addN = (label, n, suffix) => { if (n != null && Number(n) !== 0) rows.push({ label, value: `${Number(n).toLocaleString()}${suffix}` }); };

  /* 매물번호 */
  add('매물번호', p.property_id);

  /* 기본 거래 */
  add('매물분류', p.category);
  add('거래종류', p.transaction);
  if (p.contract_status && p.contract_status !== '계약가능') add('계약상태', p.contract_status);

  /* 아파트명·동·호수 */
  add('아파트명', p.apt_name);
  add('동', p.dong);
  if (p.ho_privacy !== '비공개') add('호수', p.ho);

  /* 위치 (privacy) */
  if (p.location_privacy !== '비노출') {
    const loc = p.location || p.road_address || p.address;
    add('소재지', loc);
  }
  if (p.address_detail_privacy !== '비노출') add('상세주소', p.address_detail);

  /* 입주·승인 */
  add('입주가능일', p.move_in || p.move_in_date || p.available_date);
  add('사용승인일', p.approval_date || p.built_year || p.use_approved);
  add('사용검사일', p.inspection_date);

  /* 가격 — 거래종류별 */
  addP('매매가격', p.sale_price || p.price);
  addP('전세가격', p.jeonse_price || p.lease_price);
  addP('보증금',   p.deposit || p.monthly_deposit || p.lease_deposit);
  addP('월세',     p.monthly_rent || p.rent);
  addP('현보증금', p.curr_deposit);
  addP('현월세',   p.curr_monthly);

  /* 융자금 */
  if (typeof p.loan_info === 'number' && p.loan_info) {
    addP('융자금', p.loan_info);
  } else if (typeof p.loan_info === 'string' && p.loan_info && p.loan_info !== '-') {
    add('융자금', p.loan_info + (p.loan_info.endsWith('만원') ? '' : '만원'));
  }

  /* 관리비 */
  if (p.maintenance || p.management_fee) {
    const mVal  = p.maintenance || p.management_fee;
    const items = p.maintenance_items || p.management_fee_items;
    const note  = p.maintenance_note;
    const parts = [formatPrice(mVal) || mVal + '만원'];
    if (items) parts.push(`포함: ${items}`);
    if (note)  parts.push(note);
    rows.push({ label: '관리비', value: parts.join(' / ') });
  }

  /* 상가·토지 전용 금액 */
  addP('권리금',   p.manager_fee);
  addP('시설금',   p.facility_fee);
  addP('환관리비', p.env_fee);
  addP('월관리비', p.monthly_fee);

  /* 면적 */
  const areaStr = [
    p.supply_area    && `공급 ${p.supply_area}㎡`,
    p.exclusive_area && `전용 ${p.exclusive_area}㎡`,
  ].filter(Boolean).join(' / ');
  if (areaStr) rows.push({ label: '면적', value: areaStr });
  if (p.land_share_area) rows.push({ label: '대지지분',     value: `${p.land_share_area}㎡` });
  if (p.land_area)       rows.push({ label: '토지면적',     value: `${p.land_area}㎡` });
  if (p.contract_area)   rows.push({ label: '임대계약면적', value: `${p.contract_area}㎡` });

  /* 층수 */
  const cf = p.curr_floor;
  if (p.curr_floor_privacy !== '비공개' && cf && cf !== '-') {
    const flStr = [cf && `${cf}층`, p.total_floors && `전체 ${p.total_floors}층`].filter(Boolean).join(' / ');
    rows.push({ label: '층수', value: flStr });
  } else if (p.total_floors) {
    rows.push({ label: '총층수', value: `${p.total_floors}층` });
  }
  if (p.above_floors) rows.push({ label: '지상층수', value: `${p.above_floors}층` });

  /* 방/욕실/화장실/세대 */
  if (p.rooms || p.bathrooms) {
    const rb = [p.rooms && `방 ${p.rooms}개`, p.bathrooms && `욕실 ${p.bathrooms}개`].filter(Boolean).join(' / ');
    rows.push({ label: '방/욕실', value: rb });
  }
  addN('화장실', p.restrooms, '개');
  addN('세대수',  p.households, '세대');

  /* 방향 */
  if (p.direction && p.direction !== '-') {
    const dir = p.direction_base ? `${p.direction}향 (${p.direction_base} 기준)` : `${p.direction}향`;
    rows.push({ label: '방향', value: dir });
  }

  /* 건물 구조 */
  add('건물유형',   p.building_type);
  add('현관유형',   p.entrance_type || p.entrance);
  add('방거실형태', p.room_type);
  add('복층여부',   p.duplex);
  add('건물용도',   p.building_use);
  if (p.illegal_building && p.illegal_building !== '해당없음') add('위반건축물', p.illegal_building);

  /* 주차 */
  add('주차', p.parking_yn);
  addN('총주차대수',   p.total_parking, '대');
  addN('세대당주차대수', p.unit_parking,   '대');

  /* 난방 */
  if (p.heating_type) {
    add('난방', p.heating_fuel ? `${p.heating_type} (${p.heating_fuel})` : p.heating_type);
  }

  /* 토지 전용 */
  add('세부지목',     p.sub_category);
  add('현재용도',     p.current_use);
  add('추천용도',     p.recommended_use);
  add('용도지역',     p.zoning);
  add('국토이용',     p.national_land_use);
  add('도시계획',     p.city_planning);
  add('건축허가',     p.building_permit);
  add('토지거래허가', p.land_trade_permit);
  add('진입도로',     p.access_road);

  /* 상가 전용 */
  addN('업포수', p.shops_count, '개');
  add('현업종',   p.current_business);
  add('추천업종', p.recommended_business);

  /* 옵션 */
  const opts = [p.opt_ac, p.opt_general, p.opt_security, p.opt_extra, p.opt_parking]
    .filter(v => v && v !== '-').join(', ');
  if (opts) rows.push({ label: '옵션', value: opts });

  /* 매물 상세설명은 AI 글 생성에만 활용, 표에는 미노출 */

  return rows;
}

/* ══════════════════════════════════════════
   섹션 헬퍼
   ══════════════════════════════════════════ */
function SH(icon, text) {
  return `<div style="display:flex;align-items:center;gap:8px;margin:36px 0 14px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">
    <span style="font-size:20px;">${icon}</span>
    <h2 style="font-size:17px;font-weight:800;color:#111827;margin:0;">${text}</h2>
  </div>`;
}

function TR(label, value) {
  if (!value) return '';
  return `<tr style="border-bottom:1px solid #f3f4f6;">
    <td style="padding:10px 14px;font-size:13px;color:#6b7280;white-space:nowrap;width:110px;background:#fafafa;font-weight:500;">${label}</td>
    <td style="padding:10px 14px;font-size:13px;color:#1f2937;font-weight:600;">${value}</td>
  </tr>`;
}

function PR({ label, value, highlight }) {
  if (!value) return '';
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid #f3f4f6;">
    <span style="font-size:13px;color:#6b7280;">${label}</span>
    <span style="font-size:${highlight ? '22px' : '15px'};font-weight:${highlight ? '800' : '600'};color:${highlight ? '#e55a2b' : '#1f2937'};">${value}</span>
  </div>`;
}

/* ── AI 본문 텍스트에서 [사진N] 자리를 실제 img 태그로 치환 ── */
function injectPhotos(bodyText, images, labels) {
  let html = bodyText
    .split('\n')
    .map(line => {
      const m = line.match(/\[사진(\d+)\]/);
      if (m) {
        const idx = parseInt(m[1], 10) - 1;
        if (images[idx]) {
          const label = labels[idx] || `사진 ${idx + 1}`;
          return `<div style="margin:20px 0;">
  <p style="font-size:12px;font-weight:700;color:#6b7280;margin:0 0 6px;letter-spacing:.05em;">▶ ${label}</p>
  <div style="border-radius:12px;overflow:hidden;">
    <img src="${images[idx]}" alt="${label}" style="width:100%;display:block;max-height:540px;object-fit:cover;" />
  </div>
</div>`;
        }
      }
      return line ? `<p style="font-size:15px;line-height:1.9;color:#374151;margin:0 0 12px;">${line}</p>` : '<div style="height:8px;"></div>';
    })
    .join('\n');

  // 아직 삽입 안 된 남은 사진들 추가
  const usedCount = (bodyText.match(/\[사진\d+\]/g) || []).length;
  images.slice(usedCount).forEach((url, i) => {
    const label = labels[usedCount + i] || `사진 ${usedCount + i + 1}`;
    html += `<div style="margin:20px 0;">
  <p style="font-size:12px;font-weight:700;color:#6b7280;margin:0 0 6px;letter-spacing:.05em;">▶ ${label}</p>
  <div style="border-radius:12px;overflow:hidden;">
    <img src="${url}" alt="${label}" style="width:100%;display:block;max-height:540px;object-fit:cover;" />
  </div>
</div>`;
  });

  return html;
}

function textToHtml(text) {
  return text
    .split('\n')
    .map(l => l ? `<p style="font-size:15px;line-height:1.9;color:#374151;margin:0 0 12px;">${l}</p>` : '<div style="height:8px;"></div>')
    .join('\n');
}

/* ══════════════════════════════════════════
   HTML 빌더 — 출력 순서 지침서 기준
   ══════════════════════════════════════════ */
function buildHtml(p, story) {
  const name      = p_name(p);
  const location  = p_location(p);
  const prices    = buildPrices(p);
  const maint     = p_maintenance(p);
  const maintItems = p_maint_items(p);
  const youtubeId = getYouTubeId(p.youtube_url);
  const images    = Array.isArray(p.imageUrls) ? p.imageUrls : [];
  const mapUrl    = kakaoStaticMapUrl(p.map_lat, p.map_lng);
  const options   = [p.opt_ac, p.opt_general, p.opt_security, p.opt_extra, p.opt_parking].filter(v => v && v !== '-');

  const txColor = p.transaction === '매매' ? '#e55a2b' : p.transaction === '전세' ? '#1d4ed8' : '#059669';
  const txBg    = p.transaction === '매매' ? '#fff3ee' : p.transaction === '전세' ? '#eff6ff' : '#f0fdf4';

  const photoLabels = ['거실', '주방', '욕실', '침실', '현관', '베란다', '드레스룸', '전경'];

  /* ① 헤더 */
  const s1_header = `<div style="background:linear-gradient(135deg,#1a2e2f 0%,#2d4e50 100%);padding:28px 24px;border-radius:16px;margin-bottom:20px;">
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
    <span style="padding:4px 12px;background:${txBg};color:${txColor};border-radius:20px;font-size:12px;font-weight:700;">${p.transaction || ''}</span>
    <span style="padding:4px 12px;background:rgba(255,255,255,0.15);color:#fff;border-radius:20px;font-size:12px;font-weight:700;">${p.category || ''}</span>
    <span style="padding:4px 12px;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);border-radius:20px;font-size:12px;">${story.type}타입</span>
  </div>
  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 8px;line-height:1.4;">${name}</h1>
  <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:0;">📍 ${location}</p>
</div>
<div style="background:#f8f9fa;border-left:4px solid #2a4a4c;padding:16px 20px;border-radius:0 10px 10px 0;margin-bottom:8px;">
  ${textToHtml(story.intro)}
</div>`;

  /* ② 한민희 소개글 */
  const s2_agent_intro = `${SH('👋', '안녕하세요, 한결부동산입니다')}
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;">
  ${textToHtml(story.agentIntro)}
</div>`;

  /* ③ 지도 */
  const s3_map = mapUrl
    ? `${SH('🗺️', '위치 안내')}
<div style="border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <img src="${mapUrl}" alt="매물 위치 지도" style="width:100%;display:block;" />
</div>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:6px 0 0;">📍 ${location}</p>`
    : `${SH('🗺️', '위치 안내')}
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;">
  <p style="font-size:14px;color:#374151;margin:0;font-weight:600;">📍 ${location}</p>
</div>`;

  /* ④ 유튜브 영상 */
  const s4_video = youtubeId ? `${SH('🎬', '매물 영상')}
<iframe src="https://www.youtube.com/embed/${youtubeId}" width="100%" height="400" style="border:0;border-radius:12px;display:block;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : '';

  /* ⑤ 매물 정보 표 */
  const infoRows = buildInfoRows(p).map(r => TR(r.label, r.value)).join('');

  const s5_info = `${SH('📋', '중개대상물 정보')}
<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
  <table style="width:100%;border-collapse:collapse;"><tbody>${infoRows}</tbody></table>
</div>`;

  /* ⑥ 가격 정보 */
  const priceRows = [
    ...prices.map(PR),
    maint ? PR({
      label: `관리비${maintItems ? `<span style="font-size:11px;color:#9ca3af;margin-left:4px;">(${maintItems} 포함)</span>` : ''}`,
      value: formatPrice(maint) || maint + '만원',
    }) : '',
  ].filter(Boolean).join('');

  const s6_price = priceRows ? `${SH('💰', '가격 정보')}
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">${priceRows}</div>` : '';

  /* ⑦ 사진 갤러리 (본문 + 남은 사진) */
  const s7_gallery = `${SH('📸', '매물 사진')}
${injectPhotos(story.body, images, photoLabels)}`;

  /* ⑧ 주변 환경 */
  const s8_neighborhood = story.neighborhood ? `${SH('🏙️', '주변 환경')}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px 20px;">
  ${textToHtml(story.neighborhood)}
</div>` : '';

  /* ⑨ 홈페이지 링크 */
  const s9_homepage = `${SH('🔗', '더 많은 매물 보기')}
<div style="text-align:center;padding:20px;background:linear-gradient(135deg,#f8f9fa,#e9ecef);border-radius:14px;">
  <p style="font-size:14px;color:#6b7280;margin:0 0 16px;line-height:1.7;">한결부동산의 더 많은 매물을 홈페이지에서 확인하세요 😊</p>
  <a href="${OFFICE.homepage}" target="_blank" rel="noopener noreferrer"
    style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:#2a4a4c;color:#fff;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">
    🏠 한결부동산 홈페이지 바로가기
  </a>
</div>`;

  /* ⑩ 마무리 (장단점 + 추천 고객층) */
  const s10_summary = story.summary ? `${SH('✍️', '마무리')}
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px 20px;">
  ${textToHtml(story.summary)}
</div>` : '';

  /* ⑪ 공인중개사 카드 */
  const s11_agent = `${SH('👤', '담당 공인중개사')}
<div style="background:#fff;border:2px solid #e5e7eb;border-radius:14px;padding:20px 22px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
  <div style="width:64px;height:64px;background:linear-gradient(135deg,#2a4a4c,#1a2e2f);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <span style="font-size:28px;">🏡</span>
  </div>
  <div style="flex:1;min-width:160px;">
    <p style="font-size:18px;font-weight:800;color:#111827;margin:0 0 4px;">${OFFICE.agentName} <span style="font-size:13px;font-weight:500;color:#6b7280;">${OFFICE.agentTitle}</span></p>
    <p style="font-size:14px;color:#374151;margin:0 0 2px;">📞 <a href="tel:${OFFICE.agentPhone}" style="color:#2a4a4c;font-weight:700;text-decoration:none;">${OFFICE.agentPhone}</a></p>
    <p style="font-size:13px;color:#6b7280;margin:0;">✉️ ${OFFICE.agentEmail}</p>
  </div>
  <a href="tel:${OFFICE.agentPhone}" style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:#2a4a4c;color:#fff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;flex-shrink:0;">
    📞 전화 상담
  </a>
</div>`;

  /* ⑫ 사무소 정보 */
  const s12_office = `${SH('🏢', '사무소 정보')}
<div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
  <div style="background:#2a4a4c;padding:14px 20px;">
    <p style="font-size:16px;font-weight:800;color:#fff;margin:0;">${OFFICE.officeName}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tbody>
      ${[
        ['대표',    OFFICE.ceoName],
        ['대표번호', `<a href="tel:${OFFICE.officePhone}" style="color:#2a4a4c;font-weight:700;text-decoration:none;">${OFFICE.officePhone}</a>`],
        ['소재지',   OFFICE.address],
        ['등록번호', OFFICE.license],
      ].map(([l,v]) => `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:9px 16px;font-size:13px;color:#6b7280;white-space:nowrap;width:90px;background:#fafafa;">${l}</td>
        <td style="padding:9px 16px;font-size:13px;color:#1f2937;">${v}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;

  /* ⑬ 해시태그 */
  const s13_hashtags = story.hashtags ? `<div style="margin-top:32px;padding:16px;background:#f8f9fa;border-radius:10px;">
  <p style="font-size:13px;color:#6b7280;line-height:1.9;margin:0;word-break:break-all;">${story.hashtags}</p>
</div>` : '';

  /* 옵션 뱃지 */
  const optBlock = options.length ? `${SH('✅', '옵션 / 특징')}
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;display:flex;flex-wrap:wrap;gap:8px;">
  ${options.map(o => `<span style="padding:6px 14px;background:#f8f9fa;border:1px solid #e5e7eb;color:#374151;border-radius:20px;font-size:13px;font-weight:600;">${o}</span>`).join('')}
</div>` : '';

  return `<div style="max-width:760px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;color:#1f2937;line-height:1.6;">

${s1_header}
${s2_agent_intro}
${s3_map}
${s4_video}
${s5_info}
${s6_price}
${optBlock}
${s7_gallery}
${s8_neighborhood}
${s9_homepage}
${s10_summary}
${s11_agent}
${s12_office}
${s13_hashtags}

</div>`;
}

/* ══════════════════════════════════════════
   네이버 텍스트 빌더
   ══════════════════════════════════════════ */
function buildNaverText(p, story) {
  const name      = p_name(p);
  const location  = p_location(p);
  const prices    = buildPrices(p);
  const maint     = p_maintenance(p);
  const maintItems = p_maint_items(p);
  const youtubeId = getYouTubeId(p.youtube_url);
  const images    = Array.isArray(p.imageUrls) ? p.imageUrls : [];
  const options   = [p.opt_ac, p.opt_general, p.opt_security, p.opt_extra, p.opt_parking].filter(v => v && v !== '-');

  const L = [];
  const line  = (t) => L.push(t);
  const blank = ()  => L.push('');
  const div   = ()  => L.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  line(`📍 ${name}`);
  blank();
  line(story.agentIntro);
  blank();
  div(); line('✨ 도입'); div();
  line(story.intro);
  blank();
  div(); line('🗺️ 위치 안내'); div();
  line(`▪ ${location}`);
  blank();
  if (youtubeId) {
    div(); line('🎬 매물 영상'); div();
    line(`▸ https://www.youtube.com/watch?v=${youtubeId}`);
    blank();
  }
  div(); line('📋 중개대상물 정보'); div();
  buildInfoRows(p).forEach(({ label, value }) => line(`▪ ${label} : ${value}`));
  blank();
  div(); line('💰 가격 정보'); div();
  prices.forEach(({ label, value }) => { if (value) line(`▪ ${label.replace(/&nbsp;/g,' ').padEnd(5)} : ${value}`); });
  if (maint) line(`▪ 관리비  : ${formatPrice(maint) || maint+'만원'}${maintItems ? ` (${maintItems} 포함)` : ''}`);
  blank();
  div(); line('📝 본문'); div();
  line(story.body.replace(/\[사진\d+\]/g, '↓ [사진 첨부]'));
  blank();
  if (images.length) {
    div(); line(`📸 사진 목록 (${images.length}장 — 아래 순서대로 첨부)`); div();
    images.forEach((_, i) => line(`▪ 사진${i+1}`));
    blank();
  }
  if (options.length) {
    div(); line('✅ 옵션 / 특징'); div();
    options.forEach(o => line(`▪ ${o}`));
    blank();
  }
  div(); line('🏙️ 주변 환경'); div();
  line(story.neighborhood);
  blank();
  div(); line('🔗 더 많은 매물 보기'); div();
  line(`▸ ${OFFICE.homepage}`);
  blank();
  div(); line('✍️ 마무리'); div();
  line(story.summary);
  blank();
  div(); line('👤 담당 공인중개사'); div();
  line(`▪ 담당   : ${OFFICE.agentName} ${OFFICE.agentTitle}`);
  line(`▪ 연락처 : ${OFFICE.agentPhone}`);
  line(`▪ 이메일 : ${OFFICE.agentEmail}`);
  blank();
  div(); line('🏢 사무소 정보'); div();
  line(`▪ 상호   : ${OFFICE.officeName}`);
  line(`▪ 대표   : ${OFFICE.ceoName}`);
  line(`▪ 전화   : ${OFFICE.officePhone}`);
  line(`▪ 주소   : ${OFFICE.address}`);
  line(`▪ 등록   : ${OFFICE.license}`);
  blank();
  if (story.hashtags) {
    div(); line('# 해시태그'); div();
    line(story.hashtags);
  }

  return L.join('\n');
}

/* ══════════════════════════════════════════
   메인 핸들러
   ══════════════════════════════════════════ */
export async function POST(request) {
  try {
    const { property, platform } = await request.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    /* ── 3개 동시 발행 ── */
    if (platform === 'all') {
      let multi;
      if (apiKey) {
        try {
          multi = await generateMultiStory(property, apiKey);
        } catch (e) {
          console.error('멀티 AI 생성 실패, 기본값 사용:', e.message);
          const def = defaultStory(property);
          multi = { naver: def, tistory: def, wordpress: def };
        }
      } else {
        const def = defaultStory(property);
        multi = { naver: def, tistory: def, wordpress: def };
      }
      const fb = buildPostTitle(property);
      return NextResponse.json({
        multi: true,
        naver:     { title: multi.naver.title     || fb, content: buildNaverText(property, multi.naver),     format: 'text' },
        tistory:   { title: multi.tistory.title   || fb, content: buildHtml(property, multi.tistory),        format: 'html' },
        wordpress: { title: multi.wordpress.title || fb, content: buildHtml(property, multi.wordpress),      format: 'html' },
      });
    }

    /* ── 단일 플랫폼 ── */
    let story;
    if (apiKey) {
      try {
        story = await generateStory(property, apiKey);
      } catch (e) {
        console.error('AI 생성 실패, 기본값 사용:', e.message);
        story = defaultStory(property);
      }
    } else {
      story = defaultStory(property);
    }

    const title = story.title || buildPostTitle(property);

    if (platform === 'naver') {
      return NextResponse.json({ title, content: buildNaverText(property, story), format: 'text' });
    }
    return NextResponse.json({ title, content: buildHtml(property, story), format: 'html' });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
