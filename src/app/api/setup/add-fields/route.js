const NOTION_API = 'https://api.notion.com/v1';

const DB_IDS = [
  '8e7d1a23e5be419f820889a2dd20623b',
  'ddd43c2d10ed4553aeea333890b39238',
  '1fae6945c55b4cff9676e5011dc4fd31',
  'a3f757c9049b4e85a5d084a7ec7f01e3',
  'b39ea1c254f54808ae2343fd1db35b1c',
  'af05ff431ce34aaea68e4ae7e9aa9319',
  '646c7f5626084bea9731e115a59e6203',
  '154bb6445fb04d83900ba0f4c3792252',
  'e768c688314244f58ec812d4f81f6422',
  'cdeac614af184791b75653e6aa256868',
  '2ea8c055b69b40bfb1f82cf5ea7a7814',
  '70741fb396a747c5a337d79d01c16677',
  '1b882220c4a24565b71d8f23f3e80679',
  'edee1d3a652649b29c60a53b5910f47f',
  '9de9698a398f44ce9eb1d20d97f91276',
  '08666990d4414b44a476c391aa01c17c',
  '49339bde032b4dbc82abfc98c086f15d',
  '6afc8681b6dc4f47bad1552153007ef6',
  'a49dee1891d44d4fb03465353ec820ff',
  '3df99f451be34cfe8e6b6897f94e56d7',
  '4f2645a3487949558ded4120c4a98cee',
  '29ff90a093c14569b02a00f0e64b55a2',
  '2f895fb2ffb04f47bc4a58aa01668c4b',
  '351972da7fdc4677a80719166531b1d6',
  'af6a52f3c189422a9c4a6e633ba2aa9f',
  '15c02bb2ec0b45339915967921ed03af',
  '9b3126ffac6d4077bd28c4bc178e7d99',
  '8f7b574ed090495ebae321a3a99772a4',
  'a6faf09f929c492eb6e19c67fa3708ef',
  'afe2bfbbdbae42ab9b6db0a3a2cb5d17',
  '3ac05d51f0ff4da6b1c0a9e8be2649f1',
  '8afefc557c5a41bba9687741fd91d982',
  '84da27f44fd94d3ea4c90c96ffc87a01',
  'e50ee374-ce0f-469d-b594-b952b9a2078d',
  '66c488a2-97d3-41b4-a92b-8919210252dc',
];

async function addFieldsToDB(id) {
  try {
    const res = await fetch(`${NOTION_API}/databases/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          '조회수': { number: { format: 'number' } },
        },
      }),
    });
    return { id, ok: res.ok, status: res.status };
  } catch (err) {
    return { id, ok: false, error: err.message };
  }
}

export async function GET() {
  const results = await Promise.all(DB_IDS.map(addFieldsToDB));
  const succeeded = results.filter(r => r.ok).length;
  const failed    = results.filter(r => !r.ok);
  return Response.json({ succeeded, failed, total: DB_IDS.length });
}
