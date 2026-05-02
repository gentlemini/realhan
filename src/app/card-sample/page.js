'use client';

import styles from './card-sample.module.css';

const MOCK_ITEMS = [
  {
    id: 1,
    recommended: true,
    category: '아파트',
    transaction: '매매',
    building_name: '해운대 두산위브 더 제니스',
    location: '부산 해운대구 중동',
    curr_floor: '15층',
    sale_price: 85000,
    imageUrl: null,
  },
  {
    id: 2,
    recommended: false,
    category: '오피스텔',
    transaction: '월세',
    building_name: '센텀 SK 허브',
    location: '부산 해운대구 재송동',
    curr_floor: '8층',
    deposit: 1000,
    monthly_rent: 75,
    maintenance: 8,
    imageUrl: null,
  },
  {
    id: 3,
    recommended: true,
    category: '아파트',
    transaction: '전세',
    building_name: '대연 파크푸르지오',
    location: '부산 남구 대연동',
    curr_floor: '7층',
    jeonse_price: 42000,
    imageUrl: null,
  },
  {
    id: 4,
    recommended: false,
    category: '단독주택',
    transaction: '매매',
    building_name: '',
    location: '부산 남구 용호동',
    curr_floor: '',
    sale_price: 32000,
    imageUrl: null,
  },
  {
    id: 5,
    recommended: false,
    category: '상가',
    transaction: '월세',
    building_name: '센텀시티 상가',
    location: '부산 해운대구 센텀시티',
    curr_floor: '2층',
    deposit: 5000,
    monthly_rent: 300,
    maintenance: 20,
    imageUrl: null,
  },
  {
    id: 6,
    recommended: true,
    category: '오피스텔',
    transaction: '매매',
    building_name: '광안 W스퀘어',
    location: '부산 수영구 광안동',
    curr_floor: '12층',
    sale_price: 28000,
    imageUrl: null,
  },
  {
    id: 7,
    recommended: false,
    category: '토지',
    transaction: '매매',
    building_name: '',
    location: '경남 양산시 물금읍',
    curr_floor: '',
    sale_price: 15000,
    imageUrl: null,
  },
  {
    id: 8,
    recommended: false,
    category: '다가구',
    transaction: '전세',
    building_name: '',
    location: '부산 북구 화명동',
    curr_floor: '3층',
    jeonse_price: 18000,
    imageUrl: null,
  },
];

function formatPrice(item) {
  const { transaction, sale_price, jeonse_price, deposit, monthly_rent, maintenance } = item;
  if (transaction === '매매' && sale_price) {
    return `매매 ${sale_price.toLocaleString()}만원`;
  }
  if (transaction === '전세' && jeonse_price) {
    return `전세 ${jeonse_price.toLocaleString()}만원`;
  }
  if (transaction === '월세') {
    const parts = [deposit || 0, monthly_rent || 0, maintenance || 0];
    return `월세 ${parts.join(' / ')}만원`;
  }
  return '';
}

const CATEGORY_COLORS = {
  '아파트':   { bg: '#e8f0fe', color: '#1a56db' },
  '오피스텔': { bg: '#fef3c7', color: '#92400e' },
  '단독주택': { bg: '#d1fae5', color: '#065f46' },
  '다가구':   { bg: '#ede9fe', color: '#5b21b6' },
  '다세대':   { bg: '#fce7f3', color: '#9d174d' },
  '상가':     { bg: '#fee2e2', color: '#991b1b' },
  '토지':     { bg: '#ecfdf5', color: '#047857' },
  '빌딩':     { bg: '#f0f9ff', color: '#0369a1' },
};

const TX_COLORS = {
  '매매': { bg: '#fff7ed', color: '#c2410c' },
  '전세': { bg: '#eff6ff', color: '#1d4ed8' },
  '월세': { bg: '#f0fdf4', color: '#15803d' },
};

function SampleCard({ item }) {
  const catStyle = CATEGORY_COLORS[item.category] || { bg: '#f3f4f6', color: '#374151' };
  const txStyle  = TX_COLORS[item.transaction]     || { bg: '#f3f4f6', color: '#374151' };
  const price    = formatPrice(item);

  return (
    <div className={styles.card}>
      {/* 이미지 영역 */}
      <div className={styles.imgWrap}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className={styles.img} />
        ) : (
          <div className={styles.imgPlaceholder}>
            <span className={styles.imgPlaceholderIcon}>🏠</span>
          </div>
        )}
        {item.recommended && (
          <span className={styles.recommendBadge}>추천</span>
        )}
      </div>

      {/* 카드 본문 */}
      <div className={styles.cardBody}>
        {/* 배지 행 */}
        <div className={styles.badgeRow}>
          <span className={styles.badge} style={{ background: catStyle.bg, color: catStyle.color }}>
            {item.category}
          </span>
          <span className={styles.badge} style={{ background: txStyle.bg, color: txStyle.color }}>
            {item.transaction}
          </span>
        </div>

        {/* 건물명 */}
        <p className={styles.buildingName}>
          {item.building_name || <span className={styles.empty}>&nbsp;</span>}
        </p>

        {/* 소재지 */}
        <p className={styles.location}>
          {item.location || <span className={styles.empty}>&nbsp;</span>}
        </p>

        {/* 구분선 */}
        <div className={styles.divider} />

        {/* 금액 */}
        <p className={styles.price}>
          {price || <span className={styles.empty}>&nbsp;</span>}
        </p>

        {/* 해당층 */}
        <p className={styles.floor}>
          {item.curr_floor || <span className={styles.empty}>&nbsp;</span>}
        </p>
      </div>
    </div>
  );
}

export default function CardSamplePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>카드 샘플 — 미리보기</h1>
        <p className={styles.desc}>실제 적용 전 디자인 확인용 페이지입니다.</p>
      </div>

      <div className={styles.grid}>
        {MOCK_ITEMS.map(item => (
          <SampleCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
