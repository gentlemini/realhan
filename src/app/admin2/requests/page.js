'use client';

import { useEffect, useState } from 'react';

const STATUS_COLORS = {
  '미확인': { bg: '#fef3c7', color: '#92400e' },
  '확인':   { bg: '#d1fae5', color: '#065f46' },
  '완료':   { bg: '#e0e7ff', color: '#3730a3' },
};

const TX_COLORS = {
  '매매': { bg: '#fff7ed', color: '#c2410c' },
  '전세': { bg: '#eff6ff', color: '#1d4ed8' },
  '월세': { bg: '#f0fdf4', color: '#15803d' },
};

const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {status || '-'}
    </span>
  );
}

function TxBadge({ tx }) {
  const c = TX_COLORS[tx] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
      {tx}
    </span>
  );
}

function RequestCard({ item, isSelected, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        background: isSelected ? '#fdf8f4' : '#fff',
        borderRadius: 14,
        border: `1.5px solid ${isSelected ? '#c19a6b' : '#e8e2d8'}`,
        padding: '14px 16px',
        cursor: 'pointer',
        boxShadow: isSelected ? '0 2px 12px rgba(193,154,107,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'all 0.15s',
      }}
    >
      {/* 1행: 이름 + 상태 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1c1917' }}>{item.name || '-'}</span>
        <StatusBadge status={item.status} />
      </div>

      {/* 2행: 연락처 */}
      {item.phone && (
        <div style={{ fontSize: '0.82rem', color: '#44403c', marginBottom: 6 }}>
          📞 {item.phone}
        </div>
      )}

      {/* 3행: 매물 정보 태그들 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {item.propertyType && (
          <span style={{ fontSize: '0.78rem', fontWeight: 700, background: '#f0ebe4', color: '#5a3e28', borderRadius: 6, padding: '2px 8px' }}>
            {item.propertyType}
          </span>
        )}
        {item.transaction && <TxBadge tx={item.transaction} />}
        {item.location && (
          <span style={{ fontSize: '0.78rem', color: '#78716c' }}>📍 {item.location}</span>
        )}
      </div>

      {/* 4행: 날짜 */}
      <div style={{ fontSize: '0.72rem', color: '#a0978e' }}>{fmt(item.created_time)}</div>
    </div>
  );
}

function DetailPanel({ item, onClose }) {
  return (
    <div style={{
      marginTop: 10,
      background: '#fff',
      borderRadius: 14,
      border: '1px solid #e8e2d8',
      padding: '20px 18px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1c1917' }}>{item.name} 님의 매물접수 상세</h3>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#9ca3af', lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 20px', fontSize: '0.84rem', marginBottom: 16 }}>
        {[
          ['이름',     item.name],
          ['연락처',   item.phone],
          ['이메일',   item.email],
          ['매물종류', item.propertyType],
          ['거래종류', item.transaction],
          ['소재지',   item.location],
          ['희망가격', item.price],
          ['면적',     item.area],
          ['처리상태', item.status],
          ['접수일시', fmt(item.created_time)],
        ].map(([k, v]) => v ? (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '0.72rem', color: '#9d9189', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
            <span style={{ color: '#1c1917', fontWeight: 600, fontSize: '0.85rem' }}>{v}</span>
          </div>
        ) : null)}
      </div>

      {item.memo && (
        <div>
          <p style={{ fontSize: '0.72rem', color: '#9d9189', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>추가 요청사항</p>
          <p style={{ background: '#faf7f4', borderRadius: 10, padding: '12px 14px', fontSize: '0.875rem', color: '#1c1917', lineHeight: 1.75, whiteSpace: 'pre-wrap', border: '1px solid #ede8e1' }}>
            {item.memo}
          </p>
        </div>
      )}
    </div>
  );
}

export default function RequestsPage() {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/property-request/list')
      .then(r => r.json())
      .then(d => setItems(d))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (item) => setSelected(prev => prev?.id === item.id ? null : item);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1c1917' }}>매물 접수 내역</h2>
        <span style={{ fontSize: '0.8rem', color: '#78716c', background: '#f0ebe4', padding: '3px 10px', borderRadius: 100, fontWeight: 600 }}>
          총 {items.length}건
        </span>
      </div>

      {loading && <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>불러오는 중…</p>}
      {!loading && items.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>접수된 매물 신청이 없습니다.</p>}

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id}>
              <RequestCard item={item} isSelected={selected?.id === item.id} onToggle={() => toggle(item)} />
              {selected?.id === item.id && (
                <DetailPanel item={selected} onClose={() => setSelected(null)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
