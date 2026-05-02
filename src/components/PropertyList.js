'use client';

import { useState, useRef, useCallback } from 'react';
import SlideInDrawer from './SlideInDrawer';
import PropertyImageFallback from './PropertyImageFallback';
import { renderPrice, getTypeBadgeStyle } from '@/lib/utils';
import styles from './PropertyList.module.css';

export default function PropertyList({ title, layout = 'grid', properties = [] }) {
  const [selected, setSelected] = useState(null);
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const SCROLL_AMT = 620;

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scroll = (dir) => {
    trackRef.current?.scrollBy({ left: dir * SCROLL_AMT, behavior: 'smooth' });
    setTimeout(updateArrows, 350);
  };

  if (!properties.length) return null;

  return (
    <section className={styles.section}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}

      {layout === 'carousel' ? (
        <div className={styles.carouselWrap}>
          {canPrev && (
            <button
              className={`${styles.arrowBtn} ${styles.arrowLeft}`}
              onClick={() => scroll(-1)}
              aria-label="이전"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          <div
            className={styles.carousel}
            ref={trackRef}
            onScroll={updateArrows}
          >
            {properties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} onClick={() => setSelected(prop)} />
            ))}
          </div>

          {canNext && (
            <button
              className={`${styles.arrowBtn} ${styles.arrowRight}`}
              onClick={() => scroll(1)}
              aria-label="다음"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {properties.map((prop) => (
            <PropertyCard key={prop.id} property={prop} onClick={() => setSelected(prop)} />
          ))}
        </div>
      )}

      <SlideInDrawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        property={selected}
      />
    </section>
  );
}

function PropertyCard({ property, onClick }) {
  const badgeStyle = getTypeBadgeStyle(property.type);
  const isRecommended = property.isRecommended;

  const handleClick = async () => {
    onClick();
    try {
      await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'hit', currentCount: property.hitCount }),
      });
    } catch (_) {}
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.imgWrap}>
        {property.imageUrl ? (
          <img src={property.imageUrl} alt={property.name} className={styles.img} />
        ) : (
          <div className={styles.imgFallback}><PropertyImageFallback /></div>
        )}
        {isRecommended && <span className={styles.recommendBadge}>⭐ 추천</span>}
        <span
          className={styles.typeBadge}
          style={{ background: badgeStyle.bg, color: badgeStyle.color }}
        >
          {property.type}
        </span>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardAddress}>{property.address || '주소 정보 없음'}</p>
        <h3 className={styles.cardName}>
          {property.name || `${property.type || ''} ${(property.transactionType || []).join('·')}`.trim()}
        </h3>
        <p className={styles.cardPrice}>{renderPrice(property)}</p>
        {property.area > 0 && (
          <p className={styles.cardMeta}>
            공급 {property.area}㎡
            {property.currentFloor ? ` · ${property.currentFloor}층` : ''}
            {property.direction ? ` · ${property.direction}` : ''}
          </p>
        )}
        {property.features && (
          <p className={styles.cardFeatures}>{property.features}</p>
        )}
      </div>
    </div>
  );
}
