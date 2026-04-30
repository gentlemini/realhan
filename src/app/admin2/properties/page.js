'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './properties.module.css';

const COLS = [
  { key: 'imageUrl',     label: '사진',      type: 'photo'  },
  { key: 'property_id',  label: '매물번호',  type: 'id'     },
  { key: '_edit',        label: '',          type: 'edit'   },
  { key: 'recommended',  label: '추천',      type: 'recommended' },
  { key: 'category',     label: '분류'                      },
  { key: 'transaction',  label: '거래'                      },
  { key: 'apt_name',     label: '아파트명',  type: 'bold'   },
  { key: 'location',     label: '소재지'                    },
  { key: 'sale_price',   label: '매매가',    type: 'price'  },
  { key: 'dong',         label: '동'                        },
  { key: 'ho',           label: '호수'                      },
  { key: 'ho_memo',      label: '호수메모',  type: 'memo'   },
  { key: 'created_time', label: '등록일',    type: 'date'   },
];

const DETAIL_SECTIONS = [
  { title: '기본 정보', fields: [
    { key: 'property_id',  label: '매물번호' },
    { key: 'category',     label: '분류' },
    { key: 'transaction',  label: '거래종류' },
    { key: 'title',        label: '제목/특징' },
    { key: 'apt_name',     label: '아파트명' },
    { key: 'location',     label: '소재지' },
    { key: 'move_in',      label: '입주가능일' },
    { key: 'approval_date',label: '사용승인일' },
  ]},
  { title: '가격 정보', fields: [
    { key: 'sale_price',   label: '매매가격',   type: 'price' },
    { key: 'loan_info',    label: '융자금',     type: 'num' },
    { key: 'curr_deposit', label: '현보증금',   type: 'num' },
    { key: 'curr_monthly', label: '현월세',     type: 'num' },
    { key: 'maintenance',  label: '관리비',     type: 'num' },
  ]},
  { title: '면적·구조', fields: [
    { key: 'supply_area',    label: '공급면적(㎡)',  type: 'num' },
    { key: 'exclusive_area', label: '전용면적(㎡)',  type: 'num' },
    { key: 'total_floors',   label: '총층수',        type: 'num' },
    { key: 'rooms',          label: '방수',          type: 'num' },
    { key: 'bathrooms',      label: '욕실수',        type: 'num' },
    { key: 'direction_base', label: '방향기준' },
    { key: 'direction',      label: '방향' },
    { key: 'entrance',       label: '현관유형' },
    { key: 'duplex',         label: '복층여부' },
    { key: 'building_use',   label: '건축물용도' },
  ]},
  { title: '동·호수', fields: [
    { key: 'dong',               label: '동' },
    { key: 'ho',                 label: '호수' },
    { key: 'ho_privacy',         label: '호수 공개여부', type: 'privacy' },
    { key: 'ho_memo',            label: '호수 관리자메모', type: 'memo' },
    { key: 'curr_floor',         label: '해당층' },
    { key: 'curr_floor_privacy', label: '해당층 공개여부', type: 'privacy' },
    { key: 'curr_floor_memo',    label: '해당층 관리자메모', type: 'memo' },
  ]},
  { title: '주차', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'unit_parking',  label: '세대당 주차대수', type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
  ]},
  { title: '옵션', fields: [
    { key: 'opt_ac',       label: '에어컨' },
    { key: 'opt_general',  label: '일반옵션' },
    { key: 'opt_security', label: '보안옵션' },
    { key: 'opt_extra',    label: '기타옵션' },
  ]},
  { title: '상세정보', fields: [
    { key: 'description', label: '매물 상세정보', type: 'long' },
  ]},
];

function formatPrice(n) {
  if (n == null) return '—';
  if (n >= 10000) {
    const uk  = Math.floor(n / 10000);
    const man = n % 10000;
    return `${uk}억${man ? ` ${man.toLocaleString()}만` : ''}`;
  }
  return `${n.toLocaleString()}만원`;
}

function DetailModal({ item, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTop}>
          <div className={styles.modalHeader}>
            <span className={styles.modalId}>{item.property_id}</span>
            <span className={styles.modalAptName}>{item.apt_name || '—'}</span>
            {item.title && <span className={styles.modalTitle}>{item.title}</span>}
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {item.imageUrl && (
            <div className={styles.modalPhoto}>
              <img src={item.imageUrl} alt="대표사진" className={styles.modalPhotoImg} />
            </div>
          )}

          {DETAIL_SECTIONS.map(section => (
            <div key={section.title} className={styles.section}>
              <div className={styles.sectionTitle}>{section.title}</div>
              <div className={styles.sectionGrid}>
                {section.fields.map(f => {
                  const v = item[f.key];
                  let display;
                  if (f.type === 'price') display = <span className={styles.dPrice}>{formatPrice(v)}</span>;
                  else if (f.type === 'num') display = <span>{v != null ? v : '—'}</span>;
                  else if (f.type === 'privacy') display = <span className={v === '비공개' ? styles.dPrivate : styles.dPublic}>{v || '—'}</span>;
                  else if (f.type === 'memo') display = v && v !== '-' ? <span className={styles.dMemo}>{v}</span> : <span className={styles.dEmpty}>—</span>;
                  else if (f.type === 'long') display = <span className={styles.dLong}>{v && v !== '-' ? v : '—'}</span>;
                  else display = <span>{(!v || v === '-') ? '—' : v}</span>;

                  return (
                    <div key={f.key} className={styles.detailRow}>
                      <div className={styles.detailLabel}>{f.label}</div>
                      <div className={styles.detailValue}>{display}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const router = useRouter();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);
  const [query, setQuery]       = useState('');

  const filtered = query.trim()
    ? items.filter(item => {
        const q = query.trim().toLowerCase();
        return [item.property_id, item.apt_name, item.location, item.dong, item.ho, item.title, item.category, item.transaction]
          .some(v => v && String(v).toLowerCase().includes(q));
      })
    : items;

  useEffect(() => {
    fetch('/api/apt-sale/list')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => { setError('불러오기 실패'); setLoading(false); });
  }, []);

  function handleEdit(item) {
    sessionStorage.setItem('apt_edit_item', JSON.stringify(item));
    router.push(`/admin2/apt-sale/edit/${item.id}`);
  }

  async function handleToggleRecommended(item) {
    const next = !item.recommended;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, recommended: next } : i));
    try {
      await fetch(`/api/apt-sale/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommended: next }),
      });
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, recommended: item.recommended } : i));
    }
  }

  function renderCell(col, item) {
    const v = item[col.key];
    if (col.type === 'edit')   return <button className={styles.editBtn} onClick={() => handleEdit(item)}>수정</button>;
    if (col.type === 'recommended') return (
      <button
        className={item.recommended ? styles.recBtnOn : styles.recBtnOff}
        onClick={() => handleToggleRecommended(item)}
        title="추천매물 토글"
      >
        {item.recommended ? '★' : '☆'}
      </button>
    );
    if (col.type === 'photo')  return v
      ? <img src={v} alt="" className={styles.thumb} />
      : <div className={styles.thumbEmpty} />;
    if (col.type === 'id')     return <button className={styles.idBtn} onClick={() => setSelected(item)}>{v || '—'}</button>;
    if (col.type === 'date')   return <span>{v ? v.slice(0, 10) : '—'}</span>;
    if (col.type === 'price')  return <span className={styles.price}>{formatPrice(v)}</span>;
    if (col.type === 'bold')   return <span className={styles.bold}>{v || '—'}</span>;
    if (col.type === 'memo')   return v && v !== '-' ? <span className={styles.memo}>{v}</span> : <span className={styles.empty}>—</span>;
    if (!v || v === '-')       return <span className={styles.empty}>—</span>;
    return <span>{v}</span>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => router.push('/admin2')}>← 관리자2</button>
        <span className={styles.topTitle}>등록된 매물 전체보기</span>
        <span className={styles.count}>{loading ? '…' : `${filtered.length}건`}</span>
      </div>

      <div className={styles.body}>
        {!loading && items.length > 0 && (
          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="매물번호, 아파트명, 소재지, 동·호수 검색"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className={styles.searchClear} onClick={() => setQuery('')}>✕</button>
            )}
          </div>
        )}

        {loading && <div className={styles.status}>불러오는 중…</div>}
        {error   && <div className={styles.statusErr}>{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className={styles.status}>등록된 매물이 없습니다.</div>
        )}
        {!loading && !error && items.length > 0 && filtered.length === 0 && (
          <div className={styles.status}>검색 결과가 없습니다.</div>
        )}

        {!loading && filtered.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key} className={styles.th}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className={styles.row}>
                    {COLS.map(col => (
                      <td key={col.key} className={styles.td}>
                        {renderCell(col, item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
