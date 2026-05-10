import { queryAllPages } from '@/lib/notionList';
const DB_ID = '84da27f44fd94d3ea4c90c96ffc87a01';

export async function GET() {
  try {
    const results = await queryAllPages(DB_ID);
    const items = results.map(page => {
      const p = page.properties;
      const gT = f => f?.title?.[0]?.plain_text  || '';
      const gR = f => f?.rich_text?.[0]?.plain_text || '';
      const gN = f => f?.number ?? null;
      const gS = f => f?.select?.name || '';
      const gU = f => f?.url || '';
      const gC = f => f?.checkbox ?? false;
      const gFiles = f => f?.files?.map(fi => fi?.external?.url || fi?.file?.url).filter(Boolean) ?? [];

      return {
        id:                       page.id,
        property_id:              gT(p['매물고유번호']),
        recommended:              gC(p['추천매물']),
        category:                 gS(p['매물분류']),
        sub_category:             gS(p['세부지목']),
        transaction:              gS(p['거래종류']),
        title:                    gR(p['매물제목_특징']),
        location:                 gR(p['소재지']),
        location_privacy:         gS(p['소재지_공개여부']),
        location_memo:            gR(p['소재지_메모']),
        address_detail:           gR(p['상세주소']),
        address_detail_privacy:   gS(p['상세주소_공개여부']),
        address_detail_memo:      gR(p['상세주소_메모']),
        address_public:           gS(p['지번노출여부']),
        land_area:                gR(p['면적_㎡']),
        move_in:                  gR(p['입주가능일']),
        deposit:                  gN(p['보증금_만원']),
        monthly_rent:             gN(p['월세_만원']),
        loan_info:                gR(p['융자금_직접입력']) || gN(p['융자금_만원']) || null,
        monthly_fee:              gN(p['월관리비_만원']),
        above_floors:             gN(p['지상층수']),
        rooms:                    gN(p['방수']),
        bathrooms:                gN(p['욕실수']),
        direction_base:           gR(p['방향_기준']),
        direction:                gS(p['방향']),
        parking_yn:               gS(p['주차가능여부']),
        total_parking:            gN(p['총주차대수']),
        current_use:              gR(p['현재용도']),
        recommended_use:          gR(p['추천용도']),
        zoning:                   gR(p['용도지역']),
        national_land_use:        gS(p['국토이용']),
        city_planning:            gS(p['도시계획']),
        building_permit:          gS(p['건축허가']),
        land_trade_permit:        gS(p['토지거래허가']),
        access_road:              gS(p['진입도로']),
        inspection_date:          gR(p['사용검사일']),
        curr_floor:               gR(p['해당층']),
        curr_floor_privacy:       gS(p['해당층_공개여부']),
        curr_floor_memo:          gR(p['해당층_메모']),
        description:              gR(p['매물상세정보']),
        admin_memo:               gR(p['관리자메모']),
        map_lat:                  gN(p['지도_위도']),
        map_lng:                  gN(p['지도_경도']),
        map_radius:               gN(p['지도_반경']),
        map_hidden:               gC(p['지도_숨김']),
        imageUrl:                 gU(p['대표사진URL']),
        imageUrls:             gFiles(p['사진첨부']),
        contract_status:       gS(p['계약상태']),
        youtube_url:           gU(p['유튜브URL']),
        blog_url:              gU(p['블로그URL']),
        created_time:          page.created_time,
      };
    });

    return Response.json(items);
  } catch (err) {
    console.error('[lnd-wolse/list]', err);
    return Response.json([], { status: 200 });
  }
}
