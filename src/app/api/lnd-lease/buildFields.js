export function buildFields(d) {
  const f = {};
  const addT = (k, v) => { if (v) f[k] = { title: [{ text: { content: String(v) } }] }; };
  const addR = (k, v) => { f[k] = { rich_text: [{ text: { content: v ? String(v) : '-' } }] }; };
  const addS = (k, v) => { if (v) f[k] = { select: { name: String(v) } }; };
  const addN = (k, v) => { const n = Number(v); if (n) f[k] = { number: n }; };
  const addU = (k, v) => { if (v) f[k] = { url: String(v) }; };
  const addC = (k, v) => { f[k] = { checkbox: !!v }; };

  addT('매물고유번호', d.property_id);
  addC('추천매물', d.recommended);
  addS('계약상태', d.contract_status || '계약가능');
  addR('매물제목_특징', d.title);
  addS('매물분류', '토지');
  addS('세부지목', d.sub_category);
  addS('거래종류', '전세');

  if (d.location) {
    addR('소재지', d.location.text);
    addS('소재지_공개여부', d.location.privacy || '노출');
    if (d.location.adminMemo) addR('소재지_메모', d.location.adminMemo);
  }
  if (d.address_detail) {
    addR('상세주소', d.address_detail.text);
    addS('상세주소_공개여부', d.address_detail.privacy || '노출');
    if (d.address_detail.adminMemo) addR('상세주소_메모', d.address_detail.adminMemo);
  }
  addS('지번노출여부', d.address_public);

  if (d.map_config) {
    addN('지도_위도', d.map_config.lat);
    addN('지도_경도', d.map_config.lng);
    addN('지도_반경', d.map_config.radius);
    addC('지도_숨김', d.map_config.mapHidden);
  }

  addN('면적_㎡', d.land_area);
  addR('입주가능일', d.move_in);
  addN('전세가격_만원', d.jeonse_price);
  if (d.loan_info && typeof d.loan_info === 'object') {
    const amt = d.loan_info.amount;
    if (amt != null && amt !== '') {
      addR('융자금_직접입력', String(amt));
      const num = parseFloat(String(amt).replace(/,/g, ''));
      if (!isNaN(num)) addN('융자금_만원', num);
    }
  } else {
    addN('융자금_만원', d.loan_info);
  }
  addN('월관리비_만원', d.monthly_fee);
  addN('지상층수', d.above_floors);
  addN('방수', d.rooms);
  addN('욕실수', d.bathrooms);

  if (d.direction?.dir) {
    addR('방향_기준', d.direction.base);
    addS('방향', d.direction.dir.replace('향', ''));
  }

  addS('주차가능여부', d.parking_yn);
  addN('총주차대수', d.total_parking);
  addR('현재용도', d.current_use);
  addR('추천용도', d.recommended_use);
  addR('용도지역', d.zoning);
  addS('국토이용', d.national_land_use);
  addS('도시계획', d.city_planning);
  addS('건축허가', d.building_permit);
  addS('토지거래허가', d.land_trade_permit);
  addS('진입도로', d.access_road);
  addR('사용검사일', d.inspection_date);

  if (d.curr_floor) {
    addR('해당층', d.curr_floor.text);
    addS('해당층_공개여부', d.curr_floor.privacy || '공개');
    if (d.curr_floor.adminMemo) addR('해당층_메모', d.curr_floor.adminMemo);
  }

  addU('대표사진URL', d.imageUrl);
  if (Array.isArray(d.imageUrls) && d.imageUrls.length) {
    f['사진첨부'] = {
      files: d.imageUrls.map((url, i) => ({
        name: `photo_${i + 1}.jpg`,
        type: 'external',
        external: { url },
      })),
    };
  }

  addR('매물상세정보', d.description);
  if (d.admin_memo) addR('관리자메모', d.admin_memo);
  addR('매물등록일', d.registered_date);

  return f;
}
