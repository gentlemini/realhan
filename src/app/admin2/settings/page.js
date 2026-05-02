'use client';

import { useState } from 'react';
import styles from '../admin2.module.css';

const DEFAULT_PW = '1234';
const PW_KEY = 'hk_admin2_pw';

export default function SettingsPage() {
  const [curPw,     setCurPw]     = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg,       setMsg]       = useState('');

  const handleChangePw = (e) => {
    e.preventDefault();
    setMsg('');
    const stored = localStorage.getItem(PW_KEY) || DEFAULT_PW;
    if (curPw !== stored)    { setMsg('❌ 현재 비밀번호가 올바르지 않습니다.'); return; }
    if (newPw.length < 4)    { setMsg('❌ 새 비밀번호는 4자 이상이어야 합니다.'); return; }
    if (newPw !== confirmPw) { setMsg('❌ 새 비밀번호가 일치하지 않습니다.'); return; }
    localStorage.setItem(PW_KEY, newPw);
    setCurPw(''); setNewPw(''); setConfirmPw('');
    setMsg('✅ 비밀번호가 변경되었습니다.');
  };

  return (
    <div className={styles.settingsWrap}>
      <div className={styles.settingsCard}>
        <p className={styles.settingsCardTitle}>비밀번호 변경</p>
        <form onSubmit={handleChangePw} className={styles.settingsForm}>
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>현재 비밀번호</label>
            <input type="password" className={styles.settingsInput} value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
          </div>
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>새 비밀번호 (4자 이상)</label>
            <input type="password" className={styles.settingsInput} value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          </div>
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>새 비밀번호 확인</label>
            <input type="password" className={styles.settingsInput} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
          </div>
          {msg && <p className={styles.settingsMsg}>{msg}</p>}
          <button type="submit" className={styles.settingsBtn}>변경하기</button>
        </form>
      </div>
      <div className={styles.settingsNote}>
        <p>⚠️ 이 비밀번호는 브라우저 localStorage에 저장됩니다. 프로덕션 배포 전 NextAuth 등 서버 인증으로 교체를 권장합니다.</p>
      </div>
    </div>
  );
}
