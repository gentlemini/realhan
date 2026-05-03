'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './SlideInDrawer.module.css';
import PropertyImageFallback from './PropertyImageFallback';

const KakaoMap = dynamic(() => import('./KakaoMap'), { ssr: false });

const mArr = (v) => Array.isArray(v) && v.length ? v.join(' · ') : null;

const TYPE_EXTRA_SPECS = {
  '아파트': [
    { label: '단지명', key: 'complexName', wide: true },
    { label: '동', key: 'unitDong' },
    { label: '호수', key: 'unitHo' },
    { label: '세대수', key: 'totalUnits', fmt: (v) => v ? `${v}세대` : null },
    { label: '동수', key: 'totalBuildings', fmt: (v) => v ? `${v}동` : null },
    { label: '브랜드', key: 'aptBrand' },
    { label: '난방방식', key: 'heatingType' },
    { label: '학군', key: 'schoolInfo', wide: true },
    { label: '교통정보', key: 'trafficInfo', wide: true },
    { label: '편의시설', key: 'communityItems', fmt: mArr, wide: true },
  ],
  '빌라': [
    { label: '건물 형태', key: 'buildingForm' },
    { label: '방수', key: 'rooms', fmt: (v) => v ? `${v}개` : null },
    { label: '욕실수', key: 'bathrooms', fmt: (v) => v ? `${v}개` : null },
    { label: '대지면적', key: 'landArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '건축면적', key: 'buildingArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '난방방식', key: 'heatingType' },
  ],
  '원룸': [
    { label: '구조', key: 'structure' },
    { label: '가전 옵션', key: 'optionsAppliances', fmt: mArr, wide: true },
    { label: '가구 옵션', key: 'optionsFurniture', fmt: mArr, wide: true },
    { label: '관리비 포함', key: 'maintenanceItems', fmt: mArr, wide: true },
  ],
  '원룸·투룸': [
    { label: '구조', key: 'structure' },
    { label: '가전 옵션', key: 'optionsAppliances', fmt: mArr, wide: true },
    { label: '가구 옵션', key: 'optionsFurniture', fmt: mArr, wide: true },
    { label: '관리비 포함', key: 'maintenanceItems', fmt: mArr, wide: true },
  ],
  '오피스텔': [
    { label: '건물명', key: 'buildingName' },
    { label: '호실', key: 'unitNumber' },
    { label: '업무/주거', key: 'officetelUsage' },
    { label: '주차대수', key: 'parkingCount', fmt: (v) => v ? `${v}대` : null },
    { label: '가전 옵션', key: 'optionsAppliances', fmt: mArr, wide: true },
    { label: '가구 옵션', key: 'optionsFurniture', fmt: mArr, wide: true },
    { label: '관리비 포함', key: 'maintenanceItems', fmt: mArr, wide: true },
  ],
  '주택·빌라': [
    { label: '건물 형태', key: 'buildingForm' },
    { label: '방수', key: 'rooms', fmt: (v) => v ? `${v}개` : null },
    { label: '욕실수', key: 'bathrooms', fmt: (v) => v ? `${v}개` : null },
    { label: '대지면적', key: 'landArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '건축면적', key: 'buildingArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '난방방식', key: 'heatingType' },
    { label: '건폐율', key: 'coverageRatio', fmt: (v) => v ? `${v}%` : null },
    { label: '용적률', key: 'floorAreaRatio', fmt: (v) => v ? `${v}%` : null },
  ],
  '토지': [
    { label: '지목', key: 'landCategory' },
    { label: '용도지역', key: 'zoneUse' },
    { label: '건폐율', key: 'coverageRatio', fmt: (v) => v ? `${v}%` : null },
    { label: '용적률', key: 'floorAreaRatio', fmt: (v) => v ? `${v}%` : null },
    { label: '형상', key: 'landShape' },
    { label: '지형', key: 'landTerrain' },
    { label: '개발 가능성·규제', key: 'developmentInfo', wide: true },
  ],
  '상가': [
    { label: '위치', key: 'shopLocation', wide: true },
    { label: '권리금액', key: 'premiumAmount', fmt: (v) => v ? `${v.toLocaleString()}만원` : null },
    { label: '업종 제한', key: 'businessRestriction', wide: true },
    { label: '전기용량', key: 'utilities' },
    { label: '유동인구·상권', key: 'footTrafficInfo', wide: true },
  ],
  '빌딩': [
    { label: '건물명', key: 'buildingName', wide: true },
    { label: '연면적', key: 'totalFloorArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '대지면적', key: 'buildingLandArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '지상층수', key: 'aboveGroundFloors', fmt: (v) => v ? `${v}층` : null },
    { label: '지하층수', key: 'undergroundFloors', fmt: (v) => v ? `${v}층` : null },
    { label: '주차대수', key: 'parkingCount', fmt: (v) => v ? `${v}대` : null },
    { label: '엘리베이터', key: 'elevatorCount', fmt: (v) => v ? `${v}대` : null },
    { label: '임대현황', key: 'leaseStatus', wide: true },
  ],
  '건물': [
    { label: '건물 형태', key: 'buildingForm' },
    { label: '건축 구조', key: 'buildingStructure' },
    { label: '대지면적', key: 'landArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '건축면적', key: 'buildingArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '연면적', key: 'totalFloorArea', fmt: (v) => v ? `${v}㎡` : null },
    { label: '임대현황', key: 'leaseStatus', wide: true },
  ],
};

export default function SlideInDrawer({ isOpen, onClose, property }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    setImgIndex(0);
    setDetail(null);
    if (property?.id) {
      fetch(`/api/properties/${property.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setDetail(d))
        .catch(() => {});
    }
  }, [property?.id]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!property) return null;

  // 서브DB 데이터가 로드되면 병합, 아니면 기본 데이터 사용
  const prop = detail ? { ...property, ...detail } : property;

  const allImages = [
    ...(prop.imageUrl ? [prop.imageUrl] : []),
    ...(prop.imageUrls || []).filter((u) => u && u !== prop.imageUrl),
  ];
  const currentImage = allImages[imgIndex] || null;

  const commonSpecs = [
    { label: '공급면적', value: prop.area ? `${prop.area}㎡` : null },
    { label: '전용면적', value: prop.exclusiveArea ? `${prop.exclusiveArea}㎡` : null },
    { label: '해당층 / 전체층', value: prop.currentFloor ? `${prop.currentFloor}층 / ${prop.totalFloors || '-'}층` : null },
    { label: '방향', value: prop.direction },
    { label: '주차', value: prop.totalParking },
    { label: '관리비', value: prop.maintenanceFee ? `${prop.maintenanceFee.toLocaleString()}만원` : null },
    { label: '엘리베이터', value: prop.hasElevator ? '있음' : null },
    { label: '입주가능일', value: prop.occupancyDate },
    { label: '준공년도', value: prop.approvalDate },
    { label: '주소', value: prop.address },
  ].filter((s) => s.value);

  const typeSpecDefs = TYPE_EXTRA_SPECS[prop.type] || [];
  const typeSpecs = typeSpecDefs
    .map(({ label, key, fmt, wide }) => {
      const raw = prop[key];
      const value = fmt ? fmt(raw) : (raw || null);
      return value ? { label, value, wide } : null;
    })
    .filter(Boolean);

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
        onClick={onClose}
      />

      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.modal}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>

          <div className={styles.body}>
            {/* 좌측: 갤러리 */}
            <div className={styles.galleryCol}>
              <div className={styles.gallery}>
                {currentImage ? (
                  <img src={currentImage} alt={property.name} className={styles.galleryImg} />
                ) : (
                  <div className={styles.galleryFallback}><PropertyImageFallback /></div>
                )}
                {allImages.length > 1 && (
                  <>
                    <button
                      className={`${styles.galleryArrow} ${styles.galleryArrowPrev}`}
                      onClick={() => setImgIndex((i) => (i - 1 + allImages.length) % allImages.length)}
                      aria-label="이전"
                    >
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 4L7 11L14 18" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className={`${styles.galleryArrow} ${styles.galleryArrowNext}`}
                      onClick={() => setImgIndex((i) => (i + 1) % allImages.length)}
                      aria-label="다음"
                    >
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 4L15 11L8 18" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className={styles.galleryCount}>{imgIndex + 1} / {allImages.length}</span>
                  </>
                )}
              </div>

              {allImages.length > 1 && (
                <div className={styles.thumbnails}>
                  {allImages.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`사진 ${i + 1}`}
                      className={`${styles.thumb} ${i === imgIndex ? styles.thumbActive : ''}`}
                      onClick={() => setImgIndex(i)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 우측: 정보 */}
            <div className={styles.infoCol}>
              {prop.address && !prop.mapHidden && (
                <div className={styles.mapWrap}>
                  <KakaoMap address={prop.address} radius={3} level={3} />
                </div>
              )}
              {prop.mapHidden && (
                <div className={styles.mapHiddenBox}>
                  <span className={styles.mapHiddenIcon}>📍</span>
                  <p className={styles.mapHiddenText}>정확한 위치는 상담 후 안내드립니다</p>
                  {prop.address && <p className={styles.mapHiddenAddr}>{prop.address}</p>}
                </div>
              )}
              <div className={styles.infoBody}>
              {prop.propertyNumber && (
                <p className={styles.propNumber}>{prop.propertyNumber}</p>
              )}
              <h2 className={styles.propName}>{prop.name || '매물 상세'}</h2>

              <div className={styles.tags}>
                {prop.type && <span className={styles.tag}>{prop.type}</span>}
                {prop.transactionType?.map((t) => (
                  <span key={t} className={styles.tag}>{t}</span>
                ))}
              </div>

              <div className={styles.price}>
                <p className={styles.priceLabel}>매물 가격</p>
                <div className={styles.priceBadges}>
                  {prop.price > 0 && (
                    <span className={`${styles.priceBadge} ${styles.priceBadgeAccent}`}>
                      매매 {prop.price.toLocaleString()}만원
                    </span>
                  )}
                  {prop.deposit > 0 && (
                    <span className={`${styles.priceBadge} ${styles.priceBadgeAccent}`}>
                      보증금 {prop.deposit.toLocaleString()}만원
                    </span>
                  )}
                  {prop.monthlyRent > 0 && (
                    <span className={`${styles.priceBadge} ${styles.priceBadgeSub}`}>
                      월세 {prop.monthlyRent.toLocaleString()}만원
                    </span>
                  )}
                  {prop.maintenanceFee > 0 && (
                    <span className={`${styles.priceBadge} ${styles.priceBadgeMuted}`}>
                      관리비 {prop.maintenanceFee.toLocaleString()}만원
                    </span>
                  )}
                  {prop.price === 0 && prop.deposit === 0 && prop.monthlyRent === 0 && (
                    <span className={`${styles.priceBadge} ${styles.priceBadgeMuted}`}>가격 협의</span>
                  )}
                </div>
              </div>

              {commonSpecs.length > 0 && (
                <div className={styles.specGrid}>
                  {commonSpecs.map((s) => (
                    <div key={s.label} className={styles.specItem}>
                      <p className={styles.specLabel}>{s.label}</p>
                      <p className={styles.specValue}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {typeSpecs.length > 0 && (
                <>
                  <p className={styles.sectionTitle}>{prop.type} 상세정보</p>
                  <div className={styles.specGrid}>
                    {typeSpecs.map((s) => (
                      <div key={s.label} className={`${styles.specItem} ${s.wide ? styles.specItemWide : ''}`}>
                        <p className={styles.specLabel}>{s.label}</p>
                        <p className={styles.specValue}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {prop.features && (
                <div className={styles.features}>
                  <p className={styles.featuresTitle}>매물 특징</p>
                  <div className={styles.featureTags}>
                    {prop.features.split(/[,\n]/).map((f, i) => {
                      const text = f.trim();
                      return text ? <span key={i} className={styles.featureTag}>{text}</span> : null;
                    })}
                  </div>
                </div>
              )}

              {prop.blogUrl && (
                <a
                  href={prop.blogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.blogLink}
                >
                  📝 네이버 블로그에서 자세히 보기 →
                </a>
              )}

              <div className={styles.footer}>
                <a
                  href="https://pf.kakao.com/_QaxliG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.callBtn}
                >
                  💬 카카오톡 상담
                </a>
                <Link href="/contact" className={styles.inquiryBtn} onClick={onClose}>
                  ✉ 문의 남기기
                </Link>
              </div>

              <div className={styles.agentCard}>
                <div className={styles.agentInfo}>
                  <span className={styles.agentLabel}>담당 공인중개사</span>
                  <strong className={styles.agentName}>한민희 부장</strong>
                </div>
                <a href="tel:010-4706-8253" className={styles.agentCall}>
                  📞 010-4706-8253
                </a>
              </div>

              <div className={styles.officeFooter}>
                <strong className={styles.officeFooterName}>한결부동산</strong>
                <p>한결부동산공인중개사사무소 · 대표 이동한</p>
                <p>부산광역시 남구 대연동 · 등록번호 제26290-2019-00094호</p>
                <p>☎ 051-612-5155</p>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
