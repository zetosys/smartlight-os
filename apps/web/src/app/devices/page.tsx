'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StatusBadge, StateComparison } from '@smartlight/ui';
import { Cpu, Power, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DevicesPage() {
  const { selectedUlb } = useUlb();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.fetch<{ items: any[] }>(
        `devices?ulbId=${selectedUlb?.id || ''}&limit=50`,
      );
      setDevices(data.items || []);
    } catch {
      // Fallback sample devices for UI testing
      setDevices([
        {
          id: 'b0000000-0000-0000-0000-000000000001',
          external_id: `${selectedUlb?.code}-0001`,
          adapter_key: 'SIMULATOR',
          desired_on: true,
          reported_on: true,
          is_online: true,
          luminaireWattage: 110,
          lampType: 'LED',
          poleExternalCode: `${selectedUlb?.code}-POLE-001`,
          feederName: 'Feeder Panel FP-01',
          ulbName: selectedUlb?.name,
          simulated: true,
        },
        {
          id: 'b0000000-0000-0000-0000-000000000002',
          external_id: `${selectedUlb?.code}-0002`,
          adapter_key: 'SIMULATOR',
          desired_on: true,
          reported_on: true,
          is_online: true,
          luminaireWattage: 70,
          lampType: 'LED',
          poleExternalCode: `${selectedUlb?.code}-POLE-002`,
          feederName: 'Feeder Panel FP-01',
          ulbName: selectedUlb?.name,
          simulated: true,
        },
        {
          id: 'b0000000-0000-0000-0000-000000000003',
          external_id: `${selectedUlb?.code}-0003`,
          adapter_key: 'SIMULATOR',
          desired_on: false,
          reported_on: false,
          is_online: true,
          luminaireWattage: 35,
          lampType: 'LED',
          poleExternalCode: `${selectedUlb?.code}-POLE-003`,
          feederName: 'Feeder Panel FP-01',
          ulbName: selectedUlb?.name,
          simulated: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [selectedUlb]);

  const handleSendCommand = async (deviceId: string, externalId: string, type: 'TURN_ON' | 'TURN_OFF') => {
    setActionLoading(deviceId);
    setCommandFeedback(null);
    const idempotencyKey = `ui-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    try {
      const res = await ApiClient.fetch<{ commandId: string; status: string; isIdempotentReplay: boolean }>(
        'commands',
        {
          method: 'POST',
          body: JSON.stringify({
            deviceId,
            type,
            idempotencyKey,
          }),
        },
      );

      setCommandFeedback(
        `Command ${res.commandId.slice(0, 12)}... status: ${res.status}. ${type} processed via SimulatorAdapter.`,
      );

      // Local optimistic update
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                desired_on: type === 'TURN_ON',
                reported_on: type === 'TURN_ON', // immediate simulator sync
              }
            : d,
        ),
      );
    } catch (err: any) {
      setCommandFeedback(`Command failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Device Controller Registry
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time controller tracking with Desired vs Reported state indicators and direct switching.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SimulatedBadge />
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {commandFeedback && (
        <div className="p-3 bg-slate-800/90 border border-amber-500/40 rounded-lg text-xs text-slate-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{commandFeedback}</span>
        </div>
      )}

      {/* Device Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Device Code</th>
                <th className="px-4 py-3">Pole / Feeder</th>
                <th className="px-4 py-3">Wattage</th>
                <th className="px-4 py-3">Adapter Key</th>
                <th className="px-4 py-3">State (Desired / Reported)</th>
                <th className="px-4 py-3">Connectivity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {devices.map((device) => {
                const isWorking = actionLoading === device.id;

                return (
                  <tr key={device.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-bold flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-400" />
                      <span>{device.external_id}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <div className="font-mono text-white">{device.poleExternalCode}</div>
                      <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1.5 mt-0.5">
                        <span>{device.feederName}</span>
                        {device.gatewayExternalCode && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono text-[9px] border border-purple-500/30">
                            {device.gatewayExternalCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-amber-400 font-bold">{device.luminaireWattage}W</span>
                      <span className="text-slate-400 ml-1 text-[10px]">{device.lampType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                        {device.adapter_key}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StateComparison
                        desiredOn={device.desired_on}
                        reportedOn={device.reported_on}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={device.is_online ? 'online' : 'offline'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          disabled={isWorking}
                          onClick={() => handleSendCommand(device.id, device.external_id, 'TURN_ON')}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-xs border border-emerald-500/40 disabled:opacity-50"
                        >
                          ON
                        </button>
                        <button
                          disabled={isWorking}
                          onClick={() => handleSendCommand(device.id, device.external_id, 'TURN_OFF')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 disabled:opacity-50"
                        >
                          OFF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
