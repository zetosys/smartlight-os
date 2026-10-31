'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import {
  AlertTriangle,
  CheckCircle2,
  Wrench,
  RotateCw,
  Search,
  Filter,
  Flame,
  Zap,
  Radio,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Alert, AlertSeverity, AlertStatus } from '@smartlight/shared-types';

interface AlertDisplayItem {
  id: string;
  code: string;
  message: string;
  severity: string;
  status: string;
  opened_at: string;
  openedAt?: string;
  deviceCode?: string;
  device_id?: string;
}

export default function AlertsPage() {
  const { selectedUlb, currentUser } = useUlb();

  const [alerts, setAlerts] = useState<AlertDisplayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // Ticket creation modal from alert
  const [selectedAlertForTicket, setSelectedAlertForTicket] = useState<AlertDisplayItem | null>(null);
  const [ticketSubmitting, setTicketSubmitting] = useState<boolean>(false);

  const fetchAlerts = async () => {
    if (!selectedUlb) return;
    setLoading(true);
    try {
      const data = await ApiClient.fetch<AlertDisplayItem[]>(`alerts?ulbId=${selectedUlb.id}`);
      setAlerts(data);
    } catch {
      // Fallback
      setAlerts([
        {
          id: 'c0000000-0000-0000-0000-000000000001',
          code: 'COMMUNICATION_LOSS',
          message: 'Controller did not respond within configured 30m polling window',
          severity: 'MAJOR',
          status: 'OPEN',
          opened_at: new Date(Date.now() - 3600000).toISOString(),
          deviceCode: `${selectedUlb ? selectedUlb.code : 'ULB'}-0003`,
        },
        {
          id: 'c0000000-0000-0000-0000-000000000002',
          code: 'VOLTAGE_ANOMALY',
          message: 'Grid surge detected: 268V (Safe Envelope: 185V-260V)',
          severity: 'CRITICAL',
          status: 'OPEN',
          opened_at: new Date(Date.now() - 1800000).toISOString(),
          deviceCode: `${selectedUlb ? selectedUlb.code : 'ULB'}-0012`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAlerts();
  }, [selectedUlb]);

  const handleAcknowledge = async (id: string) => {
    try {
      await ApiClient.fetch(`alerts/${id}/acknowledge`, { method: 'POST' });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a)),
      );
      setNotification(`Alert acknowledged successfully.`);
      setTimeout(() => { setNotification(null); }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification(`Action failed: ${msg}`);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForTicket) return;

    setTicketSubmitting(true);
    try {
      const ticket = await ApiClient.fetch<{ title: string }>(`alerts/${selectedAlertForTicket.id}/ticket`, {
        method: 'POST',
      });

      // Update alert in list to ACKNOWLEDGED
      setAlerts((prev) =>
        prev.map((a) => (a.id === selectedAlertForTicket.id ? { ...a, status: 'ACKNOWLEDGED' } : a)),
      );

      setNotification(`Work Order '${ticket.title}' created and dispatched to maintenance crew!`);
      setSelectedAlertForTicket(null);
      setTimeout(() => { setNotification(null); }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification(`Failed to create ticket: ${msg}`);
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Filter logic
  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = (a.code || '').toLowerCase().includes(q);
      const devMatch = (a.deviceCode || a.device_id || '').toLowerCase().includes(q);
      const msgMatch = (a.message || '').toLowerCase().includes(q);
      return codeMatch || devMatch || msgMatch;
    }
    return true;
  });

  // Severity counts
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length;
  const majorCount = alerts.filter((a) => a.severity === 'MAJOR' && a.status === 'OPEN').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING' && a.status === 'OPEN').length;
  const minorCount = alerts.filter((a) => a.severity === 'MINOR' && a.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Real-Time Fault Detection &amp; Alert Center
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name} ({selectedUlb?.code})
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Telemetry anomaly trips, burnout detection, grid voltage violation alarms, and automated work order routing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { void fetchAlerts(); }}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <SimulatedBadge />
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Severity Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setSeverityFilter('CRITICAL');
            setStatusFilter('OPEN');
          }}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            severityFilter === 'CRITICAL'
              ? 'bg-rose-950/40 border-rose-600 shadow-md shadow-rose-900/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Critical Alarms</span>
            <Zap className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{criticalCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Voltage surge / Sag hazard</div>
        </div>

        <div
          onClick={() => {
            setSeverityFilter('MAJOR');
            setStatusFilter('OPEN');
          }}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            severityFilter === 'MAJOR'
              ? 'bg-amber-950/40 border-amber-600 shadow-md shadow-amber-900/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Major Faults</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{majorCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Burnout / Comm offline</div>
        </div>

        <div
          onClick={() => {
            setSeverityFilter('WARNING');
            setStatusFilter('OPEN');
          }}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            severityFilter === 'WARNING'
              ? 'bg-amber-950/20 border-amber-500/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Warnings</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{warningCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Day burning waste</div>
        </div>

        <div
          onClick={() => {
            setSeverityFilter('MINOR');
            setStatusFilter('OPEN');
          }}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            severityFilter === 'MINOR'
              ? 'bg-sky-950/30 border-sky-600'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Minor / Info</span>
            <Radio className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-300 mt-1">{minorCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Low power factor &lt; 0.85</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search code, device, message..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {(severityFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSeverityFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="text-amber-400 hover:text-amber-300 text-[11px] underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-sans text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); }}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN Only</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-sans text-[11px]">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); }}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="MAJOR">MAJOR</option>
              <option value="WARNING">WARNING</option>
              <option value="MINOR">MINOR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Active Fleet Alarms ({filteredAlerts.length})
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Auto-deduplicated per device
          </span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="h-48 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <span className="text-slate-300 font-semibold">No alarms matching current criteria</span>
            <span className="text-[11px] text-slate-500">The municipal fleet is operating within normal electrical envelopes.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((a) => {
              const isCrit = a.severity === 'CRITICAL';
              const isMajor = a.severity === 'MAJOR';

              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border transition ${
                    isCrit
                      ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700'
                      : isMajor
                      ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  } flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isCrit
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isMajor
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {a.severity}
                      </span>
                      <span className="font-bold text-white text-xs">{a.code}</span>
                      <StatusBadge status={a.status} />
                    </div>

                    <div className="text-slate-300 font-sans text-xs leading-relaxed">{a.message}</div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-0.5">
                      <span>
                        Target: <strong className="text-amber-400 font-mono">{a.deviceCode || a.device_id}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Opened: {new Date(a.opened_at || a.openedAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 font-sans">
                    {a.status === 'OPEN' && (
                      <button
                        onClick={() => { void handleAcknowledge(a.id); }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs flex items-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Acknowledge
                      </button>
                    )}

                    {a.status !== 'RESOLVED' && (
                      <button
                        onClick={() => { setSelectedAlertForTicket(a); }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Dispatch Work Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Work Order Modal */}
      {selectedAlertForTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-800/80 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Dispatch Maintenance Work Order
              </h3>
              <button
                onClick={() => { setSelectedAlertForTicket(null); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Triggering Alert:</span>
                <span className="text-rose-400 font-bold">{selectedAlertForTicket.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Target Asset:</span>
                <span className="text-amber-400 font-bold">{selectedAlertForTicket.deviceCode || selectedAlertForTicket.device_id}</span>
              </div>
              <div className="text-slate-300 font-sans pt-1 text-[11px]">
                {selectedAlertForTicket.message}
              </div>
            </div>

            <form onSubmit={(e) => { void handleCreateTicket(e); }} className="space-y-4 text-xs font-sans">
              <p className="text-xs text-slate-400">
                This will automatically generate a field maintenance work order, assign the duty technician for{' '}
                <strong className="text-white">{selectedUlb?.name}</strong>, and transition this alarm into{' '}
                <span className="text-amber-400 font-mono">ACKNOWLEDGED</span> status.
              </p>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setSelectedAlertForTicket(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  {ticketSubmitting ? 'Creating Work Order...' : 'Authorize & Dispatch Technician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
