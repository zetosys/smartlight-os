'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { useTheme } from '../../components/context/ThemeContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge } from '@smartlight/ui';
import { Settings, Shield, ScrollText, Database, Server, Sun, Moon, Monitor } from 'lucide-react';

interface AuditLogItem {
  id: string;
  action: string;
  actor_email?: string;
  entity_type: string;
  entity_id?: string;
  occurred_at: string;
  details?: Record<string, unknown>;
}

export default function SettingsPage() {
  const { selectedUlb } = useUlb();
  const { theme, setTheme } = useTheme();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await ApiClient.fetch<AuditLogItem[]>(`audit?ulbId=${selectedUlb?.id || ''}`);
        setLogs(data);
      } catch {
        setLogs([
          {
            id: 'audit-001',
            action: 'USER_LOGIN',
            actor_email: 'admin@smartlight.os',
            entity_type: 'AUTH',
            occurred_at: new Date(Date.now() - 7200000).toISOString(),
            details: { ip: '127.0.0.1', mechanism: 'BEARER_JWT' },
          },
          {
            id: 'audit-002',
            action: 'COMMAND_QUEUED',
            actor_email: 'operator.ganderbal@smartlight.os',
            entity_type: 'COMMAND',
            occurred_at: new Date(Date.now() - 3600000).toISOString(),
            details: { type: 'TURN_ON', idempotencyKey: 'ctl-seed-1' },
          },
        ]);
      }
    };
    void fetchLogs();
  }, [selectedUlb]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            System Settings &amp; Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System configuration parameters, integration keys, and cryptographically attributable audit logs.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Appearance & Interface Theme Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              Interface Theme &amp; Contrast
            </h2>

            <p className="text-xs text-slate-400">
              Customize control room contrast modes. Preferences are persisted automatically.
            </p>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                }}
                className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                  theme === 'dark'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Moon className="w-4 h-4 text-amber-400" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                }}
                className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                  theme === 'light'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('system');
                }}
                className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                  theme === 'system'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Monitor className="w-4 h-4 text-sky-400" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Infrastructure Parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              Infrastructure Parameters
            </h2>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
                <span className="text-slate-400">PostGIS Version:</span>
                <span className="text-white">16-3.4 (PostgreSQL 16)</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
                <span className="text-slate-400">MQTT Broker:</span>
                <span className="text-white">Mosquitto (Port 1883)</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
                <span className="text-slate-400">Redis / BullMQ:</span>
                <span className="text-white">Redis 7 (Port 6379)</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
                <span className="text-slate-400">Timezone:</span>
                <span className="text-amber-400 font-bold">Asia/Kolkata (IST)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-sky-400" />
            Immutable Audit Trail
          </h2>

          <div className="space-y-2 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      by {log.actor_email || 'SYSTEM'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Target: {log.entity_type} {log.entity_id || ''} | {JSON.stringify(log.details)}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(log.occurred_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
