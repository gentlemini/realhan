export function buildFields(d) {
  const f = {};
  const addT = (k, v) => { if (v) f[k] = { title: [{ text: { content: String(v) } }] }; };
  const addR = (k, v) => { f[k] = { rich_text: [{ text: { content: v ? String(v) : '-' } }] }; };
  const addS = (k, v) => { if (v) f[k] = { select: { name: String(v) } }; };
  const addN = (k, v) => { const n = Number(v); if (n) f[k] = { number: n }; };
  const addM = (k, v) => { if (Array.isArray(v) && v.length) f[k] = { multi_select: v.map(name => ({ name })) }; };
  const addU = (k, v) => { if (v) f[k] = { url: String(v) }; };
  const addC = (k, v) => { f[k] = { checkbox: !!v }; };

  addT('매물고유번호', d.property_id);
  addC('추천매물', d.recommended);
  addS('계약상태', d.contract_status || '계약가능');
  addR('매물제목_특징', d.title);
  addS('매물분류', '단독주택');
  addS('거래종류', '전세');

  if (d.location) {
    addR('소재지', d.location.text);
    addS('소재지_공개여부', d.location.privacy || '노출');
    if (d.location.adminMemo) addR('소재지_메모', d.location.adminMemo);
  }
  if (d.lot_number) {
    addR('번지', d.lot_number.text);
    addS('번지_공개여부', d.lot_number.privacy || '노출');
    if (d.lot_number.adminMemo) addR('번지_메모', d.lot_number.adminMemo);
  }
  addS('지번노출여부', d.address_public);

  if (d.map_config) {
    addN('지도_위도', d.map_config.lat);
    addN('지도_경도', d.map_config.lng);
    addN('지도_반경', d.map_config.radius);
    addC('지도_숨김', d.map_config.mapHidden);
  }

  addS('건물유형', d.building_type);
  addN('공급면적_㎡', d.supply_area);
  addN('전용면적_㎡', d.exclusive_area);
  addR('대지지분', d.land_share);
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
  addN('관리비_만원', d.maintenance);
  addR('관리비_상세', d.maintenance_note);
  addM('관리비_포함항목', d.maintenance_items);
  addR('입주가능일', d.move_in);

  if (d.curr_floor) {
    addR('해당층', d.curr_floor.text);
    addS('해당층_공개여부', d.curr_floor.privacy || '공개');
    if (d.curr_floor.adminMemo) addR('해당층_메모', d.curr_floor.adminMemo);
  }

  addN('총층수', d.total_floors);
  addN('방수', d.rooms);
  addN('욕실수', d.bathrooms);

  if (d.direction?.dir) {
    addR('방향_기준', d.direction.base);
    addS('방향', d.direction.dir.replace('향', ''));
  }

  addN('세대가구수', d.households);
  addS('방거실형태', d.room_type);
  addS('복층여부', d.duplex);
  addS('주차가능여부', d.parking_yn);
  addN('총주차대수', d.total_parking);
  addS('위반건축물여부', d.illegal_building);
  addR('건물용도', d.building_use);
  addR('사용승인일', d.approval_date);

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

  addS('난방시설', d.heating_type);
  addS('난방연료', d.heating_fuel);
  addM('에어컨', d.opt_ac);
  addM('일반옵션', d.opt_general);
  addM('보안옵션', d.opt_security);
  addM('기타옵션', d.opt_extra);
  addM('주차옵션', d.opt_parking);
  addR('매물상세정보', d.description);
  if (d.admin_memo) addR('관리자메모', d.admin_memo);

  return f;
}
