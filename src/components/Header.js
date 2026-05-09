'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

const NAV_LINKS = [
  {
    href: '/',
    label: '홈',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/properties',
    label: '매물찾기',
    featured: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <path d="M11 8v6M8 11h6"/>
      </svg>
    ),
  },
  {
    href: '/blog',
    label: '네이버블로그',
    naver: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    ),
  },
  {
    href: '/about',
    label: '사무소소개',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    href: '/news',
    label: '부동산소식',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4 4z"/>
        <path d="M2 4a2 2 0 0 1 2-2"/>
        <line x1="10" y1="7" x2="18" y2="7"/>
        <line x1="10" y1="11" x2="18" y2="11"/>
        <line x1="10" y1="15" x2="14" y2="15"/>
      </svg>
    ),
  },
  {
    href: '/links',
    label: '부동산관련 사이트',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/calculator',
    label: '계산기',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="6" x2="16" y2="6"/>
        <line x1="8" y1="10" x2="10" y2="10"/>
        <line x1="14" y1="10" x2="16" y2="10"/>
        <line x1="8" y1="14" x2="10" y2="14"/>
        <line x1="14" y1="14" x2="16" y2="14"/>
        <line x1="8" y1="18" x2="10" y2="18"/>
        <line x1="14" y1="18" x2="16" y2="18"/>
      </svg>
    ),
  },
  {
    href: '/contact',
    label: '상담문의 및 매물접수',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pill, setPill] = useState(null);
  const navRef = useRef(null);

  const handleMouseEnter = (e, featured) => {
    if (featured) { setPill(null); return; }
    const nav = navRef.current;
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    const rect = e.currentTarget.getBoundingClientRect();
    setPill({ left: rect.left - navRect.left, width: rect.width });
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoAgent}>친절한 공인중개사 한민희</span>
          <div className={styles.logoRow}>
            <span className={styles.logoBlack}>한결</span>
            <span className={styles.logoGold}>부동산</span>
            <span className={styles.logoSub}>공인중개사사무소</span>
          </div>
        </Link>

        <nav
          className={styles.nav}
          ref={navRef}
          onMouseLeave={() => setPill(null)}
        >
          {/* 슬라이딩 배경 필 */}
          <span
            className={styles.hoverPill}
            style={pill
              ? { left: pill.left, width: pill.width, opacity: 1 }
              : { opacity: 0 }
            }
          />

          {NAV_LINKS.map(({ href, label, icon, featured, naver }, idx) => {
            const isActive = pathname === href;
            let cls = styles.navLink;
            if (featured) cls += ` ${styles.navLinkFeatured}`;
            else if (naver) cls += ` ${styles.navLinkNaver}`;
            if (isActive && !featured) cls += ` ${styles.navLinkActive}`;
            if (isActive && featured) cls += ` ${styles.navLinkFeaturedActive}`;
            return (
              <Link
                key={href}
                href={href}
                className={cls}
                style={{ '--i': idx }}
                onMouseEnter={(e) => handleMouseEnter(e, featured)}
              >
                <span className={styles.icon}>{icon}</span>
                <span>{label}</span>
                {isActive && !featured && <span className={styles.activeDot} />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.rightArea}>
          <Link
            href="/admin2"
            className={`${styles.adminBtn} ${styles.admin2Btn} ${pathname.startsWith('/admin2') ? styles.adminBtnActive : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            관리자
          </Link>

          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="메뉴 열기"
          >
          <span className={mobileOpen ? styles.bar1Open : ''} />
          <span className={mobileOpen ? styles.bar2Open : ''} />
          <span className={mobileOpen ? styles.bar3Open : ''} />
          </button>
        </div>
      </div>

      <nav className={`${styles.mobileNav} ${mobileOpen ? styles.mobileNavOpen : ''}`}>
        {NAV_LINKS.map(({ href, label, icon, featured, naver }) => {
          let cls = styles.mobileNavLink;
          if (featured) cls += ` ${styles.mobileNavLinkFeatured}`;
          if (naver) cls += ` ${styles.mobileNavLinkNaver}`;
          return (
            <Link key={href} href={href} className={cls} onClick={() => setMobileOpen(false)}>
              <span className={styles.icon}>{icon}</span>
              {label}
            </Link>
          );
        })}
        <Link href="/admin2" className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
          <span className={styles.icon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          관리자2페이지
        </Link>
      </nav>
    </header>
  );
}
