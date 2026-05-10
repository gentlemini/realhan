'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import styles from './properties.module.css';
import modalStyles from '../../page.module.css';

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

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

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '';
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
function PreviewMap({ lat, lng }) {
  const mapRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk().then(() => {
      if (cancelled || !mapRef.current) return;
      if (!mapRef.current.offsetWidth && !mapRef.current.offsetHeight) return;
      const { kakao } = window;
      const center = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(mapRef.current, { center, level: 3 });
      map.setZoomable(false);
      new kakao.maps.Marker({ position: center, map });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lng]);
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ── 공통 상세 섹션 (아파트 공통) ─────────────────
const COMMON_SECTIONS_APT = [
  { title: '면적·구조', fields: [
    { key: 'supply_area',    label: '공급면적(㎡)', type: 'num' },
    { key: 'exclusive_area', label: '전용면적(㎡)', type: 'num' },
    { key: 'total_floors',   label: '총층수',       type: 'num' },
    { key: 'rooms',          label: '방수',         type: 'num' },
    { key: 'bathrooms',      label: '욕실수',       type: 'num' },
    { key: 'direction_base', label: '방향기준' },
    { key: 'direction',      label: '방향' },
    { key: 'entrance',       label: '현관유형' },
    { key: 'duplex',         label: '복층여부' },
    { key: 'building_use',   label: '건축물용도' },
  ]},
  { title: '동·호수', fields: [
    { key: 'dong',               label: '동' },
    { key: 'ho',                 label: '호수' },
    { key: 'ho_privacy',         label: '호수 공개여부',     type: 'privacy' },
    { key: 'ho_memo',            label: '호수 관리자메모',   type: 'memo' },
    { key: 'curr_floor',         label: '해당층' },
    { key: 'curr_floor_privacy', label: '해당층 공개여부',   type: 'privacy' },
    { key: 'curr_floor_memo',    label: '해당층 관리자메모', type: 'memo' },
  ]},
  { title: '주차', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',    type: 'num' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo', label: '관리자메모', type: 'memo' },
  ]},
];

// ── 공통 상세 섹션 (오피스텔 공통) ─────────────────
const COMMON_SECTIONS_OFC = [
  { title: '면적·구조', fields: [
    { key: 'supply_area',           label: '공급면적(㎡)',    type: 'num' },
    { key: 'exclusive_area',        label: '전용면적(㎡)',    type: 'num' },
    { key: 'pyeong',                label: '평형' },
    { key: 'total_floors',          label: '총층수',          type: 'num' },
    { key: 'rooms',                 label: '방수',            type: 'num' },
    { key: 'bathrooms',             label: '욕실수',          type: 'num' },
    { key: 'direction_base',        label: '방향기준' },
    { key: 'direction',             label: '방향' },
    { key: 'entrance',              label: '현관유형' },
    { key: 'duplex',                label: '복층여부' },
    { key: 'building_use_category', label: '건축물용도분류' },
    { key: 'building_use_text',     label: '건축물용도' },
  ]},
  { title: '호수·층', fields: [
    { key: 'ho',         label: '호수' },
    { key: 'ho_privacy', label: '호수 공개여부',   type: 'privacy' },
    { key: 'ho_memo',    label: '호수 관리자메모', type: 'memo' },
    { key: 'curr_floor', label: '해당층' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',      type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',    type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',    type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모',  type: 'memo' },
  ]},
  { title: '주차', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',    type: 'num' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo', label: '관리자메모', type: 'memo' },
  ]},
];

// ── 공통 상세 섹션 (단독주택 공통) ─────────────────
const COMMON_SECTIONS_HSE_SALE = [
  { title: '면적', fields: [
    { key: 'total_floor_area', label: '연면적(㎡)',    type: 'num' },
    { key: 'land_area',        label: '대지면적(㎡)',  type: 'num' },
    { key: 'building_area',    label: '건축면적(㎡)',  type: 'num' },
    { key: 'exclusive_area',   label: '전용면적(㎡)',  type: 'num' },
  ]},
  { title: '구조', fields: [
    { key: 'total_floors',     label: '총층수',        type: 'num' },
    { key: 'rooms',            label: '방수',          type: 'num' },
    { key: 'bathrooms',        label: '욕실수',        type: 'num' },
    { key: 'direction_base',   label: '방향기준' },
    { key: 'direction',        label: '방향' },
    { key: 'households',       label: '세대가구수',    type: 'num' },
    { key: 'duplex',           label: '복층여부' },
    { key: 'illegal_building', label: '위반건축물여부' },
    { key: 'building_use',     label: '건물용도' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',          label: '소재지' },
    { key: 'location_privacy',  label: '소재지 노출여부', type: 'privacy' },
    { key: 'location_memo',     label: '소재지 관리자메모', type: 'memo' },
    { key: 'address_public',    label: '지번노출여부' },
    { key: 'curr_floor',        label: '해당층' },
    { key: 'curr_floor_privacy',label: '해당층 공개여부',  type: 'privacy' },
    { key: 'curr_floor_memo',   label: '해당층 관리자메모', type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo', label: '관리자메모', type: 'memo' },
  ]},
];

const COMMON_SECTIONS_HSE_RENTAL = [
  { title: '면적', fields: [
    { key: 'supply_area',    label: '공급면적(㎡)',  type: 'num' },
    { key: 'exclusive_area', label: '전용면적(㎡)',  type: 'num' },
    { key: 'land_share',     label: '대지지분' },
  ]},
  { title: '구조', fields: [
    { key: 'building_type',    label: '건물유형' },
    { key: 'total_floors',     label: '총층수',        type: 'num' },
    { key: 'rooms',            label: '방수',          type: 'num' },
    { key: 'bathrooms',        label: '욕실수',        type: 'num' },
    { key: 'direction_base',   label: '방향기준' },
    { key: 'direction',        label: '방향' },
    { key: 'households',       label: '세대가구수',    type: 'num' },
    { key: 'room_type',        label: '방거실형태' },
    { key: 'duplex',           label: '복층여부' },
    { key: 'illegal_building', label: '위반건축물여부' },
    { key: 'building_use',     label: '건물용도' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',          label: '소재지' },
    { key: 'location_privacy',  label: '소재지 노출여부', type: 'privacy' },
    { key: 'location_memo',     label: '소재지 관리자메모', type: 'memo' },
    { key: 'address_public',    label: '지번노출여부' },
    { key: 'curr_floor',        label: '해당층' },
    { key: 'curr_floor_privacy',label: '해당층 공개여부',  type: 'privacy' },
    { key: 'curr_floor_memo',   label: '해당층 관리자메모', type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo', label: '관리자메모', type: 'memo' },
  ]},
];

// ── 공통 상세 섹션 (다가구 매매) ─────────────────
const COMMON_SECTIONS_DGU_SALE = [
  { title: '면적', fields: [
    { key: 'total_floor_area', label: '연면적(㎡)',    type: 'num' },
    { key: 'land_area',        label: '대지면적(㎡)',  type: 'num' },
    { key: 'building_area',    label: '건축면적(㎡)',  type: 'num' },
    { key: 'exclusive_area',   label: '전용면적(㎡)',  type: 'num' },
  ]},
  { title: '구조', fields: [
    { key: 'above_floors',     label: '지상층수',      type: 'num' },
    { key: 'below_floors',     label: '지하층수',      type: 'num' },
    { key: 'rooms',            label: '방수',          type: 'num' },
    { key: 'bathrooms',        label: '욕실수',        type: 'num' },
    { key: 'direction_base',   label: '방향기준' },
    { key: 'direction',        label: '방향' },
    { key: 'households',       label: '세대가구수',    type: 'num' },
    { key: 'duplex',           label: '복층여부' },
    { key: 'illegal_building', label: '위반건축물여부' },
    { key: 'building_use',     label: '건물용도' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

// ── 공통 상세 섹션 (다가구 전세·월세) ─────────────
const COMMON_SECTIONS_DGU_RENTAL = [
  { title: '면적', fields: [
    { key: 'supply_area',    label: '공급면적(㎡)',  type: 'num' },
    { key: 'exclusive_area', label: '전용면적(㎡)',  type: 'num' },
    { key: 'land_share',     label: '대지지분' },
  ]},
  { title: '구조', fields: [
    { key: 'building_type',    label: '건물유형' },
    { key: 'total_floors',     label: '총층수',        type: 'num' },
    { key: 'rooms',            label: '방수',          type: 'num' },
    { key: 'bathrooms',        label: '욕실수',        type: 'num' },
    { key: 'direction_base',   label: '방향기준' },
    { key: 'direction',        label: '방향' },
    { key: 'households',       label: '세대가구수',    type: 'num' },
    { key: 'room_type',        label: '방거실형태' },
    { key: 'duplex',           label: '복층여부' },
    { key: 'illegal_building', label: '위반건축물여부' },
    { key: 'building_use',     label: '건물용도' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
    { key: 'curr_floor',             label: '해당층' },
    { key: 'curr_floor_privacy',     label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',        label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

// ── 공통 상세 섹션 (다세대 공통) ─────────────────
const COMMON_SECTIONS_DSE = [
  { title: '면적', fields: [
    { key: 'supply_area',     label: '공급면적(㎡)',  type: 'num' },
    { key: 'exclusive_area',  label: '전용면적(㎡)',  type: 'num' },
    { key: 'land_share_area', label: '대지지분(㎡)',  type: 'num' },
  ]},
  { title: '구조', fields: [
    { key: 'building_type',    label: '건물유형' },
    { key: 'total_floors',     label: '총층수',        type: 'num' },
    { key: 'rooms',            label: '방수',          type: 'num' },
    { key: 'bathrooms',        label: '욕실수',        type: 'num' },
    { key: 'direction_base',   label: '방향기준' },
    { key: 'direction',        label: '방향' },
    { key: 'households',       label: '세대가구수',    type: 'num' },
    { key: 'entrance_type',    label: '현관유형' },
    { key: 'room_type',        label: '방거실형태' },
    { key: 'duplex',           label: '복층여부' },
    { key: 'illegal_building', label: '위반건축물여부' },
    { key: 'building_use',     label: '건물용도' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
    { key: 'curr_floor',             label: '해당층' },
    { key: 'curr_floor_privacy',     label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',        label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

// ── 공통 상세 섹션 (원룸 공통) ─────────────────
const COMMON_SECTIONS_ROM = [
  { title: '면적', fields: [
    { key: 'supply_area',     label: '공급면적(㎡)',  type: 'num' },
    { key: 'exclusive_area',  label: '전용면적(㎡)',  type: 'num' },
    { key: 'land_share_area', label: '대지지분(㎡)',  type: 'num' },
  ]},
  { title: '구조', fields: [
    { key: 'building_type',    label: '건물유형' },
    { key: 'total_floors',     label: '총층수',        type: 'num' },
    { key: 'rooms',            label: '방수',          type: 'num' },
    { key: 'bathrooms',        label: '욕실수',        type: 'num' },
    { key: 'direction_base',   label: '방향기준' },
    { key: 'direction',        label: '방향' },
    { key: 'households',       label: '세대가구수',    type: 'num' },
    { key: 'entrance_type',    label: '현관유형' },
    { key: 'room_type',        label: '방거실형태' },
    { key: 'duplex',           label: '복층여부' },
    { key: 'illegal_building', label: '위반건축물여부' },
    { key: 'building_use',     label: '건물용도' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
    { key: 'curr_floor',             label: '해당층' },
    { key: 'curr_floor_privacy',     label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',        label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

// ── 공통 상세 섹션 (상가 공통) ─────────────────
const COMMON_SECTIONS_SHP = [
  { title: '면적', fields: [
    { key: 'contract_area',  label: '임대계약면적(㎡)', type: 'num' },
    { key: 'exclusive_area', label: '전용면적(㎡)',     type: 'num' },
  ]},
  { title: '구조·상업', fields: [
    { key: 'building_type',        label: '건물유형' },
    { key: 'total_floors',         label: '총층수',        type: 'num' },
    { key: 'rooms',                label: '방수',          type: 'num' },
    { key: 'bathrooms',            label: '욕실수',        type: 'num' },
    { key: 'direction_base',       label: '방향기준' },
    { key: 'direction',            label: '방향' },
    { key: 'shops_count',          label: '업포수',        type: 'num' },
    { key: 'restrooms',            label: '화장실수',      type: 'num' },
    { key: 'current_business',     label: '현업종' },
    { key: 'recommended_business', label: '추천업종' },
    { key: 'illegal_building',     label: '위반건축물여부' },
    { key: 'building_use',         label: '건물용도' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
    { key: 'curr_floor',             label: '해당층' },
    { key: 'curr_floor_privacy',     label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',        label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

// ── 공통 상세 섹션 (사무실 공통) ─────────────────
const COMMON_SECTIONS_OFI = [
  { title: '면적', fields: [
    { key: 'contract_area',  label: '임대계약면적(㎡)', type: 'num' },
    { key: 'exclusive_area', label: '전용면적(㎡)',     type: 'num' },
  ]},
  { title: '구조·사무실', fields: [
    { key: 'building_type',        label: '건물유형' },
    { key: 'total_floors',         label: '총층수',        type: 'num' },
    { key: 'rooms',                label: '방수',          type: 'num' },
    { key: 'bathrooms',            label: '욕실수',        type: 'num' },
    { key: 'direction_base',       label: '방향기준' },
    { key: 'direction',            label: '방향' },
    { key: 'offices_count',        label: '사무실수',      type: 'num' },
    { key: 'shops_count',          label: '점포수',        type: 'num' },
    { key: 'restrooms',            label: '화장실수',      type: 'num' },
    { key: 'current_business',     label: '현업종' },
    { key: 'recommended_business', label: '추천업종' },
    { key: 'illegal_building',     label: '위반건축물여부' },
    { key: 'building_use',         label: '건물용도' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
    { key: 'curr_floor',             label: '해당층' },
    { key: 'curr_floor_privacy',     label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',        label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

// ── 공통 상세 섹션 (공장/창고 공통) ─────────────────
const COMMON_SECTIONS_FAC = [
  { title: '면적', fields: [
    { key: 'total_floor_area', label: '연면적(㎡)',   type: 'num' },
    { key: 'land_area',        label: '대지면적(㎡)', type: 'num' },
    { key: 'building_area',    label: '건축면적(㎡)', type: 'num' },
    { key: 'exclusive_area',   label: '전용면적(㎡)', type: 'num' },
  ]},
  { title: '구조·공장', fields: [
    { key: 'above_floors',      label: '지상층수',      type: 'num' },
    { key: 'below_floors',      label: '지하층수',      type: 'num' },
    { key: 'rooms',             label: '방수',          type: 'num' },
    { key: 'bathrooms',         label: '욕실수',        type: 'num' },
    { key: 'direction_base',    label: '방향기준' },
    { key: 'direction',         label: '방향' },
    { key: 'shops_count',       label: '점포수',        type: 'num' },
    { key: 'restrooms',         label: '화장실수',      type: 'num' },
    { key: 'current_use',       label: '현재용도' },
    { key: 'recommended_use',   label: '추천용도' },
    { key: 'illegal_building',  label: '위반건축물여부' },
    { key: 'building_use',      label: '건축물용도' },
    { key: 'building_structure',label: '건축구조' },
    { key: 'zoning',            label: '용도지역' },
    { key: 'power_supply',      label: '사용전력' },
    { key: 'inspection_date',   label: '사용검사일' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
    { key: 'curr_floor',             label: '해당층' },
    { key: 'curr_floor_privacy',     label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',        label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

const COMMON_SECTIONS_BLD = [
  { title: '면적', fields: [
    { key: 'total_floor_area', label: '연면적(㎡)',   type: 'num' },
    { key: 'land_area',        label: '대지면적(㎡)', type: 'num' },
    { key: 'building_area',    label: '건축면적(㎡)', type: 'num' },
    { key: 'exclusive_area',   label: '전용면적(㎡)', type: 'num' },
  ]},
  { title: '구조·건물', fields: [
    { key: 'above_floors',      label: '지상층수',      type: 'num' },
    { key: 'below_floors',      label: '지하층수',      type: 'num' },
    { key: 'rooms',             label: '방수',          type: 'num' },
    { key: 'bathrooms',         label: '욕실수',        type: 'num' },
    { key: 'direction_base',    label: '방향기준' },
    { key: 'direction',         label: '방향' },
    { key: 'shops_count',       label: '점포수',        type: 'num' },
    { key: 'restrooms',         label: '화장실수',      type: 'num' },
    { key: 'current_use',       label: '현재용도' },
    { key: 'recommended_use',   label: '추천용도' },
    { key: 'illegal_building',  label: '위반건축물여부' },
    { key: 'building_use',      label: '건축물용도' },
    { key: 'building_structure',label: '건축구조' },
    { key: 'zoning',            label: '용도지역' },
    { key: 'power_supply',      label: '사용전력' },
    { key: 'inspection_date',   label: '사용검사일/사용승인일/준공일' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
    { key: 'curr_floor',             label: '해당층' },
    { key: 'curr_floor_privacy',     label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',        label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '주차·난방', fields: [
    { key: 'parking_yn',    label: '주차가능여부' },
    { key: 'total_parking', label: '총 주차대수',   type: 'num' },
    { key: 'opt_parking',   label: '주차옵션' },
    { key: 'heating_type',  label: '난방시설' },
    { key: 'heating_fuel',  label: '난방연료' },
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
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

const COMMON_SECTIONS_LND = [
  { title: '구조·토지', fields: [
    { key: 'above_floors',     label: '지상층수',    type: 'num' },
    { key: 'rooms',            label: '방수',        type: 'num' },
    { key: 'bathrooms',        label: '욕실수',      type: 'num' },
    { key: 'direction_base',   label: '방향기준' },
    { key: 'direction',        label: '방향' },
    { key: 'parking_yn',       label: '주차가능여부' },
    { key: 'total_parking',    label: '총 주차대수', type: 'num' },
    { key: 'current_use',      label: '현재용도' },
    { key: 'recommended_use',  label: '추천용도' },
    { key: 'zoning',           label: '용도지역' },
    { key: 'national_land_use',label: '국토이용' },
    { key: 'city_planning',    label: '도시계획' },
    { key: 'building_permit',  label: '건축허가' },
    { key: 'land_trade_permit',label: '토지거래허가' },
    { key: 'access_road',      label: '진입도로' },
    { key: 'inspection_date',  label: '사용검사일/사용승인일/준공일' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
    { key: 'curr_floor',             label: '해당층' },
    { key: 'curr_floor_privacy',     label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',        label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '상세정보', fields: [
    { key: 'description', label: '매물 상세정보', type: 'long' },
  ]},
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

const COMMON_SECTIONS_RDV = [
  { title: '면적', fields: [
    { key: 'total_floor_area', label: '연면적(㎡)',   type: 'num' },
    { key: 'land_area',        label: '대지면적(㎡)', type: 'num' },
    { key: 'building_area',    label: '건축면적(㎡)', type: 'num' },
    { key: 'expected_area',    label: '예상면적(㎡)', type: 'num' },
  ]},
  { title: '구조', fields: [
    { key: 'building_type',    label: '건물유형' },
    { key: 'above_floors',     label: '지상층수',    type: 'num' },
    { key: 'rooms',            label: '방수',        type: 'num' },
    { key: 'bathrooms',        label: '욕실수',      type: 'num' },
    { key: 'direction_base',   label: '방향기준' },
    { key: 'direction',        label: '방향' },
    { key: 'parking_yn',       label: '주차가능여부' },
    { key: 'total_parking',    label: '총 주차대수', type: 'num' },
    { key: 'illegal_building', label: '위반건축물여부' },
    { key: 'building_use',     label: '건축물용도' },
    { key: 'current_use',      label: '현재용도' },
    { key: 'recommended_use',  label: '추천용도' },
    { key: 'zoning',           label: '용도지역' },
    { key: 'inspection_date',  label: '사용검사일/사용승인일/준공일' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',         label: '소재지' },
    { key: 'location_privacy', label: '소재지 노출여부',   type: 'privacy' },
    { key: 'location_memo',    label: '소재지 관리자메모', type: 'memo' },
    { key: 'address_detail',           label: '상세주소' },
    { key: 'address_detail_privacy',   label: '상세주소 노출여부',   type: 'privacy' },
    { key: 'address_detail_memo',      label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',   label: '지번노출여부' },
    { key: 'curr_floor',       label: '해당층' },
    { key: 'curr_floor_privacy', label: '해당층 공개여부',    type: 'privacy' },
    { key: 'curr_floor_memo',  label: '해당층 관리자메모',  type: 'memo' },
  ]},
  { title: '상세정보', fields: [
    { key: 'description', label: '매물 상세정보', type: 'long' },
  ]},
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo',      label: '관리자메모', type: 'memo' },
    { key: 'registered_date', label: '매물 등록일' },
  ]},
];

const COMMON_SECTIONS_PRS = [
  { title: '기본 정보 (분양권)', fields: [
    { key: 'apt_name',          label: '아파트명' },
    { key: 'pyeong',            label: '평형' },
    { key: 'supply_area',       label: '공급면적(㎡)',    type: 'num' },
    { key: 'exclusive_area',    label: '전용면적(㎡)',    type: 'num' },
    { key: 'presale_type',      label: '분양구분' },
    { key: 'has_presale_price', label: '분양가유무' },
    { key: 'presale_price',     label: '분양금액(만원)',  type: 'num' },
    { key: 'premium',           label: '프리미엄(만원)',  type: 'num' },
    { key: 'option_price',      label: '옵션가격(만원)',  type: 'num' },
    { key: 'sale_price',        label: '매매가격(만원)',  type: 'price' },
    { key: 'installment_paid',  label: '납입중도금(만원)', type: 'num' },
    { key: 'relocation_fee',    label: '이주비(만원)',    type: 'num' },
    { key: 'loan_info',         label: '융자금(만원)',    type: 'num' },
    { key: 'maintenance',       label: '관리비' },
    { key: 'maintenance_note',  label: '관리비 상세' },
    { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
    { key: 'move_in',           label: '입주가능일' },
  ]},
  { title: '구조', fields: [
    { key: 'above_floors',   label: '해당동 총층',    type: 'num' },
    { key: 'rooms',          label: '방수',           type: 'num' },
    { key: 'bathrooms',      label: '욕실수',         type: 'num' },
    { key: 'direction_base', label: '방향기준' },
    { key: 'direction',      label: '방향' },
    { key: 'entrance',       label: '현관유형' },
    { key: 'duplex',         label: '복층여부' },
    { key: 'parking_yn',     label: '주차가능여부' },
    { key: 'total_parking',  label: '총 주차대수',    type: 'num' },
    { key: 'unit_parking',   label: '세대당 주차대수', type: 'num' },
    { key: 'building_use',   label: '건축물용도' },
    { key: 'inspection_date',label: '사용검사일' },
  ]},
  { title: '동·호수·층', fields: [
    { key: 'dong',               label: '동' },
    { key: 'ho',                 label: '호수' },
    { key: 'curr_floor',         label: '해당층' },
    { key: 'curr_floor_privacy', label: '해당층 공개여부',   type: 'privacy' },
    { key: 'curr_floor_memo',    label: '해당층 관리자메모', type: 'memo' },
  ]},
  { title: '소재지', fields: [
    { key: 'location',               label: '소재지' },
    { key: 'location_privacy',       label: '소재지 노출여부',    type: 'privacy' },
    { key: 'location_memo',          label: '소재지 관리자메모',  type: 'memo' },
    { key: 'address_detail',         label: '상세주소' },
    { key: 'address_detail_privacy', label: '상세주소 노출여부',  type: 'privacy' },
    { key: 'address_detail_memo',    label: '상세주소 관리자메모', type: 'memo' },
    { key: 'address_public',         label: '지번노출여부' },
  ]},
  { title: '옵션', fields: [
    { key: 'opt_ac',       label: '에어컨' },
    { key: 'opt_general',  label: '일반옵션' },
    { key: 'opt_security', label: '보안옵션' },
    { key: 'opt_extra',    label: '기타옵션' },
    { key: 'opt_parking',  label: '주차옵션' },
  ]},
  { title: '상세정보', fields: [
    { key: 'description', label: '매물 상세정보', type: 'long' },
  ]},
  { title: '🔒 관리자 전용', fields: [
    { key: 'admin_memo', label: '관리자메모', type: 'memo' },
  ]},
];

// ── 그룹·탭 설정 (DB 추가 시 여기만 수정) ────────
const TAB_GROUPS = [
  {
    id: 'apt',
    label: '아파트',
    tabs: [
      {
        id: 'apt-sale',
        label: '매매',
        typeLabel: '아파트 매매',
        api: '/api/apt-sale/list',
        editKey: 'apt_edit_item',
        editRoute: id => `/admin2/apt-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'apt_name',      label: '아파트명' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',   label: '매매가격',  type: 'price' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'maintenance',  label: '관리비',    type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_APT,
        ],
      },
      {
        id: 'apt-wolse',
        label: '월세',
        typeLabel: '아파트 월세',
        api: '/api/apt-wolse/list',
        editKey: 'apt_wolse_edit_item',
        editRoute: id => `/admin2/apt-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'apt_name',      label: '아파트명' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금',  type: 'price' },
            { key: 'monthly_rent', label: '월세',    type: 'price' },
            { key: 'loan_info',    label: '융자금',  type: 'num' },
            { key: 'maintenance',  label: '관리비',  type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_APT,
        ],
      },
      {
        id: 'apt-lease',
        label: '전세',
        typeLabel: '아파트 전세',
        api: '/api/apt-lease/list',
        editKey: 'apt_lease_edit_item',
        editRoute: id => `/admin2/apt-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'apt_name',      label: '아파트명' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'maintenance',  label: '관리비',   type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_APT,
        ],
      },
    ],
  },
  {
    id: 'ofc',
    label: '오피스텔',
    tabs: [
      {
        id: 'ofc-sale',
        label: '매매',
        typeLabel: '오피스텔 매매',
        api: '/api/ofc-sale/list',
        editKey: 'ofc_sale_edit_item',
        editRoute: id => `/admin2/ofc-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'ofc_name',      label: '오피스텔명' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',   label: '매매가격',  type: 'price' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'maintenance',  label: '관리비',    type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_OFC,
        ],
      },
      {
        id: 'ofc-lease',
        label: '전세',
        typeLabel: '오피스텔 전세',
        api: '/api/ofc-lease/list',
        editKey: 'ofc_lease_edit_item',
        editRoute: id => `/admin2/ofc-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'ofc_name',      label: '오피스텔명' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'maintenance',  label: '관리비',   type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_OFC,
        ],
      },
      {
        id: 'ofc-wolse',
        label: '월세',
        typeLabel: '오피스텔 월세',
        api: '/api/ofc-wolse/list',
        editKey: 'ofc_wolse_edit_item',
        editRoute: id => `/admin2/ofc-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'ofc_name',      label: '오피스텔명' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금', type: 'price' },
            { key: 'monthly_rent', label: '월세',   type: 'price' },
            { key: 'loan_info',    label: '융자금', type: 'num' },
            { key: 'maintenance',  label: '관리비', type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_OFC,
        ],
      },
    ],
  },
  {
    id: 'hse',
    label: '단독주택',
    tabs: [
      {
        id: 'hse-sale',
        label: '매매',
        typeLabel: '단독주택 매매',
        api: '/api/hse-sale/list',
        editKey: 'hse_sale_edit_item',
        editRoute: id => `/admin2/hse-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',        label: '매매가격',      type: 'price' },
            { key: 'curr_jeonse',       label: '현전세보증금',  type: 'num' },
            { key: 'curr_monthly_rent', label: '현전월세',      type: 'num' },
            { key: 'loan_info',         label: '융자금',        type: 'num' },
            { key: 'maintenance',       label: '관리비',        type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_HSE_SALE,
        ],
      },
      {
        id: 'hse-lease',
        label: '전세',
        typeLabel: '단독주택 전세',
        api: '/api/hse-lease/list',
        editKey: 'hse_lease_edit_item',
        editRoute: id => `/admin2/hse-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'maintenance',  label: '관리비',   type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_HSE_RENTAL,
        ],
      },
      {
        id: 'hse-wolse',
        label: '월세',
        typeLabel: '단독주택 월세',
        api: '/api/hse-wolse/list',
        editKey: 'hse_wolse_edit_item',
        editRoute: id => `/admin2/hse-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금', type: 'price' },
            { key: 'monthly_rent', label: '월세',   type: 'price' },
            { key: 'loan_info',    label: '융자금', type: 'num' },
            { key: 'maintenance',  label: '관리비', type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_HSE_RENTAL,
        ],
      },
    ],
  },
  {
    id: 'dgu',
    label: '다가구',
    tabs: [
      {
        id: 'dgu-sale',
        label: '매매',
        typeLabel: '다가구 매매',
        api: '/api/dgu-sale/list',
        editKey: 'dgu_sale_edit_item',
        editRoute: id => `/admin2/dgu-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',        label: '매매가격',   type: 'price' },
            { key: 'curr_jeonse',       label: '현보증금',   type: 'num' },
            { key: 'curr_monthly_rent', label: '현월세',     type: 'num' },
            { key: 'loan_info',         label: '융자금',     type: 'num' },
            { key: 'maintenance',       label: '관리비',     type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_DGU_SALE,
        ],
      },
      {
        id: 'dgu-lease',
        label: '전세',
        typeLabel: '다가구 전세',
        api: '/api/dgu-lease/list',
        editKey: 'dgu_lease_edit_item',
        editRoute: id => `/admin2/dgu-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'maintenance',  label: '관리비',   type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_DGU_RENTAL,
        ],
      },
      {
        id: 'dgu-wolse',
        label: '월세',
        typeLabel: '다가구 월세',
        api: '/api/dgu-wolse/list',
        editKey: 'dgu_wolse_edit_item',
        editRoute: id => `/admin2/dgu-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금', type: 'price' },
            { key: 'monthly_rent', label: '월세',   type: 'price' },
            { key: 'loan_info',    label: '융자금', type: 'num' },
            { key: 'maintenance',  label: '관리비', type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_DGU_RENTAL,
        ],
      },
    ],
  },
  {
    id: 'dse',
    label: '다세대',
    tabs: [
      {
        id: 'dse-sale',
        label: '매매',
        typeLabel: '다세대 매매',
        api: '/api/dse-sale/list',
        editKey: 'dse_sale_edit_item',
        editRoute: id => `/admin2/dse-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',   label: '매매가격',  type: 'price' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'maintenance',  label: '관리비',    type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_DSE,
        ],
      },
      {
        id: 'dse-lease',
        label: '전세',
        typeLabel: '다세대 전세',
        api: '/api/dse-lease/list',
        editKey: 'dse_lease_edit_item',
        editRoute: id => `/admin2/dse-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'maintenance',  label: '관리비',   type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_DSE,
        ],
      },
      {
        id: 'dse-wolse',
        label: '월세',
        typeLabel: '다세대 월세',
        api: '/api/dse-wolse/list',
        editKey: 'dse_wolse_edit_item',
        editRoute: id => `/admin2/dse-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금', type: 'price' },
            { key: 'monthly_rent', label: '월세',   type: 'price' },
            { key: 'loan_info',    label: '융자금', type: 'num' },
            { key: 'maintenance',  label: '관리비', type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_DSE,
        ],
      },
    ],
  },
  {
    id: 'rom',
    label: '원룸',
    tabs: [
      {
        id: 'rom-sale',
        label: '매매',
        typeLabel: '원룸 매매',
        api: '/api/rom-sale/list',
        editKey: 'rom_sale_edit_item',
        editRoute: id => `/admin2/rom-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',   label: '매매가격',  type: 'price' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'maintenance',  label: '관리비',    type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_ROM,
        ],
      },
      {
        id: 'rom-lease',
        label: '전세',
        typeLabel: '원룸 전세',
        api: '/api/rom-lease/list',
        editKey: 'rom_lease_edit_item',
        editRoute: id => `/admin2/rom-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'maintenance',  label: '관리비',   type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_ROM,
        ],
      },
      {
        id: 'rom-wolse',
        label: '월세',
        typeLabel: '원룸 월세',
        api: '/api/rom-wolse/list',
        editKey: 'rom_wolse_edit_item',
        editRoute: id => `/admin2/rom-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금', type: 'price' },
            { key: 'monthly_rent', label: '월세',   type: 'price' },
            { key: 'loan_info',    label: '융자금', type: 'num' },
            { key: 'maintenance',  label: '관리비', type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_ROM,
        ],
      },
    ],
  },
  {
    id: 'shp',
    label: '상가',
    tabs: [
      {
        id: 'shp-sale',
        label: '매매',
        typeLabel: '상가 매매',
        api: '/api/shp-sale/list',
        editKey: 'shp_sale_edit_item',
        editRoute: id => `/admin2/shp-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',   label: '매매가격',  type: 'price' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'manager_fee',  label: '관리금',    type: 'num' },
            { key: 'facility_fee', label: '시설금',    type: 'num' },
            { key: 'env_fee',      label: '환관리비',  type: 'num' },
          ]},
          ...COMMON_SECTIONS_SHP,
        ],
      },
      {
        id: 'shp-lease',
        label: '전세',
        typeLabel: '상가 전세',
        api: '/api/shp-lease/list',
        editKey: 'shp_lease_edit_item',
        editRoute: id => `/admin2/shp-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'manager_fee',  label: '관리금',   type: 'num' },
            { key: 'facility_fee', label: '시설금',   type: 'num' },
            { key: 'env_fee',      label: '환관리비', type: 'num' },
          ]},
          ...COMMON_SECTIONS_SHP,
        ],
      },
      {
        id: 'shp-wolse',
        label: '월세',
        typeLabel: '상가 월세',
        api: '/api/shp-wolse/list',
        editKey: 'shp_wolse_edit_item',
        editRoute: id => `/admin2/shp-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금',   type: 'price' },
            { key: 'monthly_rent', label: '월세',     type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'manager_fee',  label: '관리금',   type: 'num' },
            { key: 'facility_fee', label: '시설금',   type: 'num' },
            { key: 'env_fee',      label: '환관리비', type: 'num' },
          ]},
          ...COMMON_SECTIONS_SHP,
        ],
      },
    ],
  },
  {
    id: 'ofi',
    label: '사무실',
    tabs: [
      {
        id: 'ofi-sale',
        label: '매매',
        typeLabel: '사무실 매매',
        api: '/api/ofi-sale/list',
        editKey: 'ofi_sale_edit_item',
        editRoute: id => `/admin2/ofi-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',   label: '매매가격',   type: 'price' },
            { key: 'curr_deposit', label: '현보증금',   type: 'num' },
            { key: 'curr_monthly', label: '현월세',     type: 'num' },
            { key: 'loan_info',    label: '융자금',     type: 'num' },
            { key: 'monthly_fee',  label: '월관리비',   type: 'num' },
          ]},
          ...COMMON_SECTIONS_OFI,
        ],
      },
      {
        id: 'ofi-lease',
        label: '전세',
        typeLabel: '사무실 전세',
        api: '/api/ofi-lease/list',
        editKey: 'ofi_lease_edit_item',
        editRoute: id => `/admin2/ofi-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'manager_fee',  label: '관리금',   type: 'num' },
            { key: 'facility_fee', label: '시설금',   type: 'num' },
            { key: 'env_fee',      label: '환관리비', type: 'num' },
          ]},
          ...COMMON_SECTIONS_OFI,
        ],
      },
      {
        id: 'ofi-wolse',
        label: '월세',
        typeLabel: '사무실 월세',
        api: '/api/ofi-wolse/list',
        editKey: 'ofi_wolse_edit_item',
        editRoute: id => `/admin2/ofi-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id',   label: '매물번호' },
            { key: 'category',      label: '분류' },
            { key: 'transaction',   label: '거래종류' },
            { key: 'title',         label: '제목/특징' },
            { key: 'location',      label: '소재지' },
            { key: 'move_in',       label: '입주가능일' },
            { key: 'approval_date', label: '사용승인일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금',   type: 'price' },
            { key: 'monthly_rent', label: '월세',     type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'manager_fee',  label: '관리금',   type: 'num' },
            { key: 'facility_fee', label: '시설금',   type: 'num' },
            { key: 'env_fee',      label: '환관리비', type: 'num' },
          ]},
          ...COMMON_SECTIONS_OFI,
        ],
      },
    ],
  },
  {
    id: 'fac',
    label: '공장/창고',
    tabs: [
      {
        id: 'fac-sale',
        label: '매매',
        typeLabel: '공장/창고 매매',
        api: '/api/fac-sale/list',
        editKey: 'fac_sale_edit_item',
        editRoute: id => `/admin2/fac-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'sale_price',   label: '매매가격',  type: 'num' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'monthly_fee',  label: '월관리비',  type: 'num' },
          ]},
          ...COMMON_SECTIONS_FAC,
        ],
      },
      {
        id: 'fac-lease',
        label: '전세',
        typeLabel: '공장/창고 전세',
        api: '/api/fac-lease/list',
        editKey: 'fac_lease_edit_item',
        editRoute: id => `/admin2/fac-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'jeonse_price', label: '전세가격', type: 'num' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'monthly_fee',  label: '월관리비', type: 'num' },
          ]},
          ...COMMON_SECTIONS_FAC,
        ],
      },
      {
        id: 'fac-wolse',
        label: '월세',
        typeLabel: '공장/창고 월세',
        api: '/api/fac-wolse/list',
        editKey: 'fac_wolse_edit_item',
        editRoute: id => `/admin2/fac-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'deposit',      label: '보증금',    type: 'num' },
            { key: 'monthly_rent', label: '월세',      type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'monthly_fee',  label: '월관리비',  type: 'num' },
          ]},
          ...COMMON_SECTIONS_FAC,
        ],
      },
    ],
  },
  {
    id: 'bld',
    label: '빌딩/건물',
    tabs: [
      {
        id: 'bld-sale',
        label: '매매',
        typeLabel: '빌딩/건물 매매',
        api: '/api/bld-sale/list',
        editKey: 'bld_sale_edit_item',
        editRoute: id => `/admin2/bld-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'category',     label: '매물분류' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'sale_price',   label: '매매가격',  type: 'num' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'monthly_fee',  label: '월관리비',  type: 'num' },
          ]},
          ...COMMON_SECTIONS_BLD,
        ],
      },
      {
        id: 'bld-lease',
        label: '전세',
        typeLabel: '빌딩/건물 전세',
        api: '/api/bld-lease/list',
        editKey: 'bld_lease_edit_item',
        editRoute: id => `/admin2/bld-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'category',     label: '매물분류' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'jeonse_price', label: '전세가격', type: 'num' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'monthly_fee',  label: '월관리비', type: 'num' },
          ]},
          ...COMMON_SECTIONS_BLD,
        ],
      },
      {
        id: 'bld-wolse',
        label: '월세',
        typeLabel: '빌딩/건물 월세',
        api: '/api/bld-wolse/list',
        editKey: 'bld_wolse_edit_item',
        editRoute: id => `/admin2/bld-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'category',     label: '매물분류' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'deposit',      label: '보증금',    type: 'num' },
            { key: 'monthly_rent', label: '월세',      type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'monthly_fee',  label: '월관리비',  type: 'num' },
          ]},
          ...COMMON_SECTIONS_BLD,
        ],
      },
    ],
  },
  {
    id: 'lnd',
    label: '토지',
    tabs: [
      {
        id: 'lnd-sale',
        label: '매매',
        typeLabel: '토지 매매',
        api: '/api/lnd-sale/list',
        editKey: 'lnd_sale_edit_item',
        editRoute: id => `/admin2/lnd-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'transaction',  label: '거래종류' },
            { key: 'sub_category', label: '세부지목' },
            { key: 'land_area',    label: '면적(㎡)',   type: 'num' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'sale_price',   label: '매매가격',  type: 'price' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'monthly_fee',  label: '월관리비',  type: 'num' },
          ]},
          ...COMMON_SECTIONS_LND,
        ],
      },
      {
        id: 'lnd-lease',
        label: '전세',
        typeLabel: '토지 전세',
        api: '/api/lnd-lease/list',
        editKey: 'lnd_lease_edit_item',
        editRoute: id => `/admin2/lnd-lease/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'transaction',  label: '거래종류' },
            { key: 'sub_category', label: '세부지목' },
            { key: 'land_area',    label: '면적(㎡)',   type: 'num' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'jeonse_price', label: '전세가격', type: 'price' },
            { key: 'loan_info',    label: '융자금',   type: 'num' },
            { key: 'monthly_fee',  label: '월관리비', type: 'num' },
          ]},
          ...COMMON_SECTIONS_LND,
        ],
      },
      {
        id: 'lnd-wolse',
        label: '월세',
        typeLabel: '토지 월세',
        api: '/api/lnd-wolse/list',
        editKey: 'lnd_wolse_edit_item',
        editRoute: id => `/admin2/lnd-wolse/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'transaction',  label: '거래종류' },
            { key: 'sub_category', label: '세부지목' },
            { key: 'land_area',    label: '면적(㎡)',   type: 'num' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
          ]},
          { title: '가격 정보', fields: [
            { key: 'deposit',      label: '보증금',    type: 'price' },
            { key: 'monthly_rent', label: '월세',      type: 'price' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'monthly_fee',  label: '월관리비',  type: 'num' },
          ]},
          ...COMMON_SECTIONS_LND,
        ],
      },
    ],
  },
  {
    id: 'rdv',
    label: '재개발',
    tabs: [
      {
        id: 'rdv-sale',
        label: '매매',
        typeLabel: '재개발 매매',
        api: '/api/rdv-sale/list',
        editKey: 'rdv_sale_edit_item',
        editRoute: id => `/admin2/rdv-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'sub_type',     label: '세부유형' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'sale_price',   label: '매매가격',  type: 'price' },
            { key: 'curr_deposit', label: '현보증금',  type: 'num' },
            { key: 'curr_monthly', label: '현월세',    type: 'num' },
            { key: 'loan_info',    label: '융자금',    type: 'num' },
            { key: 'maintenance',  label: '관리비',    type: 'num' },
            { key: 'maintenance_note',  label: '관리비 상세' },
            { key: 'maintenance_items', label: '관리비 포함항목', type: 'tags' },
          ]},
          ...COMMON_SECTIONS_RDV,
        ],
      },
    ],
  },
  {
    id: 'prs',
    label: '분양권',
    tabs: [
      {
        id: 'prs-sale',
        label: '매매',
        typeLabel: '분양권 매매',
        api: '/api/prs-sale/list',
        editKey: 'prs_sale_edit_item',
        editRoute: id => `/admin2/prs-sale/edit/${id}`,
        detailSections: [
          { title: '기본 정보', fields: [
            { key: 'property_id', label: '매물번호' },
            { key: 'title',       label: '매물제목/특징' },
            { key: 'location',    label: '소재지' },
          ]},
          ...COMMON_SECTIONS_PRS,
        ],
      },
    ],
  },
];

// 전체 탭 목록 (flat)
const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);

// ── 가격 포맷 ─────────────────────────────────────
function formatPrice(n) {
  if (n == null) return '—';
  if (n >= 10000) {
    const uk  = Math.floor(n / 10000);
    const man = n % 10000;
    return `${uk}억${man ? ` ${man.toLocaleString()}만` : ''}`;
  }
  return `${n.toLocaleString()}만원`;
}

// ── 블로그 포스팅 모달 ─────────────────────────────
function BlogPostModal({ item, onClose }) {
  const [step, setStep] = useState('select'); // select | generating | preview | preview_multi | creds_tistory | creds_wp | publishing | done
  const [platform, setPlatform] = useState(null);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postFormat, setPostFormat] = useState('html');
  const [error, setError] = useState('');
  const [publishUrl, setPublishUrl] = useState('');
  const [previewMode, setPreviewMode] = useState('edit');
  // 멀티 발행용
  const [multiData, setMultiData] = useState(null); // { naver, tistory, wordpress }
  const [multiTab, setMultiTab] = useState('naver');
  const [multiPreviewMode, setMultiPreviewMode] = useState({ naver: 'edit', tistory: 'edit', wordpress: 'edit' });

  const [creds, setCreds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('realhm_blog_creds') || '{}'); } catch { return {}; }
  });
  const [tcBlog, setTcBlog] = useState('');
  const [tcToken, setTcToken] = useState('');
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpPass, setWpPass] = useState('');

  useEffect(() => {
    setTcBlog(creds.tistory_blog || '');
    setTcToken(creds.tistory_token || '');
    setWpUrl(creds.wp_url || '');
    setWpUser(creds.wp_user || '');
    setWpPass(creds.wp_pass || '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate(pl) {
    setPlatform(pl);
    setStep('generating');
    setError('');
    try {
      const res = await fetch('/api/blog-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: item, platform: pl }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.multi) {
        setMultiData(data);
        setMultiTab('naver');
        setMultiPreviewMode({ naver: 'edit', tistory: 'edit', wordpress: 'edit' });
        setStep('preview_multi');
      } else {
        setPostTitle(data.title || '');
        setPostContent(data.content || '');
        setPostFormat(data.format || 'html');
        setPreviewMode('edit');
        setStep('preview');
      }
    } catch (e) {
      setError('생성 실패: ' + e.message);
      setStep('select');
    }
  }

  function handleCopyNaver() {
    const copyText = postFormat === 'text'
      ? `${postTitle}\n\n${postContent}`
      : `<h2>${postTitle}</h2>\n${postContent}`;
    navigator.clipboard?.writeText(copyText).catch(() => {});
    const msg = postFormat === 'text'
      ? '✅ 클립보드에 복사되었습니다!\n\n네이버 블로그 → 글쓰기 → 텍스트 에디터에 붙여넣기 하세요.'
      : '✅ 클립보드에 복사되었습니다!\n\n네이버 블로그 → 글쓰기 → HTML 에디터에 붙여넣기 하세요.';
    alert(msg);
  }

  async function doPublish(activeCreds) {
    setStep('publishing');
    setError('');
    try {
      const res = await fetch('/api/blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          title: postTitle,
          content: postContent,
          tistory_blog:  activeCreds.tistory_blog,
          tistory_token: activeCreds.tistory_token,
          wp_url:  activeCreds.wp_url,
          wp_user: activeCreds.wp_user,
          wp_pass: activeCreds.wp_pass,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPublishUrl(data.url || '');
      setStep('done');
    } catch (e) {
      setError('발행 실패: ' + e.message);
      setStep('preview');
    }
  }

  function handlePublishClick() {
    if (platform === 'naver') { handleCopyNaver(); return; }
    if (platform === 'tistory' && (!creds.tistory_blog || !creds.tistory_token)) { setStep('creds_tistory'); return; }
    if (platform === 'wordpress' && (!creds.wp_url || !creds.wp_user || !creds.wp_pass)) { setStep('creds_wp'); return; }
    doPublish(creds);
  }

  function saveTistoryCreds() {
    const next = { ...creds, tistory_blog: tcBlog, tistory_token: tcToken };
    setCreds(next);
    localStorage.setItem('realhm_blog_creds', JSON.stringify(next));
    doPublish(next);
  }

  function saveWpCreds() {
    const next = { ...creds, wp_url: wpUrl, wp_user: wpUser, wp_pass: wpPass };
    setCreds(next);
    localStorage.setItem('realhm_blog_creds', JSON.stringify(next));
    doPublish(next);
  }

  const platformLabels = { naver: '네이버 블로그', tistory: '티스토리', wordpress: '워드프레스' };
  const platformColors = { naver: '#03C75A', tistory: '#f15922', wordpress: '#21759b' };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <style>{`@keyframes bpSpin{to{transform:rotate(360deg)}}.bp-spin{animation:bpSpin .8s linear infinite}`}</style>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#faf7f4', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#2a3e3f', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✍️ AI 블로그 포스팅
            {platform && step !== 'select' && (
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 400 }}>— {platformLabels[platform]}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#888', lineHeight: 1, padding: '0 2px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* 플랫폼 선택 */}
          {step === 'select' && (
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.6' }}>
                매물 정보를 분석해 블로그 포스팅 내용을 자동 생성합니다. 내용을 확인한 후 발행할 수 있습니다.
              </p>
              {/* 3개 동시 발행 */}
              <button onClick={() => handleGenerate('all')}
                style={{ width: '100%', padding: '14px 20px', marginBottom: '12px', background: 'linear-gradient(135deg,#1a2e2f,#2d4e50)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '22px' }}>🚀</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>3개 플랫폼 동시 발행 (중복방지)</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>네이버·티스토리·워드프레스 — 제목·도입부·마무리를 각각 다르게 생성</div>
                </div>
              </button>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { id: 'naver', label: '네이버 블로그', desc: '내용 생성 → 클립보드 복사', icon: 'N', color: '#03C75A' },
                  { id: 'tistory', label: '티스토리', desc: 'HTML 생성 → 붙여넣기', icon: 'T', color: '#f15922' },
                  { id: 'wordpress', label: '워드프레스', desc: 'HTML 생성 → REST API 발행', icon: 'W', color: '#21759b' },
                ].map(pl => (
                  <button key={pl.id} onClick={() => handleGenerate(pl.id)}
                    style={{ flex: '1 1 160px', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = pl.color; e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}>
                    <div style={{ width: '34px', height: '34px', background: pl.color, color: '#fff', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '17px', marginBottom: '8px' }}>{pl.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937', marginBottom: '3px' }}>{pl.label}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>{pl.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 생성 중 */}
          {step === 'generating' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div className="bp-spin" style={{ width: '44px', height: '44px', border: '4px solid #f3f4f6', borderTopColor: '#2a3e3f', borderRadius: '50%', margin: '0 auto 18px' }} />
              <p style={{ fontSize: '15px', color: '#374151', fontWeight: 600, margin: '0 0 6px' }}>포스팅 내용을 생성 중입니다...</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>매물 정보를 분석하여 최적화된 내용을 작성합니다.</p>
            </div>
          )}

          {/* 미리보기 / 편집 */}
          {step === 'preview' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>제목</label>
                <input value={postTitle} onChange={e => setPostTitle(e.target.value)} style={{ ...inputStyle, fontSize: '14px', fontWeight: 600 }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={labelStyle}>
                    내용
                    <span style={{ marginLeft: '6px', padding: '2px 7px', background: postFormat === 'text' ? '#fffbeb' : '#eff6ff', color: postFormat === 'text' ? '#92400e' : '#1d4ed8', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                      {postFormat === 'text' ? 'TEXT' : 'HTML'}
                    </span>
                  </label>
                  {postFormat === 'html' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['edit', 'preview'].map(m => (
                        <button key={m} onClick={() => setPreviewMode(m)}
                          style={{ padding: '3px 10px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '4px', background: previewMode === m ? '#2a3e3f' : '#fff', color: previewMode === m ? '#fff' : '#374151', cursor: 'pointer' }}>
                          {m === 'edit' ? '편집' : '미리보기'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {postFormat === 'text' ? (
                  <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                    style={{ width: '100%', height: '380px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: "'Noto Sans KR', sans-serif", lineHeight: '1.7', resize: 'vertical', boxSizing: 'border-box', outline: 'none', whiteSpace: 'pre-wrap' }} />
                ) : previewMode === 'edit' ? (
                  <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                    style={{ width: '100%', height: '380px', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.5', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                ) : (
                  <div style={{ height: '380px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'auto', padding: '14px' }}
                    dangerouslySetInnerHTML={{ __html: postContent }} />
                )}
              </div>
            </div>
          )}

          {/* 3개 동시 미리보기 */}
          {step === 'preview_multi' && multiData && (() => {
            const tabs = [
              { id: 'naver', label: '네이버', color: '#03C75A' },
              { id: 'tistory', label: '티스토리', color: '#f15922' },
              { id: 'wordpress', label: '워드프레스', color: '#21759b' },
            ];
            const cur = multiData[multiTab];
            const isText = cur.format === 'text';
            const pm = multiPreviewMode[multiTab];
            return (
              <div>
                {/* 탭 */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setMultiTab(t.id)}
                      style={{ flex: 1, padding: '8px', border: `2px solid ${multiTab === t.id ? t.color : '#e5e7eb'}`, borderRadius: '8px', background: multiTab === t.id ? t.color : '#fff', color: multiTab === t.id ? '#fff' : '#374151', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* 제목 */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>제목</label>
                  <input value={cur.title} onChange={e => setMultiData(prev => ({ ...prev, [multiTab]: { ...prev[multiTab], title: e.target.value } }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box', outline: 'none' }} />
                </div>
                {/* 내용 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                      내용 <span style={{ marginLeft: '6px', padding: '2px 7px', background: isText ? '#fffbeb' : '#eff6ff', color: isText ? '#92400e' : '#1d4ed8', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>{isText ? 'TEXT' : 'HTML'}</span>
                    </label>
                    {!isText && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['edit', 'preview'].map(m => (
                          <button key={m} onClick={() => setMultiPreviewMode(prev => ({ ...prev, [multiTab]: m }))}
                            style={{ padding: '3px 10px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '4px', background: pm === m ? '#2a3e3f' : '#fff', color: pm === m ? '#fff' : '#374151', cursor: 'pointer' }}>
                            {m === 'edit' ? '편집' : '미리보기'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isText ? (
                    <textarea value={cur.content} onChange={e => setMultiData(prev => ({ ...prev, [multiTab]: { ...prev[multiTab], content: e.target.value } }))}
                      style={{ width: '100%', height: '340px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', lineHeight: '1.7', resize: 'vertical', boxSizing: 'border-box', outline: 'none', whiteSpace: 'pre-wrap' }} />
                  ) : pm === 'edit' ? (
                    <textarea value={cur.content} onChange={e => setMultiData(prev => ({ ...prev, [multiTab]: { ...prev[multiTab], content: e.target.value } }))}
                      style={{ width: '100%', height: '340px', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.5', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                  ) : (
                    <div style={{ height: '340px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'auto', padding: '14px' }}
                      dangerouslySetInnerHTML={{ __html: cur.content }} />
                  )}
                </div>
                {/* 복사 버튼 (네이버) */}
                {multiTab === 'naver' && (
                  <button onClick={() => {
                    navigator.clipboard?.writeText(`${cur.title}\n\n${cur.content}`).catch(() => {});
                    alert('✅ 네이버 클립보드 복사 완료!\n\n네이버 블로그 → 글쓰기에 붙여넣기 하세요.');
                  }} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#03C75A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    📋 네이버 클립보드 복사
                  </button>
                )}
                {multiTab === 'tistory' && (
                  <button onClick={() => {
                    navigator.clipboard?.writeText(cur.content).catch(() => {});
                    alert('✅ 티스토리 HTML 복사 완료!\n\n티스토리 → 글쓰기 → HTML 에디터에 붙여넣기 하세요.');
                  }} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#f15922', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    📋 티스토리 HTML 복사
                  </button>
                )}
                {multiTab === 'wordpress' && (
                  <button onClick={() => {
                    navigator.clipboard?.writeText(cur.content).catch(() => {});
                    alert('✅ 워드프레스 HTML 복사 완료!\n\n워드프레스 → 글쓰기 → HTML 에디터에 붙여넣기 하세요.');
                  }} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#21759b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    📋 워드프레스 HTML 복사
                  </button>
                )}
              </div>
            );
          })()}

          {/* 티스토리 인증 */}
          {step === 'creds_tistory' && (
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '18px', lineHeight: '1.6' }}>
                티스토리 발행에 필요한 정보를 입력해주세요. 최초 1회 입력하면 저장됩니다.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>블로그명 <span style={{ color: '#9ca3af', fontWeight: 400 }}>(예: myblog → myblog.tistory.com)</span></label>
                  <input value={tcBlog} onChange={e => setTcBlog(e.target.value)} placeholder="your-blog-name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>액세스 토큰</label>
                  <input value={tcToken} onChange={e => setTcToken(e.target.value)} type="password" placeholder="Tistory Access Token" style={inputStyle} />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>티스토리 관리 → 설정 → Open API → 인증 토큰 확인</p>
                </div>
              </div>
            </div>
          )}

          {/* 워드프레스 인증 */}
          {step === 'creds_wp' && (
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '18px', lineHeight: '1.6' }}>
                WordPress 발행에 필요한 정보를 입력해주세요. 최초 1회 입력하면 저장됩니다.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>사이트 주소</label>
                  <input value={wpUrl} onChange={e => setWpUrl(e.target.value)} placeholder="https://your-blog.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>사용자명</label>
                  <input value={wpUser} onChange={e => setWpUser(e.target.value)} placeholder="admin" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>애플리케이션 비밀번호</label>
                  <input value={wpPass} onChange={e => setWpPass(e.target.value)} type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" style={inputStyle} />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>워드프레스 → 사용자 → 내 프로필 → 애플리케이션 비밀번호 생성</p>
                </div>
              </div>
            </div>
          )}

          {/* 발행 중 */}
          {step === 'publishing' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div className="bp-spin" style={{ width: '44px', height: '44px', border: '4px solid #f3f4f6', borderTopColor: '#2a3e3f', borderRadius: '50%', margin: '0 auto 18px' }} />
              <p style={{ fontSize: '15px', color: '#374151', fontWeight: 600, margin: 0 }}>블로그에 발행 중입니다...</p>
            </div>
          )}

          {/* 완료 */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
              <p style={{ fontSize: '17px', color: '#059669', fontWeight: 700, margin: '0 0 8px' }}>발행 완료!</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>블로그에 포스팅이 성공적으로 등록되었습니다.</p>
              {publishUrl && (
                <a href={publishUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#f0fdf4', border: '1px solid #86efac', color: '#059669', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  블로그에서 확인 →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview_multi' && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f0ebe4', display: 'flex', justifyContent: 'flex-start', flexShrink: 0 }}>
            <button onClick={() => setStep('select')}
              style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
              ← 이전
            </button>
          </div>
        )}
        {(step === 'preview' || step === 'creds_tistory' || step === 'creds_wp') && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f0ebe4', display: 'flex', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => setStep(step === 'preview' ? 'select' : 'preview')}
              style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
              ← 이전
            </button>

            {step === 'preview' && (
              <button onClick={handlePublishClick}
                style={{ padding: '8px 22px', background: platformColors[platform] || '#2a3e3f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {platform === 'naver' ? '📋 클립보드 복사' : '🚀 발행하기'}
              </button>
            )}

            {step === 'creds_tistory' && (
              <button onClick={saveTistoryCreds} disabled={!tcBlog || !tcToken}
                style={{ padding: '8px 22px', background: !tcBlog || !tcToken ? '#d1d5db' : '#f15922', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: !tcBlog || !tcToken ? 'not-allowed' : 'pointer' }}>
                저장 후 발행
              </button>
            )}

            {step === 'creds_wp' && (
              <button onClick={saveWpCreds} disabled={!wpUrl || !wpUser || !wpPass}
                style={{ padding: '8px 22px', background: !wpUrl || !wpUser || !wpPass ? '#d1d5db' : '#21759b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: !wpUrl || !wpUser || !wpPass ? 'not-allowed' : 'pointer' }}>
                저장 후 발행
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── 상세 모달 ─────────────────────────────────────
function DetailModal({ item, detailSections, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  const catStyle = CATEGORY_COLORS[item.category] || { bg: '#f3f4f6', color: '#374151' };
  const txStyle  = TX_COLORS[item.transaction]    || { bg: '#f3f4f6', color: '#374151' };
  const modalTitle = item.title || item.apt_name || item.building_name || '';
  const hasMap = item.map_lat && item.map_lng;
  const mapLat = item.map_lat;
  const mapLng = item.map_lng;

  const [showBlogModal, setShowBlogModal] = useState(false);

  const imageUrls = item.imageUrls?.length ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : []);
  const youtubeId = getYouTubeId(item.youtube_url);
  const slides = [
    ...(youtubeId ? [{ type: 'youtube', id: youtubeId }] : []),
    ...imageUrls.map(url => ({ type: 'photo', url })),
  ];
  const [slideIdx, setSlideIdx] = useState(0);
  const prevSlide = () => setSlideIdx(i => (i - 1 + slides.length) % slides.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % slides.length);
  const currentSlide = slides[slideIdx];

  const portal = createPortal(
    <div className={modalStyles.pvOverlay} onClick={onClose}>
      <div className={modalStyles.pvBox} onClick={e => e.stopPropagation()}>

        <button className={modalStyles.pvClose} onClick={onClose}>✕</button>

        <div className={modalStyles.pvLayout}>
          {/* 사진/영상 슬라이더 */}
          <div className={modalStyles.pvPhotoCol}>
            <div className={modalStyles.pvPhotoMain}>
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
                    <img src={currentSlide.url} alt="매물사진" className={modalStyles.pvPhotoImg} />
                  )}
                  {slides.length > 1 && (
                    <>
                      <button onClick={prevSlide} className={modalStyles.pvSlidePrev}>&#8249;</button>
                      <button onClick={nextSlide} className={modalStyles.pvSlideNext}>&#8250;</button>
                      <div className={modalStyles.pvSlideCount}>{slideIdx + 1} / {slides.length}</div>
                    </>
                  )}
                </>
              ) : (
                <div className={modalStyles.pvPhotoArea}>
                  <span className={modalStyles.pvPhotoGhost}>사진없음</span>
                </div>
              )}
            </div>
            {slides.length > 1 && (
              <div className={modalStyles.pvThumbs}>
                {slides.map((s, i) => (
                  <div key={i} className={`${modalStyles.pvThumb} ${i === slideIdx ? modalStyles.pvThumbActive : ''}`} onClick={() => setSlideIdx(i)}>
                    <img src={s.type === 'youtube' ? `https://img.youtube.com/vi/${s.id}/mqdefault.jpg` : s.url} alt={`${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 데이터 */}
          <div className={modalStyles.pvDataCol}>
            <div className={modalStyles.pvMapBox}>
              {hasMap ? (
                <PreviewMap lat={mapLat} lng={mapLng} radius={0} />
              ) : (
                <span className={modalStyles.pvMapPlaceholder}>지도 위치 미등록</span>
              )}
            </div>
            <div className={modalStyles.pvDataScroll}>
              <div className={modalStyles.pvDataHeader}>
                <div className={modalStyles.pvHeaderSub}>
                  <span className={modalStyles.fBadge} style={{ background: catStyle.bg, color: catStyle.color }}>{item.category}</span>
                  <span className={modalStyles.fBadge} style={{ background: txStyle.bg,  color: txStyle.color  }}>{item.transaction}</span>
                  {item.contract_status && (
                    <span className={modalStyles.fBadge} style={{
                      background: item.contract_status === '계약진행중' ? '#fffbeb' : '#f0fdf4',
                      color:      item.contract_status === '계약진행중' ? '#92400e' : '#166534',
                    }}>{item.contract_status}</span>
                  )}
                </div>
                <div className={modalStyles.pvTitle}>{modalTitle || <span className={modalStyles.pvTitleEmpty}>매물제목 미입력</span>}</div>
              </div>

              {hasMap && (
                <div className={modalStyles.pvMobileMap}>
                  <PreviewMap lat={mapLat} lng={mapLng} radius={0} />
                </div>
              )}

              {detailSections.map(section => (
                <div key={section.title}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#a87b51', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 14px 4px', background: '#faf7f4', borderBottom: '1px solid #f0ebe4' }}>
                    {section.title}
                  </div>
                  {section.fields.map(f => {
                    const v = item[f.key];
                    let display;
                    if (f.type === 'price')        display = <span className={styles.dPrice}>{formatPrice(v)}</span>;
                    else if (f.type === 'num')      display = <span>{v != null ? v : '—'}</span>;
                    else if (f.type === 'privacy')  display = <span className={v === '비공개' ? styles.dPrivate : styles.dPublic}>{v || '—'}</span>;
                    else if (f.type === 'memo')     display = v && v !== '-' ? <span className={styles.dMemo}>{v}</span> : <span className={styles.dEmpty}>—</span>;
                    else if (f.type === 'long')     display = <span className={styles.dLong}>{v && v !== '-' ? v : '—'}</span>;
                    else if (f.type === 'tags')     display = v ? (
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {String(v).split(', ').filter(Boolean).map(tag => (
                          <span key={tag} style={{ display: 'inline-block', padding: '2px 8px', background: '#f4f0ec', border: '1px solid #e0d8cc', color: '#5a3e28', borderRadius: '5px', fontSize: '11.5px', fontWeight: 500, lineHeight: 1.5 }}>{tag}</span>
                        ))}
                      </span>
                    ) : <span className={styles.dEmpty}>—</span>;
                    else display = <span>{(!v || v === '-') ? '—' : v}</span>;
                    return (
                      <div key={f.key} className={modalStyles.pvRow}>
                        <div className={modalStyles.pvLabel}>{f.label}</div>
                        <div className={modalStyles.pvValue}>{display}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {item.blog_url && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                  <a href={item.blog_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#03C75A', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
                    onClick={e => e.stopPropagation()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 3h-9A4.5 4.5 0 003 7.5v9A4.5 4.5 0 007.5 21h9A4.5 4.5 0 0021 16.5v-9A4.5 4.5 0 0016.5 3zm-4.25 13.25c-2.9 0-5.25-2.35-5.25-5.25S9.35 5.75 12.25 5.75 17.5 8.1 17.5 11s-2.35 5.25-5.25 5.25zm0-8.5a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5z"/>
                    </svg>
                    블로그 바로가기
                  </a>
                </div>
              )}
              {/* AI 블로그 포스팅 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 16px' }}>
                <button onClick={() => setShowBlogModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: '#2a3e3f', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  ✍️ AI 블로그 포스팅
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
  return (
    <>
      {portal}
      {showBlogModal && <BlogPostModal item={item} onClose={() => setShowBlogModal(false)} />}
    </>
  );
}

// ── 메인 ─────────────────────────────────────────
export default function PropertiesPage() {
  const router = useRouter();

  const [allItems,     setAllItems]     = useState([]); // [{ item, tab }]
  const [loading,      setLoading]      = useState(true);
  const [activeGroup,  setActiveGroup]  = useState('all'); // 'all' | group.id
  const [activeTabId,  setActiveTabId]  = useState(null);  // tab.id | null
  const [query,        setQuery]        = useState('');
  const [selected,     setSelected]     = useState(null);
  const [selectedTab,  setSelectedTab]  = useState(null);
  const [currentPage,  setCurrentPage]  = useState(1);

  const PAGE_SIZE = 20;

  const lastFetchRef = useRef(0);

  // 페이지 진입 시 전체 DB 로드 (등록일 내림차순)
  useEffect(() => {
    function fetchAll(showLoading = true) {
      const now = Date.now();
      if (!showLoading && now - lastFetchRef.current < 15000) return;
      lastFetchRef.current = now;
      if (showLoading) setLoading(true);
      Promise.all(
        ALL_TABS.map(t =>
          fetch(t.api)
            .then(r => r.json())
            .then(data => data.map(item => ({ item, tab: t })))
            .catch(() => [])
        )
      ).then(chunks => {
        const contractOrder = { '계약가능': 0, '계약진행중': 1, '계약완료': 2 };
        const merged = chunks.flat().sort((a, b) => {
          const orderA = contractOrder[a.item.contract_status] ?? 0;
          const orderB = contractOrder[b.item.contract_status] ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return (b.item.created_time || '').localeCompare(a.item.created_time || '');
        });
        setAllItems(merged);
        if (showLoading) setLoading(false);
      });
    }

    fetchAll(true);

    function onVisible() {
      if (!document.hidden) fetchAll(false);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // 그룹 클릭
  function handleGroupClick(groupId) {
    if (groupId === 'all') {
      setActiveGroup('all');
      setActiveTabId(null);
    } else {
      const g = TAB_GROUPS.find(g => g.id === groupId);
      setActiveGroup(groupId);
      setActiveTabId(g.tabs[0].id); // 첫 번째 탭 기본 선택
    }
    setQuery('');
    setCurrentPage(1);
  }

  // 서브탭 클릭
  function handleSubTabClick(tabId) {
    setActiveTabId(tabId);
    setQuery('');
    setCurrentPage(1);
  }

  // 현재 그룹의 서브탭 목록
  const currentGroup = TAB_GROUPS.find(g => g.id === activeGroup);

  // 필터링
  const filtered = allItems
    .filter(({ tab }) => {
      if (activeGroup === 'all') return true;
      if (!activeTabId) return tab.id.startsWith(activeGroup);
      return tab.id === activeTabId;
    })
    .filter(({ item }) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const loc = typeof item.location === 'object' ? (item.location?.text || '') : (item.location || '');
      return (
        String(item.property_id  || '').toLowerCase().includes(q) ||
        String(loc               || '').toLowerCase().includes(q) ||
        String(item.category     || '').toLowerCase().includes(q) ||
        String(item.transaction  || '').toLowerCase().includes(q)
      );
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleEdit(item, tab) {
    sessionStorage.setItem(tab.editKey, JSON.stringify(item));
    router.push(tab.editRoute(item.id));
  }

  async function handleUpdateContractStatus(item, status) {
    const prev = item.contract_status;
    setAllItems(p => p.map(e =>
      e.item.id === item.id ? { ...e, item: { ...e.item, contract_status: status } } : e
    ));
    try {
      const res = await fetch('/api/update-contract-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: item.id, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAllItems(p => p.map(e =>
        e.item.id === item.id ? { ...e, item: { ...e.item, contract_status: prev } } : e
      ));
    }
  }

  async function handleToggleRec(item) {
    const next = !item.recommended;
    // 낙관적 업데이트: 즉시 UI 반영
    setAllItems(prev => prev.map(entry =>
      entry.item.id === item.id
        ? { ...entry, item: { ...entry.item, recommended: next } }
        : entry
    ));
    try {
      const res = await fetch('/api/toggle-recommended', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: item.id, recommended: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // 실패 시 롤백
      setAllItems(prev => prev.map(entry =>
        entry.item.id === item.id
          ? { ...entry, item: { ...entry.item, recommended: !next } }
          : entry
      ));
    }
  }

  return (
    <div className={styles.page}>
      {/* 상단 고정 헤더 */}
      <div className={styles.stickyHeader}>
        {/* 상단 바 */}
        <div className={styles.topbar}>
          <button className={styles.backBtn} onClick={() => router.push('/admin2')}>← 관리자2</button>
          <span className={styles.topTitle}>등록된 매물 전체보기</span>
          <span className={styles.count}>{loading ? '…' : `${filtered.length}건`}</span>
        </div>

        {/* 매물번호 검색 */}
        <div className={styles.globalSearchBar}>
          <div className={styles.globalSearchWrap}>
            <span className={styles.globalSearchIcon}>🔍</span>
            <input
              className={styles.globalSearchInput}
              type="text"
              placeholder="매물번호 · 소재지 · 매물분류 · 거래종류 검색"
              value={query}
              onChange={e => { setQuery(e.target.value); setCurrentPage(1); }}
            />
            {query && (
              <button className={styles.globalSearchClear} onClick={() => setQuery('')}>✕</button>
            )}
          </div>
        </div>

        {/* 1단: 대분류 탭 */}
        <div className={styles.groupBar}>
          <button
            className={`${styles.groupBtn} ${activeGroup === 'all' ? styles.groupBtnActive : ''}`}
            onClick={() => handleGroupClick('all')}
          >
            전체
          </button>
          {TAB_GROUPS.map(g => (
            <button
              key={g.id}
              className={`${styles.groupBtn} ${activeGroup === g.id ? styles.groupBtnActive : ''}`}
              onClick={() => handleGroupClick(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* 2단: 거래유형 서브탭 (대분류 선택 시에만) */}
        {currentGroup && (
          <div className={styles.tabBar}>
            {currentGroup.tabs.map(t => (
              <button
                key={t.id}
                className={`${styles.tabBtn} ${activeTabId === t.id ? styles.tabBtnActive : ''}`}
                onClick={() => handleSubTabClick(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 목록 */}
      <div className={styles.body}>
        {loading && <div className={styles.status}>전체 DB 불러오는 중…</div>}
        {!loading && filtered.length === 0 && (
          <div className={styles.status}>
            {query ? `"${query}" 검색 결과가 없습니다.` : '등록된 매물이 없습니다.'}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>번호</th>
                  <th className={styles.th}>유형</th>
                  <th className={styles.th}>사진</th>
                  <th className={styles.th}>매물번호</th>
                  <th className={styles.th}>추천</th>
                  <th className={styles.th}>소재지</th>
                  <th className={styles.th}>등록일</th>
                  <th className={styles.th}>계약상태</th>
                  <th className={styles.th}>수정</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(({ item, tab }, idx) => (
                  <tr key={`${tab.id}-${item.id}-${idx}`} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className={styles.td}>
                      <span className={styles.typeLabel}>{tab.typeLabel}</span>
                    </td>
                    <td className={styles.td}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt="" className={styles.thumb} />
                        : <div className={styles.thumbEmpty} />}
                    </td>
                    <td className={styles.td}>
                      <button
                        className={styles.idBtn}
                        onClick={() => { setSelected(item); setSelectedTab(tab); }}
                      >
                        {item.property_id || '—'}
                      </button>
                    </td>
                    <td className={styles.td}>
                      <button
                        className={item.recommended ? styles.recBtnOn : styles.recBtnOff}
                        onClick={() => handleToggleRec(item)}
                        title={item.recommended ? '추천 해제' : '추천 설정'}
                      >
                        {item.recommended ? '★' : '☆'}
                      </button>
                    </td>
                    <td className={styles.td}>
                      <span>{item.location || '—'}</span>
                      {item.address_detail && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#78716c', marginTop: 2 }}>
                          {item.address_detail}
                        </span>
                      )}
                    </td>
                    <td className={styles.td}>
                      {item.created_time ? item.created_time.slice(0, 10) : '—'}
                    </td>
                    <td className={styles.td}>
                      <select
                        value={item.contract_status || '계약가능'}
                        onChange={e => handleUpdateContractStatus(item, e.target.value)}
                        style={{
                          fontSize: '0.75rem', padding: '4px 6px', borderRadius: 6,
                          border: '1.5px solid',
                          borderColor: item.contract_status === '계약완료' ? '#d1d5db'
                            : item.contract_status === '계약진행중' ? '#fbbf24' : '#86efac',
                          background: item.contract_status === '계약완료' ? '#f9fafb'
                            : item.contract_status === '계약진행중' ? '#fffbeb' : '#f0fdf4',
                          color: item.contract_status === '계약완료' ? '#6b7280'
                            : item.contract_status === '계약진행중' ? '#92400e' : '#166534',
                          fontWeight: 700, cursor: 'pointer', outline: 'none',
                        }}
                      >
                        <option value="계약가능">계약가능</option>
                        <option value="계약진행중">계약진행중</option>
                        <option value="계약완료">계약완료</option>
                      </select>
                    </td>
                    <td className={styles.td}>
                      <button
                        className={styles.editBtn}
                        onClick={() => handleEdit(item, tab)}
                      >수정</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && arr[i - 1] !== p - 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`dots-${i}`} className={styles.pageDots}>…</span>
                : <button
                    key={p}
                    className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >{p}</button>
              )}
            <button
              className={styles.pageBtn}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >다음</button>
            <span className={styles.pageInfo}>{filtered.length}건 / {currentPage}/{totalPages} 페이지</span>
          </div>
        )}
      </div>

      {selected && (
        <DetailModal
          item={selected}
          detailSections={selectedTab.detailSections}
          onClose={() => { setSelected(null); setSelectedTab(null); }}
        />
      )}
    </div>
  );
}
