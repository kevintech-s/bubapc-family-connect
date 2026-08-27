import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncPendingChanges, isOnline, effectiveServerUrl } from '../services/api';
import { putAll } from '../utils/localDB';

const POLL_INTERVAL = 30000;

const listeners = new Map<string, Set<Function>>();

export function onSyncEvent(event: string, callback: (data?: any) => void): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(callback);
  return () => { listeners.get(event)?.delete(callback); };
}

function notify(event: string, data?: any) {
  listeners.get(event)?.forEach((cb) => cb(data));
}

async function refreshCollection(path: string, collection: string) {
  const url = effectiveServerUrl();
  if (!url) return;
  const token = localStorage.getItem('token');
  if (!token) return;
  const res = await fetch(`${url}/api/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) {
    const items = await res.json();
    await putAll(collection as any, Array.isArray(items) ? items : []);
    notify(`sync-${collection}`);
  }
}

export default function RealTimeSync() {
  const { user } = useAuth();
  const refreshKey = useRef(0);

  useEffect(() => {
    if (!user) return;

    const doRefresh = async () => {
      if (!isOnline()) return;
      const url = effectiveServerUrl();
      if (!url) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        await syncPendingChanges();
        await Promise.all([
          refreshCollection('announcements', 'announcements'),
          refreshCollection('members', 'members'),
          refreshCollection('families', 'families'),
          refreshCollection('prayer-requests', 'prayer_requests'),
        ]);
        notify('sync-complete');
      } catch (e) {
        // Silent failure on network issues
      }
    };

    doRefresh();
    const interval = setInterval(doRefresh, POLL_INTERVAL);

    const onFocus = () => doRefresh();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user]);

  return null;
}

