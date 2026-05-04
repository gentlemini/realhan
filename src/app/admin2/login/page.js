'use client';

import { signIn } from 'next-auth/react';
import styles from '../admin2.module.css';

export default function AdminLoginPage() {
  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginBox}>
        <div className={styles.loginLogo}>
          <span className={styles.loginLogoHan}>한결</span>
          <span className={styles.loginLogoReal}>부동산</span>
        </div>
        <p className={styles.loginSub}>관리자 로그인</p>
        <button
          className={styles.loginBtn}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          onClick={() => signIn('google', { callbackUrl: '/admin2' })}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none" style={{ display: 'block', flexShrink: 0 }}>
            <path d="M44.5 20H24v8.5h11.7C34.1 33.7 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.2-2.7-.5-4z" fill="#FFC107"/>
            <path d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z" fill="#FF3D00"/>
            <path d="M24 45c5.5 0 10.5-1.9 14.4-5.1l-6.7-5.5C29.6 36 27 37 24 37c-5.6 0-10.1-3.3-11.7-8.5l-7 5.4C8.8 41.2 15.9 45 24 45z" fill="#4CAF50"/>
            <path d="M44.5 20H24v8.5h11.7c-.8 2.3-2.3 4.2-4.2 5.5l6.7 5.5C42.1 36.2 45 30.6 45 24c0-1.4-.2-2.7-.5-4z" fill="#1976D2"/>
          </svg>
          Google 계정으로 로그인
        </button>
      </div>
    </div>
  );
}
