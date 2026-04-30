import {
  getPropertyById,
  getSubDBData,
  updateProperty,
  archiveProperty,
  incrementHitCount,
  buildNotionFields,
  upsertSubRecord,
} from '@/lib/notion';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const property = await getPropertyById(id);
    if (property.type) {
      const subData = await getSubDBData(id, property.type);
      // 빈 값(빈 문자열, 0, 빈 배열)은 메인 DB 값을 덮어쓰지 않도록 필터링
      const validSubData = Object.fromEntries(
        Object.entries(subData).filter(([, v]) => {
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === 'string') return v !== '';
          if (typeof v === 'number') return v !== 0;
          return v != null;
        })
      );
      return Response.json({ ...property, ...validSubData });
    }
    return Response.json(property);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body._action === 'hit') {
      await incrementHitCount(id, body.currentCount || 0);
      return Response.json({ ok: true });
    }

    if (body._action === 'recommend') {
      await updateProperty(id, { '추천매물': { checkbox: !!body.value } });
      return Response.json({ ok: true });
    }

    const fields = buildNotionFields(body);
    const page = await updateProperty(id, fields);

    if (body.type) {
      const numericKeys = [
        'area', 'exclusiveArea', 'totalFloors', 'price', 'deposit', 'monthlyRent',
        'maintenanceFee', 'totalUnits', 'totalBuildings', 'rooms', 'bathrooms',
        'landArea', 'buildingArea', 'coverageRatio', 'floorAreaRatio', 'premiumAmount',
        'totalFloorArea', 'buildingLandArea', 'aboveGroundFloors', 'undergroundFloors',
        'parkingCount', 'elevatorCount',
      ];
      const subData = { ...body };
      numericKeys.forEach((k) => { subData[k] = Number(subData[k]) || 0; });
      await upsertSubRecord(id, body.type, subData);
    }

    return Response.json({ id: page.id });
  } catch (err) {
    console.error('PATCH /api/properties/[id] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await archiveProperty(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/properties/[id] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
