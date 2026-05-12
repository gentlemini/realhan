const NOTION_API = 'https://api.notion.com/v1';

const ALWAYS_HIDDEN = new Set([
  '추천매물', '조회수', '대표사진URL',
  '지도_위도', '지도_경도', '지도_반경', '지도_숨김',
  '관리자메모', '사진첨부',
  '유튜브URL', '블로그URL',
]);

const HIDDEN_SUFFIX = ['_공개여부', '_메모', '_관리자메모'];

const LABEL_MAP = {
  '매물고유번호':     '매물번호',
  '매물분류':        '매물분류',
  '거래종류':        '거래종류',
  '매물제목_특징':    '매물 특징',
  '아파트명':        '아파트명',
  '오피스텔명':       '오피스텔명',
  '평형':           '평형',
  '소재지':         '소재지',
  '번지':           '번지',
  '상세주소':        '상세주소',
  '지번노출여부':     '지번 노출',
  '동':            '동',
  '호수':           '호수',
  '공급면적_㎡':      '공급면적 (㎡)',
  '전용면적_㎡':      '전용면적 (㎡)',
  '면적_㎡':          '면적 (㎡)',
  '건축면적_㎡':      '건축면적 (㎡)',
  '연면적_㎡':       '연면적 (㎡)',
  '임대계약면적_㎡':   '임대면적 (㎡)',
  '대지지분_㎡':      '대지지분 (㎡)',
  '대지지분':        '대지지분',
  '예상면적_㎡':      '예상면적 (㎡)',
  '매매가격_만원':     '매매가격 (만원)',
  '전세가격_만원':     '전세가격 (만원)',
  '보증금_만원':      '보증금 (만원)',
  '월세_만원':       '월세 (만원)',
  '관리비_만원':      '관리비 (만원)',
  '관리비':         '관리비',
  '관리비_상세':     '관리비 항목',
  '관리비_포함항목':  '관리비 포함 항목',
  '융자금_만원':      '융자금 (만원)',
  '현보증금_만원':     '현 보증금 (만원)',
  '현월세_만원':      '현 월세 (만원)',
  '전보증금_만원':     '현 보증금 (만원)',
  '전월세_만원':      '현 월세 (만원)',
  '현전세보증금_만원':  '현 전세 보증금 (만원)',
  '현전월세_만원':     '현 전월세 (만원)',
  '관리금_만원':      '관리금 (만원)',
  '권리금_만원':      '권리금 (만원)',
  '시설금_만원':      '시설금 (만원)',
  '환관리비_만원':     '환경 관리비 (만원)',
  '월관리비_만원':     '월 관리비 (만원)',
  '분양금액_만원':     '분양금액 (만원)',
  '프리미엄_만원':     '프리미엄 (만원)',
  '옵션가격_만원':     '옵션가격 (만원)',
  '납입중도금_만원':   '납입중도금 (만원)',
  '이주비_만원':      '이주비 (만원)',
  '분양구분':        '분양구분',
  '분양가유무':       '분양가유무',
  '입주가능일':       '입주가능일',
  '해당층':         '해당층',
  '총층수':         '총층수',
  '지상층수':        '지상층수',
  '지하층수':        '지하층수',
  '방수':           '방 수',
  '욕실수':         '욕실 수',
  '화장실수':        '화장실 수',
  '업포수':         '업포수',
  '사무실수':        '사무실 수',
  '점포수':         '점포 수',
  '세대가구수':       '세대/가구수',
  '방향_기준':       '방향 기준',
  '방향':           '방향',
  '방거실형태':       '방거실형태',
  '현관유형':        '현관유형',
  '복층여부':        '복층여부',
  '주차가능여부':      '주차가능',
  '총주차대수':       '총 주차대수',
  '세대당주차대수':    '세대당 주차',
  '건물유형':        '건물유형',
  '건축물용도':       '건물용도',
  '건축물용도_분류':   '용도 분류',
  '건물용도':        '건물용도',
  '건축구조':        '건축구조',
  '사용승인일':       '사용승인일',
  '사용검사일':       '사용검사일',
  '사용전력':        '사용전력',
  '위반건축물여부':    '위반건축물',
  '난방시설':        '난방시설',
  '난방연료':        '난방연료',
  '세부지목':        '세부지목',
  '세부유형':        '세부유형',
  '용도지역':        '용도지역',
  '국토이용':        '국토이용',
  '도시계획':        '도시계획',
  '건축허가':        '건축허가',
  '토지거래허가':      '토지거래 허가',
  '진입도로':        '진입도로',
  '현업종':         '현 업종',
  '추천업종':        '추천 업종',
  '현재용도':        '현재용도',
  '추천용도':        '추천용도',
  '에어컨':         '에어컨',
  '일반옵션':        '일반옵션',
  '보안옵션':        '보안옵션',
  '기타옵션':        '기타옵션',
  '주차옵션':        '주차옵션',
  '매물상세정보':      '매물 상세정보',
  '매물등록일':       '매물등록일',
};

const PRICE_FIELDS = new Set([
  '매매가격_만원', '전세가격_만원', '보증금_만원', '월세_만원',
  '분양금액_만원', '프리미엄_만원', '옵션가격_만원',
]);

const CATEGORY_FIELD    = '매물분류';
const TRANSACTION_FIELD = '거래종류';


/* Universal field display order — synced with admin2 form layouts */
const FIELD_ORDER = new Map([
  // header
  ['매물고유번호',    1],
  ['매물제목_특징',   2],
  ['매물분류',      3],
  ['세부유형',      4],
  ['분양구분',      5],
  ['분양가유무',     6],
  ['거래종류',      7],
  ['세부지목',      8],   // 토지: 거래종류 바로 다음
  ['면적_㎡',       9],   // 토지: 세부지목 바로 다음
  ['건물유형',      10],
  ['건축물용도_분류', 11],
  // location
  ['소재지',       11],
  ['번지',         12],
  ['상세주소',      13],
  ['지번노출여부',   14],
  // building identity
  ['아파트명',      21],
  ['오피스텔명',     22],
  ['평형',         23],
  ['동',           24],
  ['호수',         25],
  // area
  ['연면적_㎡',     31],
  ['대지면적_㎡',   32],
  ['건축면적_㎡',   33],
  ['공급면적_㎡',   34],
  ['전용면적_㎡',   35],
  ['대지지분_㎡',   36],
  ['대지지분',      37],
  ['임대계약면적_㎡', 38],
  ['예상면적_㎡',   39],
  // price
  ['매매가격_만원',  46],
  ['전세가격_만원',  47],
  ['보증금_만원',   48],
  ['월세_만원',    49],
  ['분양금액_만원',  50],
  ['프리미엄_만원',  51],
  ['옵션가격_만원',  52],
  ['납입중도금_만원', 53],
  ['이주비_만원',   54],
  ['현전세보증금_만원', 55],
  ['현전월세_만원',  56],
  ['현보증금_만원',  57],
  ['현월세_만원',   58],
  ['전보증금_만원',  59],
  ['전월세_만원',   60],
  // fees — 관리비 그룹 (가격 다음, 융자금 이전)
  ['관리비_만원',   61],
  ['관리비',       62],
  ['관리비_상세',    62],
  ['관리비_포함항목', 62],
  ['관리금_만원',   63],
  ['권리금_만원',   63],
  ['시설금_만원',   64],
  ['환관리비_만원',  65],
  ['월관리비_만원',  66],
  ['융자금_만원',   67],
  // calendar
  ['입주가능일',    71],
  // floor
  ['해당층',       81],
  ['총층수',       82],
  ['지상층수',     83],
  ['지하층수',     84],
  // rooms
  ['방수',         85],
  ['욕실수',       86],
  ['화장실수',     87],
  // direction / layout (모든 폼에서 rooms 바로 다음)
  ['방향_기준',    88],
  ['방향',        89],
  ['현관유형',     90],
  ['방거실형태',   91],
  ['세대가구수',   92],
  ['복층여부',     93],
  // parking
  ['주차가능여부',  101],
  ['총주차대수',   102],
  ['세대당주차대수', 103],
  // commercial unit counts (주차 다음 — 상가/오피스 폼 순서)
  ['업포수',       104],
  ['사무실수',     105],
  ['점포수',       106],
  // legal / building classification
  ['위반건축물여부', 111],
  ['건물용도',     112],
  ['건축물용도',   113],
  ['건축구조',     114],
  ['사용승인일',   115],
  ['사용검사일',   116],
  ['사용전력',     117],
  // heating
  ['난방시설',     121],
  ['난방연료',     122],
  // land use
  ['용도지역',     131],
  ['국토이용',     132],
  ['도시계획',     133],
  ['건축허가',     134],
  ['토지거래허가',  135],
  ['진입도로',     136],
  // business / current use
  ['현업종',      141],
  ['추천업종',     142],
  ['현재용도',     143],
  ['추천용도',     144],
  // description / meta
  ['매물상세정보',  151],
  ['매물등록일',   152],
  // options
  ['에어컨',      161],
  ['일반옵션',     162],
  ['보안옵션',     163],
  ['기타옵션',     164],
  ['주차옵션',     165],
]);

function getSection(order) {
  if (order <= 14)  return '기본 정보';
  if (order <= 39)  return '건물/면적';
  if (order <= 67)  return '가격 정보';
  if (order <= 106) return '상세 정보';
  if (order <= 122) return '건축 정보';
  if (order <= 136) return '토지 정보';
  if (order <= 144) return '업종/용도';
  if (order <= 152) return '매물 설명';
  if (order <= 165) return '옵션';
  return '기타';
}

function extractValue(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':        return prop.title?.[0]?.plain_text        || null;
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text    || null;
    case 'number':       return prop.number != null ? prop.number.toLocaleString() : null;
    case 'select':       return prop.select?.name                  || null;
    case 'multi_select': {
      const names = prop.multi_select?.map(o => o.name).filter(Boolean);
      return names?.length ? names.join(', ') : null;
    }
    case 'checkbox':     return prop.checkbox ? '✓' : null;
    case 'url':          return prop.url                           || null;
    case 'date':         return prop.date?.start                   || null;
    default:             return null;
  }
}

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const res = await fetch(`${NOTION_API}/pages/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ error: 'not found' }, { status: 404 });
    const page = await res.json();
    const p    = page.properties;

    /* collect privacy states */
    const privacyOf = {};
    for (const [name, prop] of Object.entries(p)) {
      if (name.endsWith('_공개여부')) {
        const main = name.replace('_공개여부', '');
        privacyOf[main] = prop.select?.name || '노출';
      }
    }

    /* build rows */
    const rows = [];
    for (const [name, prop] of Object.entries(p)) {
      if (ALWAYS_HIDDEN.has(name)) continue;
      if (HIDDEN_SUFFIX.some(s => name.endsWith(s))) continue;

      const label   = LABEL_MAP[name] || name.replace(/_/g, ' ');
      const privacy = privacyOf[name];
      const order   = FIELD_ORDER.get(name) ?? 500;

      if (privacy === '미노출' || privacy === '비공개') {
        rows.push({ label, value: '소유자 요청으로 인한 미노출', isPrivate: true, isPrice: false, order });
        continue;
      }

      const value = extractValue(prop);
      if (!value) continue;

      rows.push({
        label, value, isPrivate: false,
        isPrice:       PRICE_FIELDS.has(name),
        isCategory:    name === CATEGORY_FIELD,
        isTransaction: name === TRANSACTION_FIELD,
        isTags:        prop.type === 'multi_select',
        order,
      });
    }

    /* sort by display order */
    rows.sort((a, b) => a.order - b.order);

    /* strip internal order field, add section */
    const finalRows = rows.map(({ label, value, isPrivate, isPrice, isCategory, isTransaction, isTags, order }) =>
      ({ label, value, isPrivate, isPrice, isCategory, isTransaction, isTags, section: getSection(order) }));

    /* map / image meta */
    const imageUrl   = p['대표사진URL']?.url   || '';
    const imageUrls  = p['사진첨부']?.files?.map(fi => fi?.external?.url || fi?.file?.url).filter(Boolean) ?? [];
    const map_lat    = p['지도_위도']?.number   ?? null;
    const map_lng    = p['지도_경도']?.number   ?? null;
    const map_radius = p['지도_반경']?.number   ?? null;

    const allImages  = imageUrls.length ? imageUrls : (imageUrl ? [imageUrl] : []);
    const blog_url    = p['블로그URL']?.url   || null;
    const youtube_url = p['유튜브URL']?.url  || null;
    const admin_memo  = p['관리자메모']?.rich_text?.[0]?.plain_text || null;
    return Response.json({ rows: finalRows, imageUrl, imageUrls: allImages, map_lat, map_lng, map_radius, blog_url, youtube_url, admin_memo });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const { admin_memo } = await request.json();
    const res = await fetch(`${NOTION_API}/pages/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          '관리자메모': {
            rich_text: admin_memo
              ? [{ type: 'text', text: { content: admin_memo } }]
              : [],
          },
        },
      }),
    });
    if (!res.ok) return Response.json({ error: 'update failed' }, { status: res.status });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
