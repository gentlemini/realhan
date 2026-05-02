'use client';

import { useEffect, useState } from 'react';
import styles from '../admin2.module.css';

const STATUS_COLORS = {
  '미확인': { bg: '#fef3c7', color: '#92400e' },
  '확인':   { bg: '#d1fae5', color: '#065f46' },
  '완료':   { bg: '#e0e7ff', color: '#3730a3' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color }}>
      {status || '-'}
    </span>
  );
}

export default function InquiriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/inquiry/list')
      .then((r) => r.json())
      .then((d) => setItems(d))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1c1917' }}>문의 내역</h2>
        <span style={{ fontSize: '0.82rem', color: '#78716c' }}>총 {items.length}건</span>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>불러오는 중…</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>접수된 문의가 없습니다.</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #ede8e1', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#faf9f7', borderBottom: '1px solid #ede8e1' }}>
                {['접수일시', '이름', '연락처', '관심매물', '예산', '처리상태'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#78716c', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  style={{ borderBottom: i < items.length - 1 ? '1px solid #f3f0eb' : 'none', cursor: 'pointer', background: selected?.id === item.id ? '#fdf8f4' : 'transparent' }}
                >
                  <td style={{ padding: '10px 14px', color: '#78716c', whiteSpace: 'nowrap' }}>{fmt(item.created_time)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1c1917' }}>{item.name || '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#44403c' }}>{item.phone || '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#44403c' }}>{item.type || '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#44403c' }}>{item.budget || '-'}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 20, background: '#fff', borderRadius: 12, border: '1px solid #ede8e1', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1c1917' }}>{selected.name} 님의 문의 상세</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#9ca3af' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: '0.875rem', marginBottom: 16 }}>
            {[
              ['이름', selected.name], ['연락처', selected.phone],
              ['이메일', selected.email], ['관심매물', selected.type],
              ['예산', selected.budget], ['처리상태', selected.status],
              ['접수일시', fmt(selected.created_time)],
            ].map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#78716c', fontWeight: 600 }}>{k}: </span>
                <span style={{ color: '#1c1917' }}>{v || '-'}</span>
              </div>
            ))}
          </div>
          <div>
            <p style={{ color: '#78716c', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>문의 내용</p>
            <p style={{ background: '#faf9f7', borderRadius: 8, padding: '12px 14px', fontSize: '0.875rem', color: '#1c1917', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.message || '-'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
