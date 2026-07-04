import 'server-only';
import { Redis } from '@upstash/redis';
import { FamilyTreeData } from './types';
import { getSeedData } from './seed';

const TREE_KEY = 'fam-tree-data';

const redis = Redis.fromEnv();

export async function getTree(): Promise<FamilyTreeData> {
  const data = await redis.get<FamilyTreeData>(TREE_KEY);
  if (!data) {
    const seed = getSeedData();
    await redis.set(TREE_KEY, seed);
    return seed;
  }
  return data;
}

export async function setTree(data: FamilyTreeData): Promise<void> {
  await redis.set(TREE_KEY, data);
}
