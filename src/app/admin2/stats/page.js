'use client';

import styles from './stats.module.css';

const LINKS = [
  {
    icon: '📊',
    title: 'Google 애널리틱스',
    desc: '방문자 수, 유입경로, 페이지별 조회수, 체류시간',
    href: 'https://analytics.google.com',
    color: '#e37400',
  },
  {
    icon: '🔍',
    title: 'Google Search Console',
    desc: '검색 키워드, 노출수, 클릭수, 검색 순위',
    href: 'https://search.google.com/search-console',
    color: '#1a73e8',
  },
];

export default function StatsPage() {
  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>사이트 통계</h2>
      <div className={styles.grid}>
        {LINKS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.card}
            style={{ borderTop: `4px solid ${item.color}` }}
          >
            <span className={styles.icon}>{item.icon}</span>
            <strong className={styles.cardTitle}>{item.title}</strong>
            <p className={styles.cardDesc}>{item.desc}</p>
            <span className={styles.cardBtn} style={{ background: item.color }}>바로가기 →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
