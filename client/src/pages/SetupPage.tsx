import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setServerUrl, refreshApiInstance } from '../services/api';
import toast from 'react-hot-toast';

export default function SetupPage() {
  const [mode, setMode] = useState<'choose' | 'offline' | 'server'>('choose');
  const [serverUrl, setServerUrl] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleOfflineSetup = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      localStorage.setItem('bubapc_offline_user', JSON.stringify({
        id: 1, email: email || 'local@offline', name, role: 'admin', is_active: true, created_at: new Date().toISOString()
      }));
      await register(email || 'local@offline', password || 'offline', name);
      toast.success('Welcome! Running in offline mode.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleServerSetup = async (e: FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) { toast.error('Server URL is required'); return; }
    setLoading(true);
    try {
      const url = serverUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('Server responded but status is not ok');
      setServerUrl(url);
      refreshApiInstance();
      toast.success('Connected to server!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-warm-50 px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BUBAPC Family Connect</h1>
            <p className="text-gray-500 mt-2">How would you like to use this app?</p>
          </div>

          <button onClick={() => setMode('offline')} className="card w-full text-left hover:border-primary-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728m12.728 0A9 9 0 015.636 18.364m12.728-12.728L5.636 18.364" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Use Offline</h3>
                <p className="text-sm text-gray-500 mt-1">All data stored on this phone. No internet needed after setup.</p>
              </div>
            </div>
          </button>

          <button onClick={() => setMode('server')} className="card w-full text-left hover:border-primary-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Connect to Server</h3>
                <p className="text-sm text-gray-500 mt-1">Sync data across multiple devices via a server.</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'server') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-warm-50 px-4">
        <div className="w-full max-w-md">
          <button onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back</button>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Connect to Server</h1>
            <p className="text-gray-500 mt-1">Enter your server URL to sync data</p>
          </div>
          <div className="card space-y-4">
            <form onSubmit={handleServerSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server URL</label>
                <input type="url" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:5000/api" className="input-field" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center">You can also set this later in Settings</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-warm-50 px-4">
      <div className="w-full max-w-md">
        <button onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back</button>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Offline Setup</h1>
          <p className="text-gray-500 mt-1">All data will be stored on this phone</p>
        </div>
        <div className="card space-y-4">
          <form onSubmit={handleOfflineSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="input-field" required placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="Used for identification only" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password (optional)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-field" placeholder="Leave blank for no password" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Setting up...' : 'Start Using App'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
