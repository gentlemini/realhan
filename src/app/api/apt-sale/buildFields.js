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
  addS('매물분류', '아파트');
  addS('거래종류', '매매');
  addR('소재지', d.location);

  if (d.map_config) {
    addN('지도_위도', d.map_config.lat);
    addN('지도_경도', d.map_config.lng);
    addN('지도_반경', d.map_config.radius);
    addC('지도_숨김', d.map_config.mapHidden);
  }

  addR('아파트명', d.apt_name);
  addR('동', d.dong);

  if (d.ho) {
    addR('호수', d.ho.text);
    addS('호수_공개여부', d.ho.privacy || '공개');
    if (d.ho.adminMemo) addR('호수_관리자메모', d.ho.adminMemo);
  }

  addN('공급면적_㎡', d.supply_area);
  addN('전용면적_㎡', d.exclusive_area);
  addN('매매가격_만원', d.sale_price);
  addN('융자금_만원', d.loan_info);
  addN('현보증금_만원', d.curr_deposit);
  addN('현월세_만원', d.curr_monthly);
  addN('관리비_만원', d.maintenance);
  addR('입주가능일', d.move_in);

  if (d.curr_floor) {
    addR('해당층', d.curr_floor.text);
    addS('해당층_공개여부', d.curr_floor.privacy || '공개');
    if (d.curr_floor.adminMemo) addR('해당층_관리자메모', d.curr_floor.adminMemo);
  }

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
  addS('건축물용도', d.building_use);
  addR('사용승인일', d.approval_date);
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
