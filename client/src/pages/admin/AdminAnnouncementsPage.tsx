import { useState, useEffect, FormEvent } from 'react';
import { announcementService } from '../../services/api';
import { Announcement } from '../../types';
import toast from 'react-hot-toast';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '', is_important: false });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    try {
      const res = await announcementService.getAll();
      setAnnouncements(res.data);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    try {
      if (editingId) {
        await announcementService.update(editingId, form);
        toast.success('Announcement updated');
      } else {
        await announcementService.create(form);
        toast.success('Announcement created');
      }
      resetForm();
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setForm({ title: ann.title, content: ann.content, is_important: ann.is_important });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await announcementService.delete(id);
      toast.success('Announcement deleted');
      setDeleteConfirm(null);
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setForm({ title: '', content: '', is_important: false });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Announcements</h1>
          <p className="text-gray-500 mt-1">{announcements.length} announcements</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field" rows={5} required />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="important"
                checked={form.is_important}
                onChange={(e) => setForm({ ...form, is_important: e.target.checked })}
                className="rounded border-gray-300 text-primary-600"
              />
              <label htmlFor="important" className="text-sm text-gray-700">Mark as important</label>
            </div>
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Publish'}</button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="card text-center py-8"><p className="text-gray-500">No announcements yet</p></div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className={`card ${ann.is_important ? 'border-l-4 border-l-amber-400' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {ann.is_important && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Important</span>}
                    <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{ann.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(ann.published_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => handleEdit(ann)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Edit</button>
                  {deleteConfirm === ann.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(ann.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(ann.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
