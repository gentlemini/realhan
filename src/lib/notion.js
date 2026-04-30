const NOTION_API = 'https://api.notion.com/v1';
const HEADERS = {
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

export async function getProperties({ adminMode = false } = {}) {
  const filter = adminMode
    ? undefined
    : { property: '홈페이지노출', checkbox: { equals: true } };

  const res = await fetch(
    `${NOTION_API}/databases/${process.env.NOTION_DB_MAIN_ID}/query`,
    {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        filter,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100,
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) throw new Error(`Notion query failed: ${res.status}`);
  const data = await res.json();
  return data.results.map(normalizeProperty);
}

export async function createProperty(fields) {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_DB_MAIN_ID },
      properties: fields,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Notion create failed: ${res.status} — ${JSON.stringify(errBody)}`);
  }
  return res.json();
}

export async function updateProperty(pageId, fields) {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ properties: fields }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Notion update failed: ${res.status} — ${JSON.stringify(errBody)}`);
  }
  return res.json();
}

export async function getPropertyById(pageId) {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    headers: HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Notion get page failed: ${res.status}`);
  const page = await res.json();
  return normalizeProperty(page);
}

export async function getSubDBData(mainPageId, type) {
  const dbId = SUB_DB_IDS[type];
  if (!dbId) return {};

  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      filter: { property: '메인연결', relation: { contains: mainPageId } },
      page_size: 1,
    }),
  });
  if (!res.ok) return {};
  const data = await res.json();
  const page = data.results[0];
  if (!page) return {};

  const p = page.properties;
  const gT = (f) => f?.rich_text?.[0]?.plain_text || '';
  const gS = (f) => f?.select?.name || '';
  const gN = (f) => f?.number || 0;
  const gM = (f) => f?.multi_select?.map((o) => o.name) || [];

  if (type === '아파트') return {
    complexName: gT(p['단지명']), unitDong: gT(p['동']), unitHo: gT(p['호수']),
    totalUnits: gN(p['세대수']), totalBuildings: gN(p['동수']),
    heatingType: gS(p['난방방식']), aptBrand: gS(p['브랜드']),
    schoolInfo: gT(p['학군']), trafficInfo: gT(p['교통정보']),
    communityItems: gM(p['편의시설']),
  };
  if (type === '빌라' || type === '주택·빌라') return {
    buildingForm: gS(p['건물형태']), rooms: gN(p['방수']), bathrooms: gN(p['욕실수']),
    landArea: gN(p['대지면적_㎡']), buildingArea: gN(p['건축면적_㎡']),
    heatingType: gS(p['난방방식']),
    coverageRatio: gN(p['건폐율_%']), floorAreaRatio: gN(p['용적률_%']),
  };
  if (type === '원룸' || type === '원룸·투룸') return {
    structure: gS(p['구조형태']),
    optionsAppliances: gM(p['옵션_가전']), optionsFurniture: gM(p['옵션_가구']),
    maintenanceItems: gM(p['관리비포함항목']),
  };
  if (type === '오피스텔') return {
    buildingName: gT(p['건물명']), unitNumber: gT(p['호실']),
    officetelUsage: gS(p['용도']), parkingCount: gN(p['주차대수']),
    optionsAppliances: gM(p['옵션_가전']), optionsFurniture: gM(p['옵션_가구']),
    maintenanceItems: gM(p['관리비포함항목']),
  };
  if (type === '토지') return {
    landCategory: gS(p['지목']), zoneUse: gS(p['용도지역']),
    coverageRatio: gN(p['건폐율_%']), floorAreaRatio: gN(p['용적률_%']),
    landShape: gS(p['토지형상']), landTerrain: gS(p['지형']),
    developmentInfo: gT(p['규제사항']),
  };
  if (type === '상가') return {
    shopLocation: gT(p['층호수']) || gT(p['위치']),
    premiumAmount: gN(p['권리금_만원']),
    businessRestriction: gT(p['업종제한']) || gT(p['업종제한여부']),
    footTrafficInfo: gT(p['상권분석']) || gT(p['유동인구상권분석']),
    utilities: gT(p['전기용량']) || gT(p['전기가스상하수도']),
  };
  if (type === '빌딩') return {
    buildingName: gT(p['건물명']), totalFloorArea: gN(p['연면적_㎡']),
    buildingLandArea: gN(p['대지면적_㎡']), aboveGroundFloors: gN(p['지상층수']),
    undergroundFloors: gN(p['지하층수']), parkingCount: gN(p['주차대수']),
    elevatorCount: gN(p['엘리베이터수']), leaseStatus: gT(p['임차인현황']),
  };
  if (type === '건물') return {
    buildingForm: gS(p['건물형태']), buildingStructure: gS(p['구조']),
    landArea: gN(p['대지면적_㎡']), buildingArea: gN(p['건축면적_㎡']),
    totalFloorArea: gN(p['연면적_㎡']), leaseStatus: gT(p['임대현황']),
  };
  return {};
}

export async function archiveProperty(pageId) {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ archived: true }),
  });

  if (!res.ok) throw new Error(`Notion archive failed: ${res.status}`);
  return res.json();
}

export async function incrementHitCount(pageId, currentCount) {
  return updateProperty(pageId, {
    조회수: { number: (currentCount || 0) + 1 },
  });
}

function getText(field) {
  return field?.rich_text?.[0]?.plain_text || '';
}

function normalizeProperty(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: p['물건명칭']?.title?.[0]?.plain_text || '',
    propertyNumber: p['매물번호']?.unique_id
      ? `PROP-${p['매물번호'].unique_id.number}`
      : '',
    type: (p['물건종류']?.select?.name || '').replace(/^[\p{Emoji}\s]+/u, '').trim(),
    transactionType: p['거래유형']?.multi_select?.map((t) => t.name) || [],
    status: p['매물상태']?.select?.name || '',
    price: p['매매가_만원']?.number || 0,
    deposit: p['보증금_만원']?.number || 0,
    monthlyRent: p['월세_만원']?.number || 0,
    maintenanceFee: p['관리비_만원']?.number || 0,
    address: [
      p['시도']?.select?.name || '',         // 시도 → select
      getText(p['구군']),
      getText(p['동읍면']),
      getText(p['도로명주소']),
    ].filter(Boolean).join(' '),
    area: p['공급면적_㎡']?.number || 0,
    exclusiveArea: p['전용면적_㎡']?.number || 0,
    totalFloors: p['전체층수']?.number || 0,
    currentFloor: p['해당층']?.number || '',  // 해당층 → number
    direction: p['방향']?.select?.name || '',
    totalParking: p['주차']?.select?.name || '',
    occupancyDate: getText(p['입주가능일']),
    approvalDate: p['준공년도']?.number ? String(p['준공년도'].number) : '', // 준공년도 → number
    isRemodeled: false,
    hasElevator: p['엘리베이터']?.checkbox || false,
    isExposed: p['홈페이지노출']?.checkbox || false,
    isRecommended: p['추천매물']?.checkbox || false,
    mapHidden: p['지도숨김']?.checkbox || false,

    // 아파트
    complexName: getText(p['단지명']),
    unitNumber: getText(p['동호수']),
    totalUnits: p['세대수']?.number || 0,
    totalBuildings: p['동수']?.number || 0,
    heatingType: p['난방방식']?.select?.name || '',
    managementPhone: getText(p['관리사무소연락처']),
    schoolInfo: getText(p['학군교통편의시설']),
    communityFacilities: getText(p['커뮤니티시설']),

    // 원룸·투룸 / 오피스텔
    structure: p['구조']?.select?.name || '',
    options: getText(p['옵션']),
    maintenanceIncludes: getText(p['관리비포함항목']),
    security: getText(p['보안시설']),
    officetelUsage: p['업무주거구분']?.select?.name || '',
    commercialAccess: getText(p['상권접근성']),

    // 주택·빌라 / 건물
    buildingForm: p['건물형태']?.select?.name || '',
    rooms: p['방수']?.number || 0,
    bathrooms: p['욕실수']?.number || 0,
    landArea: p['대지면적_㎡']?.number || 0,
    buildingArea: p['건축면적_㎡']?.number || 0,
    buildingStructure: p['건축구조']?.select?.name || '',
    buildingMaterial: getText(p['건축구조및자재']),

    // 토지
    landCategory: p['지목']?.select?.name || '',
    zoneUse: p['용도지역']?.select?.name || '',
    coverageRatio: p['건폐율']?.number || 0,
    floorAreaRatio: p['용적률']?.number || 0,
    hasRoadAccess: p['도로접면여부']?.checkbox ?? null,
    developmentInfo: getText(p['개발가능성규제사항']),
    landShape: p['형상']?.select?.name || '',
    landTerrain: p['지형']?.select?.name || '',

    // 상가
    shopLocation: getText(p['위치']),
    hasPremium: p['권리금여부']?.checkbox ?? null,
    premiumAmount: p['권리금_만원']?.number || 0,
    leaseTerms: getText(p['임대조건']),
    businessRestriction: getText(p['업종제한여부']),
    utilities: getText(p['전기가스상하수도']),
    footTrafficInfo: getText(p['유동인구상권분석']),

    // 빌딩
    buildingName: getText(p['건물명']),
    totalFloorArea: p['연면적_㎡']?.number || 0,
    buildingLandArea: p['대지면적_㎡']?.number || 0,
    aboveGroundFloors: p['지상층수']?.number || 0,
    undergroundFloors: p['지하층수']?.number || 0,
    leaseStatus: getText(p['임대현황']),
    parkingCount: p['주차대수']?.number || 0,
    elevatorCount: p['엘리베이터수']?.number || 0,
    buildingApprovalDate: getText(p['준공년도']),
    buildingRemodeled: p['리모델링여부']?.checkbox || false,
    maintenanceFeeStructure: getText(p['관리비구조']),
    mainTenants: getText(p['주요임차업종']),

    imageUrls:
      p['사진첨부']?.files?.map(
        (f) => f.file?.url || f.external?.url || ''
      ).filter(Boolean) || [],
    imageUrl: p['대표사진URL']?.url ||
      p['사진첨부']?.files?.[0]?.file?.url ||
      p['사진첨부']?.files?.[0]?.external?.url ||
      '',
    features: getText(p['특이사항']) || getText(p['홈페이지메모']),
    blogUrl: p['네이버블로그URL']?.url || '',
    hitCount: p['조회수']?.number || 0,
    clientName: getText(p['의뢰인명']),
    agentInfo: getText(p['담당중개사']),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

// ── 유형별 세부 DB ─────────────────────────────────────────────
const SUB_DB_IDS = {
  '아파트':    process.env.NOTION_DB_APT_ID,
  '빌라':     process.env.NOTION_DB_HOUSE_ID,
  '원룸':     process.env.NOTION_DB_ROOM_ID,
  '원룸·투룸': process.env.NOTION_DB_ROOM_ID,
  '오피스텔': process.env.NOTION_DB_OFFICETEL_ID,
  '주택·빌라': process.env.NOTION_DB_HOUSE_ID,
  '토지':     process.env.NOTION_DB_LAND_ID,
  '상가':     process.env.NOTION_DB_SHOP_ID,
  '빌딩':     process.env.NOTION_DB_BUILDING_ID,
  '건물':     process.env.NOTION_DB_OTHER_ID,
};

export async function createSubRecord(mainPageId, type, data) {
  const dbId = SUB_DB_IDS[type];
  if (!dbId) return null;

  const fields = buildSubDBFields(type, data, mainPageId);
  if (!fields) return null;

  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ parent: { database_id: dbId }, properties: fields }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[Sub-DB create] ${type} failed:`, JSON.stringify(err));
    return null;
  }
  return res.json();
}

export async function upsertSubRecord(mainPageId, type, data) {
  const dbId = SUB_DB_IDS[type];
  if (!dbId) return null;

  const queryRes = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      filter: { property: '메인연결', relation: { contains: mainPageId } },
      page_size: 1,
    }),
  });

  if (!queryRes.ok) return createSubRecord(mainPageId, type, data);
  const queryData = await queryRes.json();
  const existing = queryData.results[0];

  if (existing) {
    const fields = buildSubDBFields(type, data, null);
    if (!fields) return null;
    delete fields['메인연결'];
    const res = await fetch(`${NOTION_API}/pages/${existing.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ properties: fields }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[Sub-DB update] ${type} failed:`, JSON.stringify(err));
      return null;
    }
    return res.json();
  }
  return createSubRecord(mainPageId, type, data);
}

export function buildSubDBFields(type, data, mainPageId) {
  const fields = {};
  const s = (v) => v && String(v).trim();
  const n = (v) => typeof v === 'number' && v > 0;
  const addR = (k, v) => { if (s(v)) fields[k] = { rich_text: [{ text: { content: String(v) } }] }; };
  const addS = (k, v) => { if (s(v)) fields[k] = { select: { name: String(v) } }; };
  const addN = (k, v) => { if (n(v)) fields[k] = { number: v }; };
  const addM = (k, v) => { if (Array.isArray(v) && v.length > 0) fields[k] = { multi_select: v.map((name) => ({ name })) }; };

  if (s(data.name))
    fields['물건명칭'] = { title: [{ text: { content: data.name } }] };
  if (mainPageId)
    fields['메인연결'] = { relation: [{ id: mainPageId }] };

  if (type === '아파트') {
    addR('단지명', data.complexName);
    addR('동', data.unitDong);
    addR('호수', data.unitHo);
    addN('세대수', data.totalUnits);
    addN('동수', data.totalBuildings);
    addS('난방방식', data.heatingType);
    addS('브랜드', data.aptBrand);
    addR('학군', data.schoolInfo);
    addR('교통정보', data.trafficInfo);
    addM('편의시설', data.communityItems);
  } else if (type === '빌라' || type === '주택·빌라') {
    addS('건물형태', data.buildingForm);
    addN('방수', data.rooms);
    addN('욕실수', data.bathrooms);
    addN('대지면적_㎡', data.landArea);
    addN('건축면적_㎡', data.buildingArea);
    addS('난방방식', data.heatingType);
    addN('건폐율_%', data.coverageRatio);
    addN('용적률_%', data.floorAreaRatio);
  } else if (type === '원룸' || type === '원룸·투룸') {
    addS('구조형태', data.structure);
    addM('옵션_가전', data.optionsAppliances);
    addM('옵션_가구', data.optionsFurniture);
    addM('관리비포함항목', data.maintenanceItems);
  } else if (type === '오피스텔') {
    addR('건물명', data.buildingName);
    addR('호실', data.unitNumber);
    addS('용도', data.officetelUsage);
    addN('주차대수', data.parkingCount);
    addM('옵션_가전', data.optionsAppliances);
    addM('옵션_가구', data.optionsFurniture);
    addM('관리비포함항목', data.maintenanceItems);
  } else if (type === '토지') {
    addS('지목', data.landCategory);
    addS('용도지역', data.zoneUse);
    addN('건폐율_%', data.coverageRatio);
    addN('용적률_%', data.floorAreaRatio);
    addS('토지형상', data.landShape);
    addS('지형', data.landTerrain);
    addR('규제사항', data.developmentInfo);
  } else if (type === '상가') {
    addR('층호수', data.shopLocation);
    addN('권리금_만원', data.premiumAmount);
    addR('업종제한', data.businessRestriction);
    addR('상권분석', data.footTrafficInfo);
    addR('전기용량', data.utilities);
  } else if (type === '빌딩') {
    addR('건물명', data.buildingName);
    addN('연면적_㎡', data.totalFloorArea);
    addN('대지면적_㎡', data.buildingLandArea);
    addN('지상층수', data.aboveGroundFloors);
    addN('지하층수', data.undergroundFloors);
    addN('주차대수', data.parkingCount);
    addN('엘리베이터수', data.elevatorCount);
    addR('임차인현황', data.leaseStatus);
  } else if (type === '건물') {
    addS('건물형태', data.buildingForm);
    addS('구조', data.buildingStructure);
    addN('대지면적_㎡', data.landArea);
    addN('건축면적_㎡', data.buildingArea);
    addN('연면적_㎡', data.totalFloorArea);
    addR('임대현황', data.leaseStatus);
  } else {
    return null;
  }

  return fields;
}

export function buildNotionFields(data) {
  const fields = {};
  const s = (v) => v && String(v).trim();
  const n = (v) => typeof v === 'number' && v > 0;
  const addR = (k, v) => { if (s(v)) fields[k] = { rich_text: [{ text: { content: String(v) } }] }; };
  const addS = (k, v) => { if (s(v)) fields[k] = { select: { name: String(v) } }; };
  const addN = (k, v) => { if (n(v)) fields[k] = { number: v }; };

  // ── 실제 DB에 존재하는 필드만 전송 ──
  if (s(data.name))
    fields['물건명칭'] = { title: [{ text: { content: data.name } }] };

  addS('물건종류', data.type);
  addS('매물상태', data.status);

  if (Array.isArray(data.transactionType) && data.transactionType.filter(s).length > 0)
    fields['거래유형'] = { multi_select: data.transactionType.filter(s).map((t) => ({ name: t })) };

  addN('매매가_만원', data.price);
  addN('보증금_만원', data.deposit);
  addN('월세_만원', data.monthlyRent);
  addN('관리비_만원', data.maintenanceFee);
  addN('공급면적_㎡', data.area);
  addN('전용면적_㎡', data.exclusiveArea);
  addN('전체층수', data.totalFloors);

  // 주소 — 시도는 select, 나머지는 rich_text
  if (s(data.address)) {
    const parts = data.address.split(' ').filter(Boolean);
    if (parts[0]) addS('시도', parts[0]);
    if (parts[1]) addR('구군', parts[1]);
    if (parts[2]) addR('동읍면', parts[2]);
    if (parts[3]) addR('도로명주소', parts.slice(3).join(' '));
  }

  // 해당층 → number 타입
  if (data.currentFloor) {
    const fl = Number(data.currentFloor);
    if (!isNaN(fl) && fl > 0) fields['해당층'] = { number: fl };
  }

  addS('방향', data.direction);
  addS('주차', data.totalParking);
  addR('입주가능일', data.occupancyDate);

  // 준공년도 → number 타입
  if (data.approvalDate) {
    const yr = Number(data.approvalDate);
    if (!isNaN(yr) && yr > 0) fields['준공년도'] = { number: yr };
  }

  if (typeof data.isExposed === 'boolean') fields['홈페이지노출'] = { checkbox: data.isExposed };
  if (typeof data.isRecommended === 'boolean') fields['추천매물'] = { checkbox: data.isRecommended };
  if (typeof data.mapHidden === 'boolean') fields['지도숨김'] = { checkbox: data.mapHidden };
  if (data.hasElevator) fields['엘리베이터'] = { checkbox: true };

  addR('특이사항', data.features);
  if (typeof data.hitCount === 'number') fields['조회수'] = { number: data.hitCount };

  if (s(data.imageUrl)) fields['대표사진URL'] = { url: data.imageUrl };

  // 노션 자체 호스팅 URL(S3/file.notion.so)은 external 타입으로 저장 불가 → 제외
  const isNotionHosted = (url) =>
    url.includes('prod-files-secure.s3') ||
    url.includes('file.notion.so') ||
    url.includes('secure.notion-static.com');

  if (Array.isArray(data.imageUrls)) {
    const externalUrls = data.imageUrls.filter(s).filter((url) => !isNotionHosted(url));
    if (externalUrls.length > 0)
      fields['사진첨부'] = {
        files: externalUrls.map((url, i) => ({
          name: `photo_${i + 1}.jpg`,
          type: 'external',
          external: { url },
        })),
      };
  }

  // 유형별 추가 필드는 Notion DB에 해당 컬럼을 직접 추가한 뒤 아래 주석을 해제하세요.
  // addR('단지명', data.complexName); addR('동호수', data.unitNumber); 등

  return fields;
}
