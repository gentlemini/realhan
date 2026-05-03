const NOTION_API = 'https://api.notion.com/v1';
const DB_ID = '08666990d4414b44a476c391aa01c17c';

export async function GET() {
  try {
    const res = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
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
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`Notion ${res.status}`);
    const data = await res.json();

    const items = data.results.map(page => {
      const p = page.properties;
      const gT = f => f?.title?.[0]?.plain_text  || '';
      const gR = f => f?.rich_text?.[0]?.plain_text || '';
      const gN = f => f?.number ?? null;
      const gS = f => f?.select?.name || '';
      const gU = f => f?.url || '';
      const gC = f => f?.checkbox ?? false;
      const gM = f => f?.multi_select?.map(o => o.name).join(', ') || '';
      const gFiles = f => f?.files?.map(fi => fi?.external?.url || fi?.file?.url).filter(Boolean) ?? [];

      return {
        id:                       page.id,
        property_id:              gT(p['매물고유번호']),
        recommended:              gC(p['추천매물']),
        category:                 gS(p['매물분류']),
        transaction:              gS(p['거래종류']),
        title:                    gR(p['매물제목_특징']),
        location:                 gR(p['소재지']),
        location_privacy:         gS(p['소재지_공개여부']),
        location_memo:            gR(p['소재지_메모']),
        address_detail:           gR(p['상세주소']),
        address_detail_privacy:   gS(p['상세주소_공개여부']),
        address_detail_memo:      gR(p['상세주소_메모']),
        address_public:           gS(p['지번노출여부']),
        building_type:            gS(p['건물유형']),
        contract_area:            gN(p['임대계약면적_㎡']),
        exclusive_area:           gN(p['전용면적_㎡']),
        sale_price:               gN(p['매매가격_만원']),
        curr_deposit:             gN(p['현보증금_만원']),
        curr_monthly:             gN(p['현월세_만원']),
        loan_info:                gN(p['융자금_만원']),
        manager_fee:              gN(p['관리금_만원']),
        facility_fee:             gN(p['시설금_만원']),
        env_fee:                  gN(p['환관리비_만원']),
        move_in:                  gR(p['입주가능일']),
        curr_floor:               gR(p['해당층']),
        curr_floor_privacy:       gS(p['해당층_공개여부']),
        curr_floor_memo:          gR(p['해당층_메모']),
        total_floors:             gN(p['총층수']),
        rooms:                    gN(p['방수']),
        bathrooms:                gN(p['욕실수']),
        direction_base:           gR(p['방향_기준']),
        direction:                gS(p['방향']),
        parking_yn:               gS(p['주차가능여부']),
        total_parking:            gN(p['총주차대수']),
        shops_count:              gN(p['업포수']),
        restrooms:                gN(p['화장실수']),
        current_business:         gR(p['현업종']),
        recommended_business:     gR(p['추천업종']),
        illegal_building:         gS(p['위반건축물여부']),
        building_use:             gR(p['건물용도']),
        approval_date:            gR(p['사용승인일']),
        heating_type:             gS(p['난방시설']),
        heating_fuel:             gS(p['난방연료']),
        opt_ac:                   gM(p['에어컨']),
        opt_general:              gM(p['일반옵션']),
        opt_security:             gM(p['보안옵션']),
        opt_extra:                gM(p['기타옵션']),
        opt_parking:              gM(p['주차옵션']),
        description:              gR(p['매물상세정보']),
        admin_memo:               gR(p['관리자메모']),
        map_lat:                  gN(p['지도_위도']),
        map_lng:                  gN(p['지도_경도']),
        map_radius:               gN(p['지도_반경']),
        map_hidden:               gC(p['지도_숨김']),
        imageUrl:                 gU(p['대표사진URL']),
        imageUrls:             gFiles(p['사진첨부']),
        contract_status:       gS(p['계약상태']),
        created_time:          page.created_time,
      };
    });

    const visible = items.filter(i => !i.contract_status || i.contract_status === '계약가능' || i.contract_status === '계약진행중');
    return Response.json(visible);
  } catch (err) {
    console.error('[shp-sale/list]', err);
    return Response.json([], { status: 200 });
  }
}
