'use client';

import React from 'react';
import { useUlb, SEED_ACCOUNTS } from '../context/UlbContext';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import { Building2, User, ChevronDown, Activity } from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    selectedUlb,
    allUlbs,
    setSelectedUlbId,
    currentUser,
    setCurrentAccount,
    isBackendOnline,
  } = useUlb();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Branding & Tenant Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 text-sm shadow-lg shadow-amber-500/20">
            SL
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
              SmartLight OS
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                v0.1.0-alpha
              </span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Control Room System
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 mx-2" />

        {/* ULB Context Selector */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">ULB Scope:</span>
          <select
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            value={selectedUlb?.id || ''}
            onChange={(e) => setSelectedUlbId(e.target.value)}
          >
            {allUlbs.map((ulb) => (
              <option key={ulb.id} value={ulb.id}>
                {ulb.name} ({ulb.code})
              </option>
            ))}
          </select>
        </div>

        <SimulatedBadge />
      </div>

      {/* Right: Health Pill & Active User Switcher */}
      <div className="flex items-center gap-4">
        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-xs font-mono">
          <Activity
            className={`w-3.5 h-3.5 ${
              isBackendOnline ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
            }`}
          />
          <span className="text-slate-400">API:</span>
          <span className={isBackendOnline ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
            {isBackendOnline ? 'ONLINE' : 'SANDBOX MODE'}
          </span>
        </div>

        {/* User / Scoped Role Selector */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-200">
              {currentUser.name}
            </div>
            <div className="text-[10px] font-mono text-amber-400">
              {currentUser.role}
            </div>
          </div>

          <select
            aria-label="Switch User Profile"
            className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-amber-500 cursor-pointer ml-1"
            value={currentUser.email}
            onChange={(e) => setCurrentAccount(e.target.value)}
          >
            {SEED_ACCOUNTS.map((acc) => (
              <option key={acc.email} value={acc.email}>
                Switch: {acc.name} ({acc.role})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
