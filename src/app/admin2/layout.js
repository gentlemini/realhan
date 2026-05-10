'use client';

import { useEffect, useState, useCallback } from 'react';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './admin2.module.css';

const NAV = [
  { icon: '＋', label: '매물 등록',  href: '/admin2' },
  { icon: '☰', label: '전체 매물', href: '/admin2/properties' },
  { icon: '🗺️', label: '매물 지도',  href: '/admin2/map' },
  { icon: '💰', label: '지도/금액표시', href: '/admin2/price-map' },
  { icon: '✉', label: '문의 내역', href: '/admin2/inquiries' },
  { icon: '📋', label: '매물 접수', href: '/admin2/requests' },
  { icon: '📊', label: '사이트 통계', href: '/admin2/stats' },
  { icon: '🧮', label: '계산기',    href: '/calculator' },
  { icon: '⚙', label: '설정',      href: '/admin2/settings' },
];

function AdminInner({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => { closeDrawer(); }, [pathname]);

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/admin2/login') {
      router.replace('/admin2/login');
    }
  }, [status, router, pathname]);

  if (pathname === '/admin2/login') return <>{children}</>;

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

  const handleLogout = () => signOut({ callbackUrl: '/admin2/login' });

  const handleNav = (href) => { router.push(href); closeDrawer(); };

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
        <button className={styles.mobileMenuBtn} onClick={() => setDrawerOpen(v => !v)} aria-label="메뉴">
          <span /><span /><span />
        </button>
      </div>

      <main className={styles.mainScroll}>
        {children}
      </main>

      {/* 모바일 드로어 오버레이 */}
      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={closeDrawer} />
      )}

      {/* 모바일 드로어 패널 */}
      <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>관리자 메뉴</span>
          <button className={styles.drawerClose} onClick={closeDrawer}>✕</button>
        </div>
        <nav className={styles.drawerNav}>
          {NAV.map((n) => (
            <button
              key={n.href}
              className={`${styles.drawerItem} ${isActive(n.href) ? styles.drawerItemActive : ''}`}
              onClick={() => handleNav(n.href)}
            >
              <span className={styles.drawerItemIcon}>{n.icon}</span>
              <span className={styles.drawerItemLabel}>{n.label}</span>
              {isActive(n.href) && <span className={styles.drawerItemDot} />}
            </button>
          ))}
        </nav>
        <div className={styles.drawerFooter}>
          <button onClick={handleLogout} className={styles.drawerLogout}>
            <span>↩</span>
            <span>로그아웃</span>
          </button>
        </div>
      </div>
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
