import { useState, useEffect, FormEvent } from 'react';
import { announcementService, familyService } from '../services/api';
import { Announcement, Family } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { onSyncEvent } from '../components/RealTimeSync';
import toast from 'react-hot-toast';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', is_important: false, scope: 'global' as 'global' | 'family', family_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const canCreate = user?.role === 'family_leader' || user?.role === 'family_coordinator' || user?.role === 'pastor';
  const canCreateGlobal = user?.role === 'family_coordinator' || user?.role === 'pastor';

  useEffect(() => {
    loadAnnouncements();
    if (canCreate) loadFamilies();
    const unsub = onSyncEvent('sync-announcements', loadAnnouncements);
    return unsub;
  }, []);

  const loadAnnouncements = async () => {
    try {
      const res = await announcementService.getAll();
      setAnnouncements(res.data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFamilies = async () => {
    try {
      const res = await familyService.getAll();
      setFamilies(res.data);
    } catch (error) { /* ignore */ }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    setSubmitting(true);
    try {
      const payload: any = { title: form.title, content: form.content, is_important: form.is_important, scope: form.scope };
      if (form.scope === 'family' && form.family_id) payload.family_id = parseInt(form.family_id);
      await announcementService.create(payload);
      toast.success('Announcement published');
      setForm({ title: '', content: '', is_important: false, scope: 'global', family_id: '' });
      setShowForm(false);
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 mt-1">Stay updated with community news and events</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Cancel' : 'New Announcement'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field" rows={4} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as any })} className="input-field">
                  <option value="global" disabled={!canCreateGlobal}>Global (All Families)</option>
                  <option value="family">My Family Only</option>
                </select>
              </div>
              {form.scope === 'family' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family</label>
                  <select value={form.family_id} onChange={(e) => setForm({ ...form, family_id: e.target.value })} className="input-field">
                    <option value="">Select family</option>
                    {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_important} onChange={(e) => setForm({ ...form, is_important: e.target.checked })} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <span className="text-sm font-medium text-gray-700">Mark as Important</span>
            </label>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </form>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements</h3>
          <p className="mt-1 text-sm text-gray-500">No announcements have been published yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div key={ann.id} className={`card ${ann.is_important ? 'border-l-4 border-l-amber-400' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ann.is_important && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Important</span>}
                    <h3 className="text-lg font-semibold text-gray-900">{ann.title}</h3>
                    {ann.scope === 'family' && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Family</span>}
                    {ann.scope === 'global' && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Global</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{ann.content}</p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                    <span>{new Date(ann.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {ann.author_name && <span>By {ann.author_name}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
