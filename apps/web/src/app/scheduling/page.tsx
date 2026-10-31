'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge } from '@smartlight/ui';
import {
  Calendar,
  Clock,
  Sun,
  Moon,
  Plus,
  Play,
  RotateCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { Schedule, SolarTimes, CreateScheduleDto } from '@smartlight/shared-types';

export default function SchedulingPage() {
  const { selectedUlb, currentUser } = useUlb();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [solarTimes, setSolarTimes] = useState<SolarTimes | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newScope, setNewScope] = useState<'ULB' | 'FEEDER' | 'ZONE'>('ULB');
  const [newMode, setNewMode] = useState<'ASTRONOMICAL' | 'FIXED'>('ASTRONOMICAL');
  const [turnOnOffset, setTurnOnOffset] = useState<number>(-15);
  const [turnOffOffset, setTurnOffOffset] = useState<number>(15);
  const [fixedOnTime, setFixedOnTime] = useState<string>('18:30');
  const [fixedOffTime, setFixedOffTime] = useState<string>('06:00');
  const [dimmingEnabled, setDimmingEnabled] = useState<boolean>(true);
  const [dimmingLevel, setDimmingLevel] = useState<number>(60);
  const [dimmingStartTime, setDimmingStartTime] = useState<string>('23:30');
  const [dimmingEndTime, setDimmingEndTime] = useState<string>('04:30');

  useEffect(() => {
    if (!selectedUlb) return;
    void loadData();
  }, [selectedUlb]);

  const loadData = async () => {
    if (!selectedUlb) return;
    setIsLoading(true);
    setNotification(null);

    try {
      // 1. Fetch live solar calculations
      const solar = await ApiClient.fetch<SolarTimes>(`schedules/solar?ulbId=${selectedUlb.id}`);
      setSolarTimes(solar);

      // 2. Fetch configured schedules
      const schedList = await ApiClient.fetch<Schedule[]>(`schedules?ulbId=${selectedUlb.id}`);
      setSchedules(schedList || []);
    } catch {
      // Fallback default state if API error
      setSolarTimes({
        date: new Date().toISOString().split('T')[0],
        latitude: selectedUlb.code === 'ULB-GBL' ? 34.2165 : 32.9925,
        longitude: selectedUlb.code === 'ULB-GBL' ? 74.7725 : 74.9318,
        sunrise: '05:52',
        sunset: '18:28',
        dawnCivil: '05:28',
        duskCivil: '18:52',
        solarNoon: '12:10',
        dayLengthMinutes: 756,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (scheduleId: string) => {
    try {
      const updated = await ApiClient.fetch<Schedule>(`schedules/${scheduleId}/toggle`, {
        method: 'POST',
      });
      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? updated : s)));
      setNotification({
        type: 'success',
        message: `Schedule '${updated.name}' is now ${updated.enabled ? 'ACTIVE' : 'PAUSED'}.`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to toggle schedule' });
    }
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      await ApiClient.fetch(`schedules/${scheduleId}`, { method: 'DELETE' });
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      setNotification({ type: 'success', message: 'Schedule profile deleted successfully.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete schedule' });
    }
  };

  const handleEvaluateNow = async () => {
    setIsEvaluating(true);
    setNotification(null);
    try {
      const res = await ApiClient.fetch<any>('schedules/evaluate', { method: 'POST' });
      setNotification({
        type: 'success',
        message: `Evaluated ${res.schedulesEvaluated} active schedules. Automation dispatched nightfall switching.`,
      });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to trigger schedule evaluation' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUlb || !newName) return;

    const dto: CreateScheduleDto = {
      ulbId: selectedUlb.id,
      name: newName,
      scope: newScope,
      rule: {
        mode: newMode,
        turnOnOffsetMinutes: newMode === 'ASTRONOMICAL' ? turnOnOffset : undefined,
        turnOffOffsetMinutes: newMode === 'ASTRONOMICAL' ? turnOffOffset : undefined,
        turnOnTime: newMode === 'FIXED' ? fixedOnTime : undefined,
        turnOffTime: newMode === 'FIXED' ? fixedOffTime : undefined,
        dimmingCurve: dimmingEnabled
          ? [
              {
                time: dimmingStartTime,
                brightness: dimmingLevel,
              },
              {
                time: dimmingEndTime,
                brightness: 100,
              },
            ]
          : undefined,
      },
    };

    try {
      const created = await ApiClient.fetch<Schedule>('schedules', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      setSchedules((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setNewName('');
      setNotification({ type: 'success', message: `Schedule '${created.name}' created successfully.` });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to create schedule' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Astronomical Scheduling &amp; Ephemeris Engine
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name} ({selectedUlb?.code})
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Astronomical solar offsets (NOAA algorithm), midnight energy-saving dimming curves, and group calendar profiles.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleEvaluateNow}
            disabled={isEvaluating}
            className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-pulse' : ''}`} />
            {isEvaluating ? 'Evaluating...' : 'Evaluate Now'}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Schedule
          </button>
          <SimulatedBadge />
        </div>
      </div>

      {/* Alert / Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Grid: Profiles List + Ephemeris Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Schedules List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Configured Lighting Profiles ({schedules.length})
            </h2>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-200 transition"
              title="Refresh"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="h-56 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Calendar className="w-7 h-7 text-slate-500" />
              <span>No schedules configured for this ULB. Click "New Schedule" to add one.</span>
            </div>
          ) : (
            <div className="space-y-3.5">
              {schedules.map((sched) => {
                const isAstro = sched.rule.mode === 'ASTRONOMICAL';
                return (
                  <div
                    key={sched.id}
                    className={`p-4 rounded-xl border transition ${
                      sched.enabled
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-bold text-white">{sched.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              sched.enabled
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {sched.enabled ? 'ACTIVE' : 'PAUSED'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {sched.rule.mode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Scope: <span className="text-slate-300 font-mono">{sched.scope}</span> • Targets:{' '}
                          <span className="text-amber-400 font-mono font-bold">{sched.targetCount}</span> luminaires
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(sched.id)}
                          className="text-slate-300 hover:text-white transition"
                          title={sched.enabled ? 'Pause Schedule' : 'Activate Schedule'}
                        >
                          {sched.enabled ? (
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-500" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(sched.id)}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="Delete Schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-800/60 text-xs font-mono">
                      <div className="flex items-center gap-2 text-amber-300">
                        <Moon className="w-4 h-4 shrink-0" />
                        <span>
                          ON:{' '}
                          {isAstro
                            ? `Sunset ${sched.rule.turnOnOffsetMinutes && sched.rule.turnOnOffsetMinutes < 0 ? '' : '+'}${sched.rule.turnOnOffsetMinutes || 0}m`
                            : sched.rule.turnOnTime || '18:30'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sky-300">
                        <Sun className="w-4 h-4 shrink-0" />
                        <span>
                          OFF:{' '}
                          {isAstro
                            ? `Sunrise ${sched.rule.turnOffOffsetMinutes && sched.rule.turnOffOffsetMinutes < 0 ? '' : '+'}${sched.rule.turnOffOffsetMinutes || 0}m`
                            : sched.rule.turnOffTime || '06:00'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-300">
                        <Sliders className="w-4 h-4 shrink-0" />
                        <span>
                          {sched.rule.dimmingCurve && sched.rule.dimmingCurve.length > 0
                            ? `Eco: ${sched.rule.dimmingCurve[0].brightness}% (${sched.rule.dimmingCurve[0].time})`
                            : 'Eco Dimming: Disabled'}
                        </span>
                      </div>
                    </div>

                    {sched.lastExecutedAt && (
                      <div className="text-[10px] text-slate-500 font-sans mt-2">
                        Last automated switch: {new Date(sched.lastExecutedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Astronomical Solar Ephemeris Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                Astronomical Clock &amp; Ephemeris
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Asia/Kolkata</span>
            </div>

            {solarTimes && (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Sunset className="w-4 h-4" />
                    <span>Calculated Sunset:</span>
                  </div>
                  <span className="text-white font-bold text-sm">{solarTimes.sunset} IST</span>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-300">
                    <Moon className="w-4 h-4" />
                    <span>Civil Twilight (Dusk):</span>
                  </div>
                  <span className="text-white font-bold text-sm">{solarTimes.duskCivil} IST</span>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-300">
                    <Sunrise className="w-4 h-4" />
                    <span>Calculated Sunrise:</span>
                  </div>
                  <span className="text-white font-bold text-sm">{solarTimes.sunrise} IST</span>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Sun className="w-4 h-4" />
                    <span>Civil Twilight (Dawn):</span>
                  </div>
                  <span className="text-white font-bold text-sm">{solarTimes.dawnCivil} IST</span>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
                  <span className="text-slate-400">Total Day Length:</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.floor(solarTimes.dayLengthMinutes / 60)}h {solarTimes.dayLengthMinutes % 60}m
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/60 text-[11px] font-sans text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Coordinates:</span>
                    <span className="font-mono text-slate-300">
                      {solarTimes.latitude.toFixed(4)}°N, {solarTimes.longitude.toFixed(4)}°E
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Algorithm:</span>
                    <span className="text-slate-300">NOAA / Jean Meeus Ephemeris</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conflict & Precedence Policy Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Switching Policy &amp; Conflict Order
            </h2>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
                <span className="text-slate-400">1. Emergency Override:</span>
                <span className="text-rose-400 font-bold">Highest Precedence</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
                <span className="text-slate-400">2. Operator Manual Switch:</span>
                <span className="text-amber-400 font-bold">Overrides Schedule</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded flex justify-between">
                <span className="text-slate-400">3. Astronomical Schedule:</span>
                <span className="text-emerald-400 font-bold">Default Automatic</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Configure New Lighting Schedule
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Schedule Profile Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ganderbal Highway Sunset Profile"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Target Scope</label>
                  <select
                    value={newScope}
                    onChange={(e: any) => setNewScope(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="ULB">Entire ULB Fleet</option>
                    <option value="FEEDER">CCMS Feeder Group</option>
                    <option value="ZONE">Zone Corridor</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Switching Mode</label>
                  <select
                    value={newMode}
                    onChange={(e: any) => setNewMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="ASTRONOMICAL">ASTRONOMICAL (Solar Ephemeris)</option>
                    <option value="FIXED">FIXED TIME (Clock)</option>
                  </select>
                </div>
              </div>

              {newMode === 'ASTRONOMICAL' ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <div>
                    <label className="text-slate-400 block mb-1">Sunset Turn ON Offset</label>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        value={turnOnOffset}
                        onChange={(e) => setTurnOnOffset(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-slate-400">mins</span>
                    </div>
                    <span className="text-[10px] text-slate-500">-15m = 15m before sunset</span>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Sunrise Turn OFF Offset</label>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        value={turnOffOffset}
                        onChange={(e) => setTurnOffOffset(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-slate-400">mins</span>
                    </div>
                    <span className="text-[10px] text-slate-500">+15m = 15m after sunrise</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <div>
                    <label className="text-slate-400 block mb-1">Turn ON Time (IST)</label>
                    <input
                      type="time"
                      value={fixedOnTime}
                      onChange={(e) => setFixedOnTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Turn OFF Time (IST)</label>
                    <input
                      type="time"
                      value={fixedOffTime}
                      onChange={(e) => setFixedOffTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Midnight Dimming Section */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Midnight Eco-Dimming Policy</span>
                  <input
                    type="checkbox"
                    checked={dimmingEnabled}
                    onChange={(e) => setDimmingEnabled(e.target.checked)}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>

                {dimmingEnabled && (
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Start Time</span>
                      <input
                        type="time"
                        value={dimmingStartTime}
                        onChange={(e) => setDimmingStartTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">End Time</span>
                      <input
                        type="time"
                        value={dimmingEndTime}
                        onChange={(e) => setDimmingEndTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Brightness</span>
                      <select
                        value={dimmingLevel}
                        onChange={(e) => setDimmingLevel(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs"
                      >
                        <option value="40">40% Level</option>
                        <option value="50">50% Level</option>
                        <option value="60">60% Level</option>
                        <option value="75">75% Level</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition shadow-md"
                >
                  Create Schedule Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
