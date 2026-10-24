'use client';

import React, { useState, useEffect } from 'react';
import { useUlb, SEED_ACCOUNTS } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import Link from 'next/link';
import {
  Wrench,
  Power,
  FileCheck,
  Building2,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  MapPin,
  RefreshCw,
  Cpu,
  Package,
  Layers,
  FileDown,
  ArrowRight,
  ShieldCheck,
  Send,
  Calendar,
  Sparkles,
  UserCheck,
  Sliders,
  Radio,
  ExternalLink,
} from 'lucide-react';

export default function RolePortalsPage() {
  const { currentUser, setCurrentAccount, selectedUlb, setSelectedUlbId, allUlbs } = useUlb();

  // Selected portal view (defaults to current user's role workspace)
  const [activePortal, setActivePortal] = useState<'technician' | 'operator' | 'auditor' | 'admin' | 'platform'>('technician');

  // Synchronize active view with current user's role on load or user switch
  useEffect(() => {
    if (currentUser.role === 'TECHNICIAN' || currentUser.role === 'MAINTENANCE_SUPERVISOR') {
      setActivePortal('technician');
    } else if (currentUser.role === 'CONTROL_OPERATOR' || currentUser.role === 'OPERATIONS_MANAGER') {
      setActivePortal('operator');
    } else if (currentUser.role === 'AUDITOR') {
      setActivePortal('auditor');
    } else if (currentUser.role === 'ULB_ADMIN') {
      setActivePortal('admin');
    } else {
      setActivePortal('platform');
    }
  }, [currentUser]);

  // Action feedback message
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Technician Portal States
  const [techTickets, setTechTickets] = useState([
    {
      id: 'WO-891',
      title: 'Surge Suppressor Tripped & High Voltage',
      location: 'Beehama Ward 1, Pole GBL-POL-0007',
      severity: 'CRITICAL',
      voltage: '275V',
      status: 'DISPATCHED',
      recommendedPart: 'PART-SPD-10KV',
      partName: '10kV Modular Surge Protection Device',
    },
    {
      id: 'WO-892',
      title: 'Luminaire Driver Communication Loss',
      location: 'NH-1D Highway Corridor, Pole GBL-POL-0003',
      severity: 'MAJOR',
      voltage: '0V',
      status: 'IN_PROGRESS',
      recommendedPart: 'PART-LED-110W',
      partName: '110W LED Modular Head Unit',
    },
    {
      id: 'WO-893',
      title: 'Photocell Sensor Dirt Occlusion',
      location: 'Duderhama Market Avenue, Pole GBL-POL-0012',
      severity: 'LOW',
      voltage: '228V',
      status: 'SCHEDULED',
      recommendedPart: 'PART-CLN-OPTIC',
      partName: 'Optical Lens Cleaning Kit',
    },
  ]);

  const [vanInventory, setVanInventory] = useState([
    { code: 'PART-SPD-10KV', name: '10kV Surge Protection Device', qty: 14, min: 5 },
    { code: 'PART-LED-35W', name: '35W High-Efficiency LED Module', qty: 22, min: 10 },
    { code: 'PART-LED-70W', name: '70W Urban Avenue LED Module', qty: 18, min: 8 },
    { code: 'PART-LED-110W', name: '110W Highway LED Fixture', qty: 7, min: 4 },
    { code: 'PART-DRV-DALI', name: 'DALI-2 Smart Dimming Driver', qty: 11, min: 6 },
  ]);

  const handleResolveTicket = (ticketId: string, partCode: string) => {
    setTechTickets((prev) => prev.filter((t) => t.id !== ticketId));
    setVanInventory((prev) =>
      prev.map((item) => (item.code === partCode ? { ...item, qty: Math.max(0, item.qty - 1) } : item)),
    );
    setActionNotice(`Ticket #${ticketId} marked COMPLETED. 1x ${partCode} deducted from van inventory. Linked GIS fault cleared.`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Control Operator Portal States
  const [feeders, setFeeders] = useState([
    { code: 'GBL-FP-01', name: 'Feeder Panel FP-01 Beehama West', poles: 78, voltage: 231.2, current: 24.5, pf: 0.98, status: 'ON', mode: 'ASTRO' },
    { code: 'GBL-FP-02', name: 'Feeder Panel FP-02 Chowk Junction', poles: 64, voltage: 229.8, current: 19.8, pf: 0.97, status: 'ON', mode: 'ASTRO' },
    { code: 'KTR-FP-01', name: 'Feeder Panel FP-01 Katra Banganga', poles: 92, voltage: 230.5, current: 28.2, pf: 0.99, status: 'ON', mode: 'ASTRO' },
  ]);

  const handleToggleFeeder = (feederCode: string) => {
    setFeeders((prev) =>
      prev.map((f) => {
        if (f.code === feederCode) {
          const nextState = f.status === 'ON' ? 'OFF' : 'ON';
          return { ...f, status: nextState };
        }
        return f;
      }),
    );
    setActionNotice(`Command dispatched to ${feederCode}: Contactor toggled with idempotent replay token.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
              Role-Specific Operational Portals
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                RBAC Workspace
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tailored mission-control interfaces designed for field technicians, SCADA operators, compliance auditors, and municipal executives.
          </p>
        </div>

        {/* Current Active Persona Indicator */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="font-mono">
              <span className="text-slate-400">Current Login: </span>
              <strong className="text-white">{currentUser.name}</strong>
              <span className="text-amber-400 ml-1.5 font-bold">({currentUser.role})</span>
            </div>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-slate-800/90 border border-emerald-500/40 rounded-lg text-xs text-slate-200 flex items-center gap-2 font-mono animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Interactive Portal Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <button
          onClick={() => setActivePortal('technician')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activePortal === 'technician'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <Wrench className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">TECHNICIAN</span>
          </div>
          <div className="mt-3">
            <div className="font-bold text-white text-xs">Field Repair Portal</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tickets, Van Stock &amp; Repairs</div>
          </div>
        </button>

        <button
          onClick={() => setActivePortal('operator')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activePortal === 'operator'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <Power className="w-5 h-5 text-sky-400" />
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">OPERATOR</span>
          </div>
          <div className="mt-3">
            <div className="font-bold text-white text-xs">SCADA Control Console</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Contactors &amp; Solar Twilight</div>
          </div>
        </button>

        <button
          onClick={() => setActivePortal('auditor')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activePortal === 'auditor'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">AUDITOR</span>
          </div>
          <div className="mt-3">
            <div className="font-bold text-white text-xs">Audit &amp; SLA Hub</div>
            <div className="text-[11px] text-slate-400 mt-0.5">99.8% Uptime &amp; Energy Proof</div>
          </div>
        </button>

        <button
          onClick={() => setActivePortal('admin')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activePortal === 'admin'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">ULB ADMIN</span>
          </div>
          <div className="mt-3">
            <div className="font-bold text-white text-xs">Municipal Executive</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Wards, Corridors &amp; Staff</div>
          </div>
        </button>

        <button
          onClick={() => setActivePortal('platform')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activePortal === 'platform'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">PLATFORM ADMIN</span>
          </div>
          <div className="mt-3">
            <div className="font-bold text-white text-xs">Global Master Console</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Multi-ULB &amp; System Health</div>
          </div>
        </button>
      </div>

      {/* PORTAL 1: FIELD TECHNICIAN PORTAL */}
      {activePortal === 'technician' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Field Service &amp; Repair Dispatch Portal</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Technician: {currentUser.name} • Duty Mobile Unit: Van J&amp;K-01-M-4921
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/gis"
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-500/25 transition"
              >
                <MapPin className="w-3.5 h-3.5" />
                Open GPS Asset Navigator
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Assigned Work Orders */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Assigned Work Orders</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {techTickets.length} Pending
                  </span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">Auto-dispatched via Anomaly Engine</span>
              </div>

              {techTickets.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  All field repair tickets resolved! Van inventory synchronized.
                </div>
              ) : (
                techTickets.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">{t.id}</span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                            t.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {t.severity}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs mt-1">{t.title}</h4>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t.location}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-rose-400">{t.voltage}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Reported Draw</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Package className="w-4 h-4 text-amber-400" />
                        <span>Required Part: <strong className="text-white">{t.partName}</strong></span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{t.recommendedPart}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-mono">SLA Deadline: &lt; 4 Hours (Met)</span>
                      <button
                        onClick={() => handleResolveTicket(t.id, t.recommendedPart)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete Repair &amp; Deduct Part
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile Van Stock & Parts Inventory */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  Mobile Van Stock
                </h3>
                <span className="text-[10px] font-mono text-emerald-400">Synced</span>
              </div>

              <div className="space-y-2.5">
                {vanInventory.map((item) => (
                  <div key={item.code} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-white truncate max-w-[160px]">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-400 text-sm">{item.qty}</div>
                      <div className="text-[9px] text-slate-500">In Van</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActionNotice('Restock requisition sent to Municipal Central Store Depot.')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
              >
                Request Depot Replenishment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL 2: REAL-TIME SCADA CONTROL OPERATOR CONSOLE */}
      {activePortal === 'operator' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">SCADA Real-Time Contactor Switching Console</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Operator: {currentUser.name} • Duty Station: {selectedUlb?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFeeders((prev) => prev.map((f) => ({ ...f, status: 'ON' })));
                  setActionNotice('Emergency Corridor Bypass triggered: All CCMS Feeder contactors energized to 100%.');
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Zap className="w-3.5 h-3.5" />
                Emergency 100% Illumination Bypass
              </button>
            </div>
          </div>

          {/* Real-time Feeder Contactors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {feeders.map((f) => {
              const isOn = f.status === 'ON';
              return (
                <div key={f.code} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-bold text-amber-400">{f.code}</div>
                      <div className="text-xs text-slate-300 font-medium mt-0.5">{f.name}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      isOn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {isOn ? 'ENERGIZED (ON)' : 'DE-ENERGIZED (OFF)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center font-mono text-xs">
                    <div>
                      <div className="text-slate-500 text-[10px]">VOLTAGE</div>
                      <div className="font-bold text-white">{f.voltage}V</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">CURRENT</div>
                      <div className="font-bold text-amber-400">{f.current}A</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">PF</div>
                      <div className="font-bold text-emerald-400">{f.pf}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Connected Fleet: <strong>{f.poles} Poles</strong></span>
                    <span>Mode: <strong className="text-sky-400">{f.mode}</strong></span>
                  </div>

                  <button
                    onClick={() => handleToggleFeeder(f.code)}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isOn
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {isOn ? 'Open Contactor (Turn OFF)' : 'Close Contactor (Turn ON)'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PORTAL 3: AUDITOR & COMPLIANCE PORTAL */}
      {activePortal === 'auditor' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Independent SLA &amp; Energy Audit Hub</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Auditor: {currentUser.name} • Agency: Bureau of Energy Efficiency (BEE) Certified
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActionNotice('Tender Audit Certificate CSV exported with cryptographic SHA-256 seal.')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
                Export Signed Tender Certificate (CSV)
              </button>
            </div>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">Contract SLA Uptime</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">99.8%</div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">Target: &ge; 98.5% (COMPLIANT)</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">Nightly Burning Hours</div>
              <div className="text-2xl font-black text-amber-400 mt-1">11.2 hrs</div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">Target: 11.5 &plusmn; 0.5 hrs</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">Eco-Dim Energy Saved</div>
              <div className="text-2xl font-black text-sky-400 mt-1">34.8%</div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">~1,840 kWh / night</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400">Avoided CO₂ Emissions</div>
              <div className="text-2xl font-black text-purple-400 mt-1">1.47 T</div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">Metric tonnes / night</div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL 4: MUNICIPAL EXECUTIVE & ULB ADMIN PORTAL */}
      {activePortal === 'admin' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Municipal Executive Officer Portal</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Jurisdiction: {selectedUlb?.name} ({selectedUlb?.code}) • 4,608 Fleet
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/users"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                Manage Municipal Staff
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Ward &amp; Corridor Electrification</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">Ward 1 (Beehama Chowk &amp; Commercial Hub):</span>
                  <span className="font-mono font-bold text-white">780 Luminaires (100% Online)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">Ward 2 (Duderhama Central Avenue):</span>
                  <span className="font-mono font-bold text-white">640 Luminaires (99.2% Online)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">National Highway Corridor (NH-1D):</span>
                  <span className="font-mono font-bold text-amber-400">339 Fixtures (110W LED)</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Astronomical Twilight Schedule Tuning</h3>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Evening Dusk Offset:</span>
                  <strong className="text-amber-400 font-mono">-15 Minutes (Civil Twilight)</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Morning Dawn Offset:</span>
                  <strong className="text-sky-400 font-mono">+15 Minutes (Civil Dawn)</strong>
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                  NOAA algorithm automatically recalculates everyday for J&amp;K latitude.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL 5: GLOBAL PLATFORM ADMINISTRATOR CONSOLE */}
      {activePortal === 'platform' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">State Directorate Master Platform Console</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Administrator: {currentUser.name} • Cross-ULB Multi-Tenant Governance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/users"
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Configure RBAC Role Matrix
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">Total Municipal Streetlights</div>
              <div className="text-2xl font-black text-amber-400">4,608</div>
              <div className="text-[10px] text-slate-400 font-mono">Ganderbal: 2,740 • Katra: 1,868</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">Active CCMS Feeder Panels</div>
              <div className="text-2xl font-black text-emerald-400">60 Panels</div>
              <div className="text-[10px] text-slate-400 font-mono">3-Phase 415V Concentrators</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">LoRaWAN/4G Gateways</div>
              <div className="text-2xl font-black text-purple-400">20 Units</div>
              <div className="text-[10px] text-slate-400 font-mono">MeitY MeghRaj Sovereign Cloud</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
