import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/api';
import { onSyncEvent } from '../components/RealTimeSync';
import { DashboardData } from '../types';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const unsub = onSyncEvent('sync-complete', loadDashboard);
    return unsub;
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await dashboardService.getStats();
      setData(res.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  const isLeader = user?.role === 'family_leader' || user?.role === 'family_coordinator' || user?.role === 'pastor';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-primary-100 mt-1">Family meetings: Fridays 5:00 PM - 6:00 PM</p>
      </div>

      {data?.upcomingCancellation && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-800">Friday Service Cancelled - {new Date(data.upcomingCancellation.cancellation_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              <p className="text-sm text-red-700 mt-1">{data.upcomingCancellation.reason}</p>
            </div>
          </div>
        </div>
      )}

      {isLeader && data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500">Families</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.stats.totalFamilies}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Members</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.stats.totalMembers}</p>
          </div>
          <Link to="/attendance" className="card block hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Present Today</p>
            <p className="text-2xl font-bold text-primary-700 mt-1">{data.todayAttendance?.present_count ?? 0}</p>
          </Link>
          <div className="card">
            <p className="text-sm text-gray-500">Prayer Requests</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data?.recentPrayerRequests?.length || 0}</p>
          </div>
        </div>
      )}

      {data?.birthdays && data.birthdays.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎂</span>
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.birthdays.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-pink-50 border border-pink-100">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-semibold text-sm">{m.full_name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                  <p className="text-xs text-gray-500">{m.birthday ? new Date(m.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : ''} • {m.family_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
            <Link to="/announcements" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {data?.recentAnnouncements?.length ? (
            <div className="space-y-3">
              {data.recentAnnouncements.slice(0, 3).map((ann) => (
                <div key={ann.id} className={`p-3 rounded-lg border ${ann.is_important ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-2">
                    {ann.is_important && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 flex-shrink-0 mt-0.5">!</span>}
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{ann.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(ann.published_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No announcements yet</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Worship Leaders</h2>
            <Link to="/worship" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {data?.activeWorshipLeaders?.length ? (
            <div className="space-y-3">
              {data.activeWorshipLeaders.map((wl) => (
                <div key={wl.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">{wl.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">{wl.name}</h3>
                    <p className="text-xs text-gray-500">{wl.role}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No worship leaders assigned</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Prayer Requests</h2>
            <Link to="/prayer-requests" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {data?.recentPrayerRequests?.length ? (
            <div className="space-y-3">
              {data.recentPrayerRequests.slice(0, 3).map((pr) => (
                <div key={pr.id} className="p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">{pr.title}</h3>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      pr.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      pr.status === 'addressed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{pr.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{pr.category}{pr.member_name ? ` • ${pr.member_name}` : ''}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No prayer requests</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Photos</h2>
            <Link to="/gallery" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {data?.recentPhotos?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {data.recentPhotos.slice(0, 6).map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No photos uploaded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
