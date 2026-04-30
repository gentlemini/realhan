'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin2.module.css';

// 그룹별 배경 — 모두 홈페이지 우드/어스 톤 계열
const GROUPS = [
  {
    color: '#c4834a',   // 따뜻한 앰버 (사이트 메인 액센트 계열)
    rows: [[
      { id: 'apt_sale',    label: '아파트 매매',    active: true },
      { id: 'apt_jeonse', label: '아파트 전세' },
      { id: 'apt_wolse',  label: '아파트 월세' },
    ]],
  },
  {
    color: '#a07850',   // 카키 골드
    rows: [[
      { id: 'ofc_sale',    label: '오피스텔 매매' },
      { id: 'ofc_jeonse', label: '오피스텔 전세' },
      { id: 'ofc_wolse',  label: '오피스텔 월세' },
    ]],
  },
  {
    color: '#6b9050',   // 올리브 그린
    rows: [[
      { id: 'multi_sale',    label: '다세대 매매',    sub: '연립,빌라,상가주택' },
      { id: 'multi_jeonse', label: '다세대 전세',    sub: '연립,빌라,상가주택' },
      { id: 'multi_wolse',  label: '다세대 월세',    sub: '연립,빌라,상가주택' },
    ]],
  },
  {
    color: '#508060',   // 포레스트 그린
    rows: [[
      { id: 'house_sale',    label: '단독주택 매매' },
      { id: 'house_jeonse', label: '단독주택 전세' },
      { id: 'house_wolse',  label: '단독주택 월세' },
    ]],
  },
  {
    color: '#a07040',   // 테라코타 브라운
    rows: [[
      { id: 'dagu_sale',    label: '다가구 매매' },
      { id: 'dagu_jeonse', label: '다가구 전세' },
      { id: 'dagu_wolse',  label: '다가구 월세' },
    ]],
  },
  {
    color: '#c89048',   // 골드 앰버
    rows: [[
      { id: 'room_sale',    label: '원룸 매매',    sub: '투룸,쓰리룸,오피스텔' },
      { id: 'room_jeonse', label: '원룸 전세',    sub: '투룸,쓰리룸,오피스텔' },
      { id: 'room_wolse',  label: '원룸 월세',    sub: '투룸,쓰리룸,오피스텔' },
    ]],
  },
  {
    color: '#b06050',   // 브릭 레드
    rows: [[
      { id: 'shop_sale',    label: '상가 매매',    sub: '일반상가,단지내상가,복합상가' },
      { id: 'shop_jeonse', label: '상가 전세',    sub: '일반상가,단지내상가,복합상가' },
      { id: 'shop_wolse',  label: '상가 월세',    sub: '일반상가,단지내상가,복합상가' },
    ]],
  },
  {
    color: '#5870a8',   // 슬레이트 블루
    rows: [[
      { id: 'office_sale',    label: '사무실 매매',    sub: '대형·중소형,오피스텔,지식산업센터' },
      { id: 'office_jeonse', label: '사무실 전세',    sub: '대형·중소형,오피스텔,지식산업센터' },
      { id: 'office_wolse',  label: '사무실 월세',    sub: '대형·중소형,오피스텔,지식산업센터' },
    ]],
  },
  {
    color: '#8a7860',   // 웜 타우프
    rows: [[
      { id: 'factory_sale',    label: '공장/창고 매매' },
      { id: 'factory_jeonse', label: '공장/창고 전세' },
      { id: 'factory_wolse',  label: '공장/창고 월세' },
    ]],
  },
  {
    color: '#607070',   // 블루 그레이
    rows: [[
      { id: 'building_sale',    label: '빌딩,건물 매매',    sub: '빌딩,팬션,상가건물,기타' },
      { id: 'building_jeonse', label: '빌딩,건물 전세',    sub: '빌딩,팬션,상가건물,기타' },
      { id: 'building_wolse',  label: '빌딩,건물 월세',    sub: '빌딩,팬션,상가건물,기타' },
    ]],
  },
  {
    color: '#8a7040',   // 어스 브라운
    rows: [[
      { id: 'land_sale',    label: '토지 매매' },
      { id: 'land_jeonse', label: '토지 전세' },
      { id: 'land_wolse',  label: '토지 월세' },
    ]],
  },
  {
    color: '#7858a8',   // 웜 퍼플
    rows: [[
      { id: 'redevelop_sale', label: '재개발 매매', sub: '아파트,연립,단독주택,다세대,다가구,기타' },
      { id: 'presale',        label: '분양권 매매' },
      { id: '_empty',         label: '',            empty: true },
    ]],
  },
];

export default function Admin2Page() {
  const router = useRouter();
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>🏗️</span>
          <div>
            <div className={styles.headerTitle}>관리자2 — DB 구축 패널</div>
            <div className={styles.headerSub}>매물 유형별 순서대로 활성화하며 개발합니다</div>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <button className={styles.viewAllBtn} onClick={() => router.push('/admin2/properties')}>
          <span className={styles.viewAllIcon}>📋</span>
          <span className={styles.viewAllLabel}>등록된 매물 전체보기</span>
          <span className={styles.viewAllArrow}>→</span>
        </button>

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
                    style={isActive ? {} : { background: group.color }}
                    disabled={!isActive}
                    onClick={isActive ? () => router.push('/admin2/apt-sale') : undefined}
                  >
                    {isActive
                      ? <span className={styles.activeBadge}>개발중</span>
                      : <span className={styles.lockIcon}>🔒</span>
                    }
                    <span className={styles.btnLabel}>{btn.label}</span>
                    {btn.sub && <span className={styles.btnSub}>{btn.sub}</span>}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
