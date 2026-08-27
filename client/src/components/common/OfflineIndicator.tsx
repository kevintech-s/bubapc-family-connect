import { useState, useEffect } from 'react';
import { isOnline, getSyncQueue } from '../../utils/offlineDB';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(async () => {
      const queue = await getSyncQueue();
      setPendingSync(queue.length);
    }, 5000);

    getSyncQueue().then((q) => setPendingSync(q.length));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (online && pendingSync === 0) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:max-w-sm`}>
      <div className={`rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 ${
        online ? 'bg-amber-500 text-white' : 'bg-gray-800 text-white'
      }`}>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
          online ? 'bg-amber-200 animate-pulse' : 'bg-red-400'
        }`}></div>
        <div className="flex-1 min-w-0">
          {online ? (
            <p className="text-sm font-medium">
              Syncing {pendingSync} pending change{pendingSync !== 1 ? 's' : ''}...
            </p>
          ) : (
            <p className="text-sm font-medium">
              You're offline. Changes will sync when connected.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
