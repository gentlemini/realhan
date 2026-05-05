'use client';

import { useEffect } from 'react';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './admin2.module.css';

const NAV = [
  { icon: '＋', label: '매물 등록',  href: '/admin2' },
  { icon: '☰', label: '전체 매물', href: '/admin2/properties' },
  { icon: '🗺️', label: '매물 지도',  href: '/admin2/map' },
  { icon: '✉', label: '문의 내역', href: '/admin2/inquiries' },
  { icon: '📋', label: '매물 접수', href: '/admin2/requests' },
  { icon: '📊', label: '사이트 통계', href: '/admin2/stats' },
  { icon: '⚙', label: '설정',      href: '/admin2/settings' },
];

function AdminInner({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/admin2/login') {
      router.replace('/admin2/login');
    }
  }, [status, router, pathname]);

  if (pathname === '/admin2/login') {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginBox}>
          <p className={styles.loginSub}>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isActive = (href) => {
    const [hPath] = href.split('?');
    return hPath === '/admin2' ? pathname === '/admin2' : pathname.startsWith(hPath);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/admin2/login' });
  };

  return (
    <div className={styles.layout}>
      {/* 데스크탑 사이드바 */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <p className={styles.logoLabel}>관리자</p>
        </div>
        <nav className={styles.sidebarNav}>
          {NAV.map((n) => (
            <button
              key={n.href}
              className={`${styles.navItem} ${isActive(n.href) ? styles.navItemActive : ''}`}
              onClick={() => router.push(n.href)}
            >
              <span className={styles.navIcon}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <span className={styles.navIcon}>↩</span>
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 모바일 상단 바 */}
      <div id="admin-mobile-topbar" className={styles.mobileTopBar}>
        <span className={styles.mobileTopTitle}>관리자</span>
        <button onClick={handleLogout} className={styles.mobileLogoutBtn}>↩ 로그아웃</button>
      </div>

      <main className={styles.mainScroll}>
        {children}
      </main>

      {/* 모바일 하단 탭바 */}
      <nav className={styles.mobileNav}>
        {NAV.map((n) => (
          <button
            key={n.href}
            className={`${styles.mobileNavItem} ${isActive(n.href) ? styles.mobileNavItemActive : ''}`}
            onClick={() => router.push(n.href)}
          >
            <span className={styles.mobileNavIcon}>{n.icon}</span>
            <span className={styles.mobileNavLabel}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function Admin2Layout({ children }) {
  return (
    <SessionProvider>
      <AdminInner>{children}</AdminInner>
    </SessionProvider>
  );
}
