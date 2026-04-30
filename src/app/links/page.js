import Link from 'next/link';
import styles from './links.module.css';

const LINKS = [
  {
    name: '인터넷등기소',
    url: 'http://www.iros.go.kr',
    desc: '부동산 등기부등본 열람 및 발급',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    name: '정부24',
    url: 'https://www.gov.kr',
    desc: '각종 정부 민원서류 온라인 발급',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
  {
    name: '세움터',
    url: 'https://www.eais.go.kr/',
    newTab: true,
    desc: '건축물대장 열람 및 건축행정 서비스',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    name: '주소찾기',
    url: 'https://www.juso.go.kr',
    desc: '도로명주소 및 지번주소 통합 검색',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    name: '디스코',
    url: 'https://www.disco.re/',
    desc: '실거래가 및 부동산 시세 분석',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
    ),
  },
  {
    name: '호갱노노',
    url: 'https://hogangnono.com/',
    desc: '아파트 실거래가 및 시세 비교',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    name: '부동산플래닛',
    url: 'https://www.bdsplanet.com/',
    desc: '토지·건물 실거래가 및 공시지가 조회',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    name: '네이버부동산',
    url: 'https://new.land.naver.com/',
    newTab: true,
    desc: '아파트·빌라·원룸 매물 검색',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
];

export default function LinksPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>부동산 관련 추천 사이트</h1>
        <p className={styles.sub}>업무에 자주 활용하는 공공기관 및 부동산 정보 사이트를 모아두었습니다.</p>
      </div>
      <div className={styles.grid}>
        {LINKS.map((link) =>
          link.newTab ? (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              <div className={styles.iconWrap}>{link.icon}</div>
              <h3 className={styles.name}>{link.name}</h3>
              <p className={styles.desc}>{link.desc}</p>
              <span className={styles.arrow}>↗</span>
            </a>
          ) : (
            <Link
              key={link.name}
              href={`/links/view?url=${encodeURIComponent(link.url)}&name=${encodeURIComponent(link.name)}`}
              className={styles.card}
            >
              <div className={styles.iconWrap}>{link.icon}</div>
              <h3 className={styles.name}>{link.name}</h3>
              <p className={styles.desc}>{link.desc}</p>
              <span className={styles.arrow}>→</span>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
