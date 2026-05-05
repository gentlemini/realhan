'use client';

import { useState, useMemo } from 'react';
import styles from './calculator.module.css';

// ── 중개보수 요율표
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

// ── 취득세 계산
function getAcquisitionTax(priceMan, houses, isAdj, overArea) {
  let rate;
  if (houses <= 1) {
    if (priceMan <= 60000)      rate = 0.01;
    else if (priceMan <= 90000) rate = (priceMan * 2 / 30000 - 3) / 100;
    else                         rate = 0.03;
  } else if (houses === 2) {
    if (isAdj) rate = 0.08;
    else {
      if (priceMan <= 60000)      rate = 0.01;
      else if (priceMan <= 90000) rate = (priceMan * 2 / 30000 - 3) / 100;
      else                         rate = 0.03;
    }
  } else {
    rate = isAdj ? 0.12 : 0.08;
  }
  const acqTax  = Math.round(priceMan * rate);
  const eduTax  = Math.round(acqTax * 0.1);
  const specTax = (overArea || houses >= 2) ? Math.round(acqTax * 0.1) : 0;
  const pct = rate * 100;
  return {
    rateText: pct % 1 === 0 ? `${pct.toFixed(0)}%` : `${pct.toFixed(2)}%`,
    acqTax, eduTax, specTax, total: acqTax + eduTax + specTax,
  };
}

// ── 양도세 계산
const TRF_BRACKETS = [
  { limit: 1400,    rate: 0.06, ded: 0    },
  { limit: 5000,    rate: 0.15, ded: 126  },
  { limit: 8800,    rate: 0.24, ded: 576  },
  { limit: 15000,   rate: 0.35, ded: 1544 },
  { limit: 30000,   rate: 0.38, ded: 1994 },
  { limit: 50000,   rate: 0.40, ded: 2594 },
  { limit: 100000,  rate: 0.42, ded: 3594 },
  { limit: Infinity, rate: 0.45, ded: 6594 },
];

function progressiveTax(base) {
  for (const { limit, rate, ded } of TRF_BRACKETS) {
    if (base <= limit) return Math.max(0, Math.round(base * rate - ded));
  }
  return 0;
}

function getTransferTax({ sell, buy, exp, hold, live, isOne, isAdj, houses }) {
  const gain = sell - buy - exp;
  if (gain <= 0) return { gain, zero: true };

  if (isOne && hold >= 2 && (!isAdj || live >= 2) && sell <= 120000)
    return { gain, isTaxFree: true };

  let taxGain = gain;
  if (isOne && sell > 120000)
    taxGain = Math.round(gain * (sell - 120000) / sell);

  let ltcRate = 0;
  if (hold >= 3) {
    if (isOne && sell > 120000) {
      ltcRate = Math.min(Math.floor(hold) * 4, 40) + Math.min(Math.floor(live) * 4, 40);
      ltcRate = Math.min(ltcRate, 80);
    } else if (!isOne) {
      ltcRate = Math.min(Math.floor(hold) * 2, 30);
    }
  }
  const ltcAmt   = Math.round(taxGain * ltcRate / 100);
  const afterLtc = taxGain - ltcAmt;
  const base     = Math.max(0, afterLtc - 250);

  if (hold < 1) {
    const tax = Math.round(base * 0.70);
    return { gain, taxGain, ltcRate, ltcAmt, afterLtc, base, tax, local: Math.round(tax * 0.1), total: Math.round(tax * 1.1), shortTerm: 70 };
  }
  if (hold < 2) {
    const tax = Math.round(base * 0.60);
    return { gain, taxGain, ltcRate, ltcAmt, afterLtc, base, tax, local: Math.round(tax * 0.1), total: Math.round(tax * 1.1), shortTerm: 60 };
  }

  let surcharge = 0;
  if (!isOne && isAdj) surcharge = houses >= 3 ? 30 : 20;

  const tax   = Math.round(progressiveTax(base) + base * surcharge / 100);
  const local = Math.round(tax * 0.1);
  return { gain, taxGain, ltcRate, ltcAmt, afterLtc, base, tax, local, total: tax + local, surcharge };
}

// ── 증여세·상속세 공통 세율표 (만원 단위)
const INHERIT_BRACKETS = [
  { limit: 10000,    rate: 0.10, ded: 0     },
  { limit: 50000,    rate: 0.20, ded: 1000  },
  { limit: 100000,   rate: 0.30, ded: 6000  },
  { limit: 300000,   rate: 0.40, ded: 16000 },
  { limit: Infinity, rate: 0.50, ded: 46000 },
];

function inheritBracketTax(base) {
  for (const { limit, rate, ded } of INHERIT_BRACKETS) {
    if (base <= limit) return Math.max(0, Math.round(base * rate - ded));
  }
  return 0;
}

// ── 증여세 계산
const GIFT_DEDUCTION = {
  '배우자':          60000,
  '직계존속(성인)':  5000,
  '직계존속(미성년)': 2000,
  '직계비속':        5000,
  '기타친족':        1000,
};

function getGiftTax(amount, relation) {
  const deduction = GIFT_DEDUCTION[relation] ?? 0;
  const base = Math.max(0, amount - deduction);
  if (base === 0) return { deduction, base: 0, tax: 0, discount: 0, total: 0, taxFree: true };
  const tax      = inheritBracketTax(base);
  const discount = Math.round(tax * 0.03);
  return { deduction, base, tax, discount, total: Math.max(0, tax - discount) };
}

// ── 상속세 계산
function getInheritanceTax({ estate, deductions, hasSpouse, spouseAmt, children, financialAmt }) {
  const netEstate = Math.max(0, estate - deductions);

  // 기초공제(2억) + 인적공제(자녀 1인당 5천만) vs 일괄공제(5억) 중 큰 값
  const basePersonal = 20000 + children * 5000;
  const lumpsum      = 50000;
  const basicDeduct  = Math.max(basePersonal, lumpsum);

  // 배우자 공제: 실제 상속액 기준 min 5억, max 30억
  const spouseDeduct = hasSpouse
    ? Math.min(Math.max(spouseAmt || 0, 50000), 300000)
    : 0;

  // 금융재산 공제: 20%, 최대 2억
  const financialDeduct = financialAmt > 0
    ? Math.min(Math.round(financialAmt * 0.2), 20000)
    : 0;

  const totalDeduct = basicDeduct + spouseDeduct + financialDeduct;
  const base = Math.max(0, netEstate - totalDeduct);

  if (base === 0) return {
    netEstate, basicDeduct, spouseDeduct, financialDeduct, totalDeduct,
    base: 0, tax: 0, discount: 0, total: 0, taxFree: true,
  };

  const tax      = inheritBracketTax(base);
  const discount = Math.round(tax * 0.03);
  return {
    netEstate, basicDeduct, spouseDeduct, financialDeduct, totalDeduct,
    base, tax, discount, total: Math.max(0, tax - discount),
  };
}

// ── 유틸
function fmtMan(v) {
  if (!v && v !== 0) return '—';
  const eok = Math.floor(v / 10000), rem = v % 10000;
  if (eok === 0) return `${v.toLocaleString()}만원`;
  if (rem === 0) return `${eok}억원`;
  return `${eok}억 ${rem.toLocaleString()}만원`;
}
function parseNum(str) { return Number(String(str).replace(/,/g, '')) || 0; }
function handleNumInput(setter) {
  return (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setter(raw ? Number(raw).toLocaleString() : '');
  };
}

const TABS = [
  { id: 'commission',  label: '💰 중개보수' },
  { id: 'conversion',  label: '🔢 전월세 전환' },
  { id: 'acquisition', label: '🏠 취득세' },
  { id: 'transfer',    label: '📊 양도세' },
  { id: 'gift',        label: '🎁 증여세' },
  { id: 'inheritance', label: '👨‍👩‍👧 상속세' },
];

export default function CalculatorPage() {
  const [tab, setTab] = useState('commission');

  // 중개보수
  const [txType,  setTxType]  = useState('매매');
  const [amount,  setAmount]  = useState('');
  const [deposit, setDeposit] = useState('');
  const [monthly, setMonthly] = useState('');

  // 전월세 전환
  const [dir,        setDir]        = useState('to-wolse');
  const [convJeonse, setConvJeonse] = useState('');
  const [convDep,    setConvDep]    = useState('');
  const [convMon,    setConvMon]    = useState('');
  const [convRate,   setConvRate]   = useState('5.5');

  // 취득세
  const [acqPrice,  setAcqPrice]  = useState('');
  const [acqHouses, setAcqHouses] = useState(1);
  const [acqAdj,    setAcqAdj]    = useState(false);
  const [acqOver,   setAcqOver]   = useState(false);

  // 양도세
  const [trfSell,   setTrfSell]   = useState('');
  const [trfBuy,    setTrfBuy]    = useState('');
  const [trfExp,    setTrfExp]    = useState('');
  const [trfHold,   setTrfHold]   = useState('');
  const [trfLive,   setTrfLive]   = useState('');
  const [trfIsOne,  setTrfIsOne]  = useState(true);
  const [trfIsAdj,  setTrfIsAdj]  = useState(false);
  const [trfHouses, setTrfHouses] = useState(1);

  // 증여세
  const [giftAmt,      setGiftAmt]      = useState('');
  const [giftRelation, setGiftRelation] = useState('직계존속(성인)');

  // 상속세
  const [ihtEstate,    setIhtEstate]    = useState('');
  const [ihtDeduct,    setIhtDeduct]    = useState('');
  const [ihtSpouse,    setIhtSpouse]    = useState(false);
  const [ihtSpouseAmt, setIhtSpouseAmt] = useState('');
  const [ihtChildren,  setIhtChildren]  = useState('');
  const [ihtFinancial, setIhtFinancial] = useState('');

  // ── 계산
  const commResult = useMemo(() => {
    let calcAmt = 0;
    if (txType === '월세') {
      const d = parseNum(deposit), m = parseNum(monthly);
      if (!m && !d) return null;
      const c = d + m * 100;
      calcAmt = c < 5000 ? d + m * 70 : c;
    } else {
      calcAmt = parseNum(amount);
      if (!calcAmt) return null;
    }
    const r = getCommission(txType === '매매', calcAmt);
    if (!r) return null;
    const vat = Math.floor(r.commission * 0.1);
    return { ...r, amount: calcAmt, vat, total: r.commission + vat };
  }, [txType, amount, deposit, monthly]);

  const convResult = useMemo(() => {
    const rate = parseFloat(convRate);
    if (!rate || rate <= 0) return null;
    if (dir === 'to-wolse') {
      const j = parseNum(convJeonse), d = parseNum(convDep);
      if (!j) return null;
      const diff = j - d;
      if (diff <= 0) return { error: '전세금이 보증금보다 커야 합니다.' };
      return { type: 'to-wolse', jeonse: j, deposit: d, monthly: Math.round(diff * (rate / 100) / 12) };
    } else {
      const d = parseNum(convDep), m = parseNum(convMon);
      if (!m) return null;
      return { type: 'to-jeonse', deposit: d, monthly: m, jeonse: Math.round(d + m * 12 / (rate / 100)) };
    }
  }, [dir, convJeonse, convDep, convMon, convRate]);

  const acqResult = useMemo(() => {
    const p = parseNum(acqPrice);
    if (!p) return null;
    return getAcquisitionTax(p, acqHouses, acqAdj, acqOver);
  }, [acqPrice, acqHouses, acqAdj, acqOver]);

  const trfResult = useMemo(() => {
    const sell = parseNum(trfSell), buy = parseNum(trfBuy);
    if (!sell || !buy) return null;
    return getTransferTax({
      sell, buy, exp: parseNum(trfExp),
      hold: parseFloat(trfHold) || 0,
      live: parseFloat(trfLive) || 0,
      isOne: trfIsOne, isAdj: trfIsAdj, houses: trfHouses,
    });
  }, [trfSell, trfBuy, trfExp, trfHold, trfLive, trfIsOne, trfIsAdj, trfHouses]);

  const giftResult = useMemo(() => {
    const a = parseNum(giftAmt);
    if (!a) return null;
    return getGiftTax(a, giftRelation);
  }, [giftAmt, giftRelation]);

  const ihtResult = useMemo(() => {
    const estate = parseNum(ihtEstate);
    if (!estate) return null;
    return getInheritanceTax({
      estate,
      deductions:   parseNum(ihtDeduct),
      hasSpouse:    ihtSpouse,
      spouseAmt:    parseNum(ihtSpouseAmt),
      children:     parseInt(ihtChildren) || 0,
      financialAmt: parseNum(ihtFinancial),
    });
  }, [ihtEstate, ihtDeduct, ihtSpouse, ihtSpouseAmt, ihtChildren, ihtFinancial]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEyebrow}>한결부동산 공인중개사사무소</p>
        <h1 className={styles.heroTitle}>부동산 계산기</h1>
        <p className={styles.heroSub}>중개보수 · 전월세 전환 · 취득세 · 양도세 · 증여세 · 상속세</p>
      </div>

      <div className={styles.container}>
        <div className={styles.tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tabBtn} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* ── 중개보수 ── */}
        {tab === 'commission' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>중개보수 계산기</h2>
              <span className={styles.cardBadge}>2021년 개정 상한 요율 기준</span>
            </div>
            <div className={styles.typeGroup}>
              {['매매', '전세', '월세'].map(t => (
                <button key={t} className={`${styles.typeBtn} ${txType === t ? styles.typeBtnActive : ''}`} onClick={() => setTxType(t)}>{t}</button>
              ))}
            </div>
            <div className={styles.inputBlock}>
              {txType === '월세' ? (
                <>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>보증금</label>
                    <div className={styles.inputWrap}><input className={styles.input} value={deposit} onChange={handleNumInput(setDeposit)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
                  </div>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>월세</label>
                    <div className={styles.inputWrap}><input className={styles.input} value={monthly} onChange={handleNumInput(setMonthly)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
                  </div>
                  {(parseNum(deposit) > 0 || parseNum(monthly) > 0) && (
                    <p className={styles.convertedNote}>
                      환산 보증금: {fmtMan((() => { const d = parseNum(deposit), m = parseNum(monthly), c = d + m * 100; return c < 5000 ? d + m * 70 : c; })())}
                    </p>
                  )}
                </>
              ) : (
                <div className={styles.inputRow}>
                  <label className={styles.label}>{txType === '매매' ? '매매가격' : '전세금'}</label>
                  <div className={styles.inputWrap}><input className={styles.input} value={amount} onChange={handleNumInput(setAmount)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
                </div>
              )}
            </div>
            {commResult && (
              <div className={styles.resultBox}>
                <div className={styles.resultRow}><span className={styles.rLabel}>거래금액</span><span className={styles.rValue}>{fmtMan(commResult.amount)}</span></div>
                <div className={styles.resultRow}><span className={styles.rLabel}>적용 요율</span><span className={styles.rValue}>{commResult.rateText}%</span></div>
                <div className={styles.resultRow}><span className={styles.rLabel}>중개보수 (상한)</span><span className={styles.rValue}>{fmtMan(commResult.commission)}</span></div>
                <div className={styles.resultRow}><span className={styles.rLabel}>부가세 (10%)</span><span className={styles.rValue}>{fmtMan(commResult.vat)}</span></div>
                <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>최종 합계</span><span className={styles.rValueTotal}>{fmtMan(commResult.total)}</span></div>
              </div>
            )}
            <details className={styles.tableWrap}>
              <summary className={styles.tableSummary}>📋 법정 상한 요율표 보기</summary>
              <table className={styles.rateTable}>
                <thead><tr><th>구분</th><th>거래금액</th><th>상한 요율</th><th>한도액</th></tr></thead>
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

        {/* ── 전월세 전환 ── */}
        {tab === 'conversion' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>전월세 전환 계산기</h2>
              <span className={styles.cardBadge}>전환율 직접 입력 가능</span>
            </div>
            <div className={styles.typeGroup}>
              <button className={`${styles.typeBtn} ${dir === 'to-wolse' ? styles.typeBtnActive : ''}`} onClick={() => setDir('to-wolse')}>전세 → 월세</button>
              <button className={`${styles.typeBtn} ${dir === 'to-jeonse' ? styles.typeBtnActive : ''}`} onClick={() => setDir('to-jeonse')}>월세 → 전세</button>
            </div>
            <div className={styles.inputBlock}>
              {dir === 'to-wolse' ? (
                <>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>현재 전세금</label>
                    <div className={styles.inputWrap}><input className={styles.input} value={convJeonse} onChange={handleNumInput(setConvJeonse)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
                  </div>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>새 보증금</label>
                    <div className={styles.inputWrap}><input className={styles.input} value={convDep} onChange={handleNumInput(setConvDep)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>보증금</label>
                    <div className={styles.inputWrap}><input className={styles.input} value={convDep} onChange={handleNumInput(setConvDep)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
                  </div>
                  <div className={styles.inputRow}>
                    <label className={styles.label}>월세</label>
                    <div className={styles.inputWrap}><input className={styles.input} value={convMon} onChange={handleNumInput(setConvMon)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
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
                      <button key={r} className={`${styles.presetBtn} ${convRate === r ? styles.presetActive : ''}`} onClick={() => setConvRate(r)}>{r}%</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {convResult && !convResult.error && (
              <div className={styles.resultBox}>
                {dir === 'to-wolse' ? (
                  <>
                    <div className={styles.resultRow}><span className={styles.rLabel}>현재 전세금</span><span className={styles.rValue}>{fmtMan(convResult.jeonse)}</span></div>
                    <div className={styles.resultRow}><span className={styles.rLabel}>새 보증금</span><span className={styles.rValue}>{fmtMan(convResult.deposit)}</span></div>
                    <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>월세</span><span className={styles.rValueTotal}>{fmtMan(convResult.monthly)} / 월</span></div>
                  </>
                ) : (
                  <>
                    <div className={styles.resultRow}><span className={styles.rLabel}>보증금</span><span className={styles.rValue}>{fmtMan(convResult.deposit)}</span></div>
                    <div className={styles.resultRow}><span className={styles.rLabel}>월세</span><span className={styles.rValue}>{fmtMan(convResult.monthly)} / 월</span></div>
                    <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>전세 환산금액</span><span className={styles.rValueTotal}>{fmtMan(convResult.jeonse)}</span></div>
                  </>
                )}
              </div>
            )}
            {convResult?.error && <p className={styles.errorMsg}>{convResult.error}</p>}
            <div className={styles.infoBox}>
              <p className={styles.infoTitle}>💡 전월세 전환율이란?</p>
              <p className={styles.infoText}>전세를 월세로 전환할 때 적용하는 연간 이자율입니다. 법정 상한은 <strong>연 10%</strong>이며, 통상 <strong>5~6%</strong> 수준으로 협의됩니다.</p>
              <p className={styles.infoFormula}>{dir === 'to-wolse' ? '월세 = (전세금 − 보증금) × 전환율 ÷ 12' : '전세금 = 보증금 + 월세 × 12 ÷ 전환율'}</p>
            </div>
          </div>
        )}

        {/* ── 취득세 ── */}
        {tab === 'acquisition' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>취득세 계산기</h2>
              <span className={styles.cardBadge}>주택 기준 모의계산</span>
            </div>
            <div className={styles.inputBlock} style={{ paddingTop: 16 }}>
              <div className={styles.inputRow}>
                <label className={styles.label}>취득가액</label>
                <div className={styles.inputWrap}><input className={styles.input} value={acqPrice} onChange={handleNumInput(setAcqPrice)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>보유 주택 수</label>
                <div className={styles.btnGroup}>
                  {[1, 2, 3].map(n => (
                    <button key={n} className={`${styles.typeBtn} ${acqHouses === n ? styles.typeBtnActive : ''}`} onClick={() => setAcqHouses(n)}>{n === 3 ? '3주택+' : `${n}주택`}</button>
                  ))}
                </div>
              </div>
              {acqHouses >= 2 && (
                <div className={styles.inputRow}>
                  <label className={styles.label}>조정대상지역</label>
                  <div className={styles.btnGroup}>
                    <button className={`${styles.typeBtn} ${acqAdj ? styles.typeBtnActive : ''}`} onClick={() => setAcqAdj(true)}>해당</button>
                    <button className={`${styles.typeBtn} ${!acqAdj ? styles.typeBtnActive : ''}`} onClick={() => setAcqAdj(false)}>비해당</button>
                  </div>
                </div>
              )}
              <div className={styles.inputRow}>
                <label className={styles.label}>전용면적</label>
                <div className={styles.btnGroup}>
                  <button className={`${styles.typeBtn} ${!acqOver ? styles.typeBtnActive : ''}`} onClick={() => setAcqOver(false)}>85㎡ 이하</button>
                  <button className={`${styles.typeBtn} ${acqOver ? styles.typeBtnActive : ''}`} onClick={() => setAcqOver(true)}>85㎡ 초과</button>
                </div>
              </div>
            </div>
            {acqResult && (
              <div className={styles.resultBox}>
                <div className={styles.resultRow}><span className={styles.rLabel}>취득가액</span><span className={styles.rValue}>{fmtMan(parseNum(acqPrice))}</span></div>
                <div className={styles.resultRow}><span className={styles.rLabel}>취득세율</span><span className={styles.rValue}>{acqResult.rateText}</span></div>
                <div className={styles.resultRow}><span className={styles.rLabel}>취득세</span><span className={styles.rValue}>{fmtMan(acqResult.acqTax)}</span></div>
                <div className={styles.resultRow}><span className={styles.rLabel}>지방교육세</span><span className={styles.rValue}>{fmtMan(acqResult.eduTax)}</span></div>
                <div className={styles.resultRow}><span className={styles.rLabel}>농어촌특별세</span><span className={styles.rValue}>{acqResult.specTax ? fmtMan(acqResult.specTax) : '비과세 (85㎡ 이하 1주택)'}</span></div>
                <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>합계</span><span className={styles.rValueTotal}>{fmtMan(acqResult.total)}</span></div>
              </div>
            )}
            <div className={styles.infoBox}>
              <p className={styles.infoTitle}>⚠️ 주의사항</p>
              <p className={styles.infoText}>다주택 중과세율은 2022년 12월부터 한시 완화 조치가 있어 실제 적용 세율이 다를 수 있습니다. 지방교육세·농어촌특별세는 세율 구간과 면적에 따라 달라집니다.</p>
              <p className={styles.infoFormula}>참고용 모의계산 — 정확한 세액은 세무사 상담을 권장합니다</p>
            </div>
          </div>
        )}

        {/* ── 양도세 ── */}
        {tab === 'transfer' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>양도소득세 계산기</h2>
              <span className={styles.cardBadge}>주택 기준 모의계산</span>
            </div>
            <div className={styles.inputBlock} style={{ paddingTop: 16 }}>
              <div className={styles.inputRow}>
                <label className={styles.label}>양도가액</label>
                <div className={styles.inputWrap}><input className={styles.input} value={trfSell} onChange={handleNumInput(setTrfSell)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>취득가액</label>
                <div className={styles.inputWrap}><input className={styles.input} value={trfBuy} onChange={handleNumInput(setTrfBuy)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>필요경비</label>
                <div className={styles.inputWrap}><input className={styles.input} value={trfExp} onChange={handleNumInput(setTrfExp)} placeholder="0 (선택)" /><span className={styles.inputUnit}>만원</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>보유기간</label>
                <div className={styles.inputWrap}><input className={styles.input} value={trfHold} onChange={e => setTrfHold(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="예: 3.5" /><span className={styles.inputUnit}>년</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>1세대 1주택</label>
                <div className={styles.btnGroup}>
                  <button className={`${styles.typeBtn} ${trfIsOne ? styles.typeBtnActive : ''}`} onClick={() => setTrfIsOne(true)}>해당</button>
                  <button className={`${styles.typeBtn} ${!trfIsOne ? styles.typeBtnActive : ''}`} onClick={() => setTrfIsOne(false)}>비해당</button>
                </div>
              </div>
              {trfIsOne && (
                <div className={styles.inputRow}>
                  <label className={styles.label}>거주기간</label>
                  <div className={styles.inputWrap}><input className={styles.input} value={trfLive} onChange={e => setTrfLive(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="예: 2" /><span className={styles.inputUnit}>년</span></div>
                </div>
              )}
              <div className={styles.inputRow}>
                <label className={styles.label}>조정대상지역</label>
                <div className={styles.btnGroup}>
                  <button className={`${styles.typeBtn} ${trfIsAdj ? styles.typeBtnActive : ''}`} onClick={() => setTrfIsAdj(true)}>해당</button>
                  <button className={`${styles.typeBtn} ${!trfIsAdj ? styles.typeBtnActive : ''}`} onClick={() => setTrfIsAdj(false)}>비해당</button>
                </div>
              </div>
              {!trfIsOne && (
                <div className={styles.inputRow}>
                  <label className={styles.label}>주택 수</label>
                  <div className={styles.btnGroup}>
                    {[1, 2, 3].map(n => (
                      <button key={n} className={`${styles.typeBtn} ${trfHouses === n ? styles.typeBtnActive : ''}`} onClick={() => setTrfHouses(n)}>{n === 3 ? '3주택+' : `${n}주택`}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {trfResult && (
              trfResult.zero ? (
                <div className={styles.resultBox}>
                  <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>양도차익</span><span className={styles.rValueTotal} style={{ color: '#888' }}>없음 (손실 또는 동일)</span></div>
                </div>
              ) : trfResult.isTaxFree ? (
                <div className={styles.resultBox}>
                  <div className={styles.resultRow}><span className={styles.rLabel}>양도차익</span><span className={styles.rValue}>{fmtMan(trfResult.gain)}</span></div>
                  <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>납부 세액</span><span className={styles.rValueTotal} style={{ color: '#2a9a5a' }}>비과세 (1세대 1주택)</span></div>
                </div>
              ) : (
                <div className={styles.resultBox}>
                  <div className={styles.resultRow}><span className={styles.rLabel}>양도차익</span><span className={styles.rValue}>{fmtMan(trfResult.gain)}</span></div>
                  {trfResult.taxGain !== trfResult.gain && <div className={styles.resultRow}><span className={styles.rLabel}>과세 양도차익</span><span className={styles.rValue}>{fmtMan(trfResult.taxGain)}</span></div>}
                  {trfResult.ltcRate > 0 && <div className={styles.resultRow}><span className={styles.rLabel}>장기보유특별공제 ({trfResult.ltcRate}%)</span><span className={styles.rValue}>− {fmtMan(trfResult.ltcAmt)}</span></div>}
                  <div className={styles.resultRow}><span className={styles.rLabel}>과세표준</span><span className={styles.rValue}>{fmtMan(trfResult.base)}</span></div>
                  {trfResult.shortTerm && <div className={styles.resultRow}><span className={styles.rLabel}>세율</span><span className={styles.rValue}>{trfResult.shortTerm}% (단기보유)</span></div>}
                  {trfResult.surcharge > 0 && <div className={styles.resultRow}><span className={styles.rLabel}>다주택 중과</span><span className={styles.rValue}>+{trfResult.surcharge}%p</span></div>}
                  <div className={styles.resultRow}><span className={styles.rLabel}>양도소득세</span><span className={styles.rValue}>{fmtMan(trfResult.tax)}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>지방소득세 (10%)</span><span className={styles.rValue}>{fmtMan(trfResult.local)}</span></div>
                  <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>합계</span><span className={styles.rValueTotal}>{fmtMan(trfResult.total)}</span></div>
                </div>
              )
            )}
            <div className={`${styles.infoBox} ${styles.infoBoxWarn}`}>
              <p className={styles.infoTitle}>⚠️ 참고용 모의계산입니다</p>
              <p className={styles.infoText}>양도세는 보유·거주기간, 주택 수, 조정지역, 장기보유특별공제 등 변수가 매우 많습니다. 다주택 중과 한시 완화, 비과세 요건은 개인 상황에 따라 크게 달라질 수 있습니다. <strong>반드시 세무사 상담을 받으세요.</strong></p>
              <p className={styles.infoFormula}>기본공제 250만원 적용 · 지방소득세(10%) 포함</p>
            </div>
          </div>
        )}

        {/* ── 증여세 ── */}
        {tab === 'gift' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>증여세 계산기</h2>
              <span className={styles.cardBadge}>참고용 모의계산</span>
            </div>
            <div className={styles.inputBlock} style={{ paddingTop: 16 }}>
              <div className={styles.inputRow}>
                <label className={styles.label}>증여가액</label>
                <div className={styles.inputWrap}><input className={styles.input} value={giftAmt} onChange={handleNumInput(setGiftAmt)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>증여자 관계</label>
                <div className={styles.selectWrap}>
                  <select className={styles.select} value={giftRelation} onChange={e => setGiftRelation(e.target.value)}>
                    {Object.keys(GIFT_DEDUCTION).map(r => (
                      <option key={r} value={r}>{r} (공제 {fmtMan(GIFT_DEDUCTION[r])})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {giftResult && (
              giftResult.taxFree ? (
                <div className={styles.resultBox}>
                  <div className={styles.resultRow}><span className={styles.rLabel}>증여가액</span><span className={styles.rValue}>{fmtMan(parseNum(giftAmt))}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>공제 한도</span><span className={styles.rValue}>{fmtMan(giftResult.deduction)}</span></div>
                  <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>납부 세액</span><span className={styles.rValueTotal} style={{ color: '#2a9a5a' }}>없음 (공제 이하)</span></div>
                </div>
              ) : (
                <div className={styles.resultBox}>
                  <div className={styles.resultRow}><span className={styles.rLabel}>증여가액</span><span className={styles.rValue}>{fmtMan(parseNum(giftAmt))}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>증여재산공제</span><span className={styles.rValue}>− {fmtMan(giftResult.deduction)}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>과세표준</span><span className={styles.rValue}>{fmtMan(giftResult.base)}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>산출 세액</span><span className={styles.rValue}>{fmtMan(giftResult.tax)}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>신고세액공제 (3%)</span><span className={styles.rValue}>− {fmtMan(giftResult.discount)}</span></div>
                  <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>납부 세액</span><span className={styles.rValueTotal}>{fmtMan(giftResult.total)}</span></div>
                </div>
              )
            )}

            <details className={styles.tableWrap}>
              <summary className={styles.tableSummary}>📋 증여재산공제 한도 및 세율표</summary>
              <table className={styles.rateTable}>
                <thead><tr><th>관계</th><th>공제 한도 (10년 합산)</th></tr></thead>
                <tbody>
                  <tr><td>배우자</td><td>6억원</td></tr>
                  <tr><td>직계존속 → 성인 자녀</td><td>5천만원</td></tr>
                  <tr><td>직계존속 → 미성년 자녀</td><td>2천만원</td></tr>
                  <tr><td>직계비속 (자녀→부모)</td><td>5천만원</td></tr>
                  <tr><td>기타 친족</td><td>1천만원</td></tr>
                </tbody>
              </table>
              <table className={styles.rateTable} style={{ marginTop: 8 }}>
                <thead><tr><th>과세표준</th><th>세율</th><th>누진공제</th></tr></thead>
                <tbody>
                  <tr><td>1억 이하</td><td>10%</td><td>—</td></tr>
                  <tr><td>1억~5억</td><td>20%</td><td>1,000만원</td></tr>
                  <tr><td>5억~10억</td><td>30%</td><td>6,000만원</td></tr>
                  <tr><td>10억~30억</td><td>40%</td><td>1억 6,000만원</td></tr>
                  <tr><td>30억 초과</td><td>50%</td><td>4억 6,000만원</td></tr>
                </tbody>
              </table>
              <p className={styles.tableNote}>* 공제 한도는 10년 내 동일인 증여액 합산 기준입니다.</p>
            </details>

            <div className={`${styles.infoBox} ${styles.infoBoxWarn}`}>
              <p className={styles.infoTitle}>⚠️ 참고용 모의계산입니다</p>
              <p className={styles.infoText}>10년 내 이전 증여가 있는 경우 합산 과세됩니다. 부담부증여, 창업자금 특례, 혼인·출산 공제 등 별도 공제는 반영되지 않습니다. <strong>정확한 세액은 세무사 상담을 권장합니다.</strong></p>
              <p className={styles.infoFormula}>신고세액공제 3% 적용 (기한 내 신고 시)</p>
            </div>
          </div>
        )}

        {/* ── 상속세 ── */}
        {tab === 'inheritance' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>상속세 계산기</h2>
              <span className={styles.cardBadge}>참고용 모의계산</span>
            </div>
            <div className={styles.inputBlock} style={{ paddingTop: 16 }}>
              <div className={styles.inputRow}>
                <label className={styles.label}>상속재산 총액</label>
                <div className={styles.inputWrap}><input className={styles.input} value={ihtEstate} onChange={handleNumInput(setIhtEstate)} placeholder="0" /><span className={styles.inputUnit}>만원</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>채무·공과금·장례비</label>
                <div className={styles.inputWrap}><input className={styles.input} value={ihtDeduct} onChange={handleNumInput(setIhtDeduct)} placeholder="0 (선택)" /><span className={styles.inputUnit}>만원</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>배우자 생존</label>
                <div className={styles.btnGroup}>
                  <button className={`${styles.typeBtn} ${ihtSpouse ? styles.typeBtnActive : ''}`} onClick={() => setIhtSpouse(true)}>있음</button>
                  <button className={`${styles.typeBtn} ${!ihtSpouse ? styles.typeBtnActive : ''}`} onClick={() => setIhtSpouse(false)}>없음</button>
                </div>
              </div>
              {ihtSpouse && (
                <div className={styles.inputRow}>
                  <label className={styles.label}>배우자 상속액</label>
                  <div className={styles.inputWrap}><input className={styles.input} value={ihtSpouseAmt} onChange={handleNumInput(setIhtSpouseAmt)} placeholder="0 (미입력 시 최소 5억 적용)" /><span className={styles.inputUnit}>만원</span></div>
                </div>
              )}
              <div className={styles.inputRow}>
                <label className={styles.label}>자녀 수</label>
                <div className={styles.inputWrap}><input className={styles.input} value={ihtChildren} onChange={e => setIhtChildren(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /><span className={styles.inputUnit}>명</span></div>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.label}>금융재산</label>
                <div className={styles.inputWrap}><input className={styles.input} value={ihtFinancial} onChange={handleNumInput(setIhtFinancial)} placeholder="0 (선택)" /><span className={styles.inputUnit}>만원</span></div>
              </div>
            </div>

            {ihtResult && (
              ihtResult.taxFree ? (
                <div className={styles.resultBox}>
                  <div className={styles.resultRow}><span className={styles.rLabel}>과세가액</span><span className={styles.rValue}>{fmtMan(ihtResult.netEstate)}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>총 공제액</span><span className={styles.rValue}>{fmtMan(ihtResult.totalDeduct)}</span></div>
                  <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>납부 세액</span><span className={styles.rValueTotal} style={{ color: '#2a9a5a' }}>없음 (공제 이하)</span></div>
                </div>
              ) : (
                <div className={styles.resultBox}>
                  <div className={styles.resultRow}><span className={styles.rLabel}>상속재산 과세가액</span><span className={styles.rValue}>{fmtMan(ihtResult.netEstate)}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>일괄공제 (5억) / 기초+인적공제</span><span className={styles.rValue}>− {fmtMan(ihtResult.basicDeduct)}</span></div>
                  {ihtResult.spouseDeduct > 0 && <div className={styles.resultRow}><span className={styles.rLabel}>배우자공제</span><span className={styles.rValue}>− {fmtMan(ihtResult.spouseDeduct)}</span></div>}
                  {ihtResult.financialDeduct > 0 && <div className={styles.resultRow}><span className={styles.rLabel}>금융재산공제 (20%)</span><span className={styles.rValue}>− {fmtMan(ihtResult.financialDeduct)}</span></div>}
                  <div className={styles.resultRow}><span className={styles.rLabel}>과세표준</span><span className={styles.rValue}>{fmtMan(ihtResult.base)}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>산출 세액</span><span className={styles.rValue}>{fmtMan(ihtResult.tax)}</span></div>
                  <div className={styles.resultRow}><span className={styles.rLabel}>신고세액공제 (3%)</span><span className={styles.rValue}>− {fmtMan(ihtResult.discount)}</span></div>
                  <div className={`${styles.resultRow} ${styles.resultTotalRow}`}><span className={styles.rLabel}>납부 세액</span><span className={styles.rValueTotal}>{fmtMan(ihtResult.total)}</span></div>
                </div>
              )
            )}

            <details className={styles.tableWrap}>
              <summary className={styles.tableSummary}>📋 주요 상속공제 항목 보기</summary>
              <table className={styles.rateTable}>
                <thead><tr><th>공제 항목</th><th>공제액</th></tr></thead>
                <tbody>
                  <tr><td>일괄공제</td><td>5억원 (기초+인적공제와 비교 후 큰 값)</td></tr>
                  <tr><td>기초공제</td><td>2억원</td></tr>
                  <tr><td>자녀 인적공제</td><td>1인당 5천만원</td></tr>
                  <tr><td>배우자공제</td><td>실제 상속액 기준 최소 5억 ~ 최대 30억</td></tr>
                  <tr><td>금융재산공제</td><td>금융재산의 20%, 최대 2억원</td></tr>
                  <tr><td>동거주택공제</td><td>주택가액의 100%, 최대 6억원 (미반영)</td></tr>
                </tbody>
              </table>
              <p className={styles.tableNote}>* 동거주택공제, 가업상속공제 등 특수공제는 이 계산기에 포함되지 않습니다.</p>
            </details>

            <div className={`${styles.infoBox} ${styles.infoBoxWarn}`}>
              <p className={styles.infoTitle}>⚠️ 참고용 모의계산입니다</p>
              <p className={styles.infoText}>동거주택공제(최대 6억), 가업·영농상속공제, 10년 내 사전증여 합산 등은 반영되지 않습니다. 실제 세액은 개인 상황에 따라 크게 달라집니다. <strong>반드시 세무사 상담을 받으세요.</strong></p>
              <p className={styles.infoFormula}>신고세액공제 3% 적용 · 세율 10%~50% (증여세와 동일)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
