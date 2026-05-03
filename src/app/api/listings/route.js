const NOTION_API = 'https://api.notion.com/v1';

const DBS = [
  { id: '8e7d1a23e5be419f820889a2dd20623b', nameField: '아파트명' },
  { id: 'ddd43c2d10ed4553aeea333890b39238', nameField: '아파트명' },
  { id: '1fae6945c55b4cff9676e5011dc4fd31', nameField: '아파트명' },
  { id: 'a3f757c9049b4e85a5d084a7ec7f01e3', nameField: '오피스텔명' },
  { id: 'b39ea1c254f54808ae2343fd1db35b1c', nameField: '오피스텔명' },
  { id: 'af05ff431ce34aaea68e4ae7e9aa9319', nameField: '오피스텔명' },
  { id: '646c7f5626084bea9731e115a59e6203' },
  { id: '154bb6445fb04d83900ba0f4c3792252' },
  { id: 'e768c688314244f58ec812d4f81f6422' },
  { id: 'cdeac614af184791b75653e6aa256868' },
  { id: '2ea8c055b69b40bfb1f82cf5ea7a7814' },
  { id: '70741fb396a747c5a337d79d01c16677' },
  { id: '1b882220c4a24565b71d8f23f3e80679' },
  { id: 'edee1d3a652649b29c60a53b5910f47f' },
  { id: '9de9698a398f44ce9eb1d20d97f91276' },
  { id: '08666990d4414b44a476c391aa01c17c' },
  { id: '49339bde032b4dbc82abfc98c086f15d' },
  { id: '6afc8681b6dc4f47bad1552153007ef6' },
  { id: 'a49dee1891d44d4fb03465353ec820ff' },
  { id: '3df99f451be34cfe8e6b6897f94e56d7' },
  { id: '4f2645a3487949558ded4120c4a98cee' },
  { id: '29ff90a093c14569b02a00f0e64b55a2' },
  { id: '2f895fb2ffb04f47bc4a58aa01668c4b' },
  { id: '351972da7fdc4677a80719166531b1d6' },
  { id: 'af6a52f3c189422a9c4a6e633ba2aa9f' },
  { id: '15c02bb2ec0b45339915967921ed03af' },
  { id: '9b3126ffac6d4077bd28c4bc178e7d99' },
  { id: '8f7b574ed090495ebae321a3a99772a4' },
  { id: 'a6faf09f929c492eb6e19c67fa3708ef' },
  { id: 'afe2bfbbdbae42ab9b6db0a3a2cb5d17' },
  { id: '3ac05d51f0ff4da6b1c0a9e8be2649f1' },
  { id: '8afefc557c5a41bba9687741fd91d982' },
  { id: '84da27f44fd94d3ea4c90c96ffc87a01' },
  { id: 'e50ee374-ce0f-469d-b594-b952b9a2078d' },
  { id: '66c488a2-97d3-41b4-a92b-8919210252dc' },
];

async function queryDB({ id, nameField }) {
  try {
    const res = await fetch(`${NOTION_API}/databases/${id}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100,
      }),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();

    const gT = f => f?.title?.[0]?.plain_text || '';
    const gR = f => f?.rich_text?.[0]?.plain_text || '';
    const gN = f => f?.number ?? null;
    const gS = f => f?.select?.name || '';
    const gU = f => f?.url || '';
    const gC = f => f?.checkbox ?? false;
    const gFiles = f => f?.files?.map(file => file?.external?.url || file?.file?.url).filter(Boolean) ?? [];

    return data.results.map(page => {
      const p = page.properties;
      return {
        id:            page.id,
        property_id:   gT(p['매물고유번호']),
        recommended:   gC(p['추천매물']),
        view_count:    gN(p['조회수']) ?? 0,
        category:      gS(p['매물분류']),
        transaction:   gS(p['거래종류']),
        title:         gR(p['매물제목_특징']),
        building_name: nameField ? gR(p[nameField]) : '',
        location:      gR(p['소재지']),
        curr_floor:    gR(p['해당층']),
        total_floors:  gN(p['총층수']),
        supply_area:   gN(p['공급면적_㎡']),
        exclusive_area:gN(p['전용면적_㎡']),
        land_area:     gN(p['대지면적_㎡']),
        build_area:    gN(p['건축면적_㎡']),
        total_area:    gN(p['연면적_㎡']),
        contract_area: gN(p['임대계약면적_㎡']),
        expected_area: gN(p['예상면적_㎡']),
        direction:     gS(p['방향']),
        rooms:         gN(p['방수']),
        sale_price:    gN(p['매매가격_만원']),
        jeonse_price:  gN(p['전세가격_만원']),
        deposit:       gN(p['보증금_만원']),
        monthly_rent:  gN(p['월세_만원']),
        maintenance:   gN(p['관리비_만원']),
        map_lat:       gN(p['지도_위도']),
        map_lng:       gN(p['지도_경도']),
        map_radius:    gN(p['지도_반경']),
        map_hidden:    gC(p['지도_숨김']),
        contract_status: gS(p['계약상태']),
        imageUrl:      gU(p['대표사진URL']),
        imageUrls:     gFiles(p['사진첨부']),
        created_time:  page.created_time,
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const results = await Promise.all(DBS.map(queryDB));
  const items = results.flat();
  return Response.json(items);
}
