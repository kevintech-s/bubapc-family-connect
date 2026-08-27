import { useState, useEffect } from 'react';
import { worshipLeaderService } from '../services/api';
import { WorshipLeader } from '../types';

export default function WorshipPage() {
  const [leaders, setLeaders] = useState<WorshipLeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaders();
  }, []);

  const loadLeaders = async () => {
    try {
      const res = await worshipLeaderService.getAll();
      setLeaders(res.data);
  } catch (error) {
      console.error('Failed to load worship leaders:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeLeaders = leaders.filter((l) => l.is_active);
  const inactiveLeaders = leaders.filter((l) => !l.is_active);

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
        <h1 className="text-2xl font-bold text-gray-900">Worship Leaders</h1>
        <p className="text-gray-500 mt-1">Our current worship team</p>
      </div>

      {activeLeaders.length === 0 && inactiveLeaders.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No worship leaders</h3>
          <p className="mt-1 text-sm text-gray-500">Worship leaders have not been assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeLeaders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Team</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeLeaders.map((leader) => (
                  <div key={leader.id} className="card text-center">
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl mx-auto">
                      {leader.name.charAt(0)}
                    </div>
                    <h3 className="mt-3 font-semibold text-gray-900">{leader.name}</h3>
                    <p className="text-sm text-primary-600 mt-0.5">{leader.role}</p>
                    {leader.start_date && (
                      <p className="text-xs text-gray-400 mt-2">
                        Since {new Date(leader.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {inactiveLeaders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-500 mb-4">Previous Members</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveLeaders.map((leader) => (
                  <div key={leader.id} className="card text-center opacity-60">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold mx-auto">
                      {leader.name.charAt(0)}
                    </div>
                    <h3 className="mt-2 font-medium text-gray-700">{leader.name}</h3>
                    <p className="text-sm text-gray-500">{leader.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
