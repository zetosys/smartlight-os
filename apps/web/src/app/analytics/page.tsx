'use client';

import React from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { SimulatedBadge } from '@smartlight/ui';
import { BarChart3, Zap, TrendingUp, Flame } from 'lucide-react';

export default function AnalyticsPage() {
  const { selectedUlb } = useUlb();

  const powerLoad = selectedUlb?.code === 'ULB-GBL' ? 142.8 : 95.2;
  const energyMwh = selectedUlb?.code === 'ULB-GBL' ? 1.24 : 0.82;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Energy Consumption &amp; Analytics
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical burning hours, energy deltas, and feeder-level power factor profiles.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Cumulative Energy Today</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {energyMwh} <span className="text-sm font-normal text-slate-400">MWh</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Computed via <code className="text-amber-400">watts * hours / 1000</code>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Peak Demand</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {powerLoad} <span className="text-sm font-normal text-slate-400">kW</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Occurred at 20:30 IST
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Average Burning Hours</span>
            <Flame className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            1,240 <span className="text-sm font-normal text-slate-400">hrs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            Luminaires runtime counter
          </div>
        </div>
      </div>
    </div>
  );
}
