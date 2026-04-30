'use client';

import { useState } from 'react';
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

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[한결부동산 상담] ${form.name}님의 상담 문의`);
    const body = encodeURIComponent(
      `이름: ${form.name}\n연락처: ${form.phone}\n이메일: ${form.email}\n관심 매물: ${form.type}\n예산: ${form.budget}\n\n문의 내용:\n${form.message}`
    );
    window.location.href = `mailto:zsaza@naver.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
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
            href="http://pf.kakao.com/_QaxliG/chat"
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

        <div className={styles.formSection}>
          <h2 className={styles.formTitle}>온라인 상담 신청</h2>
          {submitted ? (
            <div className={styles.successMsg}>
              <span>✅</span>
              <p>메일 클라이언트가 열립니다. 전송 후 1-2 영업일 내 답변드립니다.</p>
              <button onClick={() => setSubmitted(false)} className={styles.resetBtn}>
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

              <button type="submit" className={styles.submitBtn}>
                상담 신청하기 →
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
