'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { OverviewDashboardKpi } from '@smartlight/shared-types';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import {
  Lightbulb,
  Power,
  Zap,
  Activity,
  AlertTriangle,
  Wrench,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const { selectedUlb, isBackendOnline } = useUlb();
  const [kpis, setKpis] = useState<OverviewDashboardKpi | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.fetch<OverviewDashboardKpi>(
        `dashboard/overview?ulbId=${selectedUlb?.id || ''}`,
      );
      setKpis(data);
    } catch {
      // Resilient fallback for Prompt 0 sandbox view
      setKpis({
        totalLuminaires: selectedUlb?.code === 'ULB-GBL' ? 2740 : 1868,
        activeLuminairesOn: selectedUlb?.code === 'ULB-GBL' ? 1890 : 1320,
        activeLuminairesOff: selectedUlb?.code === 'ULB-GBL' ? 850 : 548,
        onlineDevices: selectedUlb?.code === 'ULB-GBL' ? 2732 : 1860,
        offlineDevices: selectedUlb?.code === 'ULB-GBL' ? 8 : 8,
        openAlerts: selectedUlb?.code === 'ULB-GBL' ? 1 : 0,
        activeTickets: selectedUlb?.code === 'ULB-GBL' ? 1 : 0,
        totalEnergyKwhToday: selectedUlb?.code === 'ULB-GBL' ? 1240.5 : 820.3,
        currentPowerKw: selectedUlb?.code === 'ULB-GBL' ? 142.8 : 95.2,
        uptimePercentage: 99.8,
        complianceNote:
          'Simulated IoT fleet — Initial Prompt 0 architecture baseline. Pending field hardware verification.',
      });
    } finally {
      setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    void fetchOverview();
  }, [selectedUlb]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Operations Overview
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name || 'All ULBs'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time streetlight fleet telemetry, power demand, and system health status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            Updated: {lastRefreshed || '—'}
          </span>
          <button
            onClick={() => {
              void fetchOverview();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tender & Hardware Disclaimer Alert */}
      <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-amber-300 flex items-center gap-2">
            <span>Hardware Abstraction Layer Active</span>
            <SimulatedBadge />
          </div>
          <div className="text-slate-300 leading-relaxed">
            All devices in this interface run on the shared <code className="text-amber-400">DeviceAdapter</code> contract with deterministic simulated telemetry. No OEM-specific code is coupled to the presentation or domain layers.
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Luminaires</span>
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">
              {kpis?.totalLuminaires.toLocaleString() ?? '—'}
            </span>
            <span className="text-xs text-emerald-400 font-mono">
              {kpis ? `${kpis.onlineDevices} online` : ''}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Active ON: {kpis?.activeLuminairesOn}</span>
            <span className="text-slate-600">|</span>
            <span>OFF: {kpis?.activeLuminairesOff}</span>
          </div>
        </div>

        {/* Current Power Demand */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Current Power Load</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">
              {kpis?.currentPowerKw ?? '—'} <span className="text-sm font-normal text-slate-400">kW</span>
            </span>
            <span className="text-xs text-sky-400 font-mono">Active</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Total Energy Today: <span className="font-mono text-slate-200">{kpis?.totalEnergyKwhToday} kWh</span>
          </div>
        </div>

        {/* Active Alarms */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Open System Alarms</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-400 font-mono">
              {kpis?.openAlerts ?? '—'}
            </span>
            <StatusBadge status={kpis && kpis.openAlerts > 0 ? 'warning' : 'healthy'} />
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Field Tickets: <span className="font-mono text-slate-200">{kpis?.activeTickets} Assigned</span>
          </div>
        </div>

        {/* System Uptime */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Monthly Uptime</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              {kpis?.uptimePercentage ?? '—'}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">SLA &ge; 98.0%</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Tenant: <span className="text-slate-300 font-mono">{selectedUlb?.code || 'ALL'}</span>
          </div>
        </div>
      </div>

      {/* Fleet Distribution & Quick Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Composition by Wattage */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">
              Target Fleet Wattage Distribution ({selectedUlb?.name})
            </h2>
            <span className="text-xs font-mono text-slate-400">
              PRD Mix Specification
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">35W LED Luminaires (Local & Residential)</span>
                <span className="font-mono text-slate-400">
                  {selectedUlb?.code === 'ULB-GBL' ? '859 lights (31%)' : '1,364 lights (73%)'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: selectedUlb?.code === 'ULB-GBL' ? '31%' : '73%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">70W LED Luminaires (Arterial & Collector Roads)</span>
                <span className="font-mono text-slate-400">
                  {selectedUlb?.code === 'ULB-GBL' ? '1,542 lights (56%)' : '381 lights (20%)'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-400 h-full rounded-full"
                  style={{ width: selectedUlb?.code === 'ULB-GBL' ? '56%' : '20%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">110W LED Luminaires (Highways & Major Junctions)</span>
                <span className="font-mono text-slate-400">
                  {selectedUlb?.code === 'ULB-GBL' ? '339 lights (13%)' : '123 lights (7%)'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: selectedUlb?.code === 'ULB-GBL' ? '13%' : '7%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white mb-3">
            Quick Operations
          </h2>
          <div className="space-y-2 text-xs">
            <a
              href="/controls"
              className="w-full p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded border border-slate-700 flex items-center justify-between text-slate-200 transition"
            >
              <span>Live Control Console</span>
              <Power className="w-4 h-4 text-amber-400" />
            </a>
            <a
              href="/devices"
              className="w-full p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded border border-slate-700 flex items-center justify-between text-slate-200 transition"
            >
              <span>Inspect Device Registry</span>
              <Activity className="w-4 h-4 text-sky-400" />
            </a>
            <a
              href="/simulator"
              className="w-full p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded border border-slate-700 flex items-center justify-between text-slate-200 transition"
            >
              <span>Simulator Scenario Lab</span>
              <SimulatedBadge />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
