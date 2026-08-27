import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { setServerUrl, getServerUrl, refreshApiInstance } from '../services/api';

export default function SettingsPage() {
  const { user, offlineMode } = useAuth();
  const [serverUrl, setServerUrlState] = useState(getServerUrl() || '');
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    setServerUrlState(getServerUrl() || '');
  }, []);

  const testConnection = async () => {
    if (!serverUrl.trim()) {
      toast.error('Enter a server URL first');
      return;
    }
    setTesting(true);
    setConnected(null);
    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setConnected(true);
        toast.success('Server connected!');
      } else {
        setConnected(false);
        toast.error('Server responded but status is not ok');
      }
    } catch {
      setConnected(false);
      toast.error('Could not connect to server');
    } finally {
      setTesting(false);
    }
  };

  const saveServerUrl = () => {
    const url = serverUrl.trim().replace(/\/$/, '');
    setServerUrl(url || null);
    refreshApiInstance();
    toast.success(url ? 'Server URL saved. Reconnect required.' : 'Server disconnected. Running offline.');
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your app connection</p>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Connection Mode</h2>
        <div className={`p-3 rounded-lg text-sm font-medium ${offlineMode ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          {offlineMode ? 'Offline Mode — Data stored locally only' : 'Connected Mode — Syncing with server'}
        </div>
        {user && (
          <p className="text-sm text-gray-500">
            Logged in as: <strong>{user.name}</strong> ({user.email})
            {offlineMode && ' [local]'}
          </p>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Server Connection</h2>
        <p className="text-sm text-gray-500">
          Enter your server URL to enable sync across devices. Without a server, all data is stored locally on this phone.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Server URL</label>
          <input
            type="url"
            value={serverUrl}
            onChange={(e) => setServerUrlState(e.target.value)}
            placeholder="https://your-server.com/api"
            className="input-field"
          />
          <p className="text-xs text-gray-400 mt-1">Example: http://192.168.1.100:5000/api</p>
        </div>
        <div className="flex gap-3">
          <button onClick={testConnection} disabled={testing} className="btn-secondary">
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button onClick={saveServerUrl} className="btn-primary">
            Save
          </button>
        </div>
        {connected !== null && (
          <p className={`text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? 'Server is reachable' : 'Server is not reachable'}
          </p>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
        <p className="text-sm text-gray-500">
          Clear all locally stored data. This does not affect the server.
        </p>
        <button
          onClick={() => {
            if (confirm('Are you sure? This will delete all local data.')) {
              localStorage.clear();
              window.location.href = '/';
            }
          }}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
        >
          Clear Local Data
        </button>
      </div>
    </div>
  );
}
