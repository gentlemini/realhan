'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import styles from '../admin2.module.css';

const ERROR_MSG = {
  Callback: '로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
  AccessDenied: '접근 권한이 없는 계정입니다.',
  OAuthSignin: 'Google 로그인을 시작할 수 없습니다.',
  OAuthCallback: '로그인 콜백 처리에 실패했습니다. 다시 시도해 주세요.',
  Default: '로그인 중 오류가 발생했습니다.',
};

export default function AdminLoginPage() {
  const params = useSearchParams();
  const error = params.get('error');
  const errorMsg = error ? (ERROR_MSG[error] ?? ERROR_MSG.Default) : null;

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginBox}>
        <div className={styles.loginLogo}>
          <span className={styles.loginLogoHan}>한결</span>
          <span className={styles.loginLogoReal}>부동산</span>
        </div>
        <p className={styles.loginSub}>관리자 로그인</p>
        {errorMsg && (
          <p style={{ color: '#e53e3e', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
            {errorMsg}
          </p>
        )}
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
