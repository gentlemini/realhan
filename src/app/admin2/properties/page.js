'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './properties.module.css';

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
  { title: '면적', fields: [
    { key: 'land_area', label: '대지면적(㎡)', type: 'num' },
  ]},
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
            { key: 'sub_category', label: '세부지목' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'sale_price',   label: '매매가격',  type: 'num' },
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
            { key: 'sub_category', label: '세부지목' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'jeonse_price', label: '전세가격', type: 'num' },
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
            { key: 'sub_category', label: '세부지목' },
            { key: 'title',        label: '매물제목/특징' },
            { key: 'move_in',      label: '입주가능일' },
            { key: 'deposit',      label: '보증금',    type: 'num' },
            { key: 'monthly_rent', label: '월세',      type: 'num' },
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

// ── 상세 모달 ─────────────────────────────────────
function DetailModal({ item, detailSections, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTop}>
          <div className={styles.modalHeader}>
            <span className={styles.modalId}>{item.property_id}</span>
            <span className={styles.modalAptName}>{item.apt_name || '—'}</span>
            {item.title && <span className={styles.modalTitle}>{item.title}</span>}
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {item.imageUrl && (
            <div className={styles.modalPhoto}>
              <img src={item.imageUrl} alt="대표사진" className={styles.modalPhotoImg} />
            </div>
          )}
          {detailSections.map(section => (
            <div key={section.title} className={styles.section}>
              <div className={styles.sectionTitle}>{section.title}</div>
              <div className={styles.sectionGrid}>
                {section.fields.map(f => {
                  const v = item[f.key];
                  let display;
                  if (f.type === 'price')        display = <span className={styles.dPrice}>{formatPrice(v)}</span>;
                  else if (f.type === 'num')      display = <span>{v != null ? v : '—'}</span>;
                  else if (f.type === 'privacy')  display = <span className={v === '비공개' ? styles.dPrivate : styles.dPublic}>{v || '—'}</span>;
                  else if (f.type === 'memo')     display = v && v !== '-' ? <span className={styles.dMemo}>{v}</span> : <span className={styles.dEmpty}>—</span>;
                  else if (f.type === 'long')     display = <span className={styles.dLong}>{v && v !== '-' ? v : '—'}</span>;
                  else display = <span>{(!v || v === '-') ? '—' : v}</span>;
                  return (
                    <div key={f.key} className={styles.detailRow}>
                      <div className={styles.detailLabel}>{f.label}</div>
                      <div className={styles.detailValue}>{display}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
        const merged = chunks.flat().sort((a, b) =>
          (b.item.created_time || '').localeCompare(a.item.created_time || '')
        );
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
  }

  // 서브탭 클릭
  function handleSubTabClick(tabId) {
    setActiveTabId(tabId);
    setQuery('');
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

  function handleEdit(item, tab) {
    sessionStorage.setItem(tab.editKey, JSON.stringify(item));
    router.push(tab.editRoute(item.id));
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
            onChange={e => setQuery(e.target.value)}
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
                  <th className={styles.th}>유형</th>
                  <th className={styles.th}>사진</th>
                  <th className={styles.th}>매물번호</th>
                  <th className={styles.th}>추천</th>
                  <th className={styles.th}>소재지</th>
                  <th className={styles.th}>등록일</th>
                  <th className={styles.th}>수정</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ item, tab }, idx) => (
                  <tr key={`${tab.id}-${item.id}-${idx}`} className={styles.row}>
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
