'use client';

import { useState, useMemo } from 'react';
import styles from './calculator.module.css';

// ── 중개보수 요율표 ──────────────────────────────────
const SALE_RATES = [
  { max: 5000,     rate: 0.006, limit: 25  },
  { max: 20000,    rate: 0.005, limit: 80  },
  { max: 90000,    rate: 0.004, limit: null },
  { max: 120000,   rate: 0.005, limit: null },
  { max: 150000,   rate: 0.006, limit: null },
  { max: Infinity, rate: 0.007, limit: null },
];
const RENT_RATES = [
  { max: 5000,     rate: 0.005, limit: 20  },
  { max: 10000,    rate: 0.004, limit: 30  },
  { max: 60000,    rate: 0.003, limit: null },
  { max: 120000,   rate: 0.004, limit: null },
  { max: Infinity, rate: 0.008, limit: null },
];

function getCommission(isSale, amount) {
  const table = isSale ? SALE_RATES : RENT_RATES;
  for (const { max, rate, limit } of table) {
    if (amount < max) {
      const raw = amount * rate;
      const commission = limit ? Math.min(raw, limit) : raw;
      return { rate, rateText: (rate * 100).toFixed(1), commission: Math.floor(commission) };
    }
  }
}

// ── 숫자 포맷 ────────────────────────────────────────
function fmtMan(v) {
  if (!v && v !== 0) return '—';
  const eok = Math.floor(v / 10000);
  const rem = v % 10000;
  if (eok === 0) return `${v.toLocaleString()}만원`;
  if (rem === 0)  return `${eok}억원`;
  return `${eok}억 ${rem.toLocaleString()}만원`;
}

function parseNum(str) {
  return Number(String(str).replace(/,/g, '')) || 0;
}

function handleNumInput(setter) {
  return (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setter(raw ? Number(raw).toLocaleString() : '');
  };
}

export default function CalculatorPage() {
  const [tab, setTab] = useState('commission');

  // ── 중개보수 state
  const [txType,  setTxType]  = useState('매매');
  const [amount,  setAmount]  = useState('');
  const [deposit, setDeposit] = useState('');
  const [monthly, setMonthly] = useState('');

  // ── 전월세 전환 state
  const [dir,          setDir]          = useState('to-wolse');
  const [convJeonse,   setConvJeonse]   = useState('');
  const [convDeposit,  setConvDeposit]  = useState('');
  const [convMonthly,  setConvMonthly]  = useState('');
  const [convRate,     setConvRate]     = useState('5.5');

  // ── 중개보수 계산
  const commResult = useMemo(() => {
    let calcAmount = 0;
    if (txType === '월세') {
      const d = parseNum(deposit);
      const m = parseNum(monthly);
      if (!m && !d) return null;
      const converted = d + m * 100;
      calcAmount = converted < 5000 ? d + m * 70 : converted;
    } else {
      calcAmount = parseNum(amount);
      if (!calcAmount) return null;
    }
    const r = getCommission(txType === '매매', calcAmount);
    if (!r) return null;
    const vat = Math.floor(r.commission * 0.1);
    return { ...r, amount: calcAmount, vat, total: r.commission + vat };
  }, [txType, amount, deposit, monthly]);

  // ── 전월세 전환 계산
  const convResult = useMemo(() => {
    const rate = parseFloat(convRate);
    if (!rate || rate <= 0) return null;
    if (dir === 'to-wolse') {
      const jeonse = parseNum(convJeonse);
      const dep    = parseNum(convDeposit);
      if (!jeonse) return null;
      const diff = jeonse - dep;
      if (diff <= 0) return { error: '전세금이 보증금보다 커야 합니다.' };
      return { type: 'to-wolse', jeonse, deposit: dep, monthly: Math.round(diff * (rate / 100) / 12) };
    } else {
      const dep = parseNum(convDeposit);
      const mon = parseNum(convMonthly);
      if (!mon) return null;
      return { type: 'to-jeonse', deposit: dep, monthly: mon, jeonse: Math.round(dep + mon * 12 / (rate / 100)) };
    }
  }, [dir, convJeonse, convDeposit, convMonthly, convRate]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEyebrow}>한결부동산 공인중개사사무소</p>
        <h1 className={styles.heroTitle}>부동산 계산기</h1>
        <p className={styles.heroSub}>중개보수와 전월세 전환을 간편하게 계산하세요</p>
      </div>

      <div className={styles.container}>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${tab === 'commission' ? styles.tabActive : ''}`}
            onClick={() => setTab('commission')}
          >
            💰 중개보수 계산기
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'conversion' ? styles.tabActive : ''}`}
            onClick={() => setTab('conversion')}
          >
            🔢 전월세 전환 계산기
          </button>
        </div>

        {/* ── 중개보수 탭 ── */}
        {tab === 'commission' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>중개보수 계산기</h2>
              <span className={styles.cardBadge}>2021년 개정 상한 요율 기준</span>
            </div>

            <div className={styles.typeGroup}>
              {['매매', '전세', '월세'].map(t => (
                <button
                  key={t}
                  className={`${styles.typeBtn} ${txType === t ? styles.typeBtnActive : ''}`}
                  onClick={() => setTxType(t)}
                >{t}</button>
              ))}
            </div>

            <div className={styles.inputBlock}>
              {txType === '월세' ? (
                <>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>보증금</label>
                    <div className={styles.inputWrap}>
                      <input className={styles.input} value={deposit} onChange={handleNumInput(setDeposit)} placeholder="0" />
                      <span className={styles.inputUnit}>만원</span>
                    </div>
                  </div>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>월세</label>
                    <div className={styles.inputWrap}>
                      <input className={styles.input} value={monthly} onChange={handleNumInput(setMonthly)} placeholder="0" />
                      <span className={styles.inputUnit}>만원</span>
                    </div>
                  </div>
                  {(parseNum(deposit) > 0 || parseNum(monthly) > 0) && (
                    <p className={styles.convertedNote}>
                      환산 보증금: {fmtMan(
                        (() => { const d = parseNum(deposit), m = parseNum(monthly), c = d + m * 100; return c < 5000 ? d + m * 70 : c; })()
                      )}
                    </p>
                  )}
                </>
              ) : (
                <div className={styles.inputRow}>
                  <label className={styles.label}>{txType === '매매' ? '매매가격' : '전세금'}</label>
                  <div className={styles.inputWrap}>
                    <input className={styles.input} value={amount} onChange={handleNumInput(setAmount)} placeholder="0" />
                    <span className={styles.inputUnit}>만원</span>
                  </div>
                </div>
              )}
            </div>

            {commResult && (
              <div className={styles.resultBox}>
                <div className={styles.resultRow}>
                  <span className={styles.rLabel}>거래금액</span>
                  <span className={styles.rValue}>{fmtMan(commResult.amount)}</span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.rLabel}>적용 요율</span>
                  <span className={styles.rValue}>{commResult.rateText}%</span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.rLabel}>중개보수 (상한)</span>
                  <span className={styles.rValue}>{fmtMan(commResult.commission)}</span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.rLabel}>부가세 (10%)</span>
                  <span className={styles.rValue}>{fmtMan(commResult.vat)}</span>
                </div>
                <div className={`${styles.resultRow} ${styles.resultTotalRow}`}>
                  <span className={styles.rLabel}>최종 합계</span>
                  <span className={styles.rValueTotal}>{fmtMan(commResult.total)}</span>
                </div>
              </div>
            )}

            <details className={styles.tableWrap}>
              <summary className={styles.tableSummary}>📋 법정 상한 요율표 보기</summary>
              <table className={styles.rateTable}>
                <thead>
                  <tr><th>구분</th><th>거래금액</th><th>상한 요율</th><th>한도액</th></tr>
                </thead>
                <tbody>
                  <tr><td rowSpan={6} className={styles.txCell}>매매</td><td>5천만원 미만</td><td>0.6%</td><td>25만원</td></tr>
                  <tr><td>5천만~2억 미만</td><td>0.5%</td><td>80만원</td></tr>
                  <tr><td>2억~9억 미만</td><td>0.4%</td><td>—</td></tr>
                  <tr><td>9억~12억 미만</td><td>0.5%</td><td>—</td></tr>
                  <tr><td>12억~15억 미만</td><td>0.6%</td><td>—</td></tr>
                  <tr><td>15억 이상</td><td>0.7%</td><td>—</td></tr>
                  <tr><td rowSpan={5} className={styles.txCell}>전·월세</td><td>5천만원 미만</td><td>0.5%</td><td>20만원</td></tr>
                  <tr><td>5천만~1억 미만</td><td>0.4%</td><td>30만원</td></tr>
                  <tr><td>1억~6억 미만</td><td>0.3%</td><td>—</td></tr>
                  <tr><td>6억~12억 미만</td><td>0.4%</td><td>—</td></tr>
                  <tr><td>12억 이상</td><td>0.8%</td><td>—</td></tr>
                </tbody>
              </table>
              <p className={styles.tableNote}>* 월세: 보증금 + 월세×100 (환산보증금)으로 계산. 실제 요율은 협의 가능합니다.</p>
            </details>
          </div>
        )}

        {/* ── 전월세 전환 탭 ── */}
        {tab === 'conversion' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>전월세 전환 계산기</h2>
              <span className={styles.cardBadge}>전환율 직접 입력 가능</span>
            </div>

            <div className={styles.typeGroup}>
              <button
                className={`${styles.typeBtn} ${dir === 'to-wolse' ? styles.typeBtnActive : ''}`}
                onClick={() => setDir('to-wolse')}
              >전세 → 월세</button>
              <button
                className={`${styles.typeBtn} ${dir === 'to-jeonse' ? styles.typeBtnActive : ''}`}
                onClick={() => setDir('to-jeonse')}
              >월세 → 전세</button>
            </div>

            <div className={styles.inputBlock}>
              {dir === 'to-wolse' ? (
                <>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>현재 전세금</label>
                    <div className={styles.inputWrap}>
                      <input className={styles.input} value={convJeonse} onChange={handleNumInput(setConvJeonse)} placeholder="0" />
                      <span className={styles.inputUnit}>만원</span>
                    </div>
                  </div>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>새 보증금</label>
                    <div className={styles.inputWrap}>
                      <input className={styles.input} value={convDeposit} onChange={handleNumInput(setConvDeposit)} placeholder="0" />
                      <span className={styles.inputUnit}>만원</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>보증금</label>
                    <div className={styles.inputWrap}>
                      <input className={styles.input} value={convDeposit} onChange={handleNumInput(setConvDeposit)} placeholder="0" />
                      <span className={styles.inputUnit}>만원</span>
                    </div>
                  </div>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>월세</label>
                    <div className={styles.inputWrap}>
                      <input className={styles.input} value={convMonthly} onChange={handleNumInput(setConvMonthly)} placeholder="0" />
                      <span className={styles.inputUnit}>만원</span>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.inputRow}>
                <label className={styles.label}>전환율</label>
                <div className={styles.rateRow}>
                  <div className={styles.inputWrap} style={{ flex: '0 0 90px' }}>
                    <input className={styles.input} value={convRate} onChange={e => setConvRate(e.target.value)} />
                    <span className={styles.inputUnit}>%</span>
                  </div>
                  <div className={styles.presets}>
                    {['4.0', '5.0', '5.5', '6.0'].map(r => (
                      <button
                        key={r}
                        className={`${styles.presetBtn} ${convRate === r ? styles.presetActive : ''}`}
                        onClick={() => setConvRate(r)}
                      >{r}%</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {convResult && !convResult.error && (
              <div className={styles.resultBox}>
                {dir === 'to-wolse' ? (
                  <>
                    <div className={styles.resultRow}>
                      <span className={styles.rLabel}>현재 전세금</span>
                      <span className={styles.rValue}>{fmtMan(convResult.jeonse)}</span>
                    </div>
                    <div className={styles.resultRow}>
                      <span className={styles.rLabel}>새 보증금</span>
                      <span className={styles.rValue}>{fmtMan(convResult.deposit)}</span>
                    </div>
                    <div className={`${styles.resultRow} ${styles.resultTotalRow}`}>
                      <span className={styles.rLabel}>월세</span>
                      <span className={styles.rValueTotal}>{fmtMan(convResult.monthly)} / 월</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.resultRow}>
                      <span className={styles.rLabel}>보증금</span>
                      <span className={styles.rValue}>{fmtMan(convResult.deposit)}</span>
                    </div>
                    <div className={styles.resultRow}>
                      <span className={styles.rLabel}>월세</span>
                      <span className={styles.rValue}>{fmtMan(convResult.monthly)} / 월</span>
                    </div>
                    <div className={`${styles.resultRow} ${styles.resultTotalRow}`}>
                      <span className={styles.rLabel}>전세 환산금액</span>
                      <span className={styles.rValueTotal}>{fmtMan(convResult.jeonse)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
            {convResult?.error && <p className={styles.errorMsg}>{convResult.error}</p>}

            <div className={styles.infoBox}>
              <p className={styles.infoTitle}>💡 전월세 전환율이란?</p>
              <p className={styles.infoText}>전세를 월세로 전환할 때 적용하는 연간 이자율입니다. 법정 상한은 <strong>연 10%</strong>이며, 통상 <strong>5~6%</strong> 수준으로 협의됩니다.</p>
              <p className={styles.infoFormula}>
                {dir === 'to-wolse'
                  ? '월세 = (전세금 − 보증금) × 전환율 ÷ 12'
                  : '전세금 = 보증금 + 월세 × 12 ÷ 전환율'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
