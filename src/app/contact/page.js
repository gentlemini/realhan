'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './contact.module.css';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: '',
    budget: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '전송 실패'); return; }
      setSubmitted(true);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.badge}>Contact</p>
          <h1 className={styles.title}>상담문의 및 매물접수</h1>
          <p className={styles.subtitle}>
            언제든지 편하게 연락주세요.<br />
            친절한 한민희 부장이 신속하게 답변드립니다.
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.quickContact}>
          <a href="tel:010-4706-8253" className={`${styles.quickBtn} ${styles.quickBtnTel}`}>
            <span className={styles.quickIcon}>📱</span>
            <div>
              <p className={styles.quickLabel}>바로 전화하기</p>
              <p className={styles.quickValue}>010-4706-8253</p>
            </div>
          </a>
          <a
            href="https://pf.kakao.com/_QaxliG"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.quickBtn}
          >
            <span className={styles.quickIcon}>💬</span>
            <div>
              <p className={styles.quickLabel}>카카오톡 상담</p>
              <p className={styles.quickValue}>1:1 채팅 시작</p>
            </div>
          </a>
          <a href="mailto:zsaza@naver.com" className={styles.quickBtn}>
            <span className={styles.quickIcon}>✉</span>
            <div>
              <p className={styles.quickLabel}>이메일 문의</p>
              <p className={styles.quickValue}>zsaza@naver.com</p>
            </div>
          </a>
        </div>

        <Link href="/property-request" className={styles.quickBtn} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', background: 'linear-gradient(135deg, #1c1917, #2a1e11)', border: '1px solid rgba(193,154,107,0.3)', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.8rem' }}>🏠</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>소유하신 매물을 맡겨주세요</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>내 매물 접수하기 →</p>
          </div>
        </Link>

        <div className={styles.formSection}>
          <h2 className={styles.formTitle}>온라인 상담 신청</h2>
          {submitted ? (
            <div className={styles.successMsg}>
              <span>✅</span>
              <p>문의가 접수되었습니다.<br />1-2 영업일 내 연락드리겠습니다.</p>
              <a
                href="https://pf.kakao.com/_QaxliG"
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '12px 28px', background: '#FAE100', color: '#3A1D1D', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}
              >
                💬 카카오톡으로 빠른 상담
              </a>
              <button onClick={() => { setSubmitted(false); setForm({ name:'', phone:'', email:'', type:'', budget:'', message:'' }); }} className={styles.resetBtn}>
                다시 작성
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.row2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>이름 *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="홍길동"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>연락처 *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    placeholder="010-0000-0000"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>이메일</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>관심 매물 종류</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className={styles.select}
                  >
                    <option value="">선택하세요</option>
                    {['아파트', '빌라', '원룸', '오피스텔', '상가', '토지', '빌딩'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>예산 (만원)</label>
                <input
                  type="text"
                  name="budget"
                  value={form.budget}
                  onChange={handleChange}
                  placeholder="예: 3억 이하, 전세 1억~2억 등"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>문의 내용 *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="원하시는 조건이나 문의 사항을 자유롭게 작성해 주세요."
                  className={styles.textarea}
                />
              </div>

              {error && <p style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: -8 }}>{error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={saving}>
                {saving ? '전송 중…' : '상담 신청하기 →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
