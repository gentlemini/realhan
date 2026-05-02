'use client';

import { useState } from 'react';
import styles from '../contact/contact.module.css';

const PROPERTY_TYPES = ['아파트', '오피스텔', '빌라/다세대', '단독/다가구', '원룸/투룸', '상가', '사무실', '공장/창고', '빌딩/건물', '토지', '분양권', '기타'];
const TRANSACTION_TYPES = ['매매', '전세', '월세', '단기임대'];

export default function PropertyRequestPage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    propertyType: '', transaction: '',
    location: '', price: '', area: '', memo: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/property-request', {
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
          <p className={styles.badge}>매물접수</p>
          <h1 className={styles.title}>내 매물 접수</h1>
          <p className={styles.subtitle}>
            소유하신 매물 정보를 알려주세요.<br />
            한결부동산이 최적의 조건으로 거래를 도와드립니다.
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.formSection}>
          <h2 className={styles.formTitle}>매물 접수 신청서</h2>
          {submitted ? (
            <div className={styles.successMsg}>
              <span>✅</span>
              <p>매물 접수가 완료되었습니다.<br />확인 후 빠르게 연락드리겠습니다.</p>
              <a
                href="http://pf.kakao.com/_QaxliG/chat"
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '12px 28px', background: '#FAE100', color: '#3A1D1D', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}
              >
                💬 카카오톡으로 빠른 상담
              </a>
              <button
                onClick={() => { setSubmitted(false); setForm({ name:'', phone:'', email:'', propertyType:'', transaction:'', location:'', price:'', area:'', memo:'' }); }}
                className={styles.resetBtn}
              >
                다시 작성
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.row2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>이름 *</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="홍길동" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>연락처 *</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="010-0000-0000" className={styles.input} />
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>이메일</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="example@email.com" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>거래 종류</label>
                  <select name="transaction" value={form.transaction} onChange={handleChange} className={styles.select}>
                    <option value="">선택하세요</option>
                    {TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>매물 종류</label>
                <select name="propertyType" value={form.propertyType} onChange={handleChange} className={styles.select}>
                  <option value="">선택하세요</option>
                  {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>소재지 (희망 지역)</label>
                <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="예: 서울시 강남구, 경기도 성남시 분당구 등" className={styles.input} />
              </div>

              <div className={styles.row2}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>희망 가격 (만원)</label>
                  <input type="text" name="price" value={form.price} onChange={handleChange} placeholder="예: 3억, 전세 1억~2억" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>면적 (희망)</label>
                  <input type="text" name="area" value={form.area} onChange={handleChange} placeholder="예: 20평 이상, 60㎡ 내외" className={styles.input} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>추가 요청사항</label>
                <textarea name="memo" value={form.memo} onChange={handleChange} rows={5} placeholder="기타 희망 조건이나 특이사항을 자유롭게 작성해 주세요." className={styles.textarea} />
              </div>

              {error && <p style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: -8 }}>{error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={saving}>
                {saving ? '접수 중…' : '매물 접수 신청하기 →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
