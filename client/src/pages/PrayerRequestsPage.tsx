import { useState, useEffect, FormEvent } from 'react';
import { prayerRequestService } from '../services/api';
import { PrayerRequest } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PrayerRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'General' });
  const [submitting, setSubmitting] = useState(false);

  const categories = ['General', 'Health', 'Family', 'Guidance', 'Financial', 'Spiritual', 'Gratitude', 'Other'];
  const isLeader = user?.role === 'family_leader' || user?.role === 'family_coordinator' || user?.role === 'pastor';

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const res = await prayerRequestService.getAll();
      setRequests(res.data);
    } catch (error) {
      console.error('Failed to load prayer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) { toast.error('Title and description are required'); return; }
    setSubmitting(true);
    try {
      await prayerRequestService.create(form);
      toast.success('Prayer request submitted');
      setForm({ title: '', description: '', category: 'General' });
      setShowForm(false);
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const forwardToPastor = async (id: number) => {
    try {
      await prayerRequestService.forward(id);
      toast.success('Forwarded to Pastor');
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to forward');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'New Request'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Prayer Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={4} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No prayer requests</h3>
          <p className="mt-1 text-sm text-gray-500">Be the first to share a prayer request.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900">{req.title}</h3>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{req.category}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      req.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      req.status === 'addressed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{req.status}</span>
                    {req.forwarded_to_pastor && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        Forwarded to Pastor
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{req.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    {req.member_name && <span>By {req.member_name}</span>}
                    {req.family_name && <span>{req.family_name}</span>}
                    <span>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {isLeader && !req.forwarded_to_pastor && req.status === 'pending' && (
                  <button
                    onClick={() => forwardToPastor(req.id)}
                    className="ml-4 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    Forward to Pastor
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
