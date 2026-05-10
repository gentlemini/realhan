import { NextResponse } from 'next/server';

const NOTION_TOKEN = process.env.NOTION_API_KEY;

const DB_IDS = [
  '8e7d1a23e5be419f820889a2dd20623b', // apt-sale
  'ddd43c2d10ed4553aeea333890b39238', // apt-lease
  '1fae6945c55b4cff9676e5011dc4fd31', // apt-wolse
  '8f7b574ed090495ebae321a3a99772a4', // bld-sale
  'a6faf09f929c492eb6e19c67fa3708ef', // bld-lease
  'afe2bfbbdbae42ab9b6db0a3a2cb5d17', // bld-wolse
  'cdeac614af184791b75653e6aa256868', // dgu-sale
  '2ea8c055b69b40bfb1f82cf5ea7a7814', // dgu-lease
  '70741fb396a747c5a337d79d01c16677', // dgu-wolse
  '1b882220c4a24565b71d8f23f3e80679', // dse-sale
  'edee1d3a652649b29c60a53b5910f47f', // dse-lease
  '9de9698a398f44ce9eb1d20d97f91276', // dse-wolse
  'af6a52f3c189422a9c4a6e633ba2aa9f', // fac-sale
  '15c02bb2ec0b45339915967921ed03af', // fac-lease
  '9b3126ffac6d4077bd28c4bc178e7d99', // fac-wolse
  '646c7f5626084bea9731e115a59e6203', // hse-sale
  '154bb6445fb04d83900ba0f4c3792252', // hse-lease
  'e768c688314244f58ec812d4f81f6422', // hse-wolse
  '3ac05d51f0ff4da6b1c0a9e8be2649f1', // lnd-sale
  '8afefc557c5a41bba9687741fd91d982', // lnd-lease
  '84da27f44fd94d3ea4c90c96ffc87a01', // lnd-wolse
  'a3f757c9049b4e85a5d084a7ec7f01e3', // ofc-sale
  'b39ea1c254f54808ae2343fd1db35b1c', // ofc-lease
  'af05ff431ce34aaea68e4ae7e9aa9319', // ofc-wolse
  '29ff90a093c14569b02a00f0e64b55a2', // ofi-sale
  '2f895fb2ffb04f47bc4a58aa01668c4b', // ofi-lease
  '351972da7fdc4677a80719166531b1d6', // ofi-wolse
  '66c488a2-97d3-41b4-a92b-8919210252dc', // prs-sale
  'e50ee374-ce0f-469d-b594-b952b9a2078d', // rdv-sale
  'a49dee1891d44d4fb03465353ec820ff', // rom-sale
  '3df99f451be34cfe8e6b6897f94e56d7', // rom-lease
  '4f2645a3487949558ded4120c4a98cee', // rom-wolse
  '08666990d4414b44a476c391aa01c17c', // shp-sale
  '49339bde032b4dbc82abfc98c086f15d', // shp-lease
  '6afc8681b6dc4f47bad1552153007ef6', // shp-wolse
];

async function addPropsToDb(dbId) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        '유튜브URL': { url: {} },
        '블로그URL': { url: {} },
      },
    }),
  });
  return { dbId, ok: res.ok, status: res.status };
}

export async function GET() {
  if (!NOTION_TOKEN) {
    return NextResponse.json({ error: 'NOTION_TOKEN missing' }, { status: 500 });
  }

  const results = await Promise.allSettled(DB_IDS.map(addPropsToDb));
  const summary = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { dbId: DB_IDS[i], ok: false, error: r.reason?.message }
  );

  const failed = summary.filter(r => !r.ok);
  return NextResponse.json({
    total: DB_IDS.length,
    success: summary.filter(r => r.ok).length,
    failed: failed.length,
    details: failed.length ? failed : '모두 성공',
  });
}
