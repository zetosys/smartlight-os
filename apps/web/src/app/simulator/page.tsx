'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import {
  FlaskConical,
  Play,
  Square,
  Zap,
  Bug,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Radio,
  Sliders,
  Flame,
  Activity,
  Layers,
  Clock,
} from 'lucide-react';
import { SimulatorFleetStatus, TelemetryReading } from '@smartlight/shared-types';

export default function SimulatorPage() {
  const { selectedUlb } = useUlb();
  const [simStatus, setSimStatus] = useState<SimulatorFleetStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fault injection controls
  const [faultCode, setFaultCode] = useState<string>('LAMP_FAILURE');
  const [faultPercentage, setFaultPercentage] = useState<number>(2);
  const [targetDeviceId, setTargetDeviceId] = useState<string>('');
  const [recentReadings, setRecentReadings] = useState<TelemetryReading[]>([]);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data: SimulatorFleetStatus = await ApiClient.fetch('simulator/status');
      setSimStatus(data);
    } catch {
      // Fallback preview
      setSimStatus({
        adapterId: 'SIMULATOR',
        scenarioName: '4,608 Fleet Municipal Control Room Simulation',
        seed: 365,
        activeDevices: 4608,
        isRunning: true,
        emissionIntervalMs: 10000,
        ulbBreakdown: {
          ganderbal: { total: 2740, '35W': 859, '70W': 1542, '110W': 339 },
          katra: { total: 1868, '35W': 1364, '70W': 381, '110W': 123 },
        },
        fleetBreakdown: {
          '35W': 2223,
          '70W': 1923,
          '110W': 462,
        },
        activeFaults: [],
        lastTickAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Seed / Provision Full 4,608 Fleet
  const handleSeedFleet = async () => {
    setSubmitting(true);
    setActionMsg(null);
    setActionError(null);
    try {
      const data: SimulatorFleetStatus = await ApiClient.fetch('simulator/seed-fleet', {
        method: 'POST',
        body: JSON.stringify({ seed: 365 }),
      });
      setSimStatus(data);
      setActionMsg(
        `Full fleet of 4,608 streetlights successfully generated across Ganderbal (2,740) & Katra (1,868).`,
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to seed simulator fleet');
    } finally {
      setSubmitting(false);
    }
  };

  // Start / Stop Background Telemetry Emission Loop
  const handleToggleLoop = async () => {
    setSubmitting(true);
    setActionMsg(null);
    setActionError(null);
    try {
      if (simStatus?.isRunning) {
        const data = await ApiClient.fetch('simulator/stop', { method: 'POST' });
        setSimStatus(data);
        setActionMsg('Background telemetry loop stopped. Virtual fleet idle.');
      } else {
        const data = await ApiClient.fetch('simulator/start', {
          method: 'POST',
          body: JSON.stringify({ intervalMs: 10000 }),
        });
        setSimStatus(data);
        setActionMsg('Background telemetry emission loop started (10s interval).');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to toggle emission loop');
    } finally {
      setSubmitting(false);
    }
  };

  // Advance simulation clock (trigger tick)
  const handleTick = async () => {
    setSubmitting(true);
    setActionMsg(null);
    setActionError(null);
    try {
      const res = await ApiClient.fetch<{
        tickedAt: string;
        sampleSize: number;
        ingested: number;
        anomaliesDetected: number;
        recentReadings: TelemetryReading[];
      }>('simulator/tick', {
        method: 'POST',
        body: JSON.stringify({ sampleCount: 50 }),
      });
      if (res.recentReadings) {
        setRecentReadings(res.recentReadings);
      }
      setActionMsg(
        `Simulation clock advanced. Sampled ${res.sampleSize} devices, ingested ${res.ingested} readings (${res.anomaliesDetected} anomalies detected).`,
      );
      fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to trigger tick');
    } finally {
      setSubmitting(false);
    }
  };

  // Inject Anomaly / Fault
  const handleInjectFault = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionMsg(null);
    setActionError(null);

    try {
      const payload: any = {
        faultCode,
      };

      if (targetDeviceId.trim()) {
        payload.deviceId = targetDeviceId.trim();
      } else {
        payload.percentage = faultPercentage;
        payload.ulbId = selectedUlb?.id;
      }

      const res: { affectedCount: number; faultCode: string } = await ApiClient.fetch(
        'simulator/fault',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setActionMsg(
        `Injected scenario '${res.faultCode}' onto ${res.affectedCount} virtual devices. Telemetry and alarms updated.`,
      );
      setTargetDeviceId('');
      fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to inject fault');
    } finally {
      setSubmitting(false);
    }
  };

  // Clear all faults
  const handleClearFaults = async () => {
    setSubmitting(true);
    setActionMsg(null);
    setActionError(null);
    try {
      await ApiClient.fetch('simulator/fault/clear', { method: 'POST' });
      setActionMsg('All active fault conditions cleared from virtual fleet.');
      fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to clear faults');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            IoT Fleet Simulator Administration &amp; Scenario Lab
            <SimulatedBadge />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic 4,608 streetlight fleet simulation, electrical physics engine, and fault injection lab.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Running Status Pill */}
          <span
            className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border ${
              simStatus?.isRunning
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                simStatus?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {simStatus?.isRunning ? 'LOOP RUNNING' : 'LOOP IDLE'}
          </span>

          <button
            onClick={handleToggleLoop}
            disabled={submitting}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              simStatus?.isRunning
                ? 'bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
            }`}
          >
            {simStatus?.isRunning ? (
              <>
                <Square className="w-3.5 h-3.5" /> Stop Loop
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Start Loop
              </>
            )}
          </button>

          <button
            onClick={handleTick}
            disabled={submitting}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 font-mono"
            title="Advance clock and ingest telemetry"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Tick Clock
          </button>

          <button
            onClick={handleSeedFleet}
            disabled={submitting}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-sm font-mono"
            title="Regenerate full 4,608 streetlight fleet"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Seed Full Fleet
          </button>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="Refresh simulator status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-red-300 text-xs flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-mono">
            Active Fleet Size
          </span>
          <span className="text-2xl font-bold text-white font-mono mt-1 block">
            {simStatus?.activeDevices ?? 4608}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Luminaires in Simulator Layer</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-mono">
            Ganderbal Municipal Council
          </span>
          <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">
            {simStatus?.ulbBreakdown?.ganderbal?.total ?? 2740}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            859 × 35W | 1542 × 70W | 339 × 110W
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-mono">
            Katra Municipal Committee
          </span>
          <span className="text-2xl font-bold text-sky-400 font-mono mt-1 block">
            {simStatus?.ulbBreakdown?.katra?.total ?? 1868}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            1364 × 35W | 381 × 70W | 123 × 110W
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-mono">
            Active Faults / Anomalies
          </span>
          <span className="text-2xl font-bold text-red-400 font-mono mt-1 block">
            {simStatus?.activeFaults?.length ?? 0}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Injected Anomaly Conditions</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Fleet Breakdown & Fault Injection */}
        <div className="space-y-6 lg:col-span-2">
          {/* Municipal Fleet Wattage Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Municipal Fleet Luminaire Class Breakdown
            </h2>

            <div className="space-y-4 text-xs font-mono">
              {/* Ganderbal Progress Bar */}
              <div className="space-y-1.5 p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div className="flex justify-between items-center text-slate-300 font-semibold">
                  <span>Ganderbal Municipal Council (ULB-GBL)</span>
                  <span className="text-amber-400">2,740 Streetlights (100%)</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(859 / 2740) * 100}%` }}
                    className="bg-emerald-500"
                    title="859 × 35W Residential"
                  />
                  <div
                    style={{ width: `${(1542 / 2740) * 100}%` }}
                    className="bg-sky-500"
                    title="1,542 × 70W Arterial"
                  />
                  <div
                    style={{ width: `${(339 / 2740) * 100}%` }}
                    className="bg-amber-500"
                    title="339 × 110W Highway NH-1D"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span className="text-emerald-400">■ 35W: 859 (31.3%)</span>
                  <span className="text-sky-400">■ 70W: 1,542 (56.3%)</span>
                  <span className="text-amber-400">■ 110W: 339 (12.4%)</span>
                </div>
              </div>

              {/* Katra Progress Bar */}
              <div className="space-y-1.5 p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div className="flex justify-between items-center text-slate-300 font-semibold">
                  <span>Katra Municipal Committee (ULB-KTR)</span>
                  <span className="text-sky-400">1,868 Streetlights (100%)</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(1364 / 1868) * 100}%` }}
                    className="bg-emerald-500"
                    title="1,364 × 35W Pedestrian Tracks"
                  />
                  <div
                    style={{ width: `${(381 / 1868) * 100}%` }}
                    className="bg-sky-500"
                    title="381 × 70W Arterial Bypass"
                  />
                  <div
                    style={{ width: `${(123 / 1868) * 100}%` }}
                    className="bg-amber-500"
                    title="123 × 110W Highway Corridor"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span className="text-emerald-400">■ 35W: 1,364 (73.0%)</span>
                  <span className="text-sky-400">■ 70W: 381 (20.4%)</span>
                  <span className="text-amber-400">■ 110W: 123 (6.6%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fault & Scenario Injection Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bug className="w-4 h-4 text-red-400" />
                Scenario Lab: Fault &amp; Anomaly Injection
              </h2>
              {simStatus?.activeFaults && simStatus.activeFaults.length > 0 && (
                <button
                  onClick={handleClearFaults}
                  className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 rounded text-xs"
                >
                  Clear All Faults
                </button>
              )}
            </div>

            <form onSubmit={handleInjectFault} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-sans font-medium mb-1">
                    Anomaly / Fault Type
                  </label>
                  <select
                    value={faultCode}
                    onChange={(e) => setFaultCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-red-400"
                  >
                    <option value="LAMP_FAILURE">LAMP_FAILURE (Burnout: 0W draw)</option>
                    <option value="DAY_BURNING">DAY_BURNING (Daytime energy waste)</option>
                    <option value="VOLTAGE_SAG">VOLTAGE_SAG (Under-voltage &lt; 180V)</option>
                    <option value="OVERVOLTAGE">OVERVOLTAGE (Surge &gt; 265V)</option>
                    <option value="LOW_POWER_FACTOR">LOW_POWER_FACTOR (PF &lt; 0.80)</option>
                    <option value="COMMUNICATION_LOSS">COMMUNICATION_LOSS (Offline)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-sans font-medium mb-1">
                    Fleet Scope (% of ULB)
                  </label>
                  <select
                    value={faultPercentage}
                    onChange={(e) => setFaultPercentage(Number(e.target.value))}
                    disabled={Boolean(targetDeviceId.trim())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-red-400 disabled:opacity-50"
                  >
                    <option value={1}>1% of Fleet (~27 to 46 lamps)</option>
                    <option value={2}>2% of Fleet (~55 to 92 lamps)</option>
                    <option value={5}>5% of Fleet (~137 to 230 lamps)</option>
                    <option value={10}>10% Stress Scenario (~460 lamps)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-sans font-medium mb-1">
                    Or Specific Device ID
                  </label>
                  <input
                    type="text"
                    value={targetDeviceId}
                    onChange={(e) => setTargetDeviceId(e.target.value)}
                    placeholder="e.g. SIM-GBL-0001"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-red-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Target ULB Scope:{' '}
                  <strong className="text-white font-sans">{selectedUlb?.name}</strong>
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded transition-colors shadow-sm"
                >
                  {submitting ? 'Injecting Anomaly...' : 'Inject Anomaly Scenario'}
                </button>
              </div>
            </form>

            {/* Active Faults List */}
            {simStatus?.activeFaults && simStatus.activeFaults.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">
                  Currently Injected Fault Conditions ({simStatus.activeFaults.length})
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {simStatus.activeFaults.map((f, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1.5 bg-red-950/40 border border-red-800/40 rounded flex items-center justify-between text-red-300"
                    >
                      <span className="font-bold">{f.deviceId}</span>
                      <span className="px-1.5 py-0.2 bg-red-900/60 rounded text-[10px]">
                        {f.faultCode}
                      </span>
                      <span className="text-slate-400 text-[10px]">{f.injectedAt.slice(11, 19)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Engine Status & Live Telemetry Inspector */}
        <div className="space-y-6">
          {/* Simulator Details Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 font-mono text-xs">
            <h2 className="text-sm font-semibold text-white font-sans flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              Engine Configuration
            </h2>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex justify-between py-1 border-b border-slate-950">
                <span className="text-slate-400">Adapter Contract:</span>
                <span className="text-white font-bold">{simStatus?.adapterId || 'SIMULATOR'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-950">
                <span className="text-slate-400">RNG Algorithm:</span>
                <span className="text-sky-400">Mulberry32 (32-bit PRNG)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-950">
                <span className="text-slate-400">Deterministic Seed:</span>
                <span className="text-amber-400">{simStatus?.seed || 365}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-950">
                <span className="text-slate-400">Emission Tick Rate:</span>
                <span className="text-emerald-400">
                  {simStatus?.emissionIntervalMs ? `${simStatus.emissionIntervalMs / 1000}s` : '10s'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-950">
                <span className="text-slate-400">Last Telemetry Tick:</span>
                <span className="text-slate-300">
                  {simStatus?.lastTickAt ? simStatus.lastTickAt.slice(11, 19) : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Live Telemetry Packets */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white font-sans flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Live Telemetry Packets
              </h2>
              <span className="text-[10px] text-emerald-400 px-1.5 py-0.2 bg-emerald-950/60 border border-emerald-800/40 rounded">
                Simulated Wire
              </span>
            </div>

            {recentReadings.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-[11px]">
                Click <strong className="text-amber-400 font-mono">Tick Clock</strong> to emit simulated electrical telemetry packets.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-[11px]">
                {recentReadings.map((r, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-slate-950/80 border border-slate-800 rounded space-y-1 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex justify-between text-white font-bold">
                      <span>{r.deviceId}</span>
                      <span className={r.reportedOn ? 'text-amber-400' : 'text-slate-400'}>
                        {r.reportedOn ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 text-slate-400 text-[10px]">
                      <span>V: {r.voltage} V</span>
                      <span>I: {r.currentAmp} A</span>
                      <span>P: {r.powerWatts} W</span>
                      <span>PF: {r.powerFactor}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
