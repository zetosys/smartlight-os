'use client';

import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { UlbProvider } from '../context/UlbContext';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  return (
    <UlbProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <TopBar
          onToggleSidebar={() => {
            setIsSidebarOpen((prev) => !prev);
          }}
          isSidebarOpen={isSidebarOpen}
        />
        <div className="flex flex-1 relative">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => {
              setIsSidebarOpen(false);
            }}
          />
          <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-950/60 min-w-0 max-w-full transition-all duration-200">
            {children}
          </main>
        </div>
      </div>
    </UlbProvider>
  );
};
