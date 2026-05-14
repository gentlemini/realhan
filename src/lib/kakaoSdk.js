// Kakao Maps SDK 단일 로더 (services 포함)
let _promise = null;

export function loadKakaoSdk() {
  if (_promise) return _promise;
  _promise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('no window'));
      return;
    }
    if (window.kakao?.maps?.services) {
      resolve(window.kakao);
      return;
    }
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!apiKey) {
      reject(new Error('NEXT_PUBLIC_KAKAO_MAP_KEY 없음'));
      return;
    }

    const onReady = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    const existing = document.getElementById('kakao-map-sdk');
    if (existing) {
      if (window.kakao?.maps?.LatLng) {
        onReady();
      } else {
        existing.addEventListener('load', onReady, { once: true });
        existing.addEventListener('error', () => reject(new Error('SDK load error')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.onload = onReady;
    script.onerror = () => reject(new Error('SDK load error'));
    document.head.appendChild(script);
  });
  _promise.catch(() => { _promise = null; });
  return _promise;
}

// 좌표 → 주소 (역지오코딩). 결과 없으면 빈 문자열.
export async function coord2Address(lat, lng) {
  const kakao = await loadKakaoSdk();
  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        const r = result[0];
        const addr = r.road_address?.address_name || r.address?.address_name || '';
        resolve(addr);
      } else {
        resolve('');
      }
    });
  });
}

// 주소 → 좌표 (지오코딩 + 키워드 검색 폴백)
export async function geocodeAddress(address) {
  const kakao = await loadKakaoSdk();
  return new Promise((resolve, reject) => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
          matched: result[0].address_name || address,
        });
        return;
      }
      const ps = new kakao.maps.services.Places();
      ps.keywordSearch(address, (data, st) => {
        if (st === kakao.maps.services.Status.OK && data[0]) {
          resolve({
            lat: parseFloat(data[0].y),
            lng: parseFloat(data[0].x),
            matched: data[0].address_name || data[0].place_name || address,
          });
        } else {
          reject(new Error('주소를 찾을 수 없습니다'));
        }
      });
    });
  });
}
