import { useState, useEffect, FormEvent } from 'react';
import { worshipLeaderService, familyService } from '../services/api';
import { WorshipLeader } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function WorshipPage() {
  const { user } = useAuth();
  const isFamilyLeader = user?.role === 'family_leader';
  const [leaders, setLeaders] = useState<WorshipLeader[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedFamily, setSelectedFamily] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', role: 'Worship Leader', is_active: true });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const familyIds = await resolveFamily();
      const params: any = {};
      if (isFamilyLeader) {
        params.service_date = selectedDate;
        if (familyIds && familyIds.length > 0) params.family_id = familyIds[0];
      }
      const res = await worshipLeaderService.getAll(params);
      setLeaders(res.data);
    } catch (error) {
      console.error('Failed to load worship leaders:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveFamily = async (): Promise<number[] | null> => {
    if (!isFamilyLeader) return null;
    try {
      const res = await familyService.getAll();
      const f = res.data.map((x: any) => x.id);
      setFamilies(res.data);
      if (selectedFamily === null && res.data.length > 0) {
        setSelectedFamily(res.data[0].id);
      }
      return f;
    } catch {
      return null;
    }
  };

  const refreshForDate = async (date: string) => {
    setSelectedDate(date);
    try {
      const res = await worshipLeaderService.getAll({ service_date: date, family_id: selectedFamily || undefined });
      setLeaders(res.data);
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    const payload: any = { ...form, service_date: selectedDate };
    if (isFamilyLeader) payload.family_id = selectedFamily;
    try {
      if (editingId) {
        await worshipLeaderService.update(editingId, payload);
        toast.success('Worship leader updated');
      } else {
        await worshipLeaderService.create(payload);
        toast.success('Worship leader added');
      }
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (leader: WorshipLeader) => {
    setEditingId(leader.id);
    setForm({ name: leader.name, role: leader.role, is_active: leader.is_active });
    setShowForm(true);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Worship Leaders</h1>
        <p className="text-gray-500 mt-1">{isFamilyLeader ? 'Manage your family\'s worship team for a service date' : 'Our current worship team'}</p>
      </div>

      {isFamilyLeader && (
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => refreshForDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Family</label>
              <select
                value={selectedFamily || ''}
                onChange={(e) => setSelectedFamily(Number(e.target.value))}
                className="input-field"
              >
                {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="ml-auto">
              <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
                {showForm ? 'Cancel' : '+ Add Leader'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isFamilyLeader && showForm && (
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

      {leaders.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No worship leaders</h3>
          <p className="mt-1 text-sm text-gray-500">Worship leaders have not been assigned yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                {!isFamilyLeader && <th className="text-left py-3 px-4 font-medium text-gray-500">Family</th>}
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                {isFamilyLeader && <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>}
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
                  {!isFamilyLeader && <td className="py-3 px-4 text-gray-500">{leader.family_name || '-'}</td>}
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${leader.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {leader.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isFamilyLeader && (
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleEdit(leader)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
