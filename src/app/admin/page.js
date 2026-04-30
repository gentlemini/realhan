'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './admin.module.css';

const DEFAULT_PW = '1234';
const PW_KEY = 'hk_admin_pw';

const PROPERTY_TYPES = [
  { id: 'residential_sale', label: '주거 매매', icon: '🏠', group: 'residential', mode: 'sale' },
  { id: 'residential_rent', label: '주거 임대', icon: '🏡', group: 'residential', mode: 'rent' },
  { id: 'commercial_sale', label: '상가 매매', icon: '🏪', group: 'commercial', mode: 'commercial_sale' },
  { id: 'commercial_rent', label: '상가 임대', icon: '🏬', group: 'commercial', mode: 'commercial_rent' },
  { id: 'building_sale', label: '빌딩 매매', icon: '🏢', group: 'building', mode: 'sale' },
  { id: 'land_sale', label: '토지 매매', icon: '🌱', group: 'land', mode: 'sale' },
  { id: 'land_rent', label: '토지 임대', icon: '🌿', group: 'land', mode: 'rent' },
];

const BLANK_FORM = {
  name: '', type: '', transactionType: [], address: '', area: '',
  exclusiveArea: '', totalFloors: '', currentFloor: '', direction: '',
  price: '', deposit: '', monthlyRent: '', maintenanceFee: '',
  imageUrl: '', imageUrls: [], features: '', blogUrl: '', isExposed: true,
  isRecommended: false, mapHidden: false, status: 'Available', approvalDate: '',
  occupancyDate: '', totalParking: '', hasElevator: false, isRemodeled: false,
  // 아파트
  complexName: '', unitDong: '', unitHo: '', totalUnits: '', totalBuildings: '',
  heatingType: '', aptBrand: '', schoolInfo: '', trafficInfo: '',
  communityItems: [],
  // 원룸·투룸 / 오피스텔
  structure: '', officetelUsage: '', unitNumber: '',
  optionsAppliances: [], optionsFurniture: [], maintenanceItems: [],
  // 주택·빌라 / 건물
  buildingForm: '', rooms: '', bathrooms: '', landArea: '', buildingArea: '',
  buildingStructure: '',
  // 토지
  landCategory: '', zoneUse: '', coverageRatio: '', floorAreaRatio: '',
  hasRoadAccess: false, landShape: '', landTerrain: '', developmentInfo: '',
  // 상가
  shopLocation: '', hasPremium: false, premiumAmount: '', leaseTerms: '',
  businessRestriction: '', utilities: '', footTrafficInfo: '',
  // 빌딩 / 건물
  buildingName: '', totalFloorArea: '', buildingLandArea: '',
  aboveGroundFloors: '', undergroundFloors: '', leaseStatus: '',
  parkingCount: '', elevatorCount: '', maintenanceFeeStructure: '', mainTenants: '',
};

const RESIDENTIAL_SUBTYPES = ['아파트', '빌라', '원룸·투룸', '오피스텔', '주택·빌라'];

const RESIDENTIAL_SUBTYPE_ICONS = {
  '아파트': '🏢', '빌라': '🏘️', '원룸·투룸': '🛏️', '오피스텔': '🏙️', '주택·빌라': '🏡',
};

const TYPE_SPECIFIC_FIELDS = {
  '아파트': {
    title: '아파트 상세정보',
    fields: [
      { label: '단지명', key: 'complexName', type: 'text', placeholder: '○○아파트', wide: true },
      { label: '동', key: 'unitDong', type: 'text', placeholder: '101동' },
      { label: '호수', key: 'unitHo', type: 'text', placeholder: '1205호' },
      { label: '세대수', key: 'totalUnits', type: 'number', placeholder: '300' },
      { label: '동수', key: 'totalBuildings', type: 'number', placeholder: '5' },
      { label: '브랜드', key: 'aptBrand', type: 'select', options: ['래미안', '힐스테이트', '자이', '푸르지오', 'e편한세상', '롯데캐슬', '더샵', '기타'] },
      { label: '난방방식', key: 'heatingType', type: 'select', options: ['개별난방', '중앙난방', '지역난방'] },
      { label: '학군', key: 'schoolInfo', type: 'text', placeholder: '○○초 도보 5분', wide: true },
      { label: '교통정보', key: 'trafficInfo', type: 'text', placeholder: '지하철 2호선 10분', wide: true },
      { label: '편의시설', key: 'communityItems', type: 'multiselect', options: ['마트', '병원', '공원', '학원가', '은행', '지하철'], wide: true },
    ],
  },
  '빌라': {
    title: '빌라 상세정보',
    fields: [
      { label: '건물 형태', key: 'buildingForm', type: 'select', options: ['다세대', '연립', '빌라'] },
      { label: '방수', key: 'rooms', type: 'number', placeholder: '2' },
      { label: '욕실수', key: 'bathrooms', type: 'number', placeholder: '1' },
      { label: '대지면적 (㎡)', key: 'landArea', type: 'number', placeholder: '150' },
      { label: '건축면적 (㎡)', key: 'buildingArea', type: 'number', placeholder: '120' },
      { label: '난방방식', key: 'heatingType', type: 'select', options: ['개별난방', '중앙난방', '기름보일러'] },
    ],
  },
  '원룸·투룸': {
    title: '원룸·투룸 상세정보',
    fields: [
      { label: '구조', key: 'structure', type: 'select', options: ['원룸', '투룸', '쓰리룸', '복층', '반지하', '고시원형'] },
      { label: '가전 옵션', key: 'optionsAppliances', type: 'multiselect', options: ['에어컨', '냉장고', '세탁기', '전자레인지', 'TV', '전기레인지', '건조기'], wide: true },
      { label: '가구 옵션', key: 'optionsFurniture', type: 'multiselect', options: ['침대', '소파', '책상', '옷장', '신발장', '식탁'], wide: true },
      { label: '관리비 포함', key: 'maintenanceItems', type: 'multiselect', options: ['인터넷', '수도', '전기', '가스', '청소'], wide: true },
    ],
  },
  '오피스텔': {
    title: '오피스텔 상세정보',
    fields: [
      { label: '건물명', key: 'buildingName', type: 'text', placeholder: '○○타워' },
      { label: '호실', key: 'unitNumber', type: 'text', placeholder: '1201호' },
      { label: '업무/주거 구분', key: 'officetelUsage', type: 'select', options: ['주거용', '업무용', '겸용'] },
      { label: '주차대수', key: 'parkingCount', type: 'number', placeholder: '1' },
      { label: '가전 옵션', key: 'optionsAppliances', type: 'multiselect', options: ['에어컨', '냉장고', '세탁기', '전자레인지', 'TV'], wide: true },
      { label: '가구 옵션', key: 'optionsFurniture', type: 'multiselect', options: ['침대', '책상', '옷장'], wide: true },
      { label: '관리비 포함', key: 'maintenanceItems', type: 'multiselect', options: ['인터넷', '수도', '전기', '가스', '청소'], wide: true },
    ],
  },
  '주택·빌라': {
    title: '주택·빌라 상세정보',
    fields: [
      { label: '건물 형태', key: 'buildingForm', type: 'select', options: ['단독주택', '다세대', '빌라', '다가구'] },
      { label: '방수', key: 'rooms', type: 'number', placeholder: '3' },
      { label: '욕실수', key: 'bathrooms', type: 'number', placeholder: '2' },
      { label: '대지면적 (㎡)', key: 'landArea', type: 'number', placeholder: '200' },
      { label: '건축면적 (㎡)', key: 'buildingArea', type: 'number', placeholder: '150' },
      { label: '난방방식', key: 'heatingType', type: 'select', options: ['개별난방', '중앙난방', '기름보일러'] },
      { label: '건폐율 (%)', key: 'coverageRatio', type: 'number', placeholder: '60' },
      { label: '용적률 (%)', key: 'floorAreaRatio', type: 'number', placeholder: '200' },
    ],
  },
  '토지': {
    title: '토지 상세정보',
    fields: [
      { label: '지목', key: 'landCategory', type: 'select', options: ['대지', '전', '답', '임야', '공장', '창고', '도로', '기타'] },
      { label: '용도지역', key: 'zoneUse', type: 'select', options: ['1종주거', '2종주거', '3종주거', '준주거', '상업', '공업', '녹지', '관리'] },
      { label: '건폐율 (%)', key: 'coverageRatio', type: 'number', placeholder: '60' },
      { label: '용적률 (%)', key: 'floorAreaRatio', type: 'number', placeholder: '200' },
      { label: '형상', key: 'landShape', type: 'select', options: ['정방형', '장방형', '세장형', '부정형', '삼각형'] },
      { label: '지형', key: 'landTerrain', type: 'select', options: ['평지', '완경사', '급경사'] },
      { label: '도로 접면 여부', key: 'hasRoadAccess', type: 'checkbox' },
      { label: '개발 가능성·규제사항', key: 'developmentInfo', type: 'textarea', placeholder: '자연녹지지역, 개발행위허가 필요...', wide: true },
    ],
  },
  '상가': {
    title: '상가 상세정보',
    fields: [
      { label: '위치 (건물명·층·호수)', key: 'shopLocation', type: 'text', placeholder: '○○빌딩 2층 201호', wide: true },
      { label: '권리금 여부', key: 'hasPremium', type: 'checkbox' },
      { label: '권리금액 (만원)', key: 'premiumAmount', type: 'number', placeholder: '3000' },
      { label: '임대 조건', key: 'leaseTerms', type: 'text', placeholder: '2년 계약, 인상 5%', wide: true },
      { label: '업종 제한', key: 'businessRestriction', type: 'text', placeholder: '음식점 가능, 유흥업소 불가', wide: true },
      { label: '전기·가스·상하수도', key: 'utilities', type: 'text', placeholder: '3상 전기 인입', wide: true },
      { label: '유동인구·상권분석', key: 'footTrafficInfo', type: 'textarea', placeholder: '유동인구 많음, 주변 상권 활성화...', wide: true },
    ],
  },
  '빌딩': {
    title: '빌딩 상세정보',
    fields: [
      { label: '건물명', key: 'buildingName', type: 'text', placeholder: '○○빌딩', wide: true },
      { label: '연면적 (㎡)', key: 'totalFloorArea', type: 'number', placeholder: '2000' },
      { label: '대지면적 (㎡)', key: 'buildingLandArea', type: 'number', placeholder: '500' },
      { label: '지상층수', key: 'aboveGroundFloors', type: 'number', placeholder: '10' },
      { label: '지하층수', key: 'undergroundFloors', type: 'number', placeholder: '2' },
      { label: '주차대수', key: 'parkingCount', type: 'number', placeholder: '30' },
      { label: '엘리베이터수', key: 'elevatorCount', type: 'number', placeholder: '2' },
      { label: '임대현황', key: 'leaseStatus', type: 'textarea', placeholder: '1층: 은행, 2층: 병원 (공실 없음)', wide: true },
      { label: '관리비 구조', key: 'maintenanceFeeStructure', type: 'text', placeholder: '층당 ○○만원', wide: true },
      { label: '주요 임차 업종', key: 'mainTenants', type: 'text', placeholder: '은행, 병원, 학원', wide: true },
    ],
  },
  '건물': {
    title: '건물 상세정보',
    fields: [
      { label: '건물 형태', key: 'buildingForm', type: 'select', options: ['상가주택', '다가구주택', '창고', '공장', '기타'] },
      { label: '건축 구조', key: 'buildingStructure', type: 'select', options: ['철근콘크리트', '철골조', '벽돌조', '목조'] },
      { label: '대지면적 (㎡)', key: 'landArea', type: 'number', placeholder: '300' },
      { label: '건축면적 (㎡)', key: 'buildingArea', type: 'number', placeholder: '250' },
      { label: '연면적 (㎡)', key: 'totalFloorArea', type: 'number', placeholder: '500' },
      { label: '임대현황', key: 'leaseStatus', type: 'textarea', placeholder: '1층: 상가, 2~3층: 주거', wide: true },
    ],
  },
};

function fmtPrice(p) {
  if (p.price > 0) return `매매 ${p.price.toLocaleString()}만`;
  if (p.deposit > 0 && p.monthlyRent > 0) return `보증금 ${p.deposit.toLocaleString()} / 월 ${p.monthlyRent.toLocaleString()}만`;
  if (p.deposit > 0) return `전세 ${p.deposit.toLocaleString()}만`;
  return '-';
}

export default function AdminPage({ noAuth = false }) {
  const [authed, setAuthed] = useState(noAuth);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  const [tab, setTab] = useState(0);
  const [editProp, setEditProp] = useState(null);

  // 페이지 이탈 시 자동 로그아웃
  useEffect(() => {
    const logout = () => setAuthed(false);
    // 다른 탭/창으로 전환 시
    document.addEventListener('visibilitychange', logout);
    // 브라우저 탭/창 닫기 또는 다른 URL로 이동 시
    window.addEventListener('pagehide', logout);
    return () => {
      document.removeEventListener('visibilitychange', logout);
      window.removeEventListener('pagehide', logout);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const stored = localStorage.getItem(PW_KEY) || DEFAULT_PW;
    if (pwInput === stored) {
      setAuthed(true);
    } else {
      setPwError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleLogout = () => {
    setAuthed(false);
    setPwInput('');
  };

  const NAV = [
    { icon: '＋', label: '매물 등록' },
    { icon: '🔍', label: '매물 검색' },
    { icon: '☰', label: '전체 매물' },
    { icon: '⚙', label: '설정' },
  ];

  const PAGE_TITLES = ['매물 등록', '매물 검색', '전체 매물', '설정'];

  if (!authed) {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginBox}>
          <div className={styles.loginLogo}>
            <span className={styles.loginLogoHan}>한결</span>
            <span className={styles.loginLogoReal}>부동산</span>
          </div>
          <p className={styles.loginSub}>관리자 로그인</p>
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError(''); }}
              placeholder="비밀번호 입력"
              className={styles.loginInput}
              autoFocus
            />
            {pwError && <p className={styles.loginError}>{pwError}</p>}
            <button type="submit" className={styles.loginBtn}>로그인</button>
          </form>
          <p className={styles.loginHint}>기본 비밀번호: 1234</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarLogo}>
            <span className={styles.logoHan}>한결</span>
            <span className={styles.logoReal}>부동산</span>
          </div>
          <p className={styles.logoLabel}>관리자</p>
        </div>
        <nav className={styles.sidebarNav}>
          {NAV.map((n, i) => (
            <button
              key={i}
              className={`${styles.navItem} ${tab === i ? styles.navItemActive : ''}`}
              onClick={() => setTab(i)}
            >
              <span className={styles.navIcon}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <span className={styles.navIcon}>↩</span>
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <h2 className={styles.pageTitle}>{editProp && tab === 0 ? `수정 — ${editProp.name}` : PAGE_TITLES[tab]}</h2>
        </div>
        <div className={styles.mainBody}>
          {tab === 0 && <RegisterTab editProp={editProp} onEditDone={() => { setEditProp(null); }} />}
          {tab === 1 && <SearchTab />}
          {tab === 2 && <AllPropertiesTab onEdit={(prop) => { setEditProp(prop); setTab(0); }} />}
          {tab === 3 && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

/* ──────────────── TAB 0: 매물 등록 / 수정 ──────────────── */
function RegisterTab({ editProp, onEditDone }) {
  const isEdit = !!editProp;

  const detectKind = (p) => {
    const tx = p.transactionType || [];
    const t = p.type || '';
    const isSale = tx.includes('매매');
    if (t === '빌딩') return 'building_sale';
    if (t === '토지') return isSale ? 'land_sale' : 'land_rent';
    if (t === '상가') return isSale ? 'commercial_sale' : 'commercial_rent';
    return isSale ? 'residential_sale' : 'residential_rent';
  };

  const [kind, setKind] = useState(() => isEdit ? detectKind(editProp) : '');
  const [form, setForm] = useState(() => isEdit ? { ...BLANK_FORM, ...editProp } : BLANK_FORM);
  const [filePreviews, setFilePreviews] = useState([]);
  const [repIdx, setRepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleTypeSelect = (t) => {
    setKind(t.id);
    const txMap = {
      sale: ['매매'], rent: ['월세'], commercial_sale: ['매매'],
      commercial_rent: ['임대'],
    };
    set('transactionType', txMap[t.mode] || []);
    set('type', {
      residential_sale: '아파트', residential_rent: '원룸',
      commercial_sale: '상가', commercial_rent: '상가',
      building_sale: '빌딩', land_sale: '토지', land_rent: '토지',
    }[t.id] || '');
  };

  const resizeImage = (file, maxPx = 1920, quality = 0.85) =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxPx && height <= maxPx) { resolve(file); return; }
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else { width = Math.round(width * maxPx / height); height = maxPx; }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
      };
      img.src = url;
    });

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 10 - filePreviews.length;
    const sliced = files.slice(0, remaining);
    const toAdd = await Promise.all(
      sliced.map(async (file) => {
        const resized = await resizeImage(file);
        return { preview: URL.createObjectURL(resized), file: resized };
      })
    );
    setFilePreviews((prev) => [...prev, ...toAdd]);
    e.target.value = '';
  };

  const removePreview = (idx) => {
    setFilePreviews((prev) => prev.filter((_, i) => i !== idx));
    setRepIdx((prev) => (prev >= idx && prev > 0 ? prev - 1 : prev === idx ? 0 : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setMsg('❌ 물건명칭을 입력해주세요.');
      return;
    }
    setSaving(true);
    setMsg('');

    let uploadedUrls = [];
    if (filePreviews.length > 0) {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (cloud && preset && cloud !== 'your_cloud_name') {
        setMsg('📤 사진 업로드 중...');
        for (const { file } of filePreviews) {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('upload_preset', preset);
          try {
            const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: fd });
            if (r.ok) { const d = await r.json(); uploadedUrls.push(d.secure_url); }
          } catch {}
        }
      } else {
        setMsg('⚠️ Cloudinary 미설정 — 사진 없이 저장됩니다.');
      }
    }

    try {
      const existingUrls = isEdit ? (editProp.imageUrls || []) : [];
      const mergedUrls = [...uploadedUrls, ...existingUrls.filter((u) => !uploadedUrls.includes(u))];
      const payload = {
        ...form,
        imageUrls: mergedUrls.length > 0 ? mergedUrls : (isEdit ? existingUrls : []),
        imageUrl: uploadedUrls[repIdx] || uploadedUrls[0] || form.imageUrl,
      };
      [
        'area', 'exclusiveArea', 'totalFloors', 'price', 'deposit', 'monthlyRent', 'maintenanceFee',
        'totalUnits', 'totalBuildings', 'rooms', 'bathrooms', 'landArea', 'buildingArea',
        'coverageRatio', 'floorAreaRatio', 'premiumAmount',
        'totalFloorArea', 'buildingLandArea', 'aboveGroundFloors', 'undergroundFloors',
        'parkingCount', 'elevatorCount',
      ].forEach((k) => {
        payload[k] = payload[k] ? Number(payload[k]) : 0;
      });
      const url = isEdit ? `/api/properties/${editProp.id}` : '/api/properties';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMsg(isEdit ? '✅ 수정되었습니다.' : '✅ 매물이 등록되었습니다.');
        if (!isEdit) {
          setForm(BLANK_FORM);
          setKind('');
          setFilePreviews([]);
          setRepIdx(0);
        } else {
          if (onEditDone) onEditDone();
        }
      } else {
        const err = await res.json();
        setMsg(`❌ 오류: ${err.error || '저장 실패'}`);
      }
    } catch (err) {
      setMsg(`❌ 오류: ${err.message}`);
    }
    setSaving(false);
  };

  const showPrice = isEdit
    ? (form.transactionType || []).includes('매매')
    : kind && ['residential_sale', 'building_sale', 'land_sale', 'commercial_sale'].includes(kind);
  const showRent = isEdit
    ? (form.transactionType || []).some((t) => ['전세', '월세', '임대'].includes(t))
    : kind && ['residential_rent', 'commercial_rent', 'land_rent'].includes(kind);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {isEdit ? (
        <div className={styles.formCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1c1917' }}>{editProp.name} 수정</span>
            <button type="button" onClick={onEditDone} style={{ fontSize: '0.78rem', color: '#78716c', background: 'none', border: '1px solid #e5e0d8', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>← 목록으로</button>
          </div>
        </div>
      ) : (
        <div className={`${styles.formCard} ${styles.kindCard}`}>
          <p className={styles.kindStepTitle}>
            <span className={styles.kindStepBadge}>1</span>
            매물 종류 선택
          </p>
          <div className={styles.kindGrid}>
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.kindBtn} ${kind === t.id ? styles.kindBtnActive : ''}`}
                onClick={() => handleTypeSelect(t)}
              >
                <span className={styles.kindBtnIcon}>{t.icon}</span>
                <span className={styles.kindBtnLabel}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isEdit && (kind === 'residential_sale' || kind === 'residential_rent') && (
        <div className={`${styles.formCard} ${styles.kindCard}`}>
          <p className={styles.kindStepTitle}>
            <span className={styles.kindStepBadge}>2</span>
            주거 유형 선택
          </p>
          <div className={styles.kindGrid}>
            {RESIDENTIAL_SUBTYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.kindBtn} ${form.type === t ? styles.kindBtnActive : ''}`}
                onClick={() => set('type', t)}
              >
                <span className={styles.kindBtnIcon}>{RESIDENTIAL_SUBTYPE_ICONS[t]}</span>
                <span className={styles.kindBtnLabel}>{t}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(kind || isEdit) && (
        <>
          {/* 기본 정보 */}
          <div className={`${styles.formCard} ${styles.cardBlue}`}>
            <p className={styles.formCardTitle}>
              <span className={`${styles.formCardDot} ${styles.dotBlue}`} />
              기본 정보
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={styles.row21}>
                <FormField label="물건명칭 *">
                  <input className={styles.input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="예: 대연동 파크푸르지오 34평" required />
                </FormField>
                <FormField label="물건 종류">
                  <input className={styles.input} value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="아파트" />
                </FormField>
              </div>
              <div className={styles.row3}>
                <div style={{ gridColumn: 'span 2' }}>
                  <FormField label="주소">
                    <input className={styles.input} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="부산광역시 남구 대연동..." />
                  </FormField>
                </div>
                <FormField label="거래유형">
                  <select className={styles.select} value={(form.transactionType || [])[0] || ''} onChange={(e) => set('transactionType', e.target.value ? [e.target.value] : [])}>
                    <option value="">선택</option>
                    {['매매', '전세', '월세', '임대'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
          </div>

          {/* 면적 / 층 */}
          <div className={`${styles.formCard} ${styles.cardGreen}`}>
            <p className={styles.formCardTitle}>
              <span className={`${styles.formCardDot} ${styles.dotGreen}`} />
              면적 · 층 · 방향
            </p>
            <div className={styles.row4}>
              <FormField label="공급면적 ㎡">
                <input type="number" className={styles.input} value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="84" />
              </FormField>
              <FormField label="전용면적 ㎡">
                <input type="number" className={styles.input} value={form.exclusiveArea} onChange={(e) => set('exclusiveArea', e.target.value)} placeholder="72" />
              </FormField>
              <FormField label="해당층">
                <input className={styles.input} value={form.currentFloor} onChange={(e) => set('currentFloor', e.target.value)} placeholder="12" />
              </FormField>
              <FormField label="전체층수">
                <input type="number" className={styles.input} value={form.totalFloors} onChange={(e) => set('totalFloors', e.target.value)} placeholder="20" />
              </FormField>
              <FormField label="방향">
                <select className={styles.select} value={form.direction} onChange={(e) => set('direction', e.target.value)}>
                  <option value="">선택</option>
                  {['남향', '남동향', '남서향', '동향', '서향', '북향'].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </FormField>
              <FormField label="주차">
                <select className={styles.select} value={form.totalParking} onChange={(e) => set('totalParking', e.target.value)}>
                  <option value="">선택</option>
                  <option value="가능">가능</option>
                  <option value="불가">불가</option>
                  <option value="조건부가능">조건부</option>
                </select>
              </FormField>
              <FormField label="준공년도">
                <input type="number" className={styles.input} value={form.approvalDate} onChange={(e) => set('approvalDate', e.target.value)} placeholder="2015" />
              </FormField>
              <FormField label="입주가능일">
                <input className={styles.input} value={form.occupancyDate} onChange={(e) => set('occupancyDate', e.target.value)} placeholder="즉시" />
              </FormField>
            </div>
          </div>

          {/* 가격 */}
          <div className={`${styles.formCard} ${styles.cardAmber}`}>
            <p className={styles.formCardTitle}>
              <span className={`${styles.formCardDot} ${styles.dotAmber}`} />
              가격 정보
            </p>
            {showPrice && (
              <div className={styles.row4}>
                <div style={{ gridColumn: 'span 2' }}>
                  <FormField label="매매가 (만원)">
                    <input type="number" className={styles.input} value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="55000" />
                  </FormField>
                </div>
              </div>
            )}
            {showRent && (
              <div className={styles.row3}>
                <FormField label="보증금 (만원)">
                  <input type="number" className={styles.input} value={form.deposit} onChange={(e) => set('deposit', e.target.value)} placeholder="1000" />
                </FormField>
                <FormField label="월세 (만원)">
                  <input type="number" className={styles.input} value={form.monthlyRent} onChange={(e) => set('monthlyRent', e.target.value)} placeholder="65" />
                </FormField>
                <FormField label="관리비 (만원)">
                  <input type="number" className={styles.input} value={form.maintenanceFee} onChange={(e) => set('maintenanceFee', e.target.value)} placeholder="10" />
                </FormField>
              </div>
            )}
            {!showPrice && !showRent && <p style={{ fontSize: '0.8rem', color: '#b0a898' }}>매물 종류 선택 후 자동으로 표시됩니다.</p>}
          </div>

          {/* 사진 */}
          <div className={`${styles.formCard} ${styles.cardPurple}`}>
            <p className={styles.formCardTitle}>
              <span className={`${styles.formCardDot} ${styles.dotPurple}`} />
              사진 {filePreviews.length > 0 && <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{filePreviews.length}/10</span>}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={styles.uploadArea}>
                <label className={styles.uploadBtn} style={{ background: '#8b5cf6' }}>
                  📷 사진 추가
                  <input type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} disabled={filePreviews.length >= 10} />
                </label>
                {filePreviews.length === 0 && <p className={styles.uploadHint}>최대 10장 · 첫번째 클릭 = 대표사진</p>}
              </div>
              {filePreviews.length > 0 && (
                <div className={styles.photoGrid}>
                  {filePreviews.map(({ preview }, idx) => (
                    <div key={idx} className={`${styles.photoItem} ${idx === repIdx ? styles.photoItemActive : ''}`} onClick={() => setRepIdx(idx)}>
                      <img src={preview} alt={`사진 ${idx + 1}`} className={styles.photoImg} />
                      {idx === repIdx && <div className={styles.photoBadge}>대표</div>}
                      <button type="button" className={styles.photoDelete} onClick={(e) => { e.stopPropagation(); removePreview(idx); }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 유형별 상세 */}
          {TYPE_SPECIFIC_FIELDS[form.type] && (
            <div className={`${styles.formCard} ${styles.cardBrown}`}>
              <p className={styles.formCardTitle}>
                <span className={`${styles.formCardDot} ${styles.dotBrown}`} />
                {TYPE_SPECIFIC_FIELDS[form.type].title}
              </p>
              <div className={styles.typeSpecGrid}>
                {TYPE_SPECIFIC_FIELDS[form.type].fields.map((field) => (
                  <div key={field.key} className={field.wide ? styles.typeSpecWide : ''}>
                    <FormField label={field.label}>{renderTypeField(field, form, set)}</FormField>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 상세 메모 */}
          <div className={`${styles.formCard} ${styles.cardSlate}`}>
            <p className={styles.formCardTitle}>
              <span className={`${styles.formCardDot} ${styles.dotSlate}`} />
              메모 · 블로그
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FormField label="특이사항 / 홈페이지 메모">
                <textarea className={styles.textarea} rows={3} value={form.features} onChange={(e) => set('features', e.target.value)} placeholder="신축, 역세권, 학군 우수 등..." />
              </FormField>
              <FormField label="네이버 블로그 URL">
                <input className={styles.input} value={form.blogUrl} onChange={(e) => set('blogUrl', e.target.value)} placeholder="https://blog.naver.com/..." />
              </FormField>
            </div>
          </div>

          {/* 노출 설정 */}
          <div className={`${styles.formCard} ${styles.cardRose}`}>
            <p className={styles.formCardTitle}>
              <span className={`${styles.formCardDot} ${styles.dotRose}`} />
              노출 설정
            </p>
            <div className={styles.checkRow}>
              <label className={`${styles.checkToggle} ${form.isExposed ? styles.checkToggleOn : ''}`}>
                <input type="checkbox" checked={form.isExposed} onChange={(e) => set('isExposed', e.target.checked)} style={{ display: 'none' }} />
                {form.isExposed ? '👁 홈페이지 노출 중' : '🚫 홈페이지 숨김'}
              </label>
              <label className={`${styles.checkToggle} ${form.isRecommended ? styles.checkToggleOn : ''}`}>
                <input type="checkbox" checked={form.isRecommended} onChange={(e) => set('isRecommended', e.target.checked)} style={{ display: 'none' }} />
                {form.isRecommended ? '⭐ 추천 매물 ON' : '☆ 추천 매물 OFF'}
              </label>
              <label className={`${styles.checkToggle} ${form.mapHidden ? styles.checkToggleOn : ''}`}>
                <input type="checkbox" checked={form.mapHidden} onChange={(e) => set('mapHidden', e.target.checked)} style={{ display: 'none' }} />
                {form.mapHidden ? '🗺️ 지도 숨김 ON' : '📍 지도 표시 중'}
              </label>
            </div>
          </div>

          <div className={styles.submitRow}>
            {msg && <p className={styles.saveMsg}>{msg}</p>}
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              {saving ? '저장 중...' : isEdit ? '수정 저장' : 'Notion에 저장'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

/* ──────────────── TAB 1: 매물 검색 ──────────────── */
function SearchTab() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [txFilter, setTxFilter] = useState('');
  const [onlyRecommended, setOnlyRecommended] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/properties?admin=true')
      .then((r) => r.json())
      .then(setProperties)
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const kw = keyword.toLowerCase();
      const matchKw = !kw || p.name?.toLowerCase().includes(kw) || p.address?.toLowerCase().includes(kw);
      const matchType = !typeFilter || p.type === typeFilter;
      const matchTx = !txFilter || (p.transactionType || []).includes(txFilter);
      const matchRec = !onlyRecommended || p.isRecommended;
      return matchKw && matchType && matchTx && matchRec;
    });
  }, [properties, keyword, typeFilter, txFilter, onlyRecommended]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>매물 검색</span>
        <div className={styles.panelActions}>
          <input className={styles.input} style={{ width: 200 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="매물명, 주소 검색" />
          <select className={styles.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">전체 종류</option>
            {['아파트', '빌라', '원룸·투룸', '오피스텔', '주택·빌라', '상가', '토지', '빌딩', '건물'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select className={styles.select} value={txFilter} onChange={(e) => setTxFilter(e.target.value)}>
            <option value="">전체 거래</option>
            {['매매', '전세', '월세', '임대'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={onlyRecommended} onChange={(e) => setOnlyRecommended(e.target.checked)} />
            추천만
          </label>
        </div>
      </div>
      {loading ? (
        <div className={styles.loading}>로딩 중...</div>
      ) : (
        <PropertyTable properties={filtered} />
      )}
    </div>
  );
}

/* ──────────────── TAB 2: 전체 매물 ──────────────── */
function AllPropertiesTab({ onEdit }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(null);

  const load = () => {
    setLoading(true);
    fetch('/api/properties?admin=true')
      .then((r) => r.json())
      .then(setProperties)
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('정말 이 매물을 삭제(아카이브)하시겠습니까?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert('삭제 실패');
      }
    } catch {
      alert('삭제 오류');
    }
    setDeleting(null);
  };

  const handleToggleRecommended = async (prop) => {
    try {
      await fetch(`/api/properties/${prop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'recommend', value: !prop.isRecommended }),
      });
      setProperties((prev) =>
        prev.map((p) => p.id === prop.id ? { ...p, isRecommended: !p.isRecommended } : p)
      );
    } catch {
      alert('수정 실패');
    }
  };

  const handleEdit = async (prop) => {
    setLoadingEdit(prop.id);
    try {
      const res = await fetch(`/api/properties/${prop.id}`);
      const full = await res.json();
      onEdit(full);
    } catch {
      alert('불러오기 실패');
    }
    setLoadingEdit(null);
  };

  const filtered = properties.filter((p) =>
    !search || p.name?.includes(search) || p.address?.includes(search) || p.propertyNumber?.includes(search)
  );

  const exposed = properties.filter((p) => p.isExposed).length;
  const recommended = properties.filter((p) => p.isRecommended).length;

  return (
    <div>
      <div className={styles.statCards}>
        <div className={styles.statCard}>
          <div className={styles.statCardValue}>{properties.length}</div>
          <div className={styles.statCardLabel}>전체 매물</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statCardValue} ${styles.statCardGreen}`}>{exposed}</div>
          <div className={styles.statCardLabel}>노출 중</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statCardValue} ${styles.statCardAccent}`}>{recommended}</div>
          <div className={styles.statCardLabel}>추천 매물</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardValue}>{properties.length - exposed}</div>
          <div className={styles.statCardLabel}>숨김</div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>매물 목록 <span className={styles.totalCount}>({filtered.length}개)</span></span>
          <div className={styles.panelActions}>
            <input
              className={styles.input}
              style={{ width: 220 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="매물명, 주소, 코드 검색"
            />
            <button onClick={load} className={styles.refreshBtn}>새로고침</button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>종류</th>
                  <th>매물명</th>
                  <th>주소</th>
                  <th>가격</th>
                  <th>거래</th>
                  <th>추천</th>
                  <th>노출</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td><code style={{ fontSize: '0.75rem', color: '#9d9189' }}>{p.propertyNumber || '-'}</code></td>
                    <td><span className={styles.typeBadge}>{p.type}</span></td>
                    <td className={styles.nameCell}>{p.name}</td>
                    <td className={styles.addrCell}>{p.address}</td>
                    <td className={styles.priceTd}>{fmtPrice(p)}</td>
                    <td style={{ fontSize: '0.82rem', color: '#78716c' }}>{p.transactionType?.join(' / ')}</td>
                    <td>
                      <button onClick={() => handleToggleRecommended(p)} className={styles.starBtn} title="추천 토글">
                        {p.isRecommended ? '⭐' : '☆'}
                      </button>
                    </td>
                    <td>
                      <span className={p.isExposed ? styles.badgeOn : styles.badgeOff}>
                        {p.isExposed ? '노출' : '숨김'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#9d9189', whiteSpace: 'nowrap' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button onClick={() => handleEdit(p)} className={styles.editBtn} disabled={loadingEdit === p.id}>
                          {loadingEdit === p.id ? '...' : '수정'}
                        </button>
                        <button onClick={() => handleDelete(p.id)} className={styles.deleteBtn} disabled={deleting === p.id}>
                          {deleting === p.id ? '...' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className={styles.emptyMsg}>매물이 없습니다.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── TAB 3: 설정 ──────────────── */
function SettingsTab() {
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');

  const handleChangePw = (e) => {
    e.preventDefault();
    setMsg('');
    const stored = localStorage.getItem(PW_KEY) || DEFAULT_PW;
    if (curPw !== stored) { setMsg('❌ 현재 비밀번호가 올바르지 않습니다.'); return; }
    if (newPw.length < 4) { setMsg('❌ 새 비밀번호는 4자 이상이어야 합니다.'); return; }
    if (newPw !== confirmPw) { setMsg('❌ 새 비밀번호가 일치하지 않습니다.'); return; }
    localStorage.setItem(PW_KEY, newPw);
    setCurPw(''); setNewPw(''); setConfirmPw('');
    setMsg('✅ 비밀번호가 변경되었습니다.');
  };

  return (
    <div className={styles.settingsWrap}>
      <div className={styles.formCard}>
      <p className={styles.formCardTitle}>비밀번호 변경</p>
      <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
        <FormField label="현재 비밀번호">
          <input type="password" className={styles.input} value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
        </FormField>
        <FormField label="새 비밀번호 (4자 이상)">
          <input type="password" className={styles.input} value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
        </FormField>
        <FormField label="새 비밀번호 확인">
          <input type="password" className={styles.input} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
        </FormField>
        {msg && <p className={styles.saveMsg}>{msg}</p>}
        <div><button type="submit" className={styles.submitBtn}>변경하기</button></div>
      </form>
      </div>
      <div className={styles.settingsNote}>
        <p>⚠️ 이 비밀번호는 브라우저 localStorage에 저장됩니다. 프로덕션 배포 전 NextAuth 등 서버 인증으로 교체를 권장합니다.</p>
      </div>
    </div>
  );
}

/* ──────────────── 공통 컴포넌트 ──────────────── */
function renderTypeField(field, form, set) {
  switch (field.type) {
    case 'select':
      return (
        <select className={styles.select} value={form[field.key] || ''} onChange={(e) => set(field.key, e.target.value)}>
          <option value="">선택</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'number':
      return (
        <input type="number" className={styles.input} value={form[field.key] || ''} onChange={(e) => set(field.key, e.target.value)} placeholder={field.placeholder} />
      );
    case 'textarea':
      return (
        <textarea className={styles.textarea} rows={3} value={form[field.key] || ''} onChange={(e) => set(field.key, e.target.value)} placeholder={field.placeholder} />
      );
    case 'checkbox':
      return (
        <label className={styles.checkLabel} style={{ paddingTop: 6 }}>
          <input type="checkbox" checked={!!form[field.key]} onChange={(e) => set(field.key, e.target.checked)} />
          {form[field.key] ? '있음' : '없음'}
        </label>
      );
    case 'multiselect':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '6px' }}>
          {field.options.map((opt) => (
            <label key={opt} className={styles.checkLabel} style={{ fontSize: '0.82rem' }}>
              <input
                type="checkbox"
                checked={(Array.isArray(form[field.key]) ? form[field.key] : []).includes(opt)}
                onChange={(e) => {
                  const cur = Array.isArray(form[field.key]) ? form[field.key] : [];
                  set(field.key, e.target.checked ? [...cur, opt] : cur.filter((v) => v !== opt));
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    default:
      return (
        <input className={styles.input} value={form[field.key] || ''} onChange={(e) => set(field.key, e.target.value)} placeholder={field.placeholder} />
      );
  }
}

function FormField({ label, required, children }) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>{label}{required && ' *'}</label>
      {children}
    </div>
  );
}

function PropertyTable({ properties }) {
  if (!properties.length) return <p className={styles.emptyMsg}>검색 결과가 없습니다.</p>;
  return (
    <div className={styles.panel} style={{ marginTop: 0 }}>
      <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>코드</th><th>종류</th><th>매물명</th><th>주소</th><th>가격</th><th>거래유형</th><th>추천</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => (
            <tr key={p.id}>
              <td><code>{p.propertyNumber || '-'}</code></td>
              <td>{p.type}</td>
              <td className={styles.nameCell}>{p.name}</td>
              <td className={styles.addrCell}>{p.address}</td>
              <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{fmtPrice(p)}</td>
              <td>{p.transactionType?.join('/')}</td>
              <td>{p.isRecommended ? '⭐' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
