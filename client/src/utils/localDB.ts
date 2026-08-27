import { get, set, del, keys } from 'idb-keyval';

const DB_PREFIX = 'bubapc_';
const COLLECTIONS = ['families', 'members', 'announcements', 'prayer_requests', 'worship_leaders', 'photos', 'me'] as const;
type Collection = typeof COLLECTIONS[number];

function colKey(name: Collection) { return `${DB_PREFIX}${name}`; }
function idKey(name: Collection, id: number) { return `${DB_PREFIX}${name}_${id}`; }

export async function getAll<T>(collection: Collection): Promise<T[]> {
  return (await get(colKey(collection))) || [];
}

export async function getById<T extends { id: number }>(collection: Collection, id: number): Promise<T | null> {
  const all = await getAll<T>(collection);
  return all.find(item => item.id === id) || null;
}

export async function putAll<T extends { id: number }>(collection: Collection, items: T[]): Promise<void> {
  await set(colKey(collection), items);
}

export async function createItem<T extends { id: number }>(collection: Collection, item: T): Promise<T> {
  const all = await getAll<T>(collection);
  all.push(item);
  await putAll(collection, all);
  return item;
}

export async function updateItem<T extends { id: number }>(collection: Collection, id: number, updates: Partial<T>): Promise<T | null> {
  const all = await getAll<T>(collection);
  const idx = all.findIndex(item => item.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  await putAll(collection, all);
  return all[idx];
}

export async function deleteItem<T extends { id: number }>(collection: Collection, id: number): Promise<boolean> {
  const all = await getAll<T>(collection);
  const filtered = all.filter(item => item.id !== id);
  if (filtered.length === all.length) return false;
  await putAll(collection, filtered);
  return true;
}

export async function clearCollection(collection: Collection): Promise<void> {
  await del(colKey(collection));
}

export async function clearAll(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith(DB_PREFIX)) {
      await del(key);
    }
  }
}

let nextId = Date.now();
export function generateId(): number {
  return nextId++;
}

export function setServerUrl(url: string | null): void {
  if (url) localStorage.setItem('bubapc_server_url', url);
  else localStorage.removeItem('bubapc_server_url');
}

export function getServerUrl(): string | null {
  return localStorage.getItem('bubapc_server_url');
}

export function isServerConfigured(): boolean {
  return !!getServerUrl() || !!import.meta.env.VITE_API_URL;
}

export type { Collection };
