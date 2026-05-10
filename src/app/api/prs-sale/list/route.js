const NOTION_API = 'https://api.notion.com/v1';
const DB_ID = '66c488a2-97d3-41b4-a92b-8919210252dc';

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
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Notion ${res.status}`);
    const data = await res.json();

    const items = data.results.map(page => {
      const p = page.properties;
      const gT  = f => f?.title?.[0]?.plain_text  || '';
      const gR  = f => f?.rich_text?.[0]?.plain_text || '';
      const gN  = f => f?.number ?? null;
      const gS  = f => f?.select?.name || '';
      const gM  = f => f?.multi_select?.map(o => o.name) || [];
      const gU  = f => f?.url || '';
      const gC  = f => f?.checkbox ?? false;
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
        apt_name:                 gR(p['아파트명']),
        pyeong:                   gR(p['평형']),
        supply_area:              gN(p['공급면적_㎡']),
        exclusive_area:           gN(p['전용면적_㎡']),
        presale_type:             gS(p['분양구분']),
        has_presale_price:        gS(p['분양가유무']),
        presale_price:            gN(p['분양금액_만원']),
        premium:                  gN(p['프리미엄_만원']),
        option_price:             gN(p['옵션가격_만원']),
        sale_price:               gN(p['매매가격_만원']),
        installment_paid:         gN(p['납입중도금_만원']),
        relocation_fee:           gN(p['이주비_만원']),
        loan_info:                gR(p['융자금_직접입력']) || gN(p['융자금_만원']) || null,
        maintenance:              gR(p['관리비']),
        maintenance_note:  gR(p['관리비_상세']),
        maintenance_items: gM(p['관리비_포함항목']),
        dong:                     gR(p['동']),
        ho:                       gR(p['호수']),
        move_in:                  gR(p['입주가능일']),
        curr_floor:               gR(p['해당층']),
        curr_floor_privacy:       gS(p['해당층_공개여부']),
        curr_floor_memo:          gR(p['해당층_메모']),
        above_floors:             gN(p['지상층수']),
        rooms:                    gN(p['방수']),
        bathrooms:                gN(p['욕실수']),
        direction_base:           gR(p['방향_기준']),
        direction:                gS(p['방향']),
        entrance:                 gS(p['현관유형']),
        duplex:                   gS(p['복층여부']),
        parking_yn:               gS(p['주차가능여부']),
        total_parking:            gN(p['총주차대수']),
        unit_parking:             gN(p['세대당주차대수']),
        building_use:             gR(p['건축물용도']),
        inspection_date:          gR(p['사용검사일']),
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
        youtube_url:           gU(p['유튜브URL']),
        blog_url:              gU(p['블로그URL']),
        created_time:          page.created_time,
      };
    });

    return Response.json(items);
  } catch (err) {
    console.error('[prs-sale/list]', err);
    return Response.json([], { status: 200 });
  }
}
