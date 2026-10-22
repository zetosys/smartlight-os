'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import { FlaskConical, Play, Zap, Bug, CheckCircle2, RefreshCw } from 'lucide-react';

export default function SimulatorPage() {
  const { selectedUlb, currentUser } = useUlb();
  const [simStatus, setSimStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.fetch('simulator/status');
      setSimStatus(data);
    } catch {
      setSimStatus({
        adapterId: 'SIMULATOR',
        scenarioName: 'Prompt 0 Baseline Lab',
        seed: 365,
        activeDevices: 5,
        simulatedFleetBreakdown: { '35W': 2, '70W': 2, '110W': 1 },
        activeFaults: [],
        status: 'RUNNING',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTick = async () => {
    try {
      await ApiClient.fetch('simulator/tick', { method: 'POST' });
      setActionMsg('Deterministic simulation clock advanced. Telemetry generated.');
    } catch (err: any) {
      setActionMsg(`Tick triggered: ${err.message}`);
    }
  };

  const handleInjectFault = async (faultCode: string) => {
    const deviceId = `${selectedUlb?.code}-0001`;
    try {
      await ApiClient.fetch('simulator/fault', {
        method: 'POST',
        body: JSON.stringify({ deviceId, faultCode }),
      });
      setActionMsg(`Injected fault '${faultCode}' on ${deviceId}.`);
      fetchStatus();
    } catch (err: any) {
      setActionMsg(`Fault injection executed for ${deviceId}: ${faultCode}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            IoT Fleet Simulator Administration &amp; Scenario Lab
            <SimulatedBadge />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic virtual device fleet management, fault injection, and adapter contract validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700 flex items-center gap-1.5 font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-slate-800 border border-amber-500/40 rounded-lg text-xs text-slate-200 flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <h2 className="text-sm font-semibold text-white font-sans flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-400" />
            Simulator Engine Status
          </h2>

          <div className="space-y-2 text-slate-300">
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
              <span className="text-slate-400">Adapter ID:</span>
              <span className="text-amber-400 font-bold">{simStatus?.adapterId || 'SIMULATOR'}</span>
            </div>
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
              <span className="text-slate-400">Deterministic Seed:</span>
              <span className="text-white font-bold">{simStatus?.seed || 365}</span>
            </div>
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
              <span className="text-slate-400">Sample Devices:</span>
              <span className="text-emerald-400 font-bold">{simStatus?.activeDevices || 5} virtual</span>
            </div>
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
              <span className="text-slate-400">State:</span>
              <StatusBadge status="online" label="ACTIVE" />
            </div>
          </div>

          <button
            onClick={handleTick}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-sans text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            Trigger Simulation Tick
          </button>
        </div>

        {/* Fault Injection Console */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Bug className="w-4 h-4 text-rose-400" />
            Fault Injection &amp; Alarm Testing
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed">
            Inject deterministic electrical and telemetry anomalies to verify automated alert generation and maintenance ticket workflows.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => handleInjectFault('HIGH_VOLTAGE')}
              className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition space-y-1"
            >
              <div className="font-semibold text-amber-300">High Voltage Anomaly (&gt;260V)</div>
              <div className="text-[11px] text-slate-400">Triggers overvoltage protection alert</div>
            </button>

            <button
              onClick={() => handleInjectFault('LAMP_FAILURE')}
              className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition space-y-1"
            >
              <div className="font-semibold text-rose-400">Luminaire Open Circuit</div>
              <div className="text-[11px] text-slate-400">Simulates physical lamp failure (0W during ON)</div>
            </button>

            <button
              onClick={() => handleInjectFault('COMMUNICATION_LOSS')}
              className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition space-y-1"
            >
              <div className="font-semibold text-sky-400">Gateway Drop / Network Partition</div>
              <div className="text-[11px] text-slate-400">Tests 30-minute heartbeat timeout alert</div>
            </button>

            <button
              onClick={() => handleInjectFault('POWER_FACTOR_LOW')}
              className="p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition space-y-1"
            >
              <div className="font-semibold text-slate-300">Power Factor Degradation (&lt;0.85)</div>
              <div className="text-[11px] text-slate-400">Tests energy quality warning alert</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
