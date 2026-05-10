'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './web-design.module.css';

const FEATURES = [
  {
    icon: '🗺️',
    title: '카카오 지도 연동',
    desc: '매물 위치를 지도에 핀으로 표시. 클러스터링·줌레벨별 자동 그룹화로 한눈에 파악.',
  },
  {
    icon: '💰',
    title: '가격 지도 표시',
    desc: '지도 위에 매물 가격이 직접 표시되는 프리미엄 기능. 고객이 직관적으로 시세를 파악합니다.',
  },
  {
    icon: '📋',
    title: '스마트 매물 관리',
    desc: '아파트·원룸·오피스텔·상가·토지 등 모든 유형의 매물을 등록·수정·삭제. 사진·유튜브 영상 첨부 가능.',
  },
  {
    icon: '📱',
    title: '모바일 완전 대응',
    desc: 'PC·태블릿·스마트폰 모든 화면에 최적화. 고객이 어디서든 편하게 매물을 확인합니다.',
  },
  {
    icon: '🤖',
    title: 'AI 블로그 자동 생성',
    desc: 'Claude AI가 매물 정보를 바탕으로 네이버 블로그 포스팅 초안을 자동 생성합니다.',
  },
  {
    icon: '📊',
    title: '실거래가 조회',
    desc: '국토부 실거래가 API 연동으로 고객에게 신뢰도 높은 시세 정보를 제공합니다.',
  },
  {
    icon: '🔍',
    title: 'SEO 최적화',
    desc: '네이버·구글 검색 상위 노출을 위한 메타태그·사이트맵·키워드 최적화 기본 포함.',
  },
  {
    icon: '💬',
    title: '카카오톡 상담 연동',
    desc: '매물 상세 페이지에서 바로 카카오톡 채널로 상담 연결. 문의 전환율을 높입니다.',
  },
  {
    icon: '📬',
    title: '매물 접수 시스템',
    desc: '고객이 직접 매물을 접수하고 관리자가 확인하는 워크플로우 내장.',
  },
];

const STACK = ['Next.js 16', 'React', 'Kakao Maps API', 'Notion DB', 'Vercel', 'Claude AI', 'Google Analytics'];

export default function WebDesignPage() {
  const [visible, setVisible] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={`${styles.hero} ${visible ? styles.heroIn : ''}`}>
        <div className={styles.heroInner}>
          <p className={styles.heroEye}>부동산 전문 홈페이지</p>
          <h1 className={styles.heroH1}>
            <span className={styles.line1}>공인중개사를 위한</span>
            <span className={styles.line2}>프리미엄 <em className={styles.gold}>홈페이지</em></span>
            <span className={styles.line3}>제작해드립니다</span>
          </h1>
          <p className={styles.heroSub}>
            지금 보고 계신 이 홈페이지와 동일한 수준의<br />
            부동산 전문 웹사이트를 제작해드립니다.<br />
            매물 관리·카카오 지도·AI 블로그까지 올인원.
          </p>
          <div className={styles.heroBtns}>
            <a href="tel:010-4706-8253" className={styles.btnPrimary}>📞 바로 전화 상담</a>
            <a href="https://pf.kakao.com/_QaxliG" target="_blank" rel="noopener noreferrer" className={styles.btnSecondary}>💬 카카오톡 문의</a>
          </div>
        </div>
        <div className={styles.heroBadge}>
          <span className={styles.badgeText}>제작 문의</span>
          <span className={styles.badgePrice}>가격 문의주세요</span>
        </div>
      </section>

      {/* ── 기술 스택 ── */}
      <section className={styles.stackSection}>
        <div className={styles.stackScroll}>
          {[...STACK, ...STACK].map((s, i) => (
            <span key={i} className={styles.stackChip}>{s}</span>
          ))}
        </div>
      </section>

      {/* ── 이런 분께 ── */}
      <section className={styles.targetSection}>
        <div className={styles.sectionInner}>
          <p className={styles.eye}>WHO IS THIS FOR</p>
          <h2 className={styles.sectionTitle}>이런 분께 딱 맞습니다</h2>
          <div className={styles.targetGrid}>
            {[
              { icon: '🏠', text: '직접 운영 중인 부동산 사무소가 있으신 분' },
              { icon: '📣', text: '네이버·구글에 내 매물을 노출하고 싶은 분' },
              { icon: '📲', text: '스마트폰으로 간편하게 매물을 관리하고 싶은 분' },
              { icon: '🤝', text: '고객에게 전문적인 첫인상을 주고 싶은 분' },
            ].map((t, i) => (
              <div key={i} className={styles.targetCard}>
                <span className={styles.targetIcon}>{t.icon}</span>
                <p className={styles.targetText}>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 기능 목록 ── */}
      <section className={styles.featSection}>
        <div className={styles.sectionInner}>
          <p className={styles.eye}>FEATURES</p>
          <h2 className={styles.sectionTitle}>포함된 기능</h2>
          <div className={styles.featGrid}>
            {FEATURES.map((f, i) => (
              <div key={i} className={styles.featCard}>
                <span className={styles.featIcon}>{f.icon}</span>
                <h3 className={styles.featTitle}>{f.title}</h3>
                <p className={styles.featDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 데모 ── */}
      <section className={styles.demoSection}>
        <div className={styles.sectionInner}>
          <p className={styles.eye}>LIVE DEMO</p>
          <h2 className={styles.sectionTitle}>지금 보고 계신 사이트가 샘플입니다</h2>
          <p className={styles.demoDesc}>
            이 홈페이지 자체가 실제 제작 결과물입니다.<br />
            매물 찾기, 지도, 관리자 페이지, AI 블로그 생성까지 직접 체험해보세요.
          </p>
          <div className={styles.demoLinks}>
            <Link href="/properties" className={styles.demoLink}>매물 찾기 보기 →</Link>
            <Link href="/blog" className={styles.demoLink}>블로그 보기 →</Link>
            <Link href="/calculator" className={styles.demoLink}>계산기 보기 →</Link>
          </div>
        </div>
      </section>

      {/* ── 제작 과정 ── */}
      <section className={styles.processSection}>
        <div className={styles.sectionInner}>
          <p className={styles.eye}>PROCESS</p>
          <h2 className={styles.sectionTitle}>제작 진행 과정</h2>
          <div className={styles.processSteps}>
            {[
              { num: '01', title: '상담 & 요구사항 파악', desc: '전화 또는 카카오톡으로 원하시는 기능과 디자인 방향을 파악합니다.' },
              { num: '02', title: '디자인 & 개발', desc: '맞춤 디자인으로 홈페이지를 개발합니다. 진행 상황을 실시간으로 공유합니다.' },
              { num: '03', title: '검토 & 수정', desc: '완성된 사이트를 함께 확인하고 피드백을 반영합니다.' },
              { num: '04', title: '배포 & 운영 교육', desc: '도메인 연결 및 배포 후, 매물 등록·관리 방법을 안내해드립니다.' },
            ].map((s, i) => (
              <div key={i} className={styles.processStep}>
                <span className={styles.processNum}>{s.num}</span>
                <div>
                  <h3 className={styles.processTitle}>{s.title}</h3>
                  <p className={styles.processDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 가격 & CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <p className={styles.ctaEye}>PRICING</p>
          <h2 className={styles.ctaTitle}>제작 비용은?</h2>
          <div className={styles.priceBox}>
            <p className={styles.priceLabel}>기본 제작비</p>
            <p className={styles.priceValue}>문의주세요</p>
            <p className={styles.priceSub}>원하시는 기능과 규모에 따라 맞춤 견적을 드립니다</p>
            <ul className={styles.priceList}>
              <li>✓ 매물 관리 시스템</li>
              <li>✓ 카카오 지도 연동</li>
              <li>✓ 모바일 반응형</li>
              <li>✓ SEO 기본 설정</li>
              <li>✓ 관리자 페이지</li>
              <li>✓ 배포 & 도메인 연결</li>
            </ul>
          </div>
          <div className={styles.ctaBtns}>
            <a href="tel:010-4706-8253" className={styles.ctaBtnPrimary}>📞 010-4706-8253 전화 상담</a>
            <a href="https://pf.kakao.com/_QaxliG" target="_blank" rel="noopener noreferrer" className={styles.ctaBtnSecondary}>💬 카카오톡으로 문의</a>
          </div>
          <p className={styles.ctaNote}>담당자: 한민희 · 빠른 답변 드립니다</p>
        </div>
      </section>

    </div>
  );
}
