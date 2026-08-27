import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/api';
import { DashboardData } from '../../types';

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your community platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/admin/families" className="card hover:shadow-md transition-shadow group">
          <p className="text-sm text-gray-500">Families</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">{data?.stats.totalFamilies || 0}</p>
          <p className="text-xs text-gray-400 mt-2 group-hover:text-primary-600">Manage families →</p>
        </Link>
        <Link to="/admin/members" className="card hover:shadow-md transition-shadow group">
          <p className="text-sm text-gray-500">Members</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">{data?.stats.totalMembers || 0}</p>
          <p className="text-xs text-gray-400 mt-2 group-hover:text-primary-600">Manage members →</p>
        </Link>
        <Link to="/admin/announcements" className="card hover:shadow-md transition-shadow group">
          <p className="text-sm text-gray-500">Announcements</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">{data?.recentAnnouncements?.length || 0}</p>
          <p className="text-xs text-gray-400 mt-2 group-hover:text-primary-600">Manage →</p>
        </Link>
        <Link to="/admin/prayer-requests" className="card hover:shadow-md transition-shadow group">
          <p className="text-sm text-gray-500">Prayer Requests</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">{data?.recentPrayerRequests?.length || 0}</p>
          <p className="text-xs text-gray-400 mt-2 group-hover:text-primary-600">Manage →</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
            <Link to="/admin/announcements" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {data?.recentAnnouncements?.length ? (
            <div className="space-y-2">
              {data.recentAnnouncements.slice(0, 4).map((ann) => (
                <div key={ann.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  {ann.is_important && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{ann.title}</p>
                    <p className="text-xs text-gray-500">{new Date(ann.published_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No announcements</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Worship Leaders</h2>
            <Link to="/admin/worship" className="text-sm text-primary-600 hover:text-primary-700">Manage</Link>
          </div>
          {data?.activeWorshipLeaders?.length ? (
            <div className="space-y-2">
              {data.activeWorshipLeaders.map((wl) => (
                <div key={wl.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">
                    {wl.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{wl.name}</p>
                    <p className="text-xs text-gray-500">{wl.role}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No active worship leaders</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Prayer Requests</h2>
            <Link to="/admin/prayer-requests" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {data?.recentPrayerRequests?.length ? (
            <div className="space-y-2">
              {data.recentPrayerRequests.slice(0, 4).map((pr) => (
                <div key={pr.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{pr.title}</p>
                    <p className="text-xs text-gray-500">{pr.category}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    pr.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    pr.status === 'addressed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {pr.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No prayer requests</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/admin/families" className="p-3 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-200 text-center text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors">
              Add Family
            </Link>
            <Link to="/admin/members" className="p-3 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-200 text-center text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors">
              Add Member
            </Link>
            <Link to="/admin/announcements" className="p-3 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-200 text-center text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors">
              New Announcement
            </Link>
            <Link to="/admin/gallery" className="p-3 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-200 text-center text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors">
              Upload Photo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
