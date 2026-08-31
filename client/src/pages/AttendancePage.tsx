import { useState, useEffect } from 'react';
import { attendanceService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface MemberRow {
  id: number;
  full_name: string;
  family_name: string;
  gender: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [checkedIn, setCheckedIn] = useState<Set<number>>(new Set());
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalMembers: number; recentServices: any[] }>({ totalMembers: 0, recentServices: [] });
  const [ownCheckedIn, setOwnCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const isLeader = user?.role === 'family_leader' || user?.role === 'family_coordinator' || user?.role === 'pastor';

  useEffect(() => {
    if (isLeader) loadData();
    else setLoading(false);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, attendanceRes, statsRes] = await Promise.all([
        attendanceService.getMembers(serviceDate),
        attendanceService.getByDate(serviceDate),
        attendanceService.getStats(),
      ]);
      const attendance = attendanceRes.data;
      setMembers(membersRes.data);
      setCheckedIn(new Set(attendance.checkedInIds || []));
      setStats(statsRes.data || { totalMembers: 0, recentServices: [] });
    } catch (error) {
      console.error('Failed to load attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const refreshForDate = async (date: string) => {
    setServiceDate(date);
    try {
      const [membersRes, attendanceRes] = await Promise.all([
        attendanceService.getMembers(date),
        attendanceService.getByDate(date),
      ]);
      setMembers(membersRes.data);
      setCheckedIn(new Set(attendanceRes.data.checkedInIds || []));
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  const handleCheckIn = async (memberId: number, status = 'present') => {
    try {
      await attendanceService.checkIn(serviceDate, memberId, status);
      toast.success('Checked in');
      const attendanceRes = await attendanceService.getByDate(serviceDate);
      setCheckedIn(new Set(attendanceRes.data.checkedInIds || []));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    }
  };

  const handleUndo = async (memberId: number) => {
    try {
      await attendanceService.undoCheckIn(serviceDate, memberId);
      toast.success('Check-in removed');
      const attendanceRes = await attendanceService.getByDate(serviceDate);
      setCheckedIn(new Set(attendanceRes.data.checkedInIds || []));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to undo');
    }
  };

  const handleSelfCheckIn = async () => {
    setCheckingIn(true);
    try {
      await attendanceService.selfCheckIn(new Date().toISOString().split('T')[0]);
      setOwnCheckedIn(true);
      toast.success('Checked in for today');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (!isLeader) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">Check in for today's service</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Today's Service</p>
              <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <button
              onClick={handleSelfCheckIn}
              disabled={checkingIn || ownCheckedIn}
              className={`btn-primary ${ownCheckedIn ? '!bg-green-100 !text-green-700 hover:!bg-green-100 cursor-default' : ''}`}
            >
              {ownCheckedIn ? 'Checked in' : checkingIn ? 'Checking in...' : 'Check in'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Thank you for letting your family know you're joining this Friday. Only leaders see the attendance roster.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 mt-1">Track Friday service attendance</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => refreshForDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="ml-auto">
            <div className="text-sm text-gray-500">Checked in</div>
            <div className="text-2xl font-bold text-primary-700">{checkedIn.size}/{members.length}</div>
          </div>
        </div>
      </div>

      {stats.recentServices.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Services</h2>
          <div className="flex flex-wrap gap-3">
            {stats.recentServices.map((s) => (
              <button
                key={s.service_date}
                onClick={() => refreshForDate(s.service_date)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  s.service_date === serviceDate ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="block">{new Date(s.service_date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="block text-xs text-gray-500">{s.present_count} present</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : members.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
          <p className="mt-1 text-sm text-gray-500">No members are registered for this date.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Member</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Family</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isPresent = checkedIn.has(m.id);
                return (
                  <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isPresent ? 'bg-green-50/40' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-warm-700 font-semibold text-xs">{m.full_name.charAt(0)}</div>
                        <span className="font-medium text-gray-900">{m.full_name}</span>
                        {isPresent && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Present</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{m.family_name || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      {isPresent ? (
                        <button onClick={() => handleUndo(m.id)} className="px-3 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Undo</button>
                      ) : (
                        <div className="inline-flex gap-1">
                          <button onClick={() => handleCheckIn(m.id, 'present')} className="px-3 py-1 text-xs font-medium rounded-lg border border-green-200 text-green-600 hover:bg-green-50">Check in</button>
                          <button onClick={() => handleCheckIn(m.id, 'late')} className="px-3 py-1 text-xs font-medium rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50">Late</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
