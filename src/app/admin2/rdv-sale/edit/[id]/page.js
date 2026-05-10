'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const GridEditor = dynamic(() => import('../../GridEditor'), { ssr: false });

function itemToFormValues(item) {
  const fromDB = v => (!v || v === '-') ? '' : v;
  return {
    property_id:      item.property_id,
    recommended:      item.recommended || false,
    sub_type:         fromDB(item.sub_type),
    building_type:    fromDB(item.building_type),
    title:            fromDB(item.title),
    location: {
      text:      fromDB(item.location),
      privacy:   item.location_privacy || '노출',
      adminMemo: fromDB(item.location_memo),
    },
    address_detail: {
      text:      fromDB(item.address_detail),
      privacy:   item.address_detail_privacy || '노출',
      adminMemo: fromDB(item.address_detail_memo),
    },
    address_public:   item.address_public || '',
    total_floor_area: item.total_floor_area,
    land_area:        item.land_area,
    building_area:    item.building_area,
    expected_area:    item.expected_area,
    sale_price:       item.sale_price,
    curr_deposit:     item.curr_deposit,
    curr_monthly:     item.curr_monthly,
    loan_info:        item.loan_info,
    maintenance:      item.maintenance,

    maintenance_note:  fromDB(item.maintenance_note),
    maintenance_items: item.maintenance_items ? item.maintenance_items.split(', ').filter(Boolean) : [],    move_in:          fromDB(item.move_in),
    curr_floor: {
      text:      fromDB(item.curr_floor),
      privacy:   item.curr_floor_privacy || '공개',
      adminMemo: fromDB(item.curr_floor_memo),
    },
    above_floors:     item.above_floors,
    rooms:            item.rooms,
    bathrooms:        item.bathrooms,
    direction: {
      base: fromDB(item.direction_base),
      dir:  item.direction ? item.direction + '향' : '동향',
    },
    parking_yn:       item.parking_yn || '',
    total_parking:    item.total_parking,
    illegal_building: item.illegal_building || '',
    building_use:     fromDB(item.building_use),
    current_use:      fromDB(item.current_use),
    recommended_use:  fromDB(item.recommended_use),
    zoning:           fromDB(item.zoning),
    inspection_date:  fromDB(item.inspection_date),
    description:      fromDB(item.description),
    youtube_url:   fromDB(item.youtube_url),
    blog_url:      fromDB(item.blog_url),
    map_config: (item.map_lat && item.map_lng) ? {
      lat:       item.map_lat,
      lng:       item.map_lng,
      radius:    item.map_radius || 0,
      mapHidden: item.map_hidden || false,
    } : null,
    admin_memo: item.admin_memo && item.admin_memo !== '-' ? item.admin_memo : '',
    imageUrl:   item.imageUrl || '',
    imageUrls: Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : []),
  };
}

export default function EditPage() {
  const params  = useParams();
  const router  = useRouter();
  const [initialValues, setInitialValues] = useState(null);
  const [ready, setReady]                 = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    try {
      const freshFormKey = params.id + '_fresh_form';
      const freshForm = sessionStorage.getItem(freshFormKey);
      if (freshForm) {
        try { setInitialValues(JSON.parse(freshForm)); } catch {}
        sessionStorage.removeItem(freshFormKey);
        setReady(true);
        return;
      }
    } catch {}
    try {
      const stored = sessionStorage.getItem('rdv_sale_edit_item');
      if (stored) {
        const item = JSON.parse(stored);
        // Merge fresh image data from previous save if available
        try {
          const freshKey = 'fresh_images_' + params.id;
          const fresh = sessionStorage.getItem(freshKey);
          if (fresh) {
            const { imageUrl, imageUrls } = JSON.parse(fresh);
            item.imageUrl = imageUrl;
            item.imageUrls = imageUrls;
            sessionStorage.removeItem(freshKey);
          }
        } catch {}
        setInitialValues(itemToFormValues(item));
      } else {
        setError('데이터를 찾을 수 없습니다. 목록으로 돌아가세요.');
      }
    } catch {
      setError('데이터 로드 실패');
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (error) return (
    <div style={{ padding: 40, color: '#c05050', textAlign: 'center' }}>
      {error}
      <br /><br />
      <button onClick={() => router.push('/admin2/properties')} style={{ marginTop: 16, padding: '8px 20px', cursor: 'pointer' }}>
        목록으로 돌아가기
      </button>
    </div>
  );

  return (
    <GridEditor
      onBack={() => router.push('/admin2/properties')}
      isEdit
      initialValues={initialValues}
      pageId={params.id}
    />
  );
}
