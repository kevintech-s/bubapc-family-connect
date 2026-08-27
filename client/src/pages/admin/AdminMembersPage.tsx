import { useState, useEffect, FormEvent } from 'react';
import { memberService, familyService } from '../../services/api';
import { Member, Family } from '../../types';
import toast from 'react-hot-toast';

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', family_id: '', role_in_family: 'Member', gender: '' as '' | 'male' | 'female', birthday: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [membersRes, familiesRes] = await Promise.all([memberService.getAll(), familyService.getAll()]);
      setMembers(membersRes.data);
      setFamilies(familiesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.family_id) { toast.error('Name, email, and family are required'); return; }
    try {
      const payload = { ...form, family_id: parseInt(form.family_id), birthday: form.birthday || null };
      if (editingId) {
        await memberService.update(editingId, payload);
        toast.success('Member updated');
      } else {
        await memberService.create(payload);
        toast.success('Member created');
      }
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (member: Member) => {
    setEditingId(member.id);
    setForm({ full_name: member.full_name, email: member.email, phone: member.phone || '', family_id: String(member.family_id), role_in_family: member.role_in_family || 'Member', gender: (member.gender as any) || '', birthday: member.birthday ? member.birthday.split('T')[0] : '' });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await memberService.delete(id);
      toast.success('Member deleted');
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setForm({ full_name: '', email: '', phone: '', family_id: '', role_in_family: 'Member', gender: '', birthday: '' });
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Members</h1>
          <p className="text-gray-500 mt-1">{members.length} members total</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? 'Edit Member' : 'New Member'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as any })} className="input-field" required>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                <input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family *</label>
                <select value={form.family_id} onChange={(e) => setForm({ ...form, family_id: e.target.value })} className="input-field" required>
                  <option value="">Select family</option>
                  {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role in Family</label>
                <input type="text" value={form.role_in_family} onChange={(e) => setForm({ ...form, role_in_family: e.target.value })} className="input-field" placeholder="e.g. Maama, Paapa, Member" />
              </div>
            </div>
            <button type="submit" className="btn-primary">{editingId ? 'Update Member' : 'Create Member'}</button>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Family</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Gender</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-warm-700 font-semibold text-xs">{member.full_name.charAt(0)}</div>
                    <span className="font-medium text-gray-900">{member.full_name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500">{member.email}</td>
                <td className="py-3 px-4 text-gray-500">{member.family_name || '-'}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${member.gender === 'male' ? 'bg-blue-100 text-blue-800' : member.gender === 'female' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-500'}`}>
                    {member.gender === 'male' ? 'Male' : member.gender === 'female' ? 'Female' : '-'}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500">{member.role_in_family}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(member)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Edit</button>
                    {deleteConfirm === member.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(member.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(member.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
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
