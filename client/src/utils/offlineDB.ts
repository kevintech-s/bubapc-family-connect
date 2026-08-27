import { get, set, del, keys } from 'idb-keyval';

const DB_PREFIX = 'bubapc_';
const QUEUE_KEY = 'bubapc_sync_queue';
const AUTH_KEY = 'bubapc_auth';

export interface SyncQueueItem {
  id: string;
  method: string;
  url: string;
  body: any;
  timestamp: number;
}

export async function cacheData(key: string, data: any): Promise<void> {
  await set(`${DB_PREFIX}${key}`, { data, cachedAt: Date.now() });
}

export async function getCachedData(key: string): Promise<any | null> {
  const stored = await get(`${DB_PREFIX}${key}`);
  return stored?.data ?? null;
}

export async function getCachedDataWithAge(key: string): Promise<{ data: any; age: number } | null> {
  const stored = await get(`${DB_PREFIX}${key}`);
  if (!stored) return null;
  return { data: stored.data, age: Date.now() - stored.cachedAt };
}

export async function clearAllCache(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith(DB_PREFIX)) {
      await del(key);
    }
  }
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
  const queue = await getSyncQueue();
  queue.push({
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  });
  await set(QUEUE_KEY, queue);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return (await get(QUEUE_KEY)) || [];
}

export async function clearSyncQueue(): Promise<void> {
  await set(QUEUE_KEY, []);
}

export async function removeSyncItem(id: string): Promise<void> {
  const queue = await getSyncQueue();
  await set(QUEUE_KEY, queue.filter((item) => item.id !== id));
}

export async function saveAuthData(token: string, user: any): Promise<void> {
  await set(AUTH_KEY, { token, user, savedAt: Date.now() });
}

export async function getAuthData(): Promise<{ token: string; user: any } | null> {
  return (await get(AUTH_KEY)) || null;
}

export async function clearAuthData(): Promise<void> {
  await del(AUTH_KEY);
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function getCacheKeys(): Promise<string[]> {
  return keys() as Promise<string[]>;
}
