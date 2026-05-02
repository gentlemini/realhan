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
  addS('매물분류', '오피스텔');
  addS('거래종류', '전세');
  addS('건축물용도_분류', d.building_use_category);
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

  if (d.map_config) {
    addN('지도_위도', d.map_config.lat);
    addN('지도_경도', d.map_config.lng);
    addN('지도_반경', d.map_config.radius);
    addC('지도_숨김', d.map_config.mapHidden);
  }

  addR('오피스텔명', d.ofc_name);
  addR('평형', d.pyeong);

  if (d.ho) {
    addR('호수', d.ho.text);
    addS('호수_공개여부', d.ho.privacy || '공개');
    if (d.ho.adminMemo) addR('호수_관리자메모', d.ho.adminMemo);
  }

  addN('공급면적_㎡', d.supply_area);
  addN('전용면적_㎡', d.exclusive_area);
  addN('전세가격_만원', d.jeonse_price);
  addN('융자금_만원', d.loan_info);
  addN('관리비_만원', d.maintenance);
  addR('입주가능일', d.move_in);
  addR('해당층', d.curr_floor);
  addN('총층수', d.total_floors);
  addN('방수', d.rooms);
  addN('욕실수', d.bathrooms);

  if (d.direction?.dir) {
    addR('방향_기준', d.direction.base);
    addS('방향', d.direction.dir.replace('향', ''));
  }

  addS('현관유형', d.entrance);
  addS('복층여부', d.duplex);
  addS('주차가능여부', d.parking_yn);
  addN('총주차대수', d.total_parking);
  addN('세대당주차대수', d.unit_parking);
  addR('사용승인일', d.approval_date);
  addR('건축물용도', d.building_use_text);
  addR('매물상세정보', d.description);

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

  addM('에어컨', d.opt_ac);
  addM('일반옵션', d.opt_general);
  addM('보안옵션', d.opt_security);
  addM('기타옵션', d.opt_extra);
  addM('주차옵션', d.opt_parking);
  if (d.admin_memo) addR('관리자메모', d.admin_memo);

  return f;
}
