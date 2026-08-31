import axios from 'axios';
import {
  getAll, getById, createItem, updateItem, deleteItem,
  setServerUrl as _setServerUrl, getServerUrl as _getServerUrl, isServerConfigured as _isServerConfigured,
  type Collection,
} from '../utils/localDB';
import { addToSyncQueue, getSyncQueue, clearSyncQueue, saveAuthData, getAuthData } from '../utils/offlineDB';

const DEFAULT_SERVER_URL = (import.meta.env.VITE_API_URL as string) || '/api';

export function effectiveServerUrl(): string {
  return _getServerUrl() || DEFAULT_SERVER_URL;
}

function createApiInstance() {
  const url = effectiveServerUrl();
  return axios.create({
    baseURL: url,
    headers: { 'Content-Type': 'application/json' },
  });
}

let api = createApiInstance();

function setupInterceptors() {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/setup') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
}

setupInterceptors();

export function refreshApiInstance() {
  api = createApiInstance();
  setupInterceptors();
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function isUsableServerUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http') || url.startsWith('/');
}

export function resolveUploadUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (!url.startsWith('/uploads/')) return url;
  const base = effectiveServerUrl();
  const origin = base.startsWith('http') ? base.replace(/\/api$/, '').replace(/\/+$/, '') : '';
  return origin ? `${origin}${url}` : url;
}

async function serverAvailable(): Promise<boolean> {
  if (!_isServerConfigured() || !isOnline()) return false;
  try {
    const res = await axios.get(`${effectiveServerUrl()}/health`, { timeout: 3000 });
    return res.data.status === 'ok';
  } catch {
    return false;
  }
}

export const authService = {
  login: async (email: string, password: string) => {
    const url = effectiveServerUrl();
    if (isUsableServerUrl(url) && isOnline()) {
      try {
        const res = await axios.post(`${url}/auth/login`, { email, password }, { timeout: 20000 });
        await saveAuthData(res.data.token, res.data.user);
        return res;
      } catch (e: any) {
        if (e.response?.status) throw e;
      }
    }
    const auth = await getAuthData();
    if (auth?.user?.email === email) {
      return { data: auth };
    }
    const offlineUser = localStorage.getItem('bubapc_offline_user');
    if (offlineUser) {
      const user = JSON.parse(offlineUser);
      if (user.email === email) return { data: { user, token: 'offline-token' } };
    }
    throw new Error('No server connected. Use offline mode or connect to a server.');
  },

  register: async (email: string, password: string, name: string, familyId?: number | string) => {
    if (await serverAvailable()) {
      const res = await api.post('/auth/register', { email, password, name, family_id: familyId });
      await saveAuthData(res.data.token, res.data.user);
      return res;
    }
    const user = { id: 1, email, name, role: 'admin' as const, is_active: true, created_at: new Date().toISOString() };
    localStorage.setItem('bubapc_offline_user', JSON.stringify(user));
    return { data: { user, token: 'offline-token' } };
  },

  getMe: async () => {
    if (await serverAvailable()) {
      try {
        const res = await api.get('/auth/me');
        return res;
      } catch { /* fall through */ }
    }
    const offlineUser = localStorage.getItem('bubapc_offline_user');
    if (offlineUser) return { data: JSON.parse(offlineUser) };
    throw new Error('Not logged in');
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    if (await serverAvailable()) return api.put('/auth/profile', data);
    const user = JSON.parse(localStorage.getItem('bubapc_offline_user') || '{}');
    const updated = { ...user, ...data };
    localStorage.setItem('bubapc_offline_user', JSON.stringify(updated));
    return { data: updated };
  },

  updatePhoto: async (file: File) => {
    if (!(await serverAvailable())) throw new Error('Photo upload requires server connection');
    const form = new FormData();
    form.append('photo', file);
    const res = await api.post('/auth/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res;
  },

  getUsers: () => api.get('/auth/users'),
  updateUserRole: (id: number, role: string) => api.put(`/auth/users/${id}/role`, { role }),
  updateUserStatus: (id: number, is_active: boolean) => api.put(`/auth/users/${id}/status`, { is_active }),
};

function maxId(items: { id: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.id), 0);
}

function makeService<T extends { id: number }>(collection: Collection) {
  return {
    getAll: async (params?: Record<string, any>): Promise<{ data: T[] }> => {
      let items = await getAll<T>(collection);
      if (await serverAvailable()) {
        try {
          const serverUrl = effectiveServerUrl();
          const res = await axios.get(`${serverUrl}/api/${collection}`, {
            params,
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          });
          items = res.data;
          const { putAll } = await import('../utils/localDB');
          await putAll(collection, items);
        } catch { /* use local */ }
      }
      if (params) {
        for (const [key, val] of Object.entries(params)) {
          if (val !== undefined && val !== null) {
            items = items.filter((item: any) => String(item[key]) === String(val));
          }
        }
      }
      return { data: items };
    },

    getById: async (id: number): Promise<{ data: T }> => {
      if (await serverAvailable()) {
        try {
          const serverUrl = effectiveServerUrl();
          const res = await axios.get(`${serverUrl}/api/${collection}/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          });
          await createItem(collection, res.data);
          return res;
        } catch { /* fall through */ }
      }
      const item = await getById<T>(collection, id);
      if (item) return { data: item };
      throw new Error('Not found');
    },

    create: async (data: Partial<T>): Promise<{ data: T }> => {
      const allItems = await getAll<T>(collection);
      const newId = maxId(allItems) + 1;
      const now = new Date().toISOString();
      const item = { ...data, id: newId, created_at: now, updated_at: now } as unknown as T;
      await createItem(collection, item);

      if (await serverAvailable()) {
        try {
          const serverUrl = effectiveServerUrl();
          const res = await axios.post(`${serverUrl}/api/${collection}`, data, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          });
          await updateItem<T>(collection, newId, res.data);
          return res;
        } catch { /* queued for sync */ }
      }
      await addToSyncQueue({ method: 'POST', url: `/api/${collection}`, body: data });
      return { data: item };
    },

    update: async (id: number, data: Partial<T>): Promise<{ data: T }> => {
      const now = new Date().toISOString();
      const item = await updateItem<T>(collection, id, { ...data, updated_at: now } as any);
      if (!item) throw new Error('Not found');

      if (await serverAvailable()) {
        try {
          const serverUrl = effectiveServerUrl();
          const res = await axios.put(`${serverUrl}/api/${collection}/${id}`, data, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          });
          await updateItem<T>(collection, id, res.data);
          return res;
        } catch { /* queued */ }
      }
      await addToSyncQueue({ method: 'PUT', url: `/api/${collection}/${id}`, body: data });
      return { data: item };
    },

    delete: async (id: number): Promise<void> => {
      await deleteItem(collection, id);
      if (await serverAvailable()) {
        try {
          const serverUrl = effectiveServerUrl();
          await axios.delete(`${serverUrl}/api/${collection}/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          });
          return;
        } catch { /* queued */ }
      }
      await addToSyncQueue({ method: 'DELETE', url: `/api/${collection}/${id}`, body: null });
    },
  };
}

export const familyService = {
  ...makeService<any>('families'),
  assignLeader: async (familyId: number, memberId: number, gender: 'male' | 'female'): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      const res = await api.post(`/families/${familyId}/leader`, { member_id: memberId, gender });
      return res;
    }
    throw new Error('Assigning a leader requires server connection');
  },
};
export const memberService = makeService<any>('members');
export const announcementService = makeService<any>('announcements');
export const prayerRequestService = {
  ...makeService<any>('prayer_requests'),
  forward: async (id: number): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      const res = await axios.post(`${serverUrl}/api/prayer_requests/${id}/forward`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      return res;
    }
    throw new Error('Forwarding requires server connection');
  },
};
export const worshipLeaderService = makeService<any>('worship_leaders');

export const reportService = {
  getAll: async (): Promise<{ data: any[] }> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      const res = await axios.get(`${serverUrl}/api/reports`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      return res;
    }
    return { data: [] };
  },

  upload: async (formData: FormData): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      const res = await axios.post(`${serverUrl}/api/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      return res;
    }
    throw new Error('Report upload requires server connection');
  },

  delete: async (id: number): Promise<void> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      await axios.delete(`${serverUrl}/api/reports/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
    }
  },
};

export const photoService = {
  getAll: async (category?: string): Promise<{ data: any[] }> => {
    let items = await getAll<any>('photos');
    if (await serverAvailable()) {
      try {
        const serverUrl = effectiveServerUrl();
        const url = category ? `${serverUrl}/api/photos?category=${category}` : `${serverUrl}/api/photos`;
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        items = res.data;
        const { putAll } = await import('../utils/localDB');
        await putAll('photos', items);
      } catch { /* use local */ }
    }
    if (category) items = items.filter((p: any) => p.category === category);
    return { data: items };
  },

  upload: async (formData: FormData): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      try {
        const serverUrl = effectiveServerUrl();
        const res = await axios.post(`${serverUrl}/api/photos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        await createItem('photos', res.data);
        return res;
      } catch { /* offline fallback */ }
    }
    const allPhotos = await getAll<any>('photos');
    const item = {
      id: maxId(allPhotos) + 1,
      url: '',
      caption: formData.get('caption') || '',
      category: formData.get('category') || 'general',
      uploaded_by: 0,
      created_at: new Date().toISOString(),
    };
    await createItem('photos', item);
    await addToSyncQueue({ method: 'POST', url: '/api/photos', body: formData });
    return { data: item };
  },

  delete: async (id: number): Promise<void> => {
    await deleteItem('photos', id);
    if (await serverAvailable()) {
      try {
        const serverUrl = effectiveServerUrl();
        await axios.delete(`${serverUrl}/api/photos/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        return;
      } catch { /* queued */ }
    }
    await addToSyncQueue({ method: 'DELETE', url: `/api/photos/${id}`, body: null });
  },
};

export const dashboardService = {
  getStats: async (): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      try {
        const serverUrl = effectiveServerUrl();
        const res = await axios.get(`${serverUrl}/api/dashboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        return res;
      } catch { /* fall through */ }
    }
    const families = await getAll<any>('families');
    const members = await getAll<any>('members');
    const announcements = await getAll<any>('announcements');
    const prayerRequests = await getAll<any>('prayer_requests');
    const worshipLeaders = await getAll<any>('worship_leaders');
    const photos = await getAll<any>('photos');
    return {
      data: {
        stats: { totalFamilies: families.length, totalMembers: members.length },
        recentAnnouncements: announcements.slice(-5).reverse(),
        recentPrayerRequests: prayerRequests.slice(-5).reverse(),
        activeWorshipLeaders: worshipLeaders.filter((w: any) => w.is_active),
        recentPhotos: photos.slice(-5).reverse(),
      },
    };
  },
};

export const attendanceService = {
  getByDate: async (date: string): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      const res = await axios.get(`${serverUrl}/api/attendance?date=${date}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      return res;
    }
    return { data: { rows: [], count: 0, checkedInIds: [] } };
  },

  getMembers: async (date?: string): Promise<{ data: any[] }> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      const url = date ? `${serverUrl}/api/attendance/members?date=${date}` : `${serverUrl}/api/attendance/members`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      return res;
    }
    return { data: [] };
  },

  getStats: async (): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      const res = await axios.get(`${serverUrl}/api/attendance/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      return res;
    }
    return { data: { totalMembers: 0, recentServices: [], totalCheckIns: 0 } };
  },

  checkIn: async (service_date: string, member_id: number, status = 'present'): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      const res = await axios.post(`${serverUrl}/api/attendance/check-in`, { service_date, member_id, status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      return res;
    }
    throw new Error('Check-in requires server connection');
  },

  undoCheckIn: async (service_date: string, member_id: number): Promise<{ data: any }> => {
    if (await serverAvailable()) {
      const serverUrl = effectiveServerUrl();
      const res = await axios.post(`${serverUrl}/api/attendance/undo`, { service_date, member_id }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      return res;
    }
    throw new Error('Check-in requires server connection');
  },
};

export const isServerConfigured = (): boolean => {
  return !!effectiveServerUrl() && effectiveServerUrl() !== '/api';
};
export const getServerUrl = _getServerUrl;
export const setServerUrl = _setServerUrl;

export async function syncPendingChanges(): Promise<void> {
  const queue = await getSyncQueue();
  if (queue.length === 0) return;
  if (!await serverAvailable()) return;

  const failed: typeof queue = [];
  for (const item of queue) {
    try {
      await api({ method: item.method, url: item.url, data: item.body });
    } catch {
      failed.push(item);
    }
  }
  if (failed.length === 0) await clearSyncQueue();
  else {
    for (const item of failed) {
      await addToSyncQueue(item);
    }
  }
}
