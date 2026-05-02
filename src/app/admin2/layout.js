'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './admin2.module.css';

const DEFAULT_PW = '1234';
const PW_KEY = 'hk_admin2_pw';

const NAV = [
  { icon: '＋', label: '매물 등록',  href: '/admin2' },
  { icon: '☰', label: '전체 매물', href: '/admin2/properties' },
  { icon: '✉', label: '문의 내역', href: '/admin2/inquiries' },
  { icon: '📋', label: '매물 접수', href: '/admin2/requests' },
  { icon: '⚙', label: '설정',      href: '/admin2/settings' },
];

export default function Admin2Layout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [authed,   setAuthed]   = useState(false);
  const [pwInput,  setPwInput]  = useState('');
  const [pwError,  setPwError]  = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const stored = localStorage.getItem(PW_KEY) || DEFAULT_PW;
    if (pwInput === stored) {
      setAuthed(true);
    } else {
      setPwError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleLogout = () => {
    setAuthed(false);
    setPwInput('');
    router.push('/admin2');
  };

  if (!authed) {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginBox}>
          <div className={styles.loginLogo}>
            <span className={styles.loginLogoHan}>한결</span>
            <span className={styles.loginLogoReal}>부동산</span>
          </div>
          <p className={styles.loginSub}>관리자2 로그인</p>
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError(''); }}
              placeholder="비밀번호 입력"
              className={styles.loginInput}
              autoFocus
            />
            {pwError && <p className={styles.loginError}>{pwError}</p>}
            <button type="submit" className={styles.loginBtn}>로그인</button>
          </form>
          <p className={styles.loginHint}>기본 비밀번호: 1234</p>
        </div>
      </div>
    );
  }

  const isActive = (href) =>
    href === '/admin2' ? pathname === '/admin2' : pathname.startsWith(href);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <p className={styles.logoLabel}>관리자2</p>
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

      <main className={styles.mainScroll}>
        {children}
      </main>
    </div>
  );
}
