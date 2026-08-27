import { useState, useEffect, FormEvent } from 'react';
import { familyService } from '../../services/api';
import { Family } from '../../types';
import toast from 'react-hot-toast';

export default function AdminFamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', contact_email: '', contact_phone: '', address: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => { loadFamilies(); }, []);

  const loadFamilies = async () => {
    try {
      const res = await familyService.getAll();
      setFamilies(res.data);
    } catch (error) {
      toast.error('Failed to load families');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error('Family name is required'); return; }
    try {
      if (editingId) {
        await familyService.update(editingId, form);
        toast.success('Family updated');
      } else {
        await familyService.create(form);
        toast.success('Family created');
      }
      resetForm();
      loadFamilies();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (family: Family) => {
    setEditingId(family.id);
    setForm({ name: family.name, description: family.description || '', contact_email: family.contact_email || '', contact_phone: family.contact_phone || '', address: family.address || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await familyService.delete(id);
      toast.success('Family deleted');
      setDeleteConfirm(null);
      loadFamilies();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', contact_email: '', contact_phone: '', address: '' });
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Families</h1>
          <p className="text-gray-500 mt-1">{families.length} families total</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Family'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? 'Edit Family' : 'New Family'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input type="text" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={3} />
            </div>
            <button type="submit" className="btn-primary">{editingId ? 'Update Family' : 'Create Family'}</button>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Members</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {families.map((family) => (
              <tr key={family.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">{family.name.charAt(0)}</div>
                    <span className="font-medium text-gray-900">{family.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500">{family.contact_email || family.contact_phone || '-'}</td>
                <td className="py-3 px-4 text-gray-500">{family.member_count || 0}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(family)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Edit</button>
                    {deleteConfirm === family.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(family.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(family.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
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
