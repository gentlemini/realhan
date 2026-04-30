'use client';

import { useEffect, useState } from 'react';
import styles from './news.module.css';

const PAGE_SIZE = 20;

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isNew(iso) {
  return Date.now() - new Date(iso).getTime() < 3 * 24 * 60 * 60 * 1000;
}

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(news.length / PAGE_SIZE);
  const items = news.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startNum = news.length - (page - 1) * PAGE_SIZE;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>부동산 소식</h1>
        <p className={styles.sub}>최신 부동산 뉴스와 시장 분석을 한눈에</p>
      </div>

      <div className={styles.container}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>뉴스를 불러오는 중...</p>
          </div>
        ) : news.length === 0 ? (
          <div className={styles.empty}>뉴스를 불러올 수 없습니다.</div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thNum}>번호</th>
                  <th className={styles.thTitle}>제목</th>
                  <th className={styles.thMore}>더보기</th>
                  <th className={styles.thDate}>등록일</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className={styles.row}>
                    <td className={styles.tdNum}>{startNum - idx}</td>
                    <td className={styles.tdTitle}>
                      <div className={styles.titleRow}>
                        {isNew(item.date) && (
                          <span className={styles.badgeNew}>NEW</span>
                        )}
                        {item.source === 'column' && (
                          <span className={styles.badgeColumn}>칼럼</span>
                        )}
                        <span className={styles.titleText}>{item.title}</span>
                      </div>
                      {item.summary && (
                        <p className={styles.summary}>{item.summary}</p>
                      )}
                    </td>
                    <td className={styles.tdMore}>
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.moreBtn}
                        >
                          더보기 +
                        </a>
                      ) : (
                        <span className={styles.moreBtnDisabled}>—</span>
                      )}
                    </td>
                    <td className={styles.tdDate}>{formatDate(item.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageArrow}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className={styles.pageArrow}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
