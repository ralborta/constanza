'use client';

import { Sidebar } from './sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </div>
    </div>
  );
}

