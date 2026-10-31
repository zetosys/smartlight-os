'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { generateClientSecureId } from '../../lib/crypto-id';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import {
  Power,
  Clock,
  Send,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Layers,
  Zap,
} from 'lucide-react';

interface FeederOption {
  id: string;
  name: string;
  code: string;
  luminaire_count?: number;
}

interface CommandLogItem {
  id: string;
  command_type: string;
  device_id: string;
  status: string;
  idempotency_key: string;
  payload?: any;
  created_at: string;
  steps?: string[];
}

export default function ControlsPage() {
  const { selectedUlb, currentUser } = useUlb();

  // Control Scope: FEEDER, DEVICE, ZONE, ULB
  const [targetScope, setTargetScope] = useState<'FEEDER' | 'DEVICE' | 'ZONE' | 'ULB'>('FEEDER');
  const [commandAction, setCommandAction] = useState<'TURN_ON' | 'TURN_OFF'>('TURN_ON');
  const [dimmingLevel, setDimmingLevel] = useState<number>(100);

  // Dynamic Options
  const [feeders, setFeeders] = useState<FeederOption[]>([]);
  const [selectedFeederId, setSelectedFeederId] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [zoneId, setZoneId] = useState<string>('ZONE-1');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Emergency Modal State
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
  const [emergencyAction, setEmergencyAction] = useState<'TURN_ON' | 'TURN_OFF'>('TURN_ON');
  const [emergencyConfirmText, setEmergencyConfirmText] = useState<string>('');

  // Live Command Stream
  const [commandLogs, setCommandLogs] = useState<CommandLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Initialize and load feeders when selected ULB changes
  useEffect(() => {
    if (!selectedUlb) return;

    setSelectedDeviceId(selectedUlb.code === 'ULB-GBL' ? 'SIM-GBL-0001' : 'SIM-KTR-0001');

    const loadFeeders = async () => {
      try {
        const data = await ApiClient.fetch<any[]>(`assets/feeders?ulbId=${selectedUlb.id}`);
        if (data && data.length > 0) {
          setFeeders(data);
          setSelectedFeederId(data[0].id);
        } else {
          // Fallback defaults
          const defaultFeeders = selectedUlb.code === 'ULB-GBL'
            ? [
                { id: 'fdr-gbl-01', name: 'Towheed Abad Feeder Panel', code: 'FDR-GBL-01', luminaire_count: 78 },
                { id: 'fdr-gbl-02', name: 'Beehama Chowk Feeder Panel', code: 'FDR-GBL-02', luminaire_count: 82 },
                { id: 'fdr-gbl-03', name: 'Duderhama Market Feeder', code: 'FDR-GBL-03', luminaire_count: 65 },
              ]
            : [
                { id: 'fdr-ktr-01', name: 'Railway Station CCMS Feeder', code: 'FDR-KTR-01', luminaire_count: 64 },
                { id: 'fdr-ktr-02', name: 'Ban Ganga Gate CCMS Feeder', code: 'FDR-KTR-02', luminaire_count: 72 },
              ];
          setFeeders(defaultFeeders);
          setSelectedFeederId(defaultFeeders[0].id);
        }
      } catch {
        // Fallback
        const fallback = [
          { id: 'fdr-fallback-1', name: 'CCMS Feeder Panel 01', code: 'FDR-01', luminaire_count: 75 },
        ];
        setFeeders(fallback);
        setSelectedFeederId(fallback[0].id);
      }
    };

    loadFeeders();
    fetchCommands();
  }, [selectedUlb]);

  const fetchCommands = async () => {
    if (!selectedUlb) return;
    setIsLoadingLogs(true);
    try {
      const data = await ApiClient.fetch<CommandLogItem[]>(`commands?ulbId=${selectedUlb.id}&limit=15`);
      if (data && Array.isArray(data)) {
        setCommandLogs(
          data.map((c) => ({
            ...c,
            steps: ['QUEUED', 'SENT', 'ACKNOWLEDGED', c.status === 'CONFIRMED' ? 'CONFIRMED' : 'ACKNOWLEDGED'],
          })),
        );
      }
    } catch {
      // Retain existing local logs if API offline
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDispatchCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUlb) return;

    setIsSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    const idempotencyKey = generateClientSecureId('cmd');

    try {
      if (targetScope === 'DEVICE') {
        // Single device command dispatch
        const res = await ApiClient.fetch<{ commandId: string; status: string; isIdempotentReplay: boolean }>(
          'commands',
          {
            method: 'POST',
            body: JSON.stringify({
              deviceId: selectedDeviceId,
              type: commandAction,
              idempotencyKey,
              payload: { dimmingLevel },
            }),
          },
        );

        setActionSuccess(
          `Command ${res.commandId} dispatched to ${selectedDeviceId}: ${commandAction} (Status: ${res.status})`,
        );

        const newLog: CommandLogItem = {
          id: res.commandId,
          command_type: commandAction,
          device_id: selectedDeviceId,
          status: res.status,
          idempotency_key: idempotencyKey,
          payload: { dimmingLevel },
          created_at: new Date().toISOString(),
          steps: ['QUEUED', 'SENT', 'ACKNOWLEDGED', res.status === 'CONFIRMED' ? 'CONFIRMED' : 'ACKNOWLEDGED'],
        };
        setCommandLogs((prev) => [newLog, ...prev.slice(0, 14)]);
      } else {
        // Batch / Feeder / ULB group dispatch
        let targetId = '';
        if (targetScope === 'FEEDER') targetId = selectedFeederId;
        else if (targetScope === 'ZONE') targetId = zoneId;

        const res = await ApiClient.fetch<{
          batchId: string;
          targetCount: number;
          confirmedCount: number;
          failedCount: number;
          isIdempotentReplay: boolean;
        }>('commands/batch', {
          method: 'POST',
          body: JSON.stringify({
            ulbId: selectedUlb.id,
            type: commandAction,
            targetType: targetScope,
            targetId: targetId || undefined,
            idempotencyKey,
            payload: { dimmingLevel },
          }),
        });

        setActionSuccess(
          `Batch ${res.batchId} executed: ${res.confirmedCount} / ${res.targetCount} luminaires switched to ${commandAction}`,
        );

        const newLog: CommandLogItem = {
          id: res.batchId,
          command_type: commandAction,
          device_id: `${targetScope}: ${targetId || selectedUlb.name}`,
          status: res.failedCount === 0 ? 'CONFIRMED' : 'ACKNOWLEDGED',
          idempotency_key: idempotencyKey,
          payload: { targetCount: res.targetCount, confirmedCount: res.confirmedCount },
          created_at: new Date().toISOString(),
          steps: ['QUEUED', 'SENT', 'ACKNOWLEDGED', 'CONFIRMED'],
        };
        setCommandLogs((prev) => [newLog, ...prev.slice(0, 14)]);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to dispatch command');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmergencyExecute = async () => {
    if (emergencyConfirmText.toUpperCase() !== 'CONFIRM') {
      setActionError("Please type 'CONFIRM' exactly to execute emergency override");
      return;
    }

    setIsSubmitting(true);
    setEmergencyModalOpen(false);
    setEmergencyConfirmText('');

    const idempotencyKey = `emergency-${selectedUlb?.code}-${Date.now()}`;

    try {
      const res = await ApiClient.fetch<any>('commands/batch', {
        method: 'POST',
        body: JSON.stringify({
          ulbId: selectedUlb?.id,
          type: emergencyAction,
          targetType: 'ULB',
          idempotencyKey,
          payload: { reason: 'EMERGENCY_MUNICIPAL_OVERRIDE', actor: currentUser?.email },
        }),
      });

      setActionSuccess(
        `🚨 EMERGENCY OVERRIDE CONFIRMED: ${res.confirmedCount} lights switched ${emergencyAction} across ${selectedUlb?.name}`,
      );
      fetchCommands();
    } catch (err: any) {
      setActionError(`Emergency Override Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Command &amp; Group Switching Console
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name} ({selectedUlb?.code})
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise CCMS Feeder switching, individual luminaire controls, and municipal emergency override.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCommands}
            disabled={isLoadingLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1.5 border border-slate-700 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            Refresh Stream
          </button>
          <SimulatedBadge />
        </div>
      </div>

      {/* Emergency Municipal Override Card */}
      <div className="p-4 bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 border border-rose-900/50 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              Emergency Municipal Fleet Override
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                HIGH PRIORITY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly broadcast state to all {selectedUlb?.code === 'ULB-GBL' ? '2,740' : '1,868'} luminaires across the municipality with single-action execution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={() => {
              setEmergencyAction('TURN_ON');
              setEmergencyModalOpen(true);
            }}
            className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition"
          >
            <Zap className="w-4 h-4" />
            ALL LIGHTS ON
          </button>
          <button
            onClick={() => {
              setEmergencyAction('TURN_OFF');
              setEmergencyModalOpen(true);
            }}
            className="flex-1 md:flex-none px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition"
          >
            <Power className="w-4 h-4" />
            ALL LIGHTS OFF
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid: Controls + Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Switching Dispatch Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Power className="w-4 h-4 text-amber-400" />
              Dispatch Switching Command
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Idempotent</span>
          </div>

          <form onSubmit={handleDispatchCommand} className="space-y-4 text-xs">
            {/* Target Scope Selection */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Target Scope</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['FEEDER', 'DEVICE', 'ZONE', 'ULB'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setTargetScope(scope)}
                    className={`py-2 rounded font-mono font-medium border transition ${
                      targetScope === scope
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope-specific Target Picker */}
            {targetScope === 'FEEDER' && (
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Select CCMS Feeder Panel</label>
                <select
                  value={selectedFeederId}
                  onChange={(e) => setSelectedFeederId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                >
                  {feeders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} - {f.name} ({f.luminaire_count || 75} lights)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Commands all luminaires physically routed through this CCMS phase-line switchboard.
                </p>
              </div>
            )}

            {targetScope === 'DEVICE' && (
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Individual Luminaire ID</label>
                <input
                  type="text"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                  placeholder="e.g. SIM-GBL-0001"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Target device external identifier or UUID.
                </p>
              </div>
            )}

            {targetScope === 'ZONE' && (
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Geographic Zone</label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="ZONE-1">Zone 1 - Main Urban Corridor</option>
                  <option value="ZONE-2">Zone 2 - Residential &amp; Heritage Sector</option>
                </select>
              </div>
            )}

            {targetScope === 'ULB' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Commands all {selectedUlb?.code === 'ULB-GBL' ? '2,740' : '1,868'} streetlights in {selectedUlb?.name}.</span>
              </div>
            )}

            {/* Command Action Buttons */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">Command Action</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCommandAction('TURN_ON')}
                  className={`py-2.5 rounded-lg font-bold border flex items-center justify-center gap-2 transition ${
                    commandAction === 'TURN_ON'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  TURN ON
                </button>
                <button
                  type="button"
                  onClick={() => setCommandAction('TURN_OFF')}
                  className={`py-2.5 rounded-lg font-bold border flex items-center justify-center gap-2 transition ${
                    commandAction === 'TURN_OFF'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  TURN OFF
                </button>
              </div>
            </div>

            {/* Dimming Level */}
            {commandAction === 'TURN_ON' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Dimming Level
                  </label>
                  <span className="font-mono text-amber-400 font-bold">{dimmingLevel}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={dimmingLevel}
                  onChange={(e) => setDimmingLevel(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>10% (Standby)</span>
                  <span>50% (Eco)</span>
                  <span>100% (Full)</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Dispatching Command...' : `Execute ${commandAction} Command`}
              </button>
            </div>
          </form>
        </div>

        {/* Live Command Stream & Lifecycle Tracker */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Live Command Lifecycle &amp; Audit Stream
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              State: QUEUED &rarr; SENT &rarr; ACKNOWLEDGED &rarr; CONFIRMED
            </span>
          </div>

          {commandLogs.length === 0 ? (
            <div className="h-64 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Power className="w-7 h-7 text-slate-500" />
              <span>No commands logged yet for this ULB. Submit a command to initiate lifecycle tracking.</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {commandLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs space-y-2.5 font-mono hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-white text-xs">{log.device_id}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          log.command_type === 'TURN_ON'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {log.command_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                      <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                      <StatusBadge status={log.status} />
                    </div>
                  </div>

                  {/* Lifecycle Steps Indicator */}
                  <div className="flex items-center gap-1.5 text-[10px] pt-0.5">
                    {['QUEUED', 'SENT', 'ACKNOWLEDGED', 'CONFIRMED'].map((step, idx) => {
                      const isComplete = (log.steps || []).includes(step) || log.status === 'CONFIRMED';
                      return (
                        <React.Fragment key={step}>
                          <span
                            className={`px-2 py-0.5 rounded border transition ${
                              isComplete
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-medium'
                                : 'bg-slate-900 text-slate-600 border-slate-800'
                            }`}
                          >
                            {step}
                          </span>
                          {idx < 3 && <span className="text-slate-700">&rarr;</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans pt-1 border-t border-slate-800/50">
                    <span className="truncate max-w-xs">
                      Key: <code className="text-amber-400/90 font-mono text-[10px]">{log.idempotency_key}</code>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {log.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Confirmation Modal */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">
                Confirm Emergency {emergencyAction} Override
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will broadcast an immediate switching command to <strong className="text-white">all streetlights</strong> in{' '}
              <span className="text-amber-400">{selectedUlb?.name}</span>. This command overrides all automated schedules until the next astronomical cycle.
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 space-y-2">
              <p className="font-semibold">Type 'CONFIRM' to authorize this municipal command:</p>
              <input
                type="text"
                value={emergencyConfirmText}
                onChange={(e) => setEmergencyConfirmText(e.target.value)}
                placeholder="Type CONFIRM"
                className="w-full bg-slate-950 border border-rose-700/60 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-rose-400 uppercase"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEmergencyModalOpen(false);
                  setEmergencyConfirmText('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmergencyExecute}
                disabled={emergencyConfirmText.toUpperCase() !== 'CONFIRM' || isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs transition disabled:opacity-50"
              >
                {isSubmitting ? 'Broadcasting...' : `Execute ${emergencyAction} Across ULB`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
