import { useState, useEffect, FormEvent } from 'react';
import { worshipLeaderService } from '../../services/api';
import { WorshipLeader } from '../../types';
import toast from 'react-hot-toast';

export default function AdminWorshipPage() {
  const [leaders, setLeaders] = useState<WorshipLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', role: 'Worship Leader', is_active: true });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => { loadLeaders(); }, []);

  const loadLeaders = async () => {
    try {
      const res = await worshipLeaderService.getAll();
      setLeaders(res.data);
    } catch (error) {
      toast.error('Failed to load worship leaders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    try {
      if (editingId) {
        await worshipLeaderService.update(editingId, form);
        toast.success('Worship leader updated');
      } else {
        await worshipLeaderService.create(form);
        toast.success('Worship leader added');
      }
      resetForm();
      loadLeaders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (leader: WorshipLeader) => {
    setEditingId(leader.id);
    setForm({ name: leader.name, role: leader.role, is_active: leader.is_active });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await worshipLeaderService.delete(id);
      toast.success('Worship leader removed');
      setDeleteConfirm(null);
      loadLeaders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const toggleActive = async (leader: WorshipLeader) => {
    try {
      await worshipLeaderService.update(leader.id, { is_active: !leader.is_active });
      toast.success(leader.is_active ? 'Deactivated' : 'Activated');
      loadLeaders();
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setForm({ name: '', role: 'Worship Leader', is_active: true });
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Worship Leaders</h1>
          <p className="text-gray-500 mt-1">{leaders.length} leaders total</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Leader'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? 'Edit Leader' : 'Add Leader'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-gray-300 text-primary-600" />
              <label htmlFor="active" className="text-sm text-gray-700">Active</label>
            </div>
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add Leader'}</button>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((leader) => (
              <tr key={leader.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">{leader.name.charAt(0)}</div>
                    <span className="font-medium text-gray-900">{leader.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500">{leader.role}</td>
                <td className="py-3 px-4">
                  <button onClick={() => toggleActive(leader)} className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${leader.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} transition-colors`}>
                    {leader.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(leader)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Edit</button>
                    {deleteConfirm === leader.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(leader.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(leader.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
