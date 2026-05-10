'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '';

const CATEGORY_COLORS = {
  '아파트':        { bg: '#e8f0fe', color: '#1a56db' },
  '오피스텔':      { bg: '#fef3c7', color: '#92400e' },
  '단독주택':      { bg: '#d1fae5', color: '#065f46' },
  '다가구':        { bg: '#ede9fe', color: '#5b21b6' },
  '다세대':        { bg: '#fce7f3', color: '#9d174d' },
  '연립':          { bg: '#fce7f3', color: '#9d174d' },
  '빌라':          { bg: '#fce7f3', color: '#9d174d' },
  '상가주택':      { bg: '#fce7f3', color: '#9d174d' },
  '상가':          { bg: '#fee2e2', color: '#991b1b' },
  '일반상가':      { bg: '#fee2e2', color: '#991b1b' },
  '단지내상가':    { bg: '#fee2e2', color: '#991b1b' },
  '복합상가':      { bg: '#fee2e2', color: '#991b1b' },
  '토지':          { bg: '#ecfdf5', color: '#047857' },
  '빌딩':          { bg: '#f0f9ff', color: '#0369a1' },
  '빌딩건물기타':  { bg: '#f0f9ff', color: '#0369a1' },
  '펜션':          { bg: '#f0f9ff', color: '#0369a1' },
  '상가건물':      { bg: '#f0f9ff', color: '#0369a1' },
  '오피스':        { bg: '#f5f3ff', color: '#6d28d9' },
  '대형사무실':    { bg: '#f5f3ff', color: '#6d28d9' },
  '중소형사무실':  { bg: '#f5f3ff', color: '#6d28d9' },
  '지식산업센터':  { bg: '#f5f3ff', color: '#6d28d9' },
  '공장/창고':     { bg: '#fff7ed', color: '#c2410c' },
  '원룸/고시원':   { bg: '#fdf4ff', color: '#86198f' },
  '원룸':          { bg: '#fdf4ff', color: '#86198f' },
  '투룸':          { bg: '#fdf4ff', color: '#86198f' },
  '쓰리룸':        { bg: '#fdf4ff', color: '#86198f' },
  '재개발':        { bg: '#f0fdf4', color: '#166534' },
  '분양':          { bg: '#fffbeb', color: '#b45309' },
  '분양권':        { bg: '#fffbeb', color: '#b45309' },
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
  const { transaction, sale_price, jeonse_price, deposit, monthly_rent } = item;
  if (transaction === '매매' && sale_price)   return `매매 ${fmtMan(sale_price)}`;
  if (transaction === '전세' && jeonse_price) return `전세 ${fmtMan(jeonse_price)}`;
  if (transaction === '월세') return `월세 ${fmtMan(deposit || 0)} / ${fmtMan(monthly_rent || 0)}`;
  return '';
}

// ── Kakao SDK ─────────────────────────────────────────────────────────────────
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
    if (existing) { if (window.kakao) { poll(); return; } existing.addEventListener('load', poll, { once: true }); return; }
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
      const { kakao } = window;
      const center = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(mapRef.current, { center, level: 5 });
      map.setZoomable(false);
      if (!radius || radius === 0) {
        new kakao.maps.Marker({ position: center, map });
      } else {
        new kakao.maps.Circle({ center, radius, strokeWeight: 2, strokeColor: '#2a3e3f', strokeOpacity: 0.8, fillColor: '#2a3e3f', fillOpacity: 0.12, map });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lng, radius]);
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function PreviewModal({ item, onClose }) {
  const catStyle = CATEGORY_COLORS[item.category] || { bg: '#f3f4f6', color: '#374151' };
  const txStyle  = TX_COLORS[item.transaction]    || { bg: '#f3f4f6', color: '#374151' };
  const [detail, setDetail]     = useState(null);
  const [detLoading, setDetLoading] = useState(true);

  useEffect(() => {
    setDetLoading(true);
    fetch(`/api/property-detail/${item.id}`)
      .then(r => r.json()).then(d => setDetail(d)).catch(() => setDetail(null)).finally(() => setDetLoading(false));
  }, [item.id]);

  const imageUrls = detail?.imageUrls?.length ? detail.imageUrls
                  : (detail?.imageUrl || item.imageUrl) ? [detail?.imageUrl || item.imageUrl] : [];
  const youtubeId = getYouTubeId(detail?.youtube_url);
  const slides = [
    ...(youtubeId ? [{ type: 'youtube', id: youtubeId }] : []),
    ...imageUrls.map(url => ({ type: 'photo', url })),
  ];
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => { setSlideIdx(0); }, [item.id]);
  const prevSlide = () => setSlideIdx(i => (i - 1 + slides.length) % slides.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % slides.length);
  const currentSlide = slides[slideIdx];

  const hasMap    = (detail?.map_lat ?? item.map_lat) && (detail?.map_lng ?? item.map_lng);
  const mapLat    = detail?.map_lat    ?? item.map_lat;
  const mapLng    = detail?.map_lng    ?? item.map_lng;
  const mapRadius = detail?.map_radius ?? item.map_radius ?? 0;
  const titleRow  = detail?.rows?.find(r => r.label === '매물 특징');
  const modalTitle = titleRow?.value || item.building_name || '';

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
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
        <button className={styles.pvClose} onClick={onClose}>✕</button>
        <a href="https://pf.kakao.com/_QaxliG" target="_blank" rel="noopener noreferrer" className={styles.pvKakaoBtn}>
          <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" alt="" className={styles.pvKakaoIcon} />
          <span>카카오톡 상담</span>
        </a>
        <div className={styles.pvLayout}>
          <div className={styles.pvPhotoCol}>
            <div className={styles.pvPhotoMain}>
              {currentSlide ? (
                <>
                  {currentSlide.type === 'youtube' ? (
                    <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${currentSlide.id}`}
                        title="매물 영상"
                        style={{ width: '100%', aspectRatio: '16/9', maxHeight: '100%', border: 'none', display: 'block' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <img src={currentSlide.url} alt={`사진 ${slideIdx + (youtubeId ? 0 : 1)}`} className={styles.pvPhotoImg} />
                  )}
                  {slides.length > 1 && (
                    <>
                      <button onClick={prevSlide} className={styles.pvSlidePrev}>&#8249;</button>
                      <button onClick={nextSlide} className={styles.pvSlideNext}>&#8250;</button>
                      <div className={styles.pvSlideCount}>{slideIdx + 1} / {slides.length}</div>
                    </>
                  )}
                </>
              ) : (
                <div className={styles.pvPhotoArea}>
                  <span className={styles.pvPhotoGhost}>사진위치</span>
                  <div className={styles.pvPhotoFallback}>
                    <p className={styles.pvFallbackSub}>사진 첨부 없을시</p>
                    <p className={styles.pvFallbackName}>"공인중개사 한민희"</p>
                    <p className={styles.pvFallbackPhone}>"010-4706-8253"</p>
                  </div>
                </div>
              )}
            </div>
            {slides.length > 1 && (
              <div className={styles.pvThumbs}>
                {slides.map((s, i) => (
                  <div key={i} className={`${styles.pvThumb} ${i === slideIdx ? styles.pvThumbActive : ''}`} onClick={() => setSlideIdx(i)}>
                    <img src={s.type === 'youtube' ? `https://img.youtube.com/vi/${s.id}/mqdefault.jpg` : s.url} alt={`${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.pvDataCol}>
            <div className={styles.pvMapBox}>
              {hasMap ? <PreviewMap lat={mapLat} lng={mapLng} radius={mapRadius} />
                      : <span className={styles.pvMapPlaceholder}>지도 위치 미등록</span>}
            </div>
            <div className={styles.pvDataScroll}>
              <div className={styles.pvDataHeader}>
                <div className={styles.pvHeaderSub}>
                  <span className={styles.fBadge} style={{ background: catStyle.bg, color: catStyle.color }}>{item.category}</span>
                  <span className={styles.fBadge} style={{ background: txStyle.bg, color: txStyle.color }}>{item.transaction}</span>
                  {item.contract_status && (
                    <span className={styles.fBadge} style={{
                      background: item.contract_status === '계약진행중' ? '#fffbeb' : '#f0fdf4',
                      color:      item.contract_status === '계약진행중' ? '#92400e' : '#166534',
                    }}>{item.contract_status}</span>
                  )}
                </div>
                <div className={styles.pvTitle}>{modalTitle || <span className={styles.pvTitleEmpty}>매물제목 미입력</span>}</div>
              </div>

              {!detLoading && hasMap && (
                <div className={styles.pvMobileMap}><PreviewMap lat={mapLat} lng={mapLng} radius={mapRadius} /></div>
              )}
              {detLoading ? (
                <div className={styles.pvDetailLoading}><div className={styles.spinner} /></div>
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
                      const rc = CATEGORY_COLORS[r.value] || { bg: '#f3f4f6', color: '#374151' };
                      const rt = TX_COLORS[r.value]       || { bg: '#f3f4f6', color: '#374151' };
                      return (
                        <div key={r.label} className={`${styles.pvRow} ${r.isPrice ? styles.pvRowHighlight : ''}`}>
                          <div className={styles.pvLabel}>{r.label}</div>
                          <div className={`${styles.pvValue} ${r.isPrivate ? styles.pvPrivate : ''}`}>
                            {r.isCategory && <span className={styles.pvBadge} style={{ background: rc.bg, color: rc.color }}>{r.value}</span>}
                            {r.isTransaction && <span className={styles.pvBadge} style={{ background: rt.bg, color: rt.color }}>{r.value}</span>}
                            {r.isPrice && <span className={styles.pvPriceBadge}>{r.value}</span>}
                            {r.isTags && !r.isCategory && !r.isTransaction && !r.isPrice && (
                              <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {r.value.split(', ').filter(Boolean).map(t => (
                                  <span key={t} style={{ padding: '2px 8px', background: '#f4f0ec', border: '1px solid #e0d8cc', color: '#2a3e3f', borderRadius: '5px', fontSize: '11.5px', fontWeight: 500 }}>{t}</span>
                                ))}
                              </span>
                            )}
                            {!r.isTags && !r.isCategory && !r.isTransaction && !r.isPrice && r.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
              {detail?.blog_url && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 0' }}>
                  <a
                    href={detail.blog_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px',
                      background: '#03C75A', color: '#fff',
                      borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                      textDecoration: 'none',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 3h-9A4.5 4.5 0 003 7.5v9A4.5 4.5 0 007.5 21h9A4.5 4.5 0 0021 16.5v-9A4.5 4.5 0 0016.5 3zm-4.25 13.25c-2.9 0-5.25-2.35-5.25-5.25S9.35 5.75 12.25 5.75 17.5 8.1 17.5 11s-2.35 5.25-5.25 5.25zm0-8.5a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5z"/>
                    </svg>
                    블로그 바로가기
                  </a>
                </div>
              )}
              <div className={styles.pvAgentCard}>
                <img src="/profile.png" alt="한민희" className={styles.pvAgentAvatar} />
                <div className={styles.pvAgentInfo}>
                  <div className={styles.pvAgentName}>친절한 공인중개사 한민희 부장</div>
                  <div className={styles.pvAgentRole}>부동산 전담 매니저</div>
                </div>
              </div>
              <div className={styles.pvOfficeFooter}>
                <strong>한결부동산공인중개사사무소</strong>
                <span>대표 이동한 · 부산광역시 남구 대연동 368-1</span>
                <span>등록번호 제26290-2019-00094호 · 051-612-5155</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── hooks ─────────────────────────────────────────────────────────────────────
function useReveal(thr = .1) {
  const [v, setV] = useState(false);
  const obsRef = useRef(null);
  const ref = useCallback(node => {
    if (obsRef.current) { obsRef.current.disconnect(); obsRef.current = null; }
    if (!node) return;
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setV(true); o.disconnect(); obsRef.current = null; }
    }, { threshold: thr });
    o.observe(node);
    obsRef.current = o;
  }, [thr]);
  return [ref, v];
}

function useCountUp(target, dur = 1600, active = false) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active || !target) return;
    let s = null;
    const step = ts => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / dur, 1);
      setN(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, active, dur]);
  return n;
}

function useHorzScroll() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = e => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return ref;
}

// ── components ────────────────────────────────────────────────────────────────
function Ornament() {
  return (
    <div className={styles.ornamentWrap}>
      <div className={styles.ornamentLine} />
      <div className={styles.ornamentDiamond} />
      <div className={styles.ornamentLine} />
    </div>
  );
}

function Card({ item, onClick }) {
  const cs = CATEGORY_COLORS[item.category] || { bg: '#f3f4f6', color: '#374151' };
  const ts = TX_COLORS[item.transaction]    || { bg: '#f3f4f6', color: '#374151' };
  const price = formatPrice(item);
  const chips = [];
  if (item.supply_area)    chips.push(`공급 ${item.supply_area}㎡`);
  if (item.exclusive_area) chips.push(`전용 ${item.exclusive_area}㎡`);
  if (item.curr_floor)     chips.push(item.total_floors ? `${item.curr_floor}/${item.total_floors}층` : `${item.curr_floor}층`);
  if (item.direction)      chips.push(`${item.direction}향`);
  if (item.rooms)          chips.push(`방 ${item.rooms}개`);
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardThumb}>
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" className={styles.cardImg} />
          : <div className={styles.cardPlaceholder}>🏠</div>}
        <div className={styles.cardBadges}>
          <span className={styles.cardBadge} style={{ background: cs.bg, color: cs.color }}>{item.category}</span>
          <span className={styles.cardBadge} style={{ background: ts.bg, color: ts.color }}>{item.transaction}</span>

        </div>
        {item.property_id && (
          <div className={styles.cardPropId}>{item.property_id}</div>
        )}
        {item.location && (
          <div className={styles.cardLocOverlay}>
            <span className={styles.cardLocPin}>📍</span> {item.location}
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardName}>
          {item.title ? item.title : item.building_name ? item.building_name : item.location ? item.location : null}
        </p>
        {price && <p className={styles.cardPrice} style={{ color: ts.color }}>{price}</p>}
        {(item.transaction === '전세' || item.transaction === '월세') && item.maintenance > 0 && (
          <p className={styles.cardMaintFee}>관리비 {fmtMan(item.maintenance)}원</p>
        )}
        {chips.length > 0 && (
          <div className={styles.cardChips}>
            {chips.map(c => <span key={c} className={styles.cardChip}>{c}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── constants ─────────────────────────────────────────────────────────────────
const HERO_IMGS = [
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=90&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&q=90&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1400&q=90&auto=format&fit=crop',
];
const CATS = ['아파트','오피스텔','단독주택','다가구','다세대','상가','토지','빌딩','오피스','공장/창고','원룸','재개발','분양'];

// ── main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [allItems, setAllItems]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [imgIdx, setImgIdx]         = useState(0);
  const [heroIn, setHeroIn]         = useState(false);

  useEffect(() => {
    fetch('/api/listings', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setAllItems(Array.isArray(data)
        ? data.filter(p => !p.contract_status || p.contract_status === '계약가능' || p.contract_status === '계약진행중')
        : []))
      .catch(() => setAllItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setImgIdx(i => (i + 1) % HERO_IMGS.length), 5200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleCardClick = useCallback(item => {
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

  const catScrollRef = useHorzScroll();
  const [featRef, featV] = useReveal(.08);
  const [catRef,  catV]  = useReveal(.1);
  const [latRef,  latV]  = useReveal(.06);
  const [popRef,  popV]  = useReveal(.06);
  const [recRef,  recV]  = useReveal(.06);
  const [ctaRef,  ctaV]  = useReveal();
  const [statRef, statV] = useReveal(.2);
  const cnt = useCountUp(allItems.length, 1600, statV);

  const catCounts = {};
  for (const item of allItems) catCounts[item.category] = (catCounts[item.category] || 0) + 1;

  return (
    <>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        {/* 사진 (60%) */}
        <div className={`${styles.heroRight} ${heroIn ? styles.heroRightIn : ''}`}>
          <div className={styles.heroImgWrap}>
            {HERO_IMGS.map((src, i) => (
              <img key={src} src={src} alt="" className={styles.heroImg}
                style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, opacity: i === imgIdx ? 1 : 0, transition: 'opacity 1.6s ease-in-out' }} />
            ))}
          </div>
          {/* 세로 스탯 */}
          <div className={styles.heroStatStrip} ref={statRef}>
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatN}>{statV ? cnt : '—'}+</span>
              <span className={styles.heroStatL}>등록 매물</span>
            </div>
            <div className={styles.heroStatDivH} />
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatN}>1:1</span>
              <span className={styles.heroStatL}>전담 상담</span>
            </div>
            <div className={styles.heroStatDivH} />
            <div className={styles.heroStatItem}>
              <span className={styles.heroStatN}>부산</span>
              <span className={styles.heroStatL}>전문 지역</span>
            </div>
          </div>
          {/* 슬라이더 도트 */}
          <div className={styles.heroDots}>
            {HERO_IMGS.map((_, i) => (
              <button key={i}
                className={`${styles.heroDot} ${i === imgIdx ? styles.heroDotActive : ''}`}
                onClick={() => setImgIdx(i)} />
            ))}
          </div>
          {/* 골드 프로그레스 바 */}
          <div className={styles.heroProgressTrack}>
            <div key={imgIdx} className={styles.heroProgressFill} />
          </div>
        </div>

        {/* 텍스트 (40%) */}
        <div className={`${styles.heroLeft} ${heroIn ? styles.heroLeftIn : ''}`}>
          <p className={styles.heroEye}>공인중개사 한민희</p>
          <h1 className={styles.heroH1}>
            <span className={styles.heroLine}><span className={`${styles.heroLineInner} ${styles.heroH1Gold}`}>친절한한부장</span></span>
            <span className={styles.heroLine}><em className={`${styles.heroLineInner} ${styles.heroH1Em}`}>친절한 중개를</em></span>
            <span className={styles.heroLine}><span className={styles.heroLineInner}>약속드립니다</span></span>
          </h1>
          <p className={styles.heroSub}>
            부산 남구·수영구 전문 공인중개사.<br />
            한민희 부장이 1:1로 최고의 부동산을 찾아드립니다.
          </p>
          <div className={styles.heroBtns}>
            <Link href="/properties" className={styles.heroBtnP}>매물 보기 →</Link>
            <Link href="/contact" className={styles.heroBtnS}>빠른 상담</Link>
          </div>
        </div>
      </section>

      {/* ── Featured + About ── */}
      {!loading && allItems.length >= 2 && (
        <section className={`${styles.featured} ${styles.rv} ${featV ? styles.in : ''}`} ref={featRef}>
          <div className={styles.featuredInner}>
            <div className={styles.featuredImgs}>
              {latestItems.slice(0, 2).map((item, i) => (
                <div key={item.id}
                  className={`${styles.featuredImgBox} ${i === 0 ? styles.featuredImgBoxMain : styles.featuredImgBoxSub}`}
                  onClick={() => handleCardClick(item)}>
                  <img src={item.imageUrl || [
                    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=85',
                    'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=500&q=80'
                  ][i]} alt="" className={styles.featuredImg} />
                  <div className={styles.featuredImgOverlay}>
                    <div className={styles.featuredImgMeta}>
                      <span className={styles.featuredCat}>{item.category}</span>
                      <span className={styles.featuredTx} style={{ background: TX_COLORS[item.transaction]?.bg, color: TX_COLORS[item.transaction]?.color }}>{item.transaction}</span>
                    </div>
                    <span className={styles.featuredPrice}>{formatPrice(item) || '가격 협의'}</span>
                    {item.building_name && <span className={styles.featuredName}>{item.building_name}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.featuredAbout}>
              <p className={styles.eye}>About us</p>
              <h2 className={styles.featuredTitle}>한결부동산<br />공인중개사사무소</h2>
              <p className={styles.featuredText}>부동산 전문가로서 아파트·상가·토지·빌딩까지 최적의 매물을 연결해 드립니다. 많은 연락 부탁드립니다.</p>
              <Link href="/about" className={styles.featuredBtn}>더 알아보기 →</Link>
            </div>
          </div>
        </section>
      )}

      <Ornament />

      {/* ── 카테고리 바 ── */}
      <div className={`${styles.catBar} ${styles.rv} ${catV ? styles.in : ''}`} ref={catRef}>
        <div className={styles.catBarInner} ref={catScrollRef}>
          <Link href="/properties" className={`${styles.catChip} ${styles.catChipActive}`}>
            <span className={styles.catChipName}>전체</span>
            <span className={styles.catChipCount}>{allItems.length}</span>
          </Link>
          {CATS.map(c => (
            <Link key={c} href={`/properties?category=${encodeURIComponent(c)}`} className={styles.catChip}>
              <span className={styles.catChipName}>{c}</span>
              {catCounts[c] > 0 && <span className={styles.catChipCount}>{catCounts[c]}</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* ── 최신 매물 ── */}
      {!loading && latestItems.length > 0 && (
        <section className={styles.listSection}>
          <div className={`${styles.listHead} ${styles.rv} ${latV ? styles.in : ''}`} ref={latRef}>
            <div><p className={styles.eye}>New Listings</p><h2 className={styles.sectionTitle}>최신 매물</h2></div>
            <Link href="/properties" className={styles.listMore}>전체 보기 →</Link>
          </div>
          <div className={styles.masonry}>
            {latestItems.slice(0, 8).map((item, i) => (
              <div key={item.id} className={styles.masonryItem}
                style={{ opacity: latV ? 1 : 0, transform: latV ? 'none' : 'translateY(20px)', transition: `opacity .6s ease ${i * 60}ms, transform .6s ease ${i * 60}ms` }}>
                <Card item={item} onClick={() => handleCardClick(item)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 인기 매물 ── */}
      {!loading && popularItems.length > 0 && (
        <section className={`${styles.listSection} ${styles.listSectionAlt}`}>
          <div className={`${styles.listHead} ${styles.rv} ${popV ? styles.in : ''}`} ref={popRef}>
            <div><p className={styles.eye}>Popular</p><h2 className={styles.sectionTitle}>인기 매물</h2></div>
            <Link href="/properties" className={styles.listMore}>전체 보기 →</Link>
          </div>
          <div className={styles.masonry}>
            {popularItems.slice(0, 8).map((item, i) => (
              <div key={item.id} className={styles.masonryItem}
                style={{ opacity: popV ? 1 : 0, transform: popV ? 'none' : 'translateY(20px)', transition: `opacity .6s ease ${i * 60}ms, transform .6s ease ${i * 60}ms` }}>
                <Card item={item} onClick={() => handleCardClick(item)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 추천 매물 ── */}
      {!loading && recommendedItems.length > 0 && (
        <section className={styles.listSection}>
          <div className={`${styles.listHead} ${styles.rv} ${recV ? styles.in : ''}`} ref={recRef}>
            <div><p className={styles.eye}>Recommended</p><h2 className={styles.sectionTitle}>추천 매물</h2></div>
            <Link href="/properties" className={styles.listMore}>전체 보기 →</Link>
          </div>
          <div className={styles.masonry}>
            {recommendedItems.slice(0, 8).map((item, i) => (
              <div key={item.id} className={styles.masonryItem}
                style={{ opacity: recV ? 1 : 0, transform: recV ? 'none' : 'translateY(20px)', transition: `opacity .6s ease ${i * 60}ms, transform .6s ease ${i * 60}ms` }}>
                <Card item={item} onClick={() => handleCardClick(item)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <Ornament />

      {/* ── CTA ── */}
      <section className={`${styles.cta} ${styles.rv} ${ctaV ? styles.in : ''}`} ref={ctaRef}>
        <div className={styles.ctaInner}>
          <p className={styles.eye}>Contact Us</p>
          <h2 className={styles.ctaTitle}>원하는 매물을 찾지<br />못하셨나요?</h2>
          <p className={styles.ctaSub}>친절한 한민희 부장에게 직접 상담을 요청하세요.<br />원하시는 조건에 딱 맞는 매물을 찾아드립니다.</p>
          <div className={styles.ctaBtns}>
            <a href="tel:010-4706-8253" className={styles.ctaCall}>📞 010-4706-8253</a>
            <a href="https://pf.kakao.com/_QaxliG" target="_blank" rel="noopener noreferrer" className={styles.ctaKakao}>
              <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" alt="" className={styles.ctaKakaoIcon} />카카오톡 상담
            </a>
            <Link href="/contact" className={styles.ctaContact}>온라인 문의 →</Link>
          </div>
        </div>
      </section>

      {selectedItem && <PreviewModal item={selectedItem} onClose={handleClose} />}
    </>
  );
}
