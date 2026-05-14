// HM 프로젝트의 parseListing/splitListings 이식
// 입력: 5줄 매물 텍스트 (한 건 또는 빈 줄 구분 여러 건)
// 출력: { price, building, address, status[], phone, raw }

export function parseListing(text) {
  const lines = text.split(/\r?\n/).map((s) => s.replace(/\t/g, ' ').trim()).filter(Boolean);
  const result = {
    price: '',
    building: '',
    address: '',
    status: [],
    phone: '',
    raw: text,
  };

  const sidoShort = '서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주';
  const sidoLong =
    '서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|강원도|충청북도|충청남도|전라북도|전북특별자치도|전라남도|경상북도|경상남도|제주특별자치도';
  const addrRe = new RegExp(
    `(?:${sidoLong}|${sidoShort})\\s+\\S+(?:구|군|시)\\s+\\S+?(?:동|읍|면|리|로|길|가)(?:\\s+\\S+)?\\s*\\d+(?:-\\d+)?`
  );
  const phoneRe = /(?:0(?:10|2|[3-9]\d?))[-\s.]?\d{3,4}[-\s.]?\d{4}/;
  // 가격 라인: 첫 두 숫자 사이 구분자가 "/" 또는 공백 모두 허용
  // 예) "1,000/45", "1,000 / 45 / 관 포함", "7100 2000/55" (전세+월세 병기)
  const priceRe = /^[\d,]{1,7}(?:\s+[\d,]{1,5})?\s*[\/／]\s*[\d,]{1,5}/;
  const buildingHints =
    /(층|호|동|아파트|빌라|오피스텔|원룸|투룸|쓰리룸|상가|사무실|타워|하이츠|맨션|파크|캐슬|자이|푸르지오|래미안|아이파크|힐스테이트|롯데캐슬|이편한|sk뷰|sk view)/i;

  const used = new Set();
  const markUsed = (i) => used.add(i);

  // 1) 전화번호
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(phoneRe);
    if (m && !result.phone) {
      result.phone = m[0];
      markUsed(i);
      break;
    }
  }
  // 2) 가격
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    if (priceRe.test(lines[i])) {
      result.price = normalizePrice(lines[i]);
      markUsed(i);
      break;
    }
  }
  if (!result.price) {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const slashes = (lines[i].match(/[\/／]/g) || []).length;
      if (slashes >= 2 && /\d/.test(lines[i]) && !addrRe.test(lines[i])) {
        result.price = normalizePrice(lines[i]);
        markUsed(i);
        break;
      }
    }
  }
  // 3) 주소
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const m = lines[i].match(addrRe);
    if (m) {
      result.address = m[0];
      markUsed(i);
      break;
    }
  }
  if (!result.address) {
    const reStart = new RegExp(`^(?:${sidoLong}|${sidoShort})\\s`);
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      if (reStart.test(lines[i]) && /\d/.test(lines[i])) {
        result.address = lines[i];
        markUsed(i);
        break;
      }
    }
  }
  // 4) 건물명
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    if (buildingHints.test(lines[i])) {
      result.building = lines[i];
      markUsed(i);
      break;
    }
  }
  if (!result.building) {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      if (lines[i].length > 1) {
        result.building = lines[i];
        markUsed(i);
        break;
      }
    }
  }
  // 5) 남은 라인 → 상태 토큰
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const tokens = lines[i]
      .split(/[\s\/／,，·]+/)
      .map((s) => s.trim())
      .filter((s) => s && s.length <= 12);
    if (tokens.length) {
      result.status.push(...tokens);
      markUsed(i);
    }
  }
  return result;
}

export function splitListings(raw) {
  const blocks = raw.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks;

  // 빈 줄 구분이 없을 때: 가격 라인 기준 분리
  const lines = raw.split(/\r?\n/);
  const priceRe = /^\s*[\d,]{1,7}(?:\s+[\d,]{1,5})?\s*[\/／]\s*[\d,]{1,4}/;
  const grouped = [];
  let current = [];
  for (const line of lines) {
    if (priceRe.test(line) && current.length) {
      grouped.push(current.join('\n').trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) grouped.push(current.join('\n').trim());
  return grouped.filter(Boolean);
}

// 가격 텍스트 정규화: 숫자는 1,000 단위 콤마, 구분자는 " / " 통일, 후행 텍스트 유지
// 예) "7100 2000/55" → "7,100 / 2,000 / 55"
// 예) "1000 / 45 / 관 포함" → "1,000 / 45 / 관 포함"
export function normalizePrice(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return '';
  const numbers = [];
  let rest = trimmed;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const m = rest.match(/^([\d,]+)(?:\s*[\/／]\s*|\s+)(.*)$/s);
    if (!m) {
      const m2 = rest.match(/^([\d,]+)\s*$/);
      if (m2) {
        numbers.push(m2[1]);
        rest = '';
      }
      break;
    }
    numbers.push(m[1]);
    if (!/^[\d,]/.test(m[2])) {
      rest = m[2];
      break;
    }
    rest = m[2];
  }
  if (numbers.length === 0) return trimmed;
  const formatted = numbers.map((n) => {
    const cleaned = n.replace(/,/g, '');
    const v = parseInt(cleaned, 10);
    return Number.isFinite(v) ? v.toLocaleString('en-US') : n;
  });
  const parts = [...formatted];
  if (rest) parts.push(rest);
  return parts.join(' / ');
}

// 배지 색상 분류
export function badgeKind(s) {
  const warn = ['주인콜', '관리인콜', '관리콜', '주인', '사모', '사장', '전화확인', '확인필요', '만료전', '만료', '계약임박', '임차인협조'];
  const primary = ['빈방', '공실', '즉시입주', '입주가능', '즉시'];
  if (warn.includes(s)) return 'warn';
  if (primary.includes(s)) return 'primary';
  if (/(콜|확인|만료|주인|사장|사모)/.test(s)) return 'warn';
  if (/(빈방|공실|즉시|가능)/.test(s)) return 'primary';
  return 'gray';
}
