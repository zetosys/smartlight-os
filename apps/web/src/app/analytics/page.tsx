'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge } from '@smartlight/ui';
import {
  Zap,
  TrendingDown,
  Leaf,
  IndianRupee,
  RotateCw,
  Gauge,
  Activity,
  Layers,
  BarChart2,
  Calendar,
} from 'lucide-react';
import { EnergySummary, FeederLoadProfile } from '@smartlight/shared-types';

export default function AnalyticsPage() {
  const { selectedUlb } = useUlb();

  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [energySummary, setEnergySummary] = useState<EnergySummary | null>(null);
  const [feederProfiles, setFeederProfiles] = useState<FeederLoadProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedUlb) return;
    loadData();
  }, [selectedUlb, period]);

  const loadData = async () => {
    if (!selectedUlb) return;
    setIsLoading(true);

    try {
      // 1. Fetch energy summary
      const energyData = await ApiClient.fetch<EnergySummary>(
        `telemetry/energy-summary?ulbId=${selectedUlb.id}&period=${period}`,
      );
      setEnergySummary(energyData);

      // 2. Fetch CCMS feeder load profiles
      const feederData = await ApiClient.fetch<FeederLoadProfile[]>(
        `telemetry/feeders/load-profiles?ulbId=${selectedUlb.id}`,
      );
      setFeederProfiles(feederData || []);
    } catch {
      // Fallback
      const isKtr = selectedUlb.code === 'ULB-KTR';
      const baseKw = isKtr ? 87.9 : 175.3;
      const hpsvKw = isKtr ? 467.0 : 685.0;
      const days = period === 'day' ? 1 : period === 'week' ? 7 : period === 'year' ? 365 : 30;
      const totalKwh = +(baseKw * 11.2 * days).toFixed(1);
      const baseKwh = +(hpsvKw * 11.2 * days).toFixed(1);
      const savingsKwh = +(baseKwh - totalKwh).toFixed(1);

      setEnergySummary({
        ulbId: selectedUlb.id,
        period,
        totalEnergyKwh: totalKwh,
        baselineEnergyKwh: baseKwh,
        energySavingsKwh: savingsKwh,
        energySavingsPercent: +((savingsKwh / baseKwh) * 100).toFixed(1),
        co2SavedKg: +(savingsKwh * 0.82).toFixed(1),
        costSavingsInr: +(savingsKwh * 7.5).toFixed(0),
        dailyTrend: Array.from({ length: 7 }).map((_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
          actualKwh: +(baseKw * 11.2).toFixed(1),
          baselineKwh: +(hpsvKw * 11.2).toFixed(1),
          savingsKwh: +(hpsvKw * 11.2 - baseKw * 11.2).toFixed(1),
        })),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Energy Consumption &amp; Municipal Analytics
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name} ({selectedUlb?.code})
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Partitioned time-series telemetry rollups, conventional HPSV baseline comparison, and 3-phase CCMS feeder balancing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded transition uppercase ${
                  period === p
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="Refresh Analytics"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <SimulatedBadge />
        </div>
      </div>

      {/* Top Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cumulative LED Energy Consumption */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Actual Energy Consumed</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {energySummary ? (energySummary.totalEnergyKwh / 1000).toFixed(2) : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1.5">MWh</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="font-mono text-slate-300">
              {energySummary ? energySummary.totalEnergyKwh.toLocaleString() : '--'} kWh
            </span>
            <span>across {period}</span>
          </div>
        </div>

        {/* Energy Reduction Percentage */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Energy Savings vs HPSV</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {energySummary ? `${energySummary.energySavingsPercent}%` : '--'}
          </div>
          <div className="text-[11px] text-slate-400">
            Saved <strong className="text-slate-200">{energySummary ? (energySummary.energySavingsKwh / 1000).toFixed(2) : '--'} MWh</strong> vs 250W HPSV
          </div>
        </div>

        {/* Avoided CO2 Emissions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Avoided CO₂ Emissions</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {energySummary ? (energySummary.co2SavedKg / 1000).toFixed(2) : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1.5">Metric Tons</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Grid factor: <code className="text-emerald-400">0.82 kg/kWh</code>
          </div>
        </div>

        {/* Monetary Tariff Savings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Municipal Cost Savings</span>
            <IndianRupee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            ₹{energySummary ? energySummary.costSavingsInr.toLocaleString() : '--'}
          </div>
          <div className="text-[11px] text-slate-400">
            Tariff baseline: <code className="text-slate-300">₹7.50 / kWh</code>
          </div>
        </div>
      </div>

      {/* Energy Comparison & Daily Trend Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-sky-400" />
              Daily Consumption vs Baseline HPSV Comparison (Past 7 Days)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comparison of LED luminaire smart switching vs conventional non-metered 250W sodium lamps.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50" />
              <span className="text-slate-400">HPSV Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-slate-200">Smart LED Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500" />
              <span className="text-emerald-400">Saved</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Comparison */}
        <div className="space-y-3 pt-2">
          {energySummary?.dailyTrend.map((d) => {
            const maxVal = d.baselineKwh;
            const actualPercent = Math.min(100, (d.actualKwh / maxVal) * 100);
            const savingsPercent = 100 - actualPercent;

            return (
              <div key={d.date} className="space-y-1 text-xs font-mono">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300">{d.date}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-300">LED: {d.actualKwh.toLocaleString()} kWh</span>
                    <span className="text-slate-500">vs</span>
                    <span className="text-rose-400 line-through">{d.baselineKwh.toLocaleString()} kWh</span>
                    <span className="text-emerald-400 font-bold">(Saved {d.savingsKwh.toLocaleString()} kWh)</span>
                  </div>
                </div>

                <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    style={{ width: `${actualPercent}%` }}
                    className="h-full bg-amber-500 transition-all duration-500"
                    title={`Actual LED Load: ${d.actualKwh} kWh`}
                  />
                  <div
                    style={{ width: `${savingsPercent}%` }}
                    className="h-full bg-emerald-500/30 border-l border-emerald-500/50 transition-all duration-500"
                    title={`Energy Saved: ${d.savingsKwh} kWh`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CCMS Feeder Load Profiles & 3-Phase Balancing Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              CCMS Feeder Electrical Load &amp; 3-Phase Balancing
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live phase power distribution (R / Y / B), total kW demand, and power factor per feeder switchboard.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {feederProfiles.length} Feeders Configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Feeder Code</th>
                <th className="py-2.5 px-3">Feeder Name</th>
                <th className="py-2.5 px-3">Luminaires</th>
                <th className="py-2.5 px-3">Active Load</th>
                <th className="py-2.5 px-3">3-Phase Split (R / Y / B)</th>
                <th className="py-2.5 px-3">Power Factor</th>
                <th className="py-2.5 px-3">Energy Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {feederProfiles.slice(0, 10).map((f) => (
                <tr key={f.feederId} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-bold text-white">{f.feederCode}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-300">{f.feederName}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-amber-400 font-bold">{f.activeLuminairesOn}</span>
                    <span className="text-slate-500"> / {f.totalLuminaires}</span>
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">{f.currentPowerKw} kW</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-400">R: {f.phaseDistribution.phaseR}</span>
                      <span className="text-amber-400">Y: {f.phaseDistribution.phaseY}</span>
                      <span className="text-sky-400">B: {f.phaseDistribution.phaseB}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        f.avgPowerFactor >= 0.95
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {f.avgPowerFactor}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{f.totalEnergyKwhToday} kWh</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
