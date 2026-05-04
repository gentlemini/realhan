import './globals.css';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingNav from '@/components/FloatingNav';

const GA_ID = 'G-8RYVD50VW7';

export const metadata = {
  title: '한결부동산 — 공인중개사 친절한 한민희 부장',
  description: '친절한 프리미엄 중개 서비스',
  keywords: '부산부동산, 남구부동산, 대연동부동산, 한결부동산, 공인중개사, 아파트매매',
  openGraph: {
    title: '한결부동산 — 공인중개사 친절한 한민희 부장',
    description: '친절한 프리미엄 중개 서비스',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}</Script>
        <Header />
        <main style={{ paddingTop: 'var(--header-height)' }}>{children}</main>
        <Footer />
        <FloatingNav />
      </body>
    </html>
  );
}
