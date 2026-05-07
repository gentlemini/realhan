import './globals.css';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingNav from '@/components/FloatingNav';

const GA_ID = 'G-8RYVD50VW7';

export const metadata = {
  title: '공인중개사 친절한 한민희 부장',
  description: '부산 전문 공인중개사. 아파트·원룸·투룸·쓰리룸·오피스텔·분양권·재개발 매매 전세 월세 전문',
  keywords: '부산부동산, 남구부동산, 대연동부동산, 한결부동산, 공인중개사, 아파트매매, 원룸, 투룸, 쓰리룸, 오피스텔, 분양권, 재개발, 대연동전세, 대연동월세',
  openGraph: {
    title: '공인중개사 친절한 한민희 부장',
    description: '부산 전문 공인중개사. 아파트·원룸·투룸·쓰리룸·오피스텔·분양권·재개발 매매 전세 월세 전문',
    locale: 'ko_KR',
    type: 'website',
  },
  other: {
    'naver-site-verification': 'a61226689398f97fb731620dfa021846ac9df39d',
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
