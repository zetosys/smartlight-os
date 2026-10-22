'use client';

import React, { useState } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StatusBadge } from '@smartlight/ui';
import { Power, CheckCircle, Clock, Send, ShieldAlert, Cpu } from 'lucide-react';

export default function ControlsPage() {
  const { selectedUlb, currentUser } = useUlb();
  const [targetType, setTargetType] = useState<'DEVICE' | 'FEEDER' | 'ZONE'>('DEVICE');
  const [commandType, setCommandType] = useState<'TURN_ON' | 'TURN_OFF'>('TURN_ON');
  const [selectedDevice, setSelectedDevice] = useState<string>(
    selectedUlb?.code === 'ULB-GBL' ? 'SIM-GBL-0001' : 'SIM-KTR-0001',
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lifecycleEvents, setLifecycleEvents] = useState<any[]>([]);

  const handleDispatch = async () => {
    setIsSubmitting(true);
    const idempotencyKey = `ctl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Add immediate local state representation
    const newLog = {
      id: `cmd-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      target: selectedDevice,
      type: commandType,
      idempotencyKey,
      status: 'QUEUED',
      steps: ['QUEUED'],
    };

    setLifecycleEvents((prev) => [newLog, ...prev]);

    try {
      // 1. Dispatch to API
      const res = await ApiClient.fetch<{ commandId: string; status: string; isIdempotentReplay: boolean }>(
        'commands',
        {
          method: 'POST',
          body: JSON.stringify({
            deviceId: selectedDevice,
            type: commandType,
            idempotencyKey,
          }),
        },
      );

      // Update lifecycle stages
      setLifecycleEvents((prev) =>
        prev.map((e) =>
          e.id === newLog.id
            ? {
                ...e,
                status: res.status,
                commandId: res.commandId,
                steps: ['QUEUED', 'SENT', 'ACKNOWLEDGED', res.status === 'CONFIRMED' ? 'CONFIRMED' : 'ACKNOWLEDGED'],
              }
            : e,
        ),
      );
    } catch (err: any) {
      setLifecycleEvents((prev) =>
        prev.map((e) =>
          e.id === newLog.id
            ? {
                ...e,
                status: 'FAILED',
                error: err.message,
                steps: [...e.steps, 'FAILED'],
              }
            : e,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Live Control &amp; Command Console
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Asynchronous switching dispatch with idempotency verification and lifecycle state machine.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Command Submission Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Power className="w-4 h-4 text-amber-400" />
            Dispatch Command
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target Scope</label>
              <div className="grid grid-cols-3 gap-1">
                {(['DEVICE', 'FEEDER', 'ZONE'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTargetType(t)}
                    className={`py-1.5 rounded font-mono border ${
                      targetType === t
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Select Target Device</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                <option value={`${selectedUlb?.code}-0001`}>
                  {selectedUlb?.code}-0001 (110W LED Luminaire)
                </option>
                <option value={`${selectedUlb?.code}-0002`}>
                  {selectedUlb?.code}-0002 (70W LED Luminaire)
                </option>
                <option value={`${selectedUlb?.code}-0003`}>
                  {selectedUlb?.code}-0003 (35W LED Luminaire)
                </option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Command Action</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCommandType('TURN_ON')}
                  className={`py-2 rounded font-semibold border flex items-center justify-center gap-1.5 ${
                    commandType === 'TURN_ON'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  TURN ON
                </button>
                <button
                  type="button"
                  onClick={() => setCommandType('TURN_OFF')}
                  className={`py-2 rounded font-semibold border flex items-center justify-center gap-1.5 ${
                    commandType === 'TURN_OFF'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  TURN OFF
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleDispatch}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Dispatching...' : 'Submit Asynchronous Command'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Command Lifecycle Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Live Command Lifecycle Stream
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              State: QUEUED &rarr; SENT &rarr; ACKNOWLEDGED &rarr; CONFIRMED
            </span>
          </div>

          {lifecycleEvents.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-800 rounded flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Power className="w-6 h-6 text-slate-400" />
              <span>No commands submitted in this session. Dispatch a command above.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {lifecycleEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-2 font-mono"
                >
                  <div className="flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{evt.target}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{evt.timestamp}</span>
                    </div>
                    <StatusBadge status={evt.status} />
                  </div>

                  {/* Lifecycle Steps Bar */}
                  <div className="flex items-center gap-1 pt-1 text-[10px]">
                    {['QUEUED', 'SENT', 'ACKNOWLEDGED', 'CONFIRMED'].map((st, i) => {
                      const isReached = evt.steps.includes(st);
                      return (
                        <React.Fragment key={st}>
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              isReached
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {st}
                          </span>
                          {i < 3 && <span className="text-slate-600">&rarr;</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-slate-400 font-sans flex justify-between pt-1">
                    <span>Idempotency Key: <code className="text-amber-400">{evt.idempotencyKey}</code></span>
                    {evt.commandId && <span>ID: {evt.commandId}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
