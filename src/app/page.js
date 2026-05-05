'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import HeroBanner from '@/components/HeroBanner';
import styles from './page.module.css';

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '';

const CATEGORY_COLORS = {
  '아파트':      { bg: '#e8f0fe', color: '#1a56db' },
  '오피스텔':    { bg: '#fef3c7', color: '#92400e' },
  '단독주택':    { bg: '#d1fae5', color: '#065f46' },
  '다가구':      { bg: '#ede9fe', color: '#5b21b6' },
  '다세대':      { bg: '#fce7f3', color: '#9d174d' },
  '상가':        { bg: '#fee2e2', color: '#991b1b' },
  '토지':        { bg: '#ecfdf5', color: '#047857' },
  '빌딩':        { bg: '#f0f9ff', color: '#0369a1' },
  '오피스':      { bg: '#f5f3ff', color: '#6d28d9' },
  '공장/창고':   { bg: '#fff7ed', color: '#c2410c' },
  '원룸/고시원': { bg: '#fdf4ff', color: '#86198f' },
  '재개발':      { bg: '#f0fdf4', color: '#166534' },
  '분양':        { bg: '#fffbeb', color: '#b45309' },
};

const TX_COLORS = {
  '매매': { bg: '#fff7ed', color: '#c2410c' },
  '전세': { bg: '#eff6ff', color: '#1d4ed8' },
  '월세': { bg: '#f0fdf4', color: '#15803d' },
};

function fmtMan(v) {
  if (!v && v !== 0) return '';
  if (v < 10000) return `${v.toLocaleString()}만`;
  const eok = Math.floor(v / 10000);
  const rem = v % 10000;
  if (rem === 0) return `${eok}억`;
  const cheon = Math.floor(rem / 1000);
  const man = rem % 1000;
  let s = `${eok}억`;
  if (cheon > 0) s += `${cheon}천`;
  if (man > 0) s += `${man}`;
  return s;
}

function formatPrice(item) {
  const { transaction, sale_price, jeonse_price, deposit, monthly_rent, maintenance } = item;
  if (transaction === '매매' && sale_price)
    return `매매 ${fmtMan(sale_price)}`;
  if (transaction === '전세' && jeonse_price)
    return `전세 ${fmtMan(jeonse_price)} / ${maintenance ? fmtMan(maintenance) : '-'}`;
  if (transaction === '월세') {
    const d = deposit      || 0;
    const m = monthly_rent || 0;
    const c = maintenance  || 0;
    return `월세 ${fmtMan(d)} / ${fmtMan(m)} / ${fmtMan(c)}`;
  }
  return '';
}

/* ── 카카오 지도 (미리보기용) ── */
let _kakaoPromise = null;

function loadKakaoSdk() {
  if (_kakaoPromise) return _kakaoPromise;
  _kakaoPromise = new Promise((resolve, reject) => {
    if (typeof window.kakao?.maps?.LatLng === 'function') { resolve(); return; }
    function poll() {
      let n = 0;
      const t = setInterval(() => {
        if (typeof window.kakao?.maps?.LatLng === 'function') { clearInterval(t); resolve(); }
        else if (++n > 100) { clearInterval(t); reject(new Error('timeout')); }
      }, 100);
    }
    if (window.kakao?.maps) { poll(); return; }
    const existing = document.getElementById('kakao-map-sdk');
    if (existing) {
      if (window.kakao) { poll(); return; }
      existing.addEventListener('load', poll, { once: true });
      return;
    }
    if (!KAKAO_APP_KEY) { reject(new Error('no key')); return; }
    const s = document.createElement('script');
    s.id = 'kakao-map-sdk';
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;
    s.onload = () => window.kakao.maps.load(resolve);
    s.onerror = () => reject(new Error('load error'));
    document.head.appendChild(s);
  });
  _kakaoPromise.catch(() => { _kakaoPromise = null; });
  return _kakaoPromise;
}

function PreviewMap({ lat, lng, radius }) {
  const mapRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk().then(() => {
      if (cancelled || !mapRef.current) return;
      if (!mapRef.current.offsetWidth && !mapRef.current.offsetHeight) return;
      const { kakao } = window;
      const center = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(mapRef.current, { center, level: 5 });
      map.setZoomable(false);
      if (!radius || radius === 0) {
        new kakao.maps.Marker({ position: center, map });
      } else {
        new kakao.maps.Circle({ center, radius, strokeWeight: 2, strokeColor: '#a87b51', strokeOpacity: 0.8, fillColor: '#c19a6b', fillOpacity: 0.15, map });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lng, radius]);
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

/* ── 상세보기 모달 (admin2 미리보기와 동일 레이아웃) ── */
function PreviewModal({ item, onClose }) {
  const catStyle = CATEGORY_COLORS[item.category] || { bg: '#f3f4f6', color: '#374151' };
  const txStyle  = TX_COLORS[item.transaction]    || { bg: '#f3f4f6', color: '#374151' };

  const [detail,  setDetail]  = useState(null);
  const [detLoading, setDetLoading] = useState(true);

  /* 전체 필드 fetch */
  useEffect(() => {
    setDetLoading(true);
    fetch(`/api/property-detail/${item.id}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetLoading(false));
  }, [item.id]);

  const imageUrls = detail?.imageUrls?.length ? detail.imageUrls
                  : (detail?.imageUrl || item.imageUrl) ? [detail?.imageUrl || item.imageUrl] : [];
  const imageUrl  = imageUrls[0] || '';

  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => { setPhotoIdx(0); }, [item.id]);
  const currentPhoto = imageUrls[photoIdx] || '';
  const prevPhoto = () => setPhotoIdx(i => (i - 1 + imageUrls.length) % imageUrls.length);
  const nextPhoto = () => setPhotoIdx(i => (i + 1) % imageUrls.length);

  const hasMap   = (detail?.map_lat ?? item.map_lat) && (detail?.map_lng ?? item.map_lng);
  const mapLat   = detail?.map_lat   ?? item.map_lat;
  const mapLng   = detail?.map_lng   ?? item.map_lng;
  const mapRadius = detail?.map_radius ?? item.map_radius ?? 0;

  /* 제목: 상세에서 '매물 특징' 행 값 사용, 없으면 building_name */
  const titleRow  = detail?.rows?.find(r => r.label === '매물 특징');
  const modalTitle = titleRow?.value || item.building_name || '';

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    const siteHeader = document.querySelector('header');
    if (siteHeader) siteHeader.style.zIndex = '0';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
      if (siteHeader) siteHeader.style.zIndex = '';
    };
  }, [onClose]);

  return (
    <div className={styles.pvOverlay} onClick={onClose}>
      <div className={styles.pvBox} onClick={e => e.stopPropagation()}>

        {/* 닫기 */}
        <button className={styles.pvClose} onClick={onClose}>✕</button>

        {/* 카카오 상담 버튼 */}
        <a
          href="https://pf.kakao.com/_QaxliG"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.pvKakaoBtn}
        >
          <img
            src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png"
            alt="카카오톡 상담"
            className={styles.pvKakaoIcon}
          />
          <span>카카오톡 상담</span>
        </a>

        <div className={styles.pvLayout}>
          {/* 좌: 사진 */}
          <div className={styles.pvPhotoCol} style={{ position: 'relative' }}>
            {currentPhoto ? (
              <>
                <img src={currentPhoto} alt={`사진 ${photoIdx + 1}`} className={styles.pvPhotoImg} />
                {imageUrls.length > 1 && (
                  <>
                    <button onClick={prevPhoto} className={styles.pvSlidePrev} aria-label="이전">&#8249;</button>
                    <button onClick={nextPhoto} className={styles.pvSlideNext} aria-label="다음">&#8250;</button>
                    <div className={styles.pvSlideDots}>
                      {imageUrls.map((_, i) => (
                        <span
                          key={i}
                          className={styles.pvSlideDot}
                          style={{ background: i === photoIdx ? '#5a3e28' : 'rgba(255,255,255,0.6)' }}
                          onClick={() => setPhotoIdx(i)}
                        />
                      ))}
                    </div>
                    <div className={styles.pvSlideCount}>{photoIdx + 1} / {imageUrls.length}</div>
                  </>
                )}
              </>
            ) : (
              <div className={styles.pvPhotoArea}>
                <span className={styles.pvPhotoGhost}>사진위치</span>
                <div className={styles.pvPhotoFallback}>
                  <p className={styles.pvFallbackSub}>사진 첨부 없을시 아래 내용</p>
                  <p className={styles.pvFallbackName}>"공인중개사 한민희"</p>
                  <p className={styles.pvFallbackPhone}>"010-4706-8253"</p>
                </div>
              </div>
            )}
          </div>

          {/* 우: 지도 + 데이터 */}
          <div className={styles.pvDataCol}>
            {/* 데스크탑 지도 (pvDataScroll 위, 고정) */}
            <div className={styles.pvMapBox}>
              {hasMap ? (
                <PreviewMap lat={mapLat} lng={mapLng} radius={mapRadius} />
              ) : (
                <span className={styles.pvMapPlaceholder}>지도 위치 미등록</span>
              )}
            </div>

            {/* 스크롤 데이터 */}
            <div className={styles.pvDataScroll}>
              {/* 헤더 */}
              <div className={styles.pvDataHeader}>
                <div className={styles.pvHeaderSub}>
                  <span className={styles.fBadge} style={{ background: catStyle.bg, color: catStyle.color }}>{item.category}</span>
                  <span className={styles.fBadge} style={{ background: txStyle.bg, color: txStyle.color }}>{item.transaction}</span>
                </div>
                <div className={styles.pvTitle}>
                  {modalTitle || <span className={styles.pvTitleEmpty}>매물제목 미입력</span>}
                </div>
              </div>

              {/* 모바일 전용 지도 (헤더 아래, 스크롤 영역 내) */}
              {!detLoading && hasMap && (
                <div className={styles.pvMobileMap}>
                  <PreviewMap lat={mapLat} lng={mapLng} radius={mapRadius} />
                </div>
              )}

              {/* 필드 행 */}
              {detLoading ? (
                <div className={styles.pvDetailLoading}>
                  <div className={styles.spinner} />
                </div>
              ) : (() => {
                const rows = detail?.rows || [];
                const sections = [];
                for (const r of rows) {
                  const sec = r.section || '기타';
                  if (!sections.length || sections[sections.length - 1].title !== sec)
                    sections.push({ title: sec, rows: [] });
                  sections[sections.length - 1].rows.push(r);
                }
                return sections.map(sec => (
                  <div key={sec.title}>
                    <div className={styles.pvRowSection}>{sec.title}</div>
                    {sec.rows.map(r => {
                      const rCatStyle = CATEGORY_COLORS[r.value] || { bg: '#f3f4f6', color: '#374151' };
                      const rTxStyle  = TX_COLORS[r.value]       || { bg: '#f3f4f6', color: '#374151' };
                      return (
                        <div key={r.label} className={`${styles.pvRow} ${r.isPrice ? styles.pvRowHighlight : ''}`}>
                          <div className={styles.pvLabel}>{r.label}</div>
                          <div className={`${styles.pvValue} ${r.isPrivate ? styles.pvPrivate : ''}`}>
                            {r.isCategory && <span className={styles.pvBadge} style={{ background: rCatStyle.bg, color: rCatStyle.color }}>{r.value}</span>}
                            {r.isTransaction && <span className={styles.pvBadge} style={{ background: rTxStyle.bg, color: rTxStyle.color }}>{r.value}</span>}
                            {r.isPrice && <span className={styles.pvPriceBadge}>{r.value}</span>}
                            {!r.isCategory && !r.isTransaction && !r.isPrice && r.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}

              {/* 담당자 카드 */}
              <div className={styles.pvAgentCard}>
                <img src="/profile.png" alt="한민희" className={styles.pvAgentAvatar} />
                <div className={styles.pvAgentInfo}>
                  <div className={styles.pvAgentName}>친절한 공인중개사 한민희 부장</div>
                  <div className={styles.pvAgentRole}>부동산 전담 매니저</div>
                </div>
              </div>

              {/* 사무소 등록 정보 */}
              <div className={styles.pvOfficeFooter}>
                <strong>한결부동산공인중개사사무소</strong>
                <span>대표 이동한 · 부산광역시 남구 대연동</span>
                <span>등록번호 제26290-2019-00094호 · 051-612-5155</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AreaMeta 칩 (면적·층·방향) ── */
function AreaMeta({ property: p }) {
  const chips = [];
  if (p.supply_area)    chips.push(`공급 ${p.supply_area}㎡`);
  if (p.exclusive_area) chips.push(`전용 ${p.exclusive_area}㎡`);
  if (p.contract_area)  chips.push(`임대 ${p.contract_area}㎡`);
  if (p.land_area)      chips.push(`대지 ${p.land_area}㎡`);
  if (p.build_area)     chips.push(`건축 ${p.build_area}㎡`);
  if (p.total_area)     chips.push(`연면적 ${p.total_area}㎡`);
  if (p.expected_area)  chips.push(`예상 ${p.expected_area}㎡`);
  const floorText = p.curr_floor
    ? (p.total_floors ? `${p.curr_floor}/${p.total_floors}층` : `${p.curr_floor}층`)
    : null;
  if (floorText)   chips.push(floorText);
  if (p.direction) chips.push(`${p.direction}향`);
  if (p.rooms)     chips.push(`방 ${p.rooms}개`);
  if (chips.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', marginTop: 4, borderTop: '1px solid #f0ebe4', paddingTop: 6 }}>
      {chips.map(c => (
        <span key={c} style={{ fontSize: '0.7rem', color: '#78716c', background: '#f5f2ee', borderRadius: 4, padding: '2px 6px' }}>{c}</span>
      ))}
    </div>
  );
}

/* ── 카드 ── */
function PropertyCard({ item, onCardClick }) {
  const catStyle = CATEGORY_COLORS[item.category] || { bg: '#f3f4f6', color: '#374151' };
  const txStyle  = TX_COLORS[item.transaction]    || { bg: '#f3f4f6', color: '#374151' };
  const price    = formatPrice(item);

  const badgeBase = { fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 5 };

  return (
    <div className={styles.fCard} onClick={() => onCardClick(item)}>
      <div className={styles.fCardThumb}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className={styles.fCardImg} />
        ) : (
          <div className={styles.fImgPlaceholder}>
            <span className={styles.fImgIcon}>🏠</span>
          </div>
        )}

        {/* 좌상단: 매물분류 + 거래종류 */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
          <span style={{ ...badgeBase, background: catStyle.bg, color: catStyle.color }}>{item.category}</span>
          <span style={{ ...badgeBase, background: txStyle.bg,  color: txStyle.color  }}>{item.transaction}</span>
        </div>

        {/* 우상단: 매물번호 + 추천 */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {item.property_id && (
            <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(0,0,0,0.45)', color: '#fff', padding: '2px 7px', borderRadius: 100 }}>
              No.{item.property_id}
            </span>
          )}
          {item.recommended && <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>⭐</span>}
        </div>

        {/* 좌하단: 소재지 그라디언트 오버레이 */}
        {item.location && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 10px 8px', background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}>
            <span style={{ fontSize: '0.72rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>📍 {item.location}</span>
          </div>
        )}
      </div>

      <div className={styles.fCardBody}>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1c1917', margin: 0 }}>
          {item.building_name || item.title || '—'}
        </p>
        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a87b51', margin: 0 }}>
          {price || '가격 미등록'}
        </p>
        <AreaMeta property={item} />
      </div>
    </div>
  );
}

const CATEGORY_META = {
  '아파트':      { emoji: '🏢', accent: '#2563eb' },
  '오피스텔':    { emoji: '🏙️', accent: '#7c3aed' },
  '단독주택':    { emoji: '🏠', accent: '#059669' },
  '다가구':      { emoji: '🏘️', accent: '#d97706' },
  '다세대':      { emoji: '🏗️', accent: '#dc2626' },
  '원룸':        { emoji: '🛏️', accent: '#0891b2' },
  '투룸':        { emoji: '🛋️', accent: '#9333ea' },
  '쓰리룸':      { emoji: '🏡', accent: '#0d9488' },
  '상가':        { emoji: '🏪', accent: '#ea580c' },
  '오피스':      { emoji: '💼', accent: '#475569' },
  '공장/창고':   { emoji: '🏭', accent: '#57534e' },
  '빌딩':        { emoji: '🏬', accent: '#0369a1' },
  '토지':        { emoji: '🌾', accent: '#16a34a' },
  '재개발':      { emoji: '🔨', accent: '#b91c1c' },
  '분양':        { emoji: '🔑', accent: '#b45309' },
};

/* ── 카테고리 버튼 ── */
function CategoryBtn({ label }) {
  const meta = CATEGORY_META[label] || { emoji: '🏠', accent: '#a87b51' };
  return (
    <Link
      href={`/properties?category=${encodeURIComponent(label)}`}
      className={styles.catBtn}
      style={{ '--cat-accent': meta.accent }}
    >
      <span className={styles.catEmoji}>{meta.emoji}</span>
      <span className={styles.catLabel}>{label}</span>
    </Link>
  );
}

/* ── 섹션 ── */
function Section({ title, desc, items, loading, onCardClick, bg }) {
  if (loading) {
    return (
      <section className={styles.propSection} style={{ background: bg }}>
        <div className={styles.propInner}>
          <div className={styles.loading}><div className={styles.spinner} /></div>
        </div>
      </section>
    );
  }
  return (
    <section className={styles.propSection} style={{ background: bg }}>
      <div className={styles.propInner}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionDesc}>{desc}</p>
        </div>
        {items.length === 0 ? (
          <p className={styles.emptyMsg}>등록된 매물이 없습니다.</p>
        ) : (
          <div className={styles.featuredGrid}>
            {items.slice(0, 8).map(item => (
              <PropertyCard key={item.id} item={item} onCardClick={onCardClick} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── 메인 페이지 ── */
export default function HomePage() {
  const [allItems,     setAllItems]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetch('/api/listings')
      .then(r => r.json())
      .then(data => setAllItems(Array.isArray(data) ? data.filter(p => !p.contract_status || p.contract_status === '계약가능' || p.contract_status === '계약진행중') : []))
      .catch(() => setAllItems([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = useCallback((item) => {
    const newCount = (item.view_count || 0) + 1;
    const updated  = { ...item, view_count: newCount };
    setAllItems(prev => prev.map(i => i.id === item.id ? updated : i));
    setSelectedItem(updated);
    fetch('/api/view-count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: item.id, newCount }),
    }).catch(() => {});
  }, []);

  const handleClose = useCallback(() => setSelectedItem(null), []);

  const latestItems      = [...allItems].sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
  const popularItems     = [...allItems].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  const recommendedItems = allItems.filter(i => i.recommended);

  return (
    <>
      <HeroBanner />

      <div className={styles.statsBar}>
        <div className={styles.statsInner}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{loading ? '—' : `${allItems.length}+`}</span>
            <span className={styles.statLabel}>등록 매물</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>1:1</span>
            <span className={styles.statLabel}>전담 상담</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>부산 전지역</span>
            <span className={styles.statLabel}>전문 지역</span>
          </div>
        </div>
      </div>

      <section className={styles.catSection}>
        <p className={styles.catSectionTitle}>매물 종류</p>
        <div className={styles.categoryGrid}>
          {['아파트','오피스텔','단독주택','다가구','다세대','원룸','투룸','쓰리룸','상가','오피스','공장/창고','빌딩','토지','재개발','분양'].map(label => (
            <CategoryBtn key={label} label={label} />
          ))}
        </div>
      </section>

      <Section title="🆕 최신매물" desc="새로 등록된 매물을 확인하세요"  items={latestItems}      loading={loading} onCardClick={handleCardClick} bg="#f8f6f2" />
      <Section title="🔥 인기매물" desc="많이 조회된 매물을 확인하세요" items={popularItems}     loading={loading} onCardClick={handleCardClick} bg="#fff"     />
      <Section title="⭐ 추천매물" desc="엄선된 추천 매물을 확인하세요" items={recommendedItems} loading={loading} onCardClick={handleCardClick} bg="#f8f6f2" />

      <section className={styles.ctaBanner}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>원하는 매물을 찾지 못하셨나요?</h2>
          <p className={styles.ctaDesc}>
            친절한 한민희 부장에게 직접 상담을 요청하세요.<br />
            원하시는 조건에 딱 맞는 매물을 찾아드립니다.
          </p>
          <div className={styles.ctaActions}>
            <a href="tel:010-4706-8253" className={styles.ctaCall}>📞 010-4706-8253</a>
            <a href="/contact" className={styles.ctaLink}>온라인 문의 →</a>
          </div>
        </div>
      </section>

      {selectedItem && <PreviewModal item={selectedItem} onClose={handleClose} />}
    </>
  );
}
