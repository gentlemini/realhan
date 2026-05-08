'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin2.module.css';

const GROUPS = [
  {
    color: '#c4834a',
    rows: [[
      { id: 'apt_sale',    label: '아파트 매매',    active: true },
      { id: 'apt_jeonse', label: '아파트 전세',    active: true },
      { id: 'apt_wolse',  label: '아파트 월세',    active: true },
    ]],
  },
  {
    color: '#a07850',
    rows: [[
      { id: 'ofc_sale',   label: '오피스텔 매매',  active: true },
      { id: 'ofc_jeonse', label: '오피스텔 전세',  active: true },
      { id: 'ofc_wolse',  label: '오피스텔 월세',  active: true },
    ]],
  },
  {
    color: '#6b9050',
    rows: [[
      { id: 'multi_sale',    label: '다세대 매매',    sub: '연립,빌라,상가주택', active: true },
      { id: 'multi_jeonse', label: '다세대 전세',    sub: '연립,빌라,상가주택', active: true },
      { id: 'multi_wolse',  label: '다세대 월세',    sub: '연립,빌라,상가주택', active: true },
    ]],
  },
  {
    color: '#508060',
    rows: [[
      { id: 'house_sale',    label: '단독주택 매매', active: true },
      { id: 'house_jeonse', label: '단독주택 전세', active: true },
      { id: 'house_wolse',  label: '단독주택 월세', active: true },
    ]],
  },
  {
    color: '#a07040',
    rows: [[
      { id: 'dagu_sale',    label: '다가구 매매', active: true },
      { id: 'dagu_jeonse', label: '다가구 전세', active: true },
      { id: 'dagu_wolse',  label: '다가구 월세', active: true },
    ]],
  },
  {
    color: '#c89048',
    rows: [[
      { id: 'room_sale',    label: '원룸 매매',    sub: '투룸,쓰리룸,오피스텔', active: true },
      { id: 'room_jeonse', label: '원룸 전세',    sub: '투룸,쓰리룸,오피스텔', active: true },
      { id: 'room_wolse',  label: '원룸 월세',    sub: '투룸,쓰리룸,오피스텔', active: true },
    ]],
  },
  {
    color: '#b06050',
    rows: [[
      { id: 'shop_sale',    label: '상가 매매',    sub: '일반상가,단지내상가,복합상가', active: true },
      { id: 'shop_jeonse', label: '상가 전세',    sub: '일반상가,단지내상가,복합상가', active: true },
      { id: 'shop_wolse',  label: '상가 월세',    sub: '일반상가,단지내상가,복합상가', active: true },
    ]],
  },
  {
    color: '#5870a8',
    rows: [[
      { id: 'office_sale',    label: '사무실 매매',    sub: '대형·중소형,오피스텔,지식산업센터', active: true },
      { id: 'office_jeonse', label: '사무실 전세',    sub: '대형·중소형,오피스텔,지식산업센터', active: true },
      { id: 'office_wolse',  label: '사무실 월세',    sub: '대형·중소형,오피스텔,지식산업센터', active: true },
    ]],
  },
  {
    color: '#8a7860',
    rows: [[
      { id: 'factory_sale',    label: '공장/창고 매매', active: true },
      { id: 'factory_jeonse', label: '공장/창고 전세', active: true },
      { id: 'factory_wolse',  label: '공장/창고 월세', active: true },
    ]],
  },
  {
    color: '#607070',
    rows: [[
      { id: 'building_sale',    label: '빌딩,건물 매매',    sub: '빌딩,팬션,상가건물,기타', active: true },
      { id: 'building_jeonse', label: '빌딩,건물 전세',    sub: '빌딩,팬션,상가건물,기타', active: true },
      { id: 'building_wolse',  label: '빌딩,건물 월세',    sub: '빌딩,팬션,상가건물,기타', active: true },
    ]],
  },
  {
    color: '#8a7040',
    rows: [[
      { id: 'land_sale',    label: '토지 매매', active: true },
      { id: 'land_jeonse', label: '토지 전세', active: true },
      { id: 'land_wolse',  label: '토지 월세', active: true },
    ]],
  },
  {
    color: '#7858a8',
    rows: [[
      { id: 'redevelop_sale', label: '재개발 매매', sub: '아파트,연립,단독주택,다세대,다가구,기타', active: true },
      { id: 'presale',        label: '분양권 매매', active: true },
      { id: '_empty',         label: '',            empty: true },
    ]],
  },
];

const ROUTE_MAP = {
  apt_sale: '/admin2/apt-sale', apt_jeonse: '/admin2/apt-lease', apt_wolse: '/admin2/apt-wolse',
  ofc_sale: '/admin2/ofc-sale', ofc_jeonse: '/admin2/ofc-lease', ofc_wolse: '/admin2/ofc-wolse',
  house_sale: '/admin2/hse-sale', house_jeonse: '/admin2/hse-lease', house_wolse: '/admin2/hse-wolse',
  dagu_sale: '/admin2/dgu-sale', dagu_jeonse: '/admin2/dgu-lease', dagu_wolse: '/admin2/dgu-wolse',
  multi_sale: '/admin2/dse-sale', multi_jeonse: '/admin2/dse-lease', multi_wolse: '/admin2/dse-wolse',
  room_sale: '/admin2/rom-sale', room_jeonse: '/admin2/rom-lease', room_wolse: '/admin2/rom-wolse',
  shop_sale: '/admin2/shp-sale', shop_jeonse: '/admin2/shp-lease', shop_wolse: '/admin2/shp-wolse',
  office_sale: '/admin2/ofi-sale', office_jeonse: '/admin2/ofi-lease', office_wolse: '/admin2/ofi-wolse',
  factory_sale: '/admin2/fac-sale', factory_jeonse: '/admin2/fac-lease', factory_wolse: '/admin2/fac-wolse',
  building_sale: '/admin2/bld-sale', building_jeonse: '/admin2/bld-lease', building_wolse: '/admin2/bld-wolse',
  land_sale: '/admin2/lnd-sale', land_jeonse: '/admin2/lnd-lease', land_wolse: '/admin2/lnd-wolse',
  redevelop_sale: '/admin2/rdv-sale', presale: '/admin2/prs-sale',
};

export default function Admin2Page() {
  const router = useRouter();

  return (
    <div className={styles.registerWrap}>
      <div className={styles.sectionTitle}>매물 유형 선택</div>
      <div className={styles.grid}>
        {GROUPS.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <div className={styles.divider} />}
            {group.rows[0].map((btn) => {
              if (btn.empty) {
                return <div key={btn.id} className={`${styles.btn} ${styles.btnEmpty}`} />;
              }
              const isActive = btn.active === true;
              return (
                <button
                  key={btn.id}
                  className={`${styles.btn} ${isActive ? styles.btnActive : ''}`}
                  style={{ '--btnColor': group.color }}
                  disabled={!isActive}
                  onClick={isActive ? () => router.push(ROUTE_MAP[btn.id] || '/admin2') : undefined}
                >
                  <span className={styles.btnLabel}>{btn.label}</span>
                  {btn.sub && <span className={styles.btnSub}>{btn.sub}</span>}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
