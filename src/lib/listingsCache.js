// 클라이언트 모듈 레벨 캐시 — 페이지 이동 시에도 5분간 데이터 유지
let _data = null;
let _ts = 0;
const TTL = 5 * 60 * 1000;

export async function fetchListings() {
  if (_data && Date.now() - _ts < TTL) return _data;
  const res = await fetch('/api/listings');
  const json = await res.json();
  _data = Array.isArray(json) ? json : [];
  _ts = Date.now();
  return _data;
}

export function invalidateListings() {
  _data = null;
  _ts = 0;
}
