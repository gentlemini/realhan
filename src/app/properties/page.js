'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import SlideInDrawer from '@/components/SlideInDrawer';
import PropertyImageFallback from '@/components/PropertyImageFallback';
import { renderPrice, getTypeBadgeStyle } from '@/lib/utils';
import styles from './properties.module.css';

const KakaoMap = dynamic(() => import('@/components/KakaoMap'), { ssr: false });

const TYPES = ['전체', '아파트', '원룸', '오피스텔', '상가', '토지', '빌라', '빌딩', '주택'];
const TX_TYPES = ['전체', '매매', '전세', '월세', '임대'];

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('전체');
  const [selectedTx, setSelectedTx] = useState('전체');
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState(null);
  const [clusterProps, setClusterProps] = useState(null);
  const [boundsProps, setBoundsProps] = useState(null);

  // 필터 바뀌면 클러스터/지도범위 선택 초기화
  useEffect(() => { setClusterProps(null); setBoundsProps(null); }, [selectedType, selectedTx, keyword]);

  useEffect(() => {
    fetch('/api/properties')
      .then((r) => r.json())
      .then((data) => setProperties(Array.isArray(data) && data.length > 0 ? data : []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const matchType = selectedType === '전체' || p.type === selectedType;
      const matchTx = selectedTx === '전체' || (p.transactionType || []).includes(selectedTx);
      const matchKw =
        !keyword ||
        p.name?.includes(keyword) ||
        p.address?.includes(keyword) ||
        p.features?.includes(keyword);
      return matchType && matchTx && matchKw;
    });
  }, [properties, selectedType, selectedTx, keyword]);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* 좌: 지도 */}
        <div className={styles.mapPane}>
          <KakaoMap
            properties={filtered}
            onClusterClick={(props) => { setClusterProps(props); }}
            onBoundsChange={(props) => { setClusterProps(null); setBoundsProps(props); }}
          />
        </div>

        {/* 우: 필터 + 리스트 */}
        <div className={styles.listPane}>
          <div className={styles.filterBar}>
            <div className={styles.searchRow}>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="매물명, 주소 검색"
                  className={styles.searchInput}
                />
              </div>
              <span className={styles.countBadge}>
                {(() => {
                  const display = clusterProps ?? boundsProps;
                  if (display) return `${display.length}건`;
                  return `${filtered.length}건`;
                })()}
              </span>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>건물유형</span>
              <div className={styles.filterRow}>
                {TYPES.map((t) => (
                  <button
                    key={t}
                    className={`${styles.filterTab} ${selectedType === t ? styles.filterTabActive : ''}`}
                    onClick={() => setSelectedType(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>거래유형</span>
              <div className={styles.filterRow}>
                {TX_TYPES.map((t) => (
                  <button
                    key={t}
                    className={`${styles.filterTab} ${selectedTx === t ? styles.filterTabActive : ''}`}
                    onClick={() => setSelectedTx(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
          </div>

          {clusterProps && (
            <div className={styles.clusterBanner}>
              <span>반경 100m 내 {clusterProps.length}개 매물</span>
              <button className={styles.clusterClear} onClick={() => setClusterProps(null)}>전체 보기 ✕</button>
            </div>
          )}
          {!clusterProps && boundsProps && (
            <div className={styles.boundsBanner}>
              📍 지도 범위 내 {boundsProps.length}개 매물
            </div>
          )}

          <div className={styles.listBody}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>매물 불러오는 중...</p>
              </div>
            ) : (clusterProps ?? boundsProps ?? filtered).length === 0 ? (
              <div className={styles.empty}>
                <span>🔍</span>
                <p>{boundsProps ? '이 지역에 매물이 없습니다.' : '검색 조건에 맞는 매물이 없습니다.'}</p>
                {!boundsProps && (
                  <button
                    className={styles.resetBtn}
                    onClick={() => { setSelectedType('전체'); setSelectedTx('전체'); setKeyword(''); }}
                  >필터 초기화</button>
                )}
              </div>
            ) : (
              (clusterProps ?? boundsProps ?? filtered).map((prop) => (
                <PropertyItem key={prop.id} property={prop} onClick={() => setSelected(prop)} />
              ))
            )}
          </div>
        </div>
      </div>

      <SlideInDrawer isOpen={!!selected} onClose={() => setSelected(null)} property={selected} />
    </div>
  );
}

function PropertyItem({ property, onClick }) {
  const badgeStyle = getTypeBadgeStyle(property.type);
  const txLabel = (property.transactionType || []).join('·');
  const badgeText = [property.type, txLabel].filter(Boolean).join('');
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardThumb}>
        {property.imageUrl ? (
          <img src={property.imageUrl} alt={property.name} className={styles.cardImg} />
        ) : (
          <div className={styles.cardImgFallback}><PropertyImageFallback /></div>
        )}
        {badgeText && (
          <span className={styles.cardBadge} style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
            {badgeText}
          </span>
        )}
        {property.isRecommended && <span className={styles.cardRec}>⭐</span>}
      </div>
      <div className={styles.cardBody}>
        {property.propertyNumber && (
          <p className={styles.cardNum}>📋 {property.propertyNumber}</p>
        )}
        <p className={styles.cardPrice}>{renderPrice(property)}</p>
        <p className={styles.cardAddr}>📍 {property.address || '주소 없음'}</p>
        <div className={styles.cardMeta}>
          {property.area > 0 && <span>📐 {property.area}㎡</span>}
          {property.currentFloor && <span>🏢 {property.currentFloor}층</span>}
          {property.rooms > 0 && <span>🛏 {property.rooms}방</span>}
          {property.direction && <span>🧭 {property.direction}</span>}
          {property.hasElevator && <span>🛗 엘베</span>}
        </div>
      </div>
    </div>
  );
}
