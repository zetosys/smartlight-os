'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge } from '@smartlight/ui';
import {
  Wrench,
  User,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  Boxes,
  CheckSquare,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  MaintenanceTicket,
  TicketStatus,
  TicketPriority,
  CreateTicketDto,
  UpdateTicketDto,
  SparePart,
} from '@smartlight/shared-types';

interface SiteEngineer {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  ulbId: string | null;
  ulbName: string;
}

export default function MaintenancePage() {
  const { selectedUlb, currentUser } = useUlb();

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [technicians, setTechnicians] = useState<SiteEngineer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Create Ticket Modal State
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('MEDIUM');
  const [newDeviceId, setNewDeviceId] = useState<string>('');
  const [newAssignedTo, setNewAssignedTo] = useState<string>('');

  // Assign Ticket Modal State
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [assigningTicket, setAssigningTicket] = useState<MaintenanceTicket | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>('');

  // Resolve Ticket Modal State
  const [resolvingTicket, setResolvingTicket] = useState<MaintenanceTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedPartQty, setSelectedPartQty] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Spare Parts Drawer
  const [partsDrawerOpen, setPartsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedUlb) return;
    void loadData();
  }, [selectedUlb]);

  const loadData = async () => {
    if (!selectedUlb) return;
    setLoading(true);
    try {
      // 1. Fetch tickets
      const data = await ApiClient.fetch<MaintenanceTicket[]>(`tickets?ulbId=${selectedUlb.id}`);
      setTickets(data);

      // 2. Fetch spare parts
      const parts = await ApiClient.fetch<SparePart[]>('maintenance/spare-parts');
      if (Array.isArray(parts) && parts.length > 0) {
        setSpareParts(parts);
        setSelectedPartId(parts[0].id);
      }

      // 3. Fetch site engineers / technicians for this ULB
      const techs = await ApiClient.fetch<SiteEngineer[]>(`maintenance/technicians?ulbId=${selectedUlb.id}`);
      if (Array.isArray(techs) && techs.length > 0) {
        setTechnicians(techs);
        setSelectedTechId(techs[0].id);
      } else {
        const fallbackTech: SiteEngineer = selectedUlb.code === 'ULB-GBL'
          ? {
              id: '40000000-0000-0000-0000-000000000004',
              name: 'Mohammad Iqbal',
              email: 'tech.ganderbal@smartlight.os',
              roleCode: 'TECHNICIAN',
              ulbId: selectedUlb.id,
              ulbName: selectedUlb.name,
            }
          : {
              id: '40000000-0000-0000-0000-000000000011',
              name: 'Rakesh Gupta',
              email: 'tech.katra@smartlight.os',
              roleCode: 'TECHNICIAN',
              ulbId: selectedUlb.id,
              ulbName: selectedUlb.name,
            };
        setTechnicians([fallbackTech]);
        setSelectedTechId(fallbackTech.id);
      }
    } catch {
      // Fallback
      setTickets([
        {
          id: 'd0000000-0000-0000-0000-000000000001',
          ulbId: selectedUlb.id,
          title: `Check feeder line at ${selectedUlb.code === 'ULB-GBL' ? 'Beehama Ward 1' : 'Banganga Ward 1'}`,
          description: 'Verify optical isolation and controller power input',
          priority: 'MEDIUM',
          status: 'OPEN',
          assignedToName: selectedUlb.code === 'ULB-GBL' ? 'Mohammad Iqbal (Field Tech)' : 'Rakesh Gupta (Field Tech)',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      const fallbackTech: SiteEngineer = selectedUlb.code === 'ULB-GBL'
        ? {
            id: '40000000-0000-0000-0000-000000000004',
            name: 'Mohammad Iqbal',
            email: 'tech.ganderbal@smartlight.os',
            roleCode: 'TECHNICIAN',
            ulbId: selectedUlb.id,
            ulbName: selectedUlb.name,
          }
        : {
            id: '40000000-0000-0000-0000-000000000011',
            name: 'Rakesh Gupta',
            email: 'tech.katra@smartlight.os',
            roleCode: 'TECHNICIAN',
            ulbId: selectedUlb.id,
            ulbName: selectedUlb.name,
          };
      setTechnicians([fallbackTech]);
      setSelectedTechId(fallbackTech.id);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUlb || !newTitle) return;

    setIsSubmitting(true);
    const dto: CreateTicketDto = {
      ulbId: selectedUlb.id,
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      deviceId: newDeviceId || `${selectedUlb.code}-0001`,
      assignedTo: newAssignedTo || undefined,
    };

    try {
      const created = await ApiClient.fetch<MaintenanceTicket>('tickets', {
        method: 'POST',
        body: JSON.stringify(dto),
      });

      setTickets((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNotification(`Work order '${created.title}' created successfully.`);
      setTimeout(() => { setNotification(null); }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification(`Failed to create ticket: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignModal = (ticket: MaintenanceTicket) => {
    setAssigningTicket(ticket);
    if (ticket.assignedTo && technicians.some((t) => t.id === ticket.assignedTo)) {
      setSelectedTechId(ticket.assignedTo);
    } else if (technicians.length > 0) {
      setSelectedTechId(technicians[0].id);
    }
    setAssignModalOpen(true);
  };

  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTicket || !selectedTechId) return;

    setIsSubmitting(true);
    try {
      const updated = await ApiClient.fetch<MaintenanceTicket>(`tickets/${assigningTicket.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedTo: selectedTechId }),
      });

      setTickets((prev) => prev.map((t) => (t.id === assigningTicket.id ? updated : t)));

      const techObj = technicians.find((t) => t.id === selectedTechId);
      setNotification(`Work order '${assigningTicket.title}' assigned to ${techObj?.name || 'Site Engineer'}. Field repair dispatched!`);
      setAssignModalOpen(false);
      setAssigningTicket(null);
      setTimeout(() => { setNotification(null); }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotification(`Failed to assign work order: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStatus = async (ticket: MaintenanceTicket, nextStatus: TicketStatus) => {
    if (nextStatus === 'RESOLVED') {
      setResolvingTicket(ticket);
      return;
    }

    try {
      const updated = await ApiClient.fetch<MaintenanceTicket>(`tickets/${ticket.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });

      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updated : t)));
      setNotification(`Ticket ${ticket.id} advanced to ${nextStatus}.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification(`Failed to update ticket: ${err.message}`);
    }
  };

  const handleCompleteResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;

    setIsSubmitting(true);
    const part = spareParts.find((p) => p.id === selectedPartId);

    const dto: UpdateTicketDto = {
      status: 'RESOLVED',
      resolutionNotes: resolutionNotes || 'Field inspection and repair completed. Verified operational on 230V line.',
      sparePartsUsed: part
        ? [
            {
              partId: part.id,
              partCode: part.code,
              partName: part.name,
              quantity: selectedPartQty,
            },
          ]
        : undefined,
    };

    try {
      const updated = await ApiClient.fetch<MaintenanceTicket>(`tickets/${resolvingTicket.id}/status`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });

      setTickets((prev) => prev.map((t) => (t.id === resolvingTicket.id ? updated : t)));

      // Deduct inventory locally
      if (part) {
        setSpareParts((prev) =>
          prev.map((p) =>
            p.id === part.id ? { ...p, quantityInStock: Math.max(0, p.quantityInStock - selectedPartQty) } : p,
          ),
        );
      }

      setNotification(`Work Order '${resolvingTicket.title}' RESOLVED! Parts inventory updated.`);
      setResolvingTicket(null);
      setResolutionNotes('');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`Failed to resolve ticket: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: { status: TicketStatus; label: string; color: string }[] = [
    { status: 'OPEN', label: 'PENDING DISPATCH', color: 'border-amber-500/40 text-amber-300' },
    { status: 'IN_PROGRESS', label: 'FIELD REPAIR IN PROGRESS', color: 'border-sky-500/40 text-sky-300' },
    { status: 'WAITING_PARTS', label: 'WAITING FOR PARTS', color: 'border-purple-500/40 text-purple-300' },
    { status: 'RESOLVED', label: 'RESOLVED & VERIFIED', color: 'border-emerald-500/40 text-emerald-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Field Maintenance &amp; Work Order Operations
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name} ({selectedUlb?.code})
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Technician dispatch, work order lifecycle, spare parts inventory deduction, and resolution audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { setPartsDrawerOpen(true); }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
          >
            <Boxes className="w-3.5 h-3.5 text-amber-400" />
            Spare Parts Catalog
          </button>
          <button
            onClick={() => { setCreateModalOpen(true); }}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Work Order
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

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.status);

          return (
            <div key={col.status} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs font-mono">
                <span className={`font-bold text-[11px] ${col.color}`}>{col.label}</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 font-bold">
                  {colTickets.length}
                </span>
              </div>

              {colTickets.length === 0 ? (
                <div className="h-44 border border-dashed border-slate-800/80 rounded-lg flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5">
                  <CheckSquare className="w-5 h-5 text-slate-600" />
                  <span>No tickets in {col.status}</span>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[620px] pr-1">
                  {colTickets.map((t) => {
                    const isCrit = t.priority === 'CRITICAL';
                    const isHigh = t.priority === 'HIGH';

                    return (
                      <div
                        key={t.id}
                        className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-2 hover:border-slate-700 transition font-sans"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isCrit
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isHigh
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="font-semibold text-white text-xs leading-snug">{t.title}</div>
                        <div className="text-slate-400 text-[11px] line-clamp-2">{t.description}</div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span className={t.assignedToName ? 'text-slate-200' : 'text-amber-400/80 italic'}>
                              {t.assignedToName || 'Unassigned'}
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold">{t.deviceCode || t.deviceId || 'ULB'}</span>
                            {t.status !== 'RESOLVED' && (
                              <button
                                onClick={() => { openAssignModal(t); }}
                                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono flex items-center gap-1 transition"
                                title="Assign or reassign site engineer"
                              >
                                <UserCheck className="w-3 h-3 text-amber-400" />
                                <span>{t.assignedTo ? 'Reassign' : 'Assign'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Spare Parts Badge if any */}
                        {t.sparePartsUsed && t.sparePartsUsed.length > 0 && (
                          <div className="pt-1 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <Boxes className="w-3 h-3" />
                            <span>{t.sparePartsUsed.map((p) => `${p.quantity}x ${p.partCode}`).join(', ')}</span>
                          </div>
                        )}

                        {/* Advance Action Buttons */}
                        <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
                          {t.status === 'OPEN' && !t.assignedTo && (
                            <button
                              onClick={() => { openAssignModal(t); }}
                              className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Assign Site Engineer</span>
                            </button>
                          )}

                          {t.status === 'OPEN' && t.assignedTo && (
                            <button
                              onClick={() => { void handleAdvanceStatus(t, 'IN_PROGRESS'); }}
                              className="w-full py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                            >
                              <span>Start Repair</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          {t.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => { void handleAdvanceStatus(t, 'RESOLVED'); }}
                              className="w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete &amp; Sign-Off</span>
                            </button>
                          )}

                          {t.status === 'RESOLVED' && (
                            <span className="text-[10px] text-slate-500 font-mono italic">
                              Resolved: {new Date(t.resolvedAt || t.updatedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Work Order Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Create Field Maintenance Work Order
              </h3>
              <button onClick={() => { setCreateModalOpen(false); }} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={(e) => { void handleCreateTicket(e); }} className="space-y-4 text-xs font-sans">
              <div>
                <label className="text-slate-400 block mb-1">Work Order Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => { setNewTitle(e.target.value); }}
                  placeholder="e.g. Replace damaged surge protector at Pole #P-GBL-014"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setNewPriority(e.target.value as TicketPriority); }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="CRITICAL">CRITICAL (Grid/Hazard)</option>
                    <option value="HIGH">HIGH (Highway Outage)</option>
                    <option value="MEDIUM">MEDIUM (Standard Fault)</option>
                    <option value="LOW">LOW (Cosmetic / Inspection)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-sans">Target Asset ID</label>
                  <input
                    type="text"
                    value={newDeviceId}
                    onChange={(e) => { setNewDeviceId(e.target.value); }}
                    placeholder="e.g. SIM-GBL-0001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-sans">Assign Site Engineer (Field Technician)</label>
                <select
                  value={newAssignedTo}
                  onChange={(e) => { setNewAssignedTo(e.target.value); }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="">Unassigned (Queue in Dispatch)</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.roleCode === 'MAINTENANCE_SUPERVISOR' ? 'Supervisor' : 'Site Engineer'}) — {tech.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Detailed Fault &amp; Repair Instructions</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => { setNewDesc(e.target.value); }}
                  placeholder="Describe electrical measurements, required tooling, and access coordinates..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setCreateModalOpen(false); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Dispatching...' : 'Dispatch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Work Order Modal */}
      {assignModalOpen && assigningTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                Assign Work Order to Site Engineer
              </h3>
              <button onClick={() => { setAssignModalOpen(false); }} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Ticket overview info */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-sans text-xs">{assigningTicket.title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {assigningTicket.priority}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Asset: <strong className="text-amber-400">{assigningTicket.deviceCode || assigningTicket.deviceId}</strong></span>
                <span>Current Status: <span className="text-slate-300">{assigningTicket.status}</span></span>
              </div>
              {assigningTicket.description && (
                <div className="text-slate-400 font-sans text-[11px] pt-1 border-t border-slate-800/80">
                  {assigningTicket.description}
                </div>
              )}
            </div>

            <form onSubmit={(e) => { void handleAssignTicket(e); }} className="space-y-4 text-xs font-sans">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                  <span>Select Qualified Site Engineer</span>
                  <span className="text-[10px] text-slate-500 font-mono">Scope: {selectedUlb?.name}</span>
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) => { setSelectedTechId(e.target.value); }}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                >
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.roleCode === 'MAINTENANCE_SUPERVISOR' ? 'Maintenance Supervisor' : 'Field Technician'}) — {tech.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Tenancy &amp; Dispatch Rules
                </div>
                <p>
                  • Assignment automatically transitions ticket status from <code className="text-amber-300">OPEN</code> to <code className="text-sky-300">FIELD REPAIR IN PROGRESS</code>.
                </p>
                <p>
                  • Dispatches ticket directly to the engineer&apos;s mobile field portal for resolution and spare parts sign-off.
                </p>
                <p>
                  • ULB boundary verification prevents cross-dispatching engineers outside {selectedUlb?.code}.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setAssignModalOpen(false); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedTechId}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Dispatching...' : 'Confirm & Dispatch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete & Resolve Modal (with Spare Parts Logging) */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-800/80 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Sign-Off &amp; Complete Work Order
              </h3>
              <button onClick={() => { setResolvingTicket(null); }} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-1 font-mono">
              <div className="font-bold text-white font-sans">{resolvingTicket.title}</div>
              <div className="text-slate-400">Asset: <span className="text-amber-400">{resolvingTicket.deviceCode || resolvingTicket.deviceId}</span></div>
            </div>

            <form onSubmit={(e) => { void handleCompleteResolution(e); }} className="space-y-4 text-xs font-sans">
              <div>
                <label className="text-slate-400 block mb-1">Technician Resolution Report</label>
                <textarea
                  rows={2}
                  required
                  value={resolutionNotes}
                  onChange={(e) => { setResolutionNotes(e.target.value); }}
                  placeholder="Report replaced components, insulation resistance test, and line voltage verified..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Spare Part Consumption Picker */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-amber-400" />
                    Log Consumed Spare Part
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Auto-deducted from warehouse</span>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div className="col-span-2">
                    <select
                      value={selectedPartId}
                      onChange={(e) => { setSelectedPartId(e.target.value); }}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"
                    >
                      {spareParts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name} (Stock: {p.quantityInStock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={selectedPartQty}
                      onChange={(e) => { setSelectedPartQty(parseInt(e.target.value, 10)); }}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setResolvingTicket(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Signing Off...' : 'Complete & Close Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spare Parts Inventory Drawer / Modal */}
      {partsDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-400" />
                Municipal Warehouse Spare Parts Catalog
              </h3>
              <button onClick={() => { setPartsDrawerOpen(false); }} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Part Code</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Stock Level</th>
                    <th className="py-2 px-3">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {spareParts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-white">{p.code}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{p.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-400">{p.quantityInStock} units</td>
                      <td className="py-2.5 px-3 text-slate-400">₹{p.unitCostInr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => { setPartsDrawerOpen(false); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
