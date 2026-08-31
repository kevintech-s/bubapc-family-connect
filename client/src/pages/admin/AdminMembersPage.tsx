import { useState, useEffect } from 'react';
import { memberService, familyService, authService } from '../../services/api';
import { Member, Family } from '../../types';
import toast from 'react-hot-toast';

interface UserRow {
  id: number;
  role: string;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningFamily, setAssigningFamily] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ member: Member; action: string; family_id: number } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, familiesRes, usersRes] = await Promise.all([
        memberService.getAll(),
        familyService.getAll(),
        authService.getUsers(),
      ]);
      setMembers(membersRes.data);
      setFamilies(familiesRes.data);
      setUsers(usersRes.data ?? []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const assignFamily = async (member: Member, familyId: number) => {
    if (!familyId) {
      toast.error('Select a family');
      return;
    }
    try {
      await memberService.update(member.id, { family_id: familyId });
      toast.success(`${member.full_name} assigned to a family`);
      setAssigningFamily(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign family');
    }
  };

  const promoteLeader = async (member: Member, gender: 'male' | 'female') => {
    const familyId = member.family_id;
    if (!familyId) { toast.error('Assign the member to a family first'); return; }
    if (member.user_id == null) { toast.error('This member has no login account yet'); return; }
    try {
      await familyService.assignLeader(familyId, member.id, gender);
      toast.success(gender === 'male' ? `${member.full_name} is now the family Paapa` : `${member.full_name} is now the family Maama`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign leader');
    }
  };

  const setCoordinator = async (member: Member, makeCoordinator: boolean) => {
    if (member.user_id == null) { toast.error('This member has no login account yet'); return; }
    try {
      await authService.updateUserRole(member.user_id, makeCoordinator ? 'family_coordinator' : 'member');
      toast.success(makeCoordinator ? `${member.full_name} is now a Family Coordinator` : `${member.full_name} is now a Member`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const userRole = (member: Member): string | undefined => users.find((u) => u.id === member.user_id)?.role;

  const leadingFamily = (member: Member): string | undefined => {
    if (member.user_id == null) return undefined;
    const f = families.find((x) => x.leader_male_id === member.user_id || x.leader_female_id === member.user_id);
    return f?.name;
  };

  const statusText = (member: Member): { label: string; color: string } | null => {
    const role = userRole(member);
    const fam = leadingFamily(member);
    if (role === 'pastor') return { label: 'Pastor', color: 'bg-indigo-100 text-indigo-800' };
    if (role === 'family_coordinator') return { label: 'Family Coordinator', color: 'bg-purple-100 text-purple-800' };
    if (role === 'family_leader') {
      const isMale = member.gender === 'male';
      const isFemale = member.gender === 'female';
      const label = isMale || !isFemale ? `Paapa` : `Maama`;
      return { label: fam ? `${label} of ${fam}` : label, color: 'bg-blue-100 text-blue-800' };
    }
    return null;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Members</h1>
        <p className="text-gray-500 mt-1">
          {members.length} members total. Members register on their own — here you assign families and leadership.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Family</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Gender</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Role in Family</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Leadership</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const status = statusText(member);
              const role = userRole(member);
              return (
                <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-warm-700 font-semibold text-xs">{member.full_name.charAt(0)}</div>
                      <div>
                        <div className="font-medium text-gray-900">{member.full_name}</div>
                        <div className="text-xs text-gray-400">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{member.family_name || '-'}</span>
                      <button
                        onClick={() => setAssigningFamily(assigningFamily === member.id ? null : member.id)}
                        className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                      >
                        {assigningFamily === member.id ? 'Cancel' : 'Change'}
                      </button>
                    </div>
                    {assigningFamily === member.id && (
                      <select
                        value={member.family_id || ''}
                        onChange={(e) => assignFamily(member, Number(e.target.value))}
                        autoFocus
                        className="input-field mt-1 !w-auto !py-1 text-xs"
                      >
                        <option value="">Select family</option>
                        {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {status ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Member</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : '-'}</td>
                  <td className="py-3 px-4 text-gray-500">{member.role_in_family || 'Member'}</td>
                  <td className="py-3 px-4 text-right">
                    {member.user_id != null ? (
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {role !== 'family_coordinator' && role !== 'pastor' && (
                          <button
                            onClick={() => setCoordinator(member, true)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            Make Coordinator
                          </button>
                        )}
                        {role === 'family_coordinator' && (
                          <button
                            onClick={() => setCoordinator(member, false)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            Make Member
                          </button>
                        )}
                        {role !== 'family_leader' && role !== 'pastor' && (
                          <>
                            <button
                              onClick={() => promoteLeader(member, 'male')}
                              disabled={member.gender === 'female'}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Make Paapa
                            </button>
                            <button
                              onClick={() => promoteLeader(member, 'female')}
                              disabled={member.gender === 'male'}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-pink-200 text-pink-700 hover:bg-pink-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Make Maama
                            </button>
                          </>
                        )}
                        {role === 'family_leader' && (
                          <button
                            onClick={() => setCoordinator(member, false)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            Demote
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No login account</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
