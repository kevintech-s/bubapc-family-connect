import { useState, useEffect } from 'react';
import { prayerRequestService } from '../../services/api';
import { PrayerRequest } from '../../types';
import toast from 'react-hot-toast';

export default function AdminPrayerRequestsPage() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const res = await prayerRequestService.getAll();
      setRequests(res.data);
    } catch (error) {
      toast.error('Failed to load prayer requests');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await prayerRequestService.update(id, { status });
      toast.success('Status updated');
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await prayerRequestService.delete(id);
      toast.success('Prayer request deleted');
      setDeleteConfirm(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Prayer Requests</h1>
        <p className="text-gray-500 mt-1">{requests.length} total requests</p>
      </div>

      <div className="flex gap-2">
        {['all', 'pending', 'addressed', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-8"><p className="text-gray-500">No prayer requests found</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
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
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{req.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    {req.member_name && <span>By {req.member_name}</span>}
                    {req.family_name && <span>{req.family_name}</span>}
                    <span>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="flex gap-1">
                    {req.status !== 'addressed' && (
                      <button onClick={() => updateStatus(req.id, 'addressed')} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Mark Addressed</button>
                    )}
                    {req.status !== 'resolved' && (
                      <button onClick={() => updateStatus(req.id, 'resolved')} className="text-green-600 hover:text-green-700 text-xs font-medium">Mark Resolved</button>
                    )}
                  </div>
                  {deleteConfirm === req.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(req.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(req.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
