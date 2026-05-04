import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '한결부동산 — 공인중개사 한민희';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2c1a0e 0%, #4a2e1a 50%, #3d2310 100%)',
          position: 'relative',
        }}
      >
        {/* 배경 장식 */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          background: 'radial-gradient(ellipse at 70% 50%, rgba(168,123,81,0.25) 0%, transparent 60%)',
        }} />

        {/* 로고 영역 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
          <span style={{ fontSize: '80px', fontWeight: 900, color: '#c8956a', letterSpacing: '-2px' }}>한결</span>
          <span style={{ fontSize: '80px', fontWeight: 900, color: '#e8d5b0', letterSpacing: '-2px' }}>부동산</span>
        </div>

        {/* 구분선 */}
        <div style={{
          width: '120px',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #a87b51, transparent)',
          marginBottom: '28px',
          display: 'flex',
        }} />

        {/* 부제목 */}
        <div style={{ fontSize: '36px', color: '#d4b896', fontWeight: 600, marginBottom: '16px', display: 'flex' }}>
          공인중개사 한민희
        </div>

        {/* 설명 */}
        <div style={{ fontSize: '26px', color: '#a89070', fontWeight: 400, display: 'flex' }}>
          친절하고 믿을 수 있는 프리미엄 부동산 중개
        </div>

        {/* 하단 URL */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          fontSize: '22px',
          color: '#6b5040',
          display: 'flex',
        }}>
          realhan.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
