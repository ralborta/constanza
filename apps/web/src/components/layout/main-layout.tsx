'use client';

import { Sidebar } from './sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/20">
          {children}
        </div>
      </div>
    </div>
  );
}

