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
  addS('매물분류', '공장/창고');
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

  addN('연면적_㎡', d.total_floor_area);
  addN('대지면적_㎡', d.land_area);
  addN('건축면적_㎡', d.building_area);
  addN('전용면적_㎡', d.exclusive_area);
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
  addN('지하층수', d.below_floors);
  addN('방수', d.rooms);
  addN('욕실수', d.bathrooms);

  if (d.direction?.dir) {
    addR('방향_기준', d.direction.base);
    addS('방향', d.direction.dir.replace('향', ''));
  }

  addN('점포수', d.shops_count);
  addN('화장실수', d.restrooms);
  addS('주차가능여부', d.parking_yn);
  addN('총주차대수', d.total_parking);
  addR('현재용도', d.current_use);
  addR('추천용도', d.recommended_use);
  addS('위반건축물여부', d.illegal_building);
  addR('건축물용도', d.building_use);
  addR('건축구조', d.building_structure);
  addR('용도지역', d.zoning);
  addR('사용전력', d.power_supply);
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

  addS('난방시설', d.heating_type);
  addS('난방연료', d.heating_fuel);
  addM('에어컨', d.opt_ac);
  addM('일반옵션', d.opt_general);
  addM('보안옵션', d.opt_security);
  addM('기타옵션', d.opt_extra);
  addM('주차옵션', d.opt_parking);
  addR('매물상세정보', d.description);
  addU('유튜브URL', d.youtube_url);
  addU('블로그URL', d.blog_url);
  if (d.admin_memo) addR('관리자메모', d.admin_memo);
  addR('매물등록일', d.registered_date);

  return f;
}
