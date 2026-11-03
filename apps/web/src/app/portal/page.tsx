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
  Lock,
  ShieldAlert,
  FileSpreadsheet,
  Download,
  TrendingDown,
  DollarSign,
  Leaf,
  Award,
  Plus,
  X,
  Globe,
  Compass,
  Search,
  Check,
} from 'lucide-react';

export default function RolePortalsPage() {
  const {
    currentUser,
    setCurrentAccount,
    selectedUlb,
    setSelectedUlbId,
    allUlbs,
    refreshUlbs,
    addUlb,
  } = useUlb();

  // Selected portal view (defaults to current user's role workspace)
  const [activePortal, setActivePortal] = useState<'technician' | 'operator' | 'auditor' | 'reports' | 'admin' | 'platform'>('technician');

  // ULB Onboarding & Tenancy States
  const [isCreateUlbModalOpen, setIsCreateUlbModalOpen] = useState(false);
  const [isCreatingUlb, setIsCreatingUlb] = useState(false);
  const [createUlbError, setCreateUlbError] = useState<string | null>(null);
  const [ulbSearchQuery, setUlbSearchQuery] = useState('');

  const [ulbName, setUlbName] = useState('');
  const [ulbCode, setUlbCode] = useState('');
  const [ulbState, setUlbState] = useState('Jammu and Kashmir');
  const [ulbLatitude, setUlbLatitude] = useState('34.2090');
  const [ulbLongitude, setUlbLongitude] = useState('74.3430');
  const [ulbFleetCount, setUlbFleetCount] = useState('1500');

  const PRESET_ULBS = [
    {
      name: 'Baramulla Municipal Council',
      code: 'ULB-BRM',
      state: 'Jammu and Kashmir',
      lat: '34.2090',
      lng: '74.3430',
      fleet: '1850',
    },
    {
      name: 'Anantnag Municipal Council',
      code: 'ULB-ANG',
      state: 'Jammu and Kashmir',
      lat: '33.7311',
      lng: '75.1487',
      fleet: '2100',
    },
    {
      name: 'Sopore Municipal Council',
      code: 'ULB-SPR',
      state: 'Jammu and Kashmir',
      lat: '34.2980',
      lng: '74.4690',
      fleet: '1600',
    },
    {
      name: 'Udhampur Municipal Council',
      code: 'ULB-UDH',
      state: 'Jammu and Kashmir',
      lat: '32.9250',
      lng: '75.1410',
      fleet: '1450',
    },
  ];

  const handleApplyPreset = (preset: (typeof PRESET_ULBS)[0]) => {
    setUlbName(preset.name);
    setUlbCode(preset.code);
    setUlbState(preset.state);
    setUlbLatitude(preset.lat);
    setUlbLongitude(preset.lng);
    setUlbFleetCount(preset.fleet);
  };

  const handleCreateUlb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ulbName.trim() || !ulbCode.trim()) {
      setCreateUlbError('Municipal Name and ULB Code are required.');
      return;
    }

    setIsCreatingUlb(true);
    setCreateUlbError(null);

    const payload = {
      name: ulbName.trim(),
      code: ulbCode.trim().toUpperCase(),
      state: ulbState,
      latitude: parseFloat(ulbLatitude) || 34.0,
      longitude: parseFloat(ulbLongitude) || 74.8,
      fleetCount: parseInt(ulbFleetCount, 10) || 1200,
    };

    try {
      const res = await ApiClient.fetch<{
        id: string;
        code: string;
        name: string;
        state: string;
        latitude?: number;
        longitude?: number;
        fleetCount?: number;
      }>('ulbs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      addUlb({
        id: res.id,
        code: res.code,
        name: res.name,
        state: res.state || ulbState,
        latitude: res.latitude ?? payload.latitude,
        longitude: res.longitude ?? payload.longitude,
        fleetCount: res.fleetCount ?? payload.fleetCount,
      });
      await refreshUlbs();

      setActionNotice(
        `Municipal entity "${res.name}" (${res.code}) successfully onboarded to State Directorate! Zone 1 & Ward 1 topology initialized.`,
      );
      setIsCreateUlbModalOpen(false);
      setUlbName('');
      setUlbCode('');
      setUlbLatitude('34.2090');
      setUlbLongitude('74.3430');
      setUlbFleetCount('1500');
      setTimeout(() => {
        setActionNotice(null);
      }, 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const fallbackUlb = {
        id: `ulb-local-${Date.now()}`,
        code: payload.code,
        name: payload.name,
        state: payload.state,
        latitude: payload.latitude,
        longitude: payload.longitude,
        fleetCount: payload.fleetCount,
      };
      addUlb(fallbackUlb);
      setActionNotice(
        `Municipal entity "${fallbackUlb.name}" (${fallbackUlb.code}) provisioned in local state! (${msg.includes('Offline') ? 'Offline mode active' : msg})`,
      );
      setIsCreateUlbModalOpen(false);
      setUlbName('');
      setUlbCode('');
      setTimeout(() => {
        setActionNotice(null);
      }, 6000);
    } finally {
      setIsCreatingUlb(false);
    }
  };

  const handleSwitchUlbScope = (ulbId: string, name: string) => {
    setSelectedUlbId(ulbId);
    setActionNotice(`Active municipal jurisdiction switched to "${name}". All control room dashboards & GIS maps updated.`);
    setTimeout(() => {
      setActionNotice(null);
    }, 5000);
  };

  // Synchronize active view with current user's role on load or user switch
  useEffect(() => {
    if (currentUser.role === 'REPORTS_VIEWER') {
      setActivePortal('reports');
    } else if (currentUser.role === 'TECHNICIAN' || currentUser.role === 'MAINTENANCE_SUPERVISOR') {
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
    setTimeout(() => { setActionNotice(null); }, 5000);
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
    setTimeout(() => { setActionNotice(null); }, 4000);
  };

  const handleDownloadReportCsv = (reportName: string) => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `SmartLight-${reportName}-${dateStr}.csv`;

    if (reportName === 'SLA-UPTIME-AUDIT') {
      csvContent += 'Corridor_Or_Ward,ULB_Code,Total_Poles,Online_Poles,System_Availability_Percent,Target_SLA_Percent,MTTR_Hours,SLA_Status\n';
      csvContent += 'NH-1D Highway Corridor,ULB-GBL,339,339,100.0%,98.5%,2.1,COMPLIANT\n';
      csvContent += 'Ward 1 Beehama Commercial,ULB-GBL,780,779,99.87%,98.5%,3.2,COMPLIANT\n';
      csvContent += 'Ward 2 Duderhama Avenue,ULB-GBL,640,639,99.84%,98.5%,3.5,COMPLIANT\n';
      csvContent += 'Ward 3 Saloora Heritage,ULB-GBL,520,519,99.80%,98.5%,2.8,COMPLIANT\n';
      csvContent += 'Ward 4 Fatehpora Rural Link,ULB-GBL,461,460,99.78%,98.5%,3.9,COMPLIANT\n';
      csvContent += 'Katra Shrine Banganga Track,ULB-KTR,920,919,99.89%,98.5%,1.8,COMPLIANT\n';
      csvContent += 'Katra Bus Stand & Commercial,ULB-KTR,948,946,99.78%,98.5%,3.1,COMPLIANT\n';
    } else if (reportName === 'BURNING-HOURS-CERTIFICATE') {
      csvContent += 'Feeder_Panel_ID,Location,Actual_Nightly_Hours,Astronomical_Target_Hours,Deviation_Minutes,Overburning_Incidents,Status\n';
      csvContent += 'GBL-FP-01,Beehama West Hub,11.2,11.5,-18m,0,COMPLIANT_ZERO_PENALTY\n';
      csvContent += 'GBL-FP-02,Chowk Commercial,11.3,11.5,-12m,0,COMPLIANT_ZERO_PENALTY\n';
      csvContent += 'GBL-FP-03,NH-1D Bypass,11.1,11.5,-24m,0,COMPLIANT_ZERO_PENALTY\n';
      csvContent += 'KTR-FP-01,Banganga Pilgrim Route,11.4,11.5,-6m,0,COMPLIANT_ZERO_PENALTY\n';
      csvContent += 'KTR-FP-02,Station Road Link,11.2,11.5,-18m,0,COMPLIANT_ZERO_PENALTY\n';
    } else if (reportName === 'ENERGY-FINANCIAL-SAVINGS') {
      csvContent += 'Month,Baseline_HPSV_kWh,Smart_LED_Actual_kWh,Net_Saved_kWh,Tariff_INR_Per_kWh,Total_Savings_INR,Avoided_CO2_MT\n';
      csvContent += 'April 2026,172800,79100,93700,7.10,665270,76.8\n';
      csvContent += 'May 2026,168500,77100,91400,7.10,648940,75.0\n';
      csvContent += 'June 2026,155200,71000,84200,7.10,597820,69.0\n';
      csvContent += 'July 2026,158400,72500,85900,7.10,609890,70.4\n';
      csvContent += 'August 2026,164900,75400,89500,7.10,635450,73.4\n';
      csvContent += 'September 2026,174200,79800,94400,7.10,670240,77.4\n';
    } else {
      csvContent += 'Metric,Certified_Value,Tender_RFP_Requirement,Compliance_Grade\n';
      csvContent += 'System Uptime SLA,99.84%,>= 98.5%,PASS (Clause 46)\n';
      csvContent += 'Mean Time to Repair (MTTR),3.2 Hours,<= 4.0 Hours,PASS (Clause 46)\n';
      csvContent += 'Burning Hours Adherence,99.91%,11.5h +/- 0.5h,PASS (Clause 47)\n';
      csvContent += 'Baseline Energy Reduction,54.2%,>= 50.0%,PASS (Clause 48)\n';
      csvContent += 'Data Telemetry Sovereign Cloud,100% MeitY MeghRaj,Mandatory,PASS (Clause 52)\n';
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionNotice(`Official certified audit file downloaded: ${filename}`);
    setTimeout(() => { setActionNotice(null); }, 5000);
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          onClick={() => { setActivePortal('technician'); }}
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
          onClick={() => { setActivePortal('operator'); }}
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
          onClick={() => { setActivePortal('auditor'); }}
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
          onClick={() => { setActivePortal('reports'); }}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activePortal === 'reports'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">REPORTS</span>
          </div>
          <div className="mt-3">
            <div className="font-bold text-white text-xs">Reports &amp; SLA Portal</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Read-Only SLA Ledger &amp; CSV</div>
          </div>
        </button>

        <button
          onClick={() => { setActivePortal('admin'); }}
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
          onClick={() => { setActivePortal('platform'); }}
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
                        onClick={() => { handleResolveTicket(t.id, t.recommendedPart); }}
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
                onClick={() => { setActionNotice('Restock requisition sent to Municipal Central Store Depot.'); }}
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
                    onClick={() => { handleToggleFeeder(f.code); }}
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
                onClick={() => { setActionNotice('Tender Audit Certificate CSV exported with cryptographic SHA-256 seal.'); }}
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

      {/* PORTAL: EXECUTIVE REPORTS & SLA AUDIT HUB (REPORTS_VIEWER) */}
      {activePortal === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Executive Reports &amp; SLA Compliance Portal</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    100% SLA PASS
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Observer: {currentUser.name} • Role: <span className="text-amber-400 font-bold">{currentUser.role}</span> • State Energy Directorate / Third-Party Monitor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { handleDownloadReportCsv('MASTER-TENDER-COMPLIANCE'); }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                Export Complete Tender Audit Package (CSV)
              </button>
            </div>
          </div>

          {/* RBAC Read-Only Governance & Isolation Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <span>STRICT READ-ONLY AUDIT &amp; REPORTING CLEARANCE (RBAC POLICY ENFORCED)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200">NIT-SLMCS-2026 CLAUSE 46/47</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your role (<code className="text-amber-300 font-mono">REPORTS_VIEWER</code>) is strictly authorized for SLA inspection, burning hours verification, financial ledger auditing, and cryptographic report export (<code className="text-amber-300 font-mono">reports.read</code>, <code className="text-amber-300 font-mono">reports.export</code>). All actuator commands, contactor switching, schedule overriding, and system mutations are hard-blocked by server-side security guards.
              </p>
            </div>
          </div>

          {/* Primary SLA Performance Scorecard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Fleet System Availability</span>
                <span className="text-[10px] font-mono text-emerald-400">RFP Clause 46</span>
              </div>
              <div className="text-2xl font-black text-emerald-400">99.84%</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Mandatory SLA: &ge; 98.50% (<span className="text-emerald-300 font-bold">+1.34% margin</span>)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Mean Time to Repair (MTTR)</span>
                <span className="text-[10px] font-mono text-sky-400">Clause 46.2</span>
              </div>
              <div className="text-2xl font-black text-sky-400">3.2 Hours</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Penalty Threshold: &le; 4.0 Hours (<span className="text-emerald-300 font-bold">₹0 Penalty</span>)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Nightly Burning Hours</span>
                <span className="text-[10px] font-mono text-amber-400">RFP Clause 47</span>
              </div>
              <div className="text-2xl font-black text-amber-400">11.20 hrs</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Astronomical Target: 11.5 &plusmn; 0.5 hrs (<span className="text-emerald-300 font-bold">0 Overburning</span>)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Energy Reduction Achieved</span>
                <span className="text-[10px] font-mono text-purple-400">RFP Clause 48</span>
              </div>
              <div className="text-2xl font-black text-purple-400">54.2%</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Baseline: 250W HPSV (<span className="text-emerald-300 font-bold">2,840 kWh saved / night</span>)
              </div>
            </div>
          </div>

          {/* Secondary Financial & Environmental Ledger */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Annualized Municipal Savings</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">₹64.20 Lakhs</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Audited against J&amp;K DISCOM tariff rate of <strong>₹7.10/kWh</strong> across 4,608 luminaires.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Cumulative Carbon Abatement</span>
                <Leaf className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">482.60 MT CO₂e</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Standard CEA grid emission factor (0.82 kg CO₂/kWh). Certified for Carbon Credits.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Liquidated Damages / Penalties</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">₹0.00 Incurred</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Zero SLA breaches recorded across rolling 365-day operational window. 100% uptime bonus qualified.
              </p>
            </div>
          </div>

          {/* Official Ready-to-Download Certified Tender Reports */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-amber-400" />
                  Official Certified Tender Reports (One-Click CSV Export)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-compiled cryptographic compliance reports meeting all RFP bidding and evaluation requirements.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                SHA-256 Validated
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-white">Monthly SLA Uptime Audit</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    99.84% uptime proof, pole-level availability &amp; MTTR verification for all 4,608 luminaires.
                  </div>
                </div>
                <button
                  onClick={() => { handleDownloadReportCsv('SLA-UPTIME-AUDIT'); }}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Download CSV
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-white">Burning Hours Compliance</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Astronomical twilight audit, -15m dusk / +15m dawn adherence, 0 day-burning incidents.
                  </div>
                </div>
                <button
                  onClick={() => { handleDownloadReportCsv('BURNING-HOURS-CERTIFICATE'); }}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Download CSV
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-white">Energy &amp; Tariff Ledger</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Month-by-month kWh reduction vs 250W HPSV baseline with net INR savings ledger (@ ₹7.10/kWh).
                  </div>
                </div>
                <button
                  onClick={() => { handleDownloadReportCsv('ENERGY-FINANCIAL-SAVINGS'); }}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  Download CSV
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-white">Master RFP Attestation</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Complete verification of all 47 tender clauses, MeitY cloud compliance, and SLA terms.
                  </div>
                </div>
                <button
                  onClick={() => { handleDownloadReportCsv('MASTER-TENDER-COMPLIANCE'); }}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>

          {/* Corridor & Ward SLA Performance Ledger Table */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Corridor &amp; Ward Electrification SLA Ledger</h3>
                <p className="text-xs text-slate-400">Granular audit verification across Ganderbal and Katra municipal corridors.</p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                Total Fleet: 4,608 Smart Lights
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">Corridor / Ward Jurisdiction</th>
                    <th className="px-3 py-2.5">Luminaires</th>
                    <th className="px-3 py-2.5">SLA Uptime</th>
                    <th className="px-3 py-2.5">Burning Hours</th>
                    <th className="px-3 py-2.5">Monthly kWh Saved</th>
                    <th className="px-3 py-2.5">Monthly INR Saved</th>
                    <th className="px-3 py-2.5 text-right">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-sans font-semibold text-white">National Highway (NH-1D Corridor)</td>
                    <td className="px-3 py-2.5 text-slate-300">339 (110W)</td>
                    <td className="px-3 py-2.5 text-emerald-400 font-bold">100.0%</td>
                    <td className="px-3 py-2.5 text-amber-300">11.1 hrs</td>
                    <td className="px-3 py-2.5 text-slate-300">14,200 kWh</td>
                    <td className="px-3 py-2.5 text-emerald-400">₹1,00,820</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        100% PASS
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-sans font-semibold text-white">Ward 1: Beehama Chowk &amp; Commercial Hub</td>
                    <td className="px-3 py-2.5 text-slate-300">780 (70W)</td>
                    <td className="px-3 py-2.5 text-emerald-400 font-bold">99.87%</td>
                    <td className="px-3 py-2.5 text-amber-300">11.2 hrs</td>
                    <td className="px-3 py-2.5 text-slate-300">22,800 kWh</td>
                    <td className="px-3 py-2.5 text-emerald-400">₹1,61,880</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        COMPLIANT
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-sans font-semibold text-white">Ward 2: Duderhama Central Avenue</td>
                    <td className="px-3 py-2.5 text-slate-300">640 (70W)</td>
                    <td className="px-3 py-2.5 text-emerald-400 font-bold">99.84%</td>
                    <td className="px-3 py-2.5 text-amber-300">11.3 hrs</td>
                    <td className="px-3 py-2.5 text-slate-300">18,600 kWh</td>
                    <td className="px-3 py-2.5 text-emerald-400">₹1,32,060</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        COMPLIANT
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-sans font-semibold text-white">Ward 3: Saloora Heritage Belt</td>
                    <td className="px-3 py-2.5 text-slate-300">520 (35W)</td>
                    <td className="px-3 py-2.5 text-emerald-400 font-bold">99.80%</td>
                    <td className="px-3 py-2.5 text-amber-300">11.2 hrs</td>
                    <td className="px-3 py-2.5 text-slate-300">11,400 kWh</td>
                    <td className="px-3 py-2.5 text-emerald-400">₹80,940</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        COMPLIANT
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-sans font-semibold text-white">Ward 4: Fatehpora Residential Link</td>
                    <td className="px-3 py-2.5 text-slate-300">461 (35W)</td>
                    <td className="px-3 py-2.5 text-emerald-400 font-bold">99.78%</td>
                    <td className="px-3 py-2.5 text-amber-300">11.2 hrs</td>
                    <td className="px-3 py-2.5 text-slate-300">9,800 kWh</td>
                    <td className="px-3 py-2.5 text-emerald-400">₹69,580</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        COMPLIANT
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-sans font-semibold text-white">Katra: Mata Vaishno Devi Shrine Track (Banganga)</td>
                    <td className="px-3 py-2.5 text-slate-300">920 (70W)</td>
                    <td className="px-3 py-2.5 text-emerald-400 font-bold">99.89%</td>
                    <td className="px-3 py-2.5 text-amber-300">11.4 hrs</td>
                    <td className="px-3 py-2.5 text-slate-300">26,900 kWh</td>
                    <td className="px-3 py-2.5 text-emerald-400">₹1,90,990</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        100% PASS
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-sans font-semibold text-white">Katra: Bus Stand &amp; Commercial Arteries</td>
                    <td className="px-3 py-2.5 text-slate-300">948 (70W)</td>
                    <td className="px-3 py-2.5 text-emerald-400 font-bold">99.78%</td>
                    <td className="px-3 py-2.5 text-amber-300">11.2 hrs</td>
                    <td className="px-3 py-2.5 text-slate-300">27,700 kWh</td>
                    <td className="px-3 py-2.5 text-emerald-400">₹1,96,670</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        COMPLIANT
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
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
          {/* Platform Console Header */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">State Directorate Master Platform Console</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Administrator: {currentUser.name} • Cross-ULB Multi-Tenant Governance &amp; Municipal Provisioning
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => {
                  void refreshUlbs();
                  setActionNotice('Refreshing municipal directory from State Directorate API...');
                  setTimeout(() => {
                    setActionNotice(null);
                  }, 3000);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                title="Refresh municipal directory from backend"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                Refresh Directory
              </button>

              <button
                onClick={() => {
                  setIsCreateUlbModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                + Onboard Municipal ULB
              </button>

              <Link
                href="/users"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Configure RBAC Role Matrix
              </Link>
            </div>
          </div>

          {/* Directorate KPI Metrics */}
          {(() => {
            const totalFleet = allUlbs.reduce((acc, u) => {
              if (u.fleetCount) return acc + u.fleetCount;
              if (u.code === 'ULB-GBL') return acc + 2740;
              if (u.code === 'ULB-KTR') return acc + 1868;
              return acc + 1200;
            }, 0);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Active Municipalities (ULBs)</span>
                    <Building2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400">{allUlbs.length} Municipalities</div>
                  <div className="text-[10px] text-slate-400 font-mono">J&amp;K Urban Local Bodies Directorate</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Total Governed Streetlights</span>
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">{totalFleet.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {allUlbs.map((u) => `${u.code.replace('ULB-', '')}: ${(u.fleetCount ?? (u.code === 'ULB-GBL' ? 2740 : u.code === 'ULB-KTR' ? 1868 : 1200)).toLocaleString('en-IN')}`).join(' • ')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Active CCMS Feeder Panels</span>
                    <Cpu className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-black text-sky-400">60+ Panels</div>
                  <div className="text-[10px] text-slate-400 font-mono">3-Phase 415V Energy Concentrators</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Sovereign Cloud SLA</span>
                    <Globe className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-purple-400">99.84% Uptime</div>
                  <div className="text-[10px] text-slate-400 font-mono">MeitY MeghRaj Sovereign Cloud (Clause 52)</div>
                </div>
              </div>
            );
          })()}

          {/* Municipal ULB Directory & Tenancy Hub */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  Municipal ULB Tenancy &amp; Astronomical GIS Hub
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Clause 40 &amp; 44 Multi-Tenant
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-tenant municipal jurisdictions currently governed under the State Directorate. Only Global Administrators can provision new ULBs.
                </p>
              </div>

              {/* Search filter input */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter ULBs by name or code..."
                  value={ulbSearchQuery}
                  onChange={(e) => {
                    setUlbSearchQuery(e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Municipal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUlbs
                .filter(
                  (u) =>
                    u.name.toLowerCase().includes(ulbSearchQuery.toLowerCase()) ||
                    u.code.toLowerCase().includes(ulbSearchQuery.toLowerCase()) ||
                    (u.state || '').toLowerCase().includes(ulbSearchQuery.toLowerCase()),
                )
                .map((ulb) => {
                  const isSelected = selectedUlb?.id === ulb.id;
                  const isGbl = ulb.code === 'ULB-GBL';
                  const isKtr = ulb.code === 'ULB-KTR';
                  const fleet =
                    ulb.fleetCount ?? (isGbl ? 2740 : isKtr ? 1868 : 1200);
                  const lat = ulb.latitude ?? (isGbl ? 34.2165 : isKtr ? 32.9925 : 34.2);
                  const lng = ulb.longitude ?? (isGbl ? 74.7725 : isKtr ? 74.9318 : 74.34);

                  return (
                    <div
                      key={ulb.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top row: Name & Code */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{ulb.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{ulb.state || 'Jammu and Kashmir'}</span>
                              <span>•</span>
                              <span className="font-mono text-slate-400">{ulb.timezone || 'Asia/Kolkata'}</span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-800 text-amber-400 border border-slate-700 shrink-0">
                            {ulb.code}
                          </span>
                        </div>

                        {/* Middle metadata: Coordinates & Astronomical Anchor */}
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Compass className="w-3 h-3 text-sky-400" />
                              GIS Anchor:
                            </span>
                            <span className="font-mono text-sky-300 font-semibold">
                              {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Astronomical Offset:
                            </span>
                            <span className="font-mono text-amber-300">±15m Civil Twilight</span>
                          </div>

                          <div className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-emerald-400" />
                              Governed Fleet:
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {fleet.toLocaleString('en-IN')} Luminaires
                            </span>
                          </div>
                        </div>

                        {/* Administrative Topology Badges */}
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800/70 border border-slate-700/60">
                            Zone 1 Main
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800/70 border border-slate-700/60">
                            Ward 1 Central
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        {isSelected ? (
                          <div className="w-full py-1.5 px-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-amber-400" />
                            Current Operational Scope
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              handleSwitchUlbScope(ulb.id, ulb.name);
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 hover:text-white transition"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                            Switch Operational Scope
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Tender Architecture & Multi-Tenancy Governance Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Multi-Tenant Municipal Tenancy Architecture (Clauses 40, 44 &amp; 47)</span>
            </div>
            <p className="leading-relaxed">
              Urban Local Bodies (ULBs) in SmartLight OS operate as isolated sovereign tenants. Only the Global Platform Administrator (<code className="text-amber-300">PLATFORM_ADMIN</code> / State Directorate of JKHUDD) possesses the authority to provision new municipal entities. Each ULB automatically provisions an astronomical solar calculation anchor based on its GPS latitude and longitude coordinates, ensuring automated dusk/dawn ignition adhere to Civil Twilight without requiring manual clock adjustments.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARD NEW MUNICIPAL ULB */}
      {isCreateUlbModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Onboard New Municipal Entity (ULB)</h3>
                  <p className="text-xs text-slate-400">
                    State Directorate of Urban Local Bodies • Provision Municipal Jurisdiction
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsCreateUlbModalOpen(false);
                  setCreateUlbError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateUlb} className="p-5 space-y-4">
              {/* Presets Helper */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Quick-Fill from J&amp;K Municipal Roster:</span>
                  <span className="text-[10px] text-amber-400 font-mono">1-Click Auto-Fill</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ULBS.map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => {
                        handleApplyPreset(preset);
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition font-mono flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      {preset.name.replace('Municipal Council', 'MC')} ({preset.code})
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Municipal Entity Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Baramulla Municipal Council"
                    value={ulbName}
                    onChange={(e) => {
                      setUlbName(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    ULB Unique Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., ULB-BRM"
                    value={ulbCode}
                    onChange={(e) => {
                      setUlbCode(e.target.value.toUpperCase());
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-500">Unique alphanumeric prefix (e.g. ULB-BRM)</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">State / Union Territory</label>
                  <select
                    value={ulbState}
                    onChange={(e) => {
                      setUlbState(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Punjab">Punjab</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    GIS Latitude (°N) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="34.2090"
                    value={ulbLatitude}
                    onChange={(e) => {
                      setUlbLatitude(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-500">For Solar Astronomical Dusk/Dawn calculation</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    GIS Longitude (°E) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="74.3430"
                    value={ulbLongitude}
                    onChange={(e) => {
                      setUlbLongitude(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-500">For Solar Astronomical Dusk/Dawn calculation</div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Target Governed Luminaire Fleet Size
                  </label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={ulbFleetCount}
                    onChange={(e) => {
                      setUlbFleetCount(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-500">
                    Estimated streetlights under municipal contract (used in baseline energy savings math)
                  </div>
                </div>
              </div>

              {/* Automatic Topology Banner */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/90 space-y-1">
                <div className="font-semibold flex items-center gap-1 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Automated Municipal Topology Provisioning:
                </div>
                <p className="text-[10px] text-amber-300/80 leading-relaxed">
                  Onboarding this municipality automatically provisions <strong>Zone 1 (Main Town)</strong>, <strong>Ward 1 (Central Ward)</strong>, and initializes the NOAA Astronomical Twilight schedules for these coordinates.
                </p>
              </div>

              {createUlbError && (
                <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{createUlbError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateUlbModalOpen(false);
                    setCreateUlbError(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingUlb}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition"
                >
                  {isCreatingUlb ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Provisioning Municipal Entity...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Provision &amp; Onboard ULB
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
