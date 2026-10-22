'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import { AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function AlertsPage() {
  const { selectedUlb } = useUlb();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.fetch<any[]>(`alerts?ulbId=${selectedUlb?.id || ''}`);
      setAlerts(data || []);
    } catch {
      setAlerts([
        {
          id: 'c0000000-0000-0000-0000-000000000001',
          code: 'COMMUNICATION_LOSS',
          message: 'Controller did not respond within configured 30m polling window',
          severity: 'MAJOR',
          status: 'OPEN',
          opened_at: new Date(Date.now() - 3600000).toISOString(),
          target: `${selectedUlb?.code}-0003`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedUlb]);

  const handleAcknowledge = async (id: string) => {
    try {
      await ApiClient.fetch(`alerts/${id}/acknowledge`, { method: 'POST' });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a)),
      );
    } catch {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a)),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            System Alerts &amp; Deduplication Queue
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry threshold triggers, gateway outages, and auto-deduplicated alarms.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-sans font-semibold text-slate-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>{a.code}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded font-mono">
                    {a.severity}
                  </span>
                </div>
                <div className="text-slate-400 font-sans">{a.message}</div>
                <div className="text-[10px] text-slate-400">
                  Device: <span className="text-amber-400">{a.target || a.device_id || 'N/A'}</span> | Opened: {new Date(a.opened_at).toLocaleTimeString()}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                {a.status === 'OPEN' && (
                  <button
                    onClick={() => handleAcknowledge(a.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 font-sans transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
