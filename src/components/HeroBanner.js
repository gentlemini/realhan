'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './HeroBanner.module.css';

export default function HeroBanner() {
  const contentRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 8;
      const y = (e.clientY / window.innerHeight - 0.5) * 5;
      if (contentRef.current) {
        contentRef.current.style.transform = `translate(${x * -0.2}px, ${y * -0.2}px)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.bg} />
      <div className={styles.overlay} />

      <div ref={contentRef} className={styles.content}>
        <h1 className={styles.title}>
          당신의 이상적인 집,<br />
          <span className={styles.titleAccent}>한결부동산</span>이<br />
          찾아드립니다
        </h1>
        <p className={styles.subtitle}>
          아파트·원룸·오피스텔·상가·토지까지<br />
          친절한 한민희 부장이 직접 상담해 드립니다
        </p>
        <div className={styles.actions}>
          <Link href="/properties" className={styles.btnPrimary}>
            매물 찾기 →
          </Link>
          <Link href="/contact" className={styles.btnSecondary}>
            빠른 상담 예약
          </Link>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>1:1</span>
            <span className={styles.statLabel}>전담 상담</span>
          </div>
          <div className={styles.statLine} />
          <div className={styles.stat}>
            <span className={styles.statNum}>부산 전지역</span>
            <span className={styles.statLabel}>전문 지역</span>
          </div>
        </div>
      </div>

      <div className={styles.scrollIndicator}>
        <span>SCROLL</span>
        <div className={styles.scrollLine} />
      </div>
    </section>
  );
}
