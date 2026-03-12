import { queryOne } from '../helpers/db.js';

const adjectives1 = [
  'brave','curious','gentle','proud','kind','clever','happy','calm','bold','silly',
  'mighty','noble','graceful','swift','wise','bright','fierce','loyal','playful','shy',
  'stubborn','quiet','eager','caring','funny','fearless','optimistic','serene','tough','friendly'
];

const adjectives2 = [
  'fluffy','fuzzy','frosty','stormy','velvet','silky','tiny','grand','golden','shadow',
  'misty','cosmic','crystal','scarlet','emerald','ivory','onyx','silver','jade','amber',
  'cobalt','frozen','lunar','solar','wild','ancient','frostbitten','radiant','thunder','obsidian'
];

const nouns = [
  'lion','tiger','panther','wolf','fox','bear','otter','eagle','hawk','falcon',
  'owl','panda','koala','jaguar','cheetah','leopard','lynx','falcon','raven','phoenix',
  'unicorn','griffin','dragon','serpent','dolphin','orca','whale','shark','rhino','elephant',
  'moose','elk','buffalo','stag','antelope','zebra','giraffe','camel','ferret','badger'
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateRandomUsername(): Promise<string> {
  let attempts = 0;
  let username: string;

  do {
    username = `${capitalize(randomItem(adjectives1))} ${capitalize(randomItem(adjectives2))} ${capitalize(randomItem(nouns))}`;
    if (++attempts > 100) {
      username += `_${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const existing = await queryOne<{ id: number }>('SELECT id FROM users WHERE username = ?', [username]);
    if (!existing) break;
  } while (true);

  return username;
}
