import './globals.css';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingNav from '@/components/FloatingNav';

const GA_ID = 'G-8RYVD50VW7';

export const metadata = {
  title: '공인중개사 친절한한부장의 친절한 부동산중개 - 한민희',
  description: '부산 전문 공인중개사. 아파트·원룸·투룸·쓰리룸·오피스텔·분양권·재개발 매매 전세 월세 전문',
  keywords: '공인중개사, 친절한한부장, 한민희, 부산부동산, 부산아파트, 부산원룸, 부산투룸, 부산오피스텔, 부산분양권, 부산재개발, 부산매매, 부산전세, 부산월세, 남구부동산, 남구아파트, 남구원룸, 남구전세, 남구월세, 대연동부동산, 대연동아파트, 대연동원룸, 대연동전세, 대연동월세, 용호동부동산, 용호동아파트, 용호동전세, 문현동부동산, 대남로부동산, 수영구부동산, 수영구아파트, 수영구원룸, 수영구전세, 수영구월세, 광안동부동산, 광안리부동산, 민락동부동산, 남천동부동산, 수영동부동산, 망미동부동산, 한결부동산, 전국부동산, 전국아파트매매, 전국분양권, 전국재개발투자, 부동산투자, 아파트투자, 재개발투자, 분양권전매, 부동산홈페이지제작, 공인중개사홈페이지, 부동산웹사이트제작',
  openGraph: {
    title: '공인중개사 친절한한부장의 친절한 부동산중개 - 한민희',
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
