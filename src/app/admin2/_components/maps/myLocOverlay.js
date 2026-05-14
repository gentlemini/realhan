// 현재 위치 표시용 펄스 dot DOM 생성 헬퍼 (Kakao CustomOverlay 의 content 로 사용)

function ensurePulseStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('my-loc-pulse-style')) return;
  const s = document.createElement('style');
  s.id = 'my-loc-pulse-style';
  s.textContent =
    '@keyframes myLocPulse{0%{transform:scale(1);opacity:.6}70%{transform:scale(2.8);opacity:0}100%{transform:scale(1);opacity:0}}';
  document.head.appendChild(s);
}

export function makeMyLocContent() {
  ensurePulseStyle();
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:18px;height:18px;pointer-events:none;';
  const pulse = document.createElement('div');
  pulse.style.cssText =
    'position:absolute;inset:-5px;border-radius:50%;background:rgba(66,133,244,0.35);animation:myLocPulse 2s ease-out infinite;';
  const dot = document.createElement('div');
  dot.style.cssText =
    'width:18px;height:18px;border-radius:50%;background:#4285f4;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);';
  wrap.appendChild(pulse);
  wrap.appendChild(dot);
  return wrap;
}
