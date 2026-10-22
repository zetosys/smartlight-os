'use client';

import React from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { UlbProvider } from '../context/UlbContext';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <UlbProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <TopBar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto bg-slate-950/60 max-w-full">
            {children}
          </main>
        </div>
      </div>
    </UlbProvider>
  );
};
