import { getProperties, createProperty, buildNotionFields, createSubRecord } from '@/lib/notion';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminMode = searchParams.get('admin') === 'true';
    const properties = await getProperties({ adminMode });
    return Response.json(properties);
  } catch (err) {
    console.error('GET /api/properties error:', err);
    return Response.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[POST] Request body:', body);
    
    const fields = buildNotionFields({
      ...body,
      status: body.status || 'Available',
      isExposed: body.isExposed ?? true,
      hitCount: 0,
    });
    
    console.log('[POST] Built fields:', JSON.stringify(fields, null, 2));
    
    const page = await createProperty(fields);
    console.log('[POST] Success:', page.id);

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
      await createSubRecord(page.id, body.type, subData);
    }

    return Response.json({ id: page.id }, { status: 201 });
  } catch (err) {
    console.error('[POST] Error:', err);
    const errorMsg = err.message || '저장 실패';
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
