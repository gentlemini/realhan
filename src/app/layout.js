import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingNav from '@/components/FloatingNav';

export const metadata = {
  title: '한결부동산 — 부산 남구 대연동 공인중개사사무소',
  description:
    '부산광역시 남구 대연동 한결부동산공인중개사사무소. 아파트, 원룸, 오피스텔, 상가, 토지 매물 상담. 친절한 한민희 부장 010-4706-8253',
  keywords: '부산부동산, 남구부동산, 대연동부동산, 한결부동산, 공인중개사, 아파트매매',
  openGraph: {
    title: '한결부동산 — 부산 남구 대연동 공인중개사',
    description: '부산 남구 대연동 프리미엄 부동산 중개 서비스',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main style={{ paddingTop: 'var(--header-height)' }}>{children}</main>
        <Footer />
        <FloatingNav />
      </body>
    </html>
  );
}
