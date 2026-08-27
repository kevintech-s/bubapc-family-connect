import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import OfflineIndicator from '../common/OfflineIndicator';
import RealTimeSync from '../RealTimeSync';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <RealTimeSync />
      <Sidebar />
      <div className="lg:ml-64">
        <div className="pt-16 lg:pt-0 min-h-screen">
          <main className="p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
      <OfflineIndicator />
    </div>
  );
}
