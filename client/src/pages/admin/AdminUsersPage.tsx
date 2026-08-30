import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { authService, resolveUploadUrl } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  profile_photo?: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  pastor: 'Pastor',
  family_coordinator: 'Family Coordinator',
  family_leader: 'Family Leader',
  member: 'Member',
};

const ROLE_COLORS: Record<string, string> = {
  pastor: 'bg-indigo-100 text-indigo-800',
  family_coordinator: 'bg-purple-100 text-purple-800',
  family_leader: 'bg-blue-100 text-blue-800',
  member: 'bg-gray-100 text-gray-600',
};

const ROLE_OPTIONS = ['member', 'family_leader', 'family_coordinator', 'pastor'];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<number | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await authService.getUsers();
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (user: UserRecord, newRole: string) => {
    try {
      await authService.updateUserRole(user.id, newRole);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      setEditingRole(null);
      toast.success(`${user.name} is now ${ROLE_LABELS[newRole]}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const toggleActive = async (user: UserRecord) => {
    try {
      await authService.updateUserStatus(user.id, !user.is_active);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      toast.success(`${user.name} ${user.is_active ? 'deactivated' : 'activated'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-500 mt-1">{users.length} registered users</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {user.profile_photo ? (
                      <img src={resolveUploadUrl(user.profile_photo)} alt={user.name} className="w-8 h-8 rounded-full object-cover bg-primary-100" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">{user.name.charAt(0)}</div>
                    )}
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500">{user.email}</td>
                <td className="py-3 px-4">
                  {editingRole === user.id ? (
                    <div className="flex gap-1">
                      {ROLE_OPTIONS.map(r => (
                        <button key={r} onClick={() => changeRole(user, r)}
                          className={`px-2 py-1 text-xs rounded border ${user.role === r ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                          {ROLE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.member}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {user.id !== currentUser?.id ? (
                      <>
                        <button onClick={() => setEditingRole(editingRole === user.id ? null : user.id)}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700">
                          Change Role
                        </button>
                        <button onClick={() => toggleActive(user)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg border ${user.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">You</span>
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
