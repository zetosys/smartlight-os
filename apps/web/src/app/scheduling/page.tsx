'use client';

import React from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { Calendar, Clock, Sun, Moon } from 'lucide-react';
import { SimulatedBadge } from '@smartlight/ui';

export default function SchedulingPage() {
  const { selectedUlb } = useUlb();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Lighting Schedules &amp; Astronomical Profiles
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated calendar switching and sunset/sunrise astronomical offsets with conflict prevention.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            Configured Lighting Profiles
          </h2>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-white text-sm">Main Highway Nightfall Profile</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  ACTIVE
                </span>
              </div>
              <div className="text-slate-400 text-xs font-sans">
                Targets: NH-1D Srinagar-Leh Highway (110W Luminaires)
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 text-[11px]">
                <div className="flex items-center gap-2 text-amber-300">
                  <Moon className="w-4 h-4" />
                  <span>ON: Sunset + 15m (18:15 IST)</span>
                </div>
                <div className="flex items-center gap-2 text-sky-300">
                  <Sun className="w-4 h-4" />
                  <span>OFF: Sunrise - 15m (05:45 IST)</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-white text-sm">Market &amp; Residential Ward Profile</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  ACTIVE
                </span>
              </div>
              <div className="text-slate-400 text-xs font-sans">
                Targets: Ward 1 &amp; Ward 2 Local Roads (35W &amp; 70W Luminaires)
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 text-[11px]">
                <div className="flex items-center gap-2 text-amber-300">
                  <Moon className="w-4 h-4" />
                  <span>ON: 18:30 IST</span>
                </div>
                <div className="flex items-center gap-2 text-sky-300">
                  <Sun className="w-4 h-4" />
                  <span>OFF: 06:00 IST</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            Astronomical Reference (Asia/Kolkata)
          </h2>
          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded flex justify-between">
              <span className="text-slate-400">Calculated Dusk:</span>
              <span className="text-amber-400 font-bold">18:12 IST</span>
            </div>
            <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded flex justify-between">
              <span className="text-slate-400">Calculated Dawn:</span>
              <span className="text-sky-400 font-bold">05:48 IST</span>
            </div>
            <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded flex justify-between">
              <span className="text-slate-400">Conflict Rule:</span>
              <span className="text-emerald-400">Manual Override Wins</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
