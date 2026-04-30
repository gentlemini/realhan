'use client';

import { useEffect, useState } from 'react';
import { useMemo } from 'react';
import HeroBanner from '@/components/HeroBanner';
import PropertyList from '@/components/PropertyList';
import { mockProperties } from '@/lib/utils';
import styles from './page.module.css';

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/properties')
      .then((r) => r.json())
      .then((data) => {
        setProperties(Array.isArray(data) && data.length > 0 ? data : mockProperties);
      })
      .catch(() => setProperties(mockProperties))
      .finally(() => setLoading(false));
  }, []);

  const recommendedProps = useMemo(
    () => properties.filter((p) => p.isRecommended).slice(0, 9),
    [properties]
  );
  const popularProps = useMemo(
    () => [...properties].sort((a, b) => b.hitCount - a.hitCount).slice(0, 10),
    [properties]
  );
  const recentProps = useMemo(
    () =>
      [...properties]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10),
    [properties]
  );

  return (
    <>
      <HeroBanner />

      <div className={styles.statsBar}>
        <div className={styles.statsInner}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{properties.length}+</span>
            <span className={styles.statLabel}>등록 매물</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>1:1</span>
            <span className={styles.statLabel}>전담 상담</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>부산 전지역</span>
            <span className={styles.statLabel}>전문 지역</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>매물 정보를 불러오는 중...</p>
        </div>
      ) : (
        <>
          {recommendedProps.length > 0 && (
            <div className={styles.sectionWrapper}>
              <PropertyList title="⭐ 추천 매물" layout="grid" properties={recommendedProps} />
            </div>
          )}

          {popularProps.length > 0 && (
            <div className={styles.sectionWrapperAlt}>
              <PropertyList title="🔥 인기 매물" layout="carousel" properties={popularProps} />
            </div>
          )}

          {recentProps.length > 0 && (
            <div className={styles.sectionWrapper}>
              <PropertyList title="🆕 최신 등록 매물" layout="carousel" properties={recentProps} />
            </div>
          )}
        </>
      )}

      <section className={styles.ctaBanner}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>원하는 매물을 찾지 못하셨나요?</h2>
          <p className={styles.ctaDesc}>
            친절한 한민희 부장에게 직접 상담을 요청하세요.<br />
            원하시는 조건에 딱 맞는 매물을 찾아드립니다.
          </p>
          <div className={styles.ctaActions}>
            <a href="tel:010-4706-8253" className={styles.ctaCall}>
              📞 010-4706-8253
            </a>
            <a href="/contact" className={styles.ctaLink}>
              온라인 문의 →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
