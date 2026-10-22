'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge } from '@smartlight/ui';
import {
  Layers,
  Folder,
  ChevronRight,
  ChevronDown,
  MapPin,
  Zap,
  Plus,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Search,
} from 'lucide-react';
import { BulkImportResult } from '@smartlight/shared-types';

export default function AssetsPage() {
  const { selectedUlb } = useUlb();
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [feeders, setFeeders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Modals state
  const [showFeederModal, setShowFeederModal] = useState<boolean>(false);
  const [showPoleModal, setShowPoleModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Form states
  const [feederForm, setFeederForm] = useState({
    name: '',
    panelCode: '',
    capacityKw: 25,
    meterNumber: '',
    phase: '3-PHASE' as '3-PHASE' | 'SINGLE-PHASE',
  });

  const [poleForm, setPoleForm] = useState({
    externalCode: '',
    heightMeters: 8.5,
    wattage: 70,
    feederId: '',
    streetId: '',
    latitude: 34.2165,
    longitude: 74.7725,
  });

  const [importJson, setImportJson] = useState<string>('');
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const ulbQuery = selectedUlb?.id ? `?ulbId=${selectedUlb.id}` : '';
      const [hData, fData] = await Promise.all([
        ApiClient.fetch(`assets/hierarchy${ulbQuery}`),
        ApiClient.fetch(`assets/feeders${ulbQuery}`),
      ]);
      setHierarchy(hData || []);
      setFeeders(fData || []);

      // Auto-expand top zones
      if (hData && Array.isArray(hData)) {
        const initialExpand: Record<string, boolean> = {};
        hData.forEach((z: any) => {
          initialExpand[z.id] = true;
          z.wards?.forEach((w: any) => {
            initialExpand[w.id] = true;
          });
        });
        setExpandedNodes((prev) => ({ ...initialExpand, ...prev }));
      }
    } catch {
      // Fallback preview if API is temporarily unavailable
      setHierarchy([
        {
          id: '50000000-0000-0000-0000-000000000001',
          name: selectedUlb?.code === 'ULB-GBL' ? 'Zone 1 - Main Town' : 'Zone 1 - Shrine Route',
          code: selectedUlb?.code === 'ULB-GBL' ? 'GBL-Z1' : 'KTR-Z1',
          wards: [
            {
              id: '60000000-0000-0000-0000-000000000001',
              ward_number: 1,
              name: selectedUlb?.code === 'ULB-GBL' ? 'Ward 1 - Beehama' : 'Ward 1 - Banganga Track',
              streets: [
                {
                  id: '70000000-0000-0000-0000-000000000001',
                  name: selectedUlb?.code === 'ULB-GBL' ? 'Srinagar-Leh Highway (NH-1D)' : 'Banganga Pilgrimage Track Road',
                  street_type: 'HIGHWAY',
                  poles: [
                    {
                      id: 'p1',
                      external_code: `${selectedUlb?.code || 'GBL'}-POLE-001`,
                      height_meters: 9.0,
                      luminaires: [{ wattage: 110, lamp_type: 'LED' }],
                    },
                    {
                      id: 'p2',
                      external_code: `${selectedUlb?.code || 'GBL'}-POLE-002`,
                      height_meters: 9.0,
                      luminaires: [{ wattage: 70, lamp_type: 'LED' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
      setFeeders([
        {
          id: 'f1',
          name: selectedUlb?.code === 'ULB-GBL' ? 'Feeder Panel FP-01 Beehama' : 'Feeder Panel FP-01 Katra Banganga',
          panel_code: `${selectedUlb?.code || 'GBL'}-FP-01`,
          capacity_kw: 25.0,
          meter_number: 'JKPDD-MTR-90812',
          phase: '3-PHASE',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [selectedUlb]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Stats calculation
  const totalZones = hierarchy.length;
  const totalWards = hierarchy.reduce((acc, z) => acc + (z.wards?.length || 0), 0);
  const totalStreets = hierarchy.reduce(
    (acc, z) => acc + (z.wards?.reduce((wAcc: number, w: any) => wAcc + (w.streets?.length || 0), 0) || 0),
    0,
  );
  const totalPoles = hierarchy.reduce(
    (acc, z) =>
      acc +
      (z.wards?.reduce(
        (wAcc: number, w: any) =>
          wAcc + (w.streets?.reduce((sAcc: number, s: any) => sAcc + (s.poles?.length || 0), 0) || 0),
        0,
      ) || 0),
    0,
  );

  // Feeder creation handler
  const handleCreateFeeder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUlb?.id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await ApiClient.fetch('assets/feeders', {
        method: 'POST',
        body: JSON.stringify({
          ...feederForm,
          ulbId: selectedUlb.id,
        }),
      });
      setActionSuccess(`Feeder Panel '${feederForm.panelCode}' successfully created!`);
      setShowFeederModal(false);
      setFeederForm({
        name: '',
        panelCode: '',
        capacityKw: 25,
        meterNumber: '',
        phase: '3-PHASE',
      });
      loadAssets();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create feeder');
    } finally {
      setSubmitting(false);
    }
  };

  // Pole creation handler
  const handleCreatePole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUlb?.id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await ApiClient.fetch('assets/poles', {
        method: 'POST',
        body: JSON.stringify({
          ulbId: selectedUlb.id,
          externalCode: poleForm.externalCode,
          heightMeters: Number(poleForm.heightMeters),
          wattage: Number(poleForm.wattage),
          feederId: poleForm.feederId || undefined,
          streetId: poleForm.streetId || undefined,
          location: {
            latitude: Number(poleForm.latitude),
            longitude: Number(poleForm.longitude),
          },
        }),
      });
      setActionSuccess(`Pole '${poleForm.externalCode}' provisioned with ${poleForm.wattage}W luminaire!`);
      setShowPoleModal(false);
      setPoleForm({
        externalCode: '',
        heightMeters: 8.5,
        wattage: 70,
        feederId: '',
        streetId: '',
        latitude: selectedUlb.code === 'ULB-GBL' ? 34.2165 : 32.9925,
        longitude: selectedUlb.code === 'ULB-GBL' ? 74.7725 : 74.9318,
      });
      loadAssets();
    } catch (err: any) {
      setActionError(err.message || 'Failed to provision pole');
    } finally {
      setSubmitting(false);
    }
  };

  // Sample batch generator for Bulk Import
  const handleLoadSampleBatch = () => {
    const prefix = selectedUlb?.code || 'GBL';
    const lat = prefix === 'ULB-GBL' || prefix === 'GBL' ? 34.218 : 32.994;
    const lng = prefix === 'ULB-GBL' || prefix === 'GBL' ? 74.773 : 74.933;
    const sample = {
      ulbId: selectedUlb?.id,
      items: [
        {
          externalCode: `${prefix}-POLE-${Math.floor(100 + Math.random() * 900)}`,
          wattage: 70,
          heightMeters: 8.5,
          latitude: +(lat + 0.001).toFixed(4),
          longitude: +(lng + 0.001).toFixed(4),
          lampType: 'LED',
        },
        {
          externalCode: `${prefix}-POLE-${Math.floor(100 + Math.random() * 900)}`,
          wattage: 110,
          heightMeters: 9.0,
          latitude: +(lat + 0.002).toFixed(4),
          longitude: +(lng + 0.002).toFixed(4),
          lampType: 'LED',
        },
        {
          externalCode: `${prefix}-POLE-${Math.floor(100 + Math.random() * 900)}`,
          wattage: 35,
          heightMeters: 7.0,
          latitude: +(lat + 0.003).toFixed(4),
          longitude: +(lng + 0.003).toFixed(4),
          lampType: 'LED',
        },
      ],
    };
    setImportJson(JSON.stringify(sample, null, 2));
  };

  // Bulk import submission handler
  const handleExecuteImport = async () => {
    if (!importJson.trim()) {
      setActionError('Please enter JSON batch data or click "Load Sample Template"');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    setImportResult(null);

    try {
      const parsed = JSON.parse(importJson);
      // Ensure ulbId matches context
      parsed.ulbId = selectedUlb?.id || parsed.ulbId;

      const res: BulkImportResult = await ApiClient.fetch('assets/import', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });

      setImportResult(res);
      if (res.success) {
        setActionSuccess(`Bulk import complete! ${res.importedCount} poles successfully provisioned.`);
        loadAssets();
      } else {
        setActionError(`Import completed with ${res.failedCount} errors. ${res.importedCount} poles imported.`);
        loadAssets();
      }
    } catch (err: any) {
      setActionError(err.message || 'Invalid JSON batch format');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Asset Hierarchy & Topology Explorer
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete structural & electrical topology: ULB &rarr; Zones &rarr; Wards &rarr; Streets &rarr; Poles &rarr; Luminaires &amp; Feeders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFeederForm((prev) => ({
                ...prev,
                panelCode: `${selectedUlb?.code || 'GBL'}-FP-0${feeders.length + 1}`,
              }));
              setShowFeederModal(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Add Feeder
          </button>

          <button
            onClick={() => {
              setPoleForm((prev) => ({
                ...prev,
                externalCode: `${selectedUlb?.code || 'GBL'}-POLE-${Math.floor(100 + Math.random() * 900)}`,
                latitude: selectedUlb?.code === 'ULB-GBL' ? 34.2165 : 32.9925,
                longitude: selectedUlb?.code === 'ULB-GBL' ? 74.7725 : 74.9318,
              }));
              setShowPoleModal(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            Add Pole
          </button>

          <button
            onClick={() => {
              handleLoadSampleBatch();
              setShowImportModal(true);
            }}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Bulk Import
          </button>

          <button
            onClick={loadAssets}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            title="Refresh assets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <SimulatedBadge />
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Zones</span>
          <span className="text-lg font-bold text-white font-mono mt-0.5 block">{totalZones}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Wards</span>
          <span className="text-lg font-bold text-white font-mono mt-0.5 block">{totalWards}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Streets</span>
          <span className="text-lg font-bold text-white font-mono mt-0.5 block">{totalStreets}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Poles / Luminaires</span>
          <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">{totalPoles}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block">CCMS Feeders</span>
          <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block">{feeders.length}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Administrative & Physical Hierarchy Tree (2 Cols) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Administrative Hierarchy Tree
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search pole or street..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-48"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">Loading asset hierarchy...</div>
          ) : hierarchy.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">No assets registered for this ULB.</div>
          ) : (
            <div className="space-y-3 font-mono text-xs overflow-y-auto max-h-[620px] pr-2">
              {hierarchy.map((zone) => {
                const isZoneOpen = expandedNodes[zone.id] ?? true;
                return (
                  <div key={zone.id} className="border border-slate-800 rounded-lg bg-slate-950/40 overflow-hidden">
                    {/* Zone Header */}
                    <button
                      onClick={() => toggleNode(zone.id)}
                      className="w-full text-left px-3 py-2.5 bg-slate-900/60 hover:bg-slate-800/50 flex items-center justify-between border-b border-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        {isZoneOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <Folder className="w-4 h-4 text-amber-400" />
                        <span>ZONE: {zone.name}</span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.2 bg-slate-800 rounded">
                          {zone.code}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {zone.wards?.length || 0} Wards
                      </span>
                    </button>

                    {/* Wards Container */}
                    {isZoneOpen && (
                      <div className="p-3 space-y-3">
                        {zone.wards?.map((ward: any) => {
                          const isWardOpen = expandedNodes[ward.id] ?? true;
                          return (
                            <div key={ward.id} className="border border-slate-800/60 rounded bg-slate-900/30 p-2.5">
                              {/* Ward Header */}
                              <button
                                onClick={() => toggleNode(ward.id)}
                                className="w-full text-left flex items-center justify-between text-sky-400 font-semibold mb-2"
                              >
                                <div className="flex items-center gap-1.5">
                                  {isWardOpen ? (
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                  )}
                                  <span>WARD {ward.ward_number}: {ward.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {ward.streets?.length || 0} Streets
                                </span>
                              </button>

                              {/* Streets Container */}
                              {isWardOpen && (
                                <div className="ml-4 space-y-3 border-l border-slate-800 pl-3">
                                  {ward.streets?.map((street: any) => {
                                    const filteredPoles = (street.poles || []).filter(
                                      (p: any) =>
                                        !searchQuery ||
                                        p.external_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        street.name?.toLowerCase().includes(searchQuery.toLowerCase()),
                                    );

                                    return (
                                      <div key={street.id} className="text-slate-300">
                                        <div className="font-medium text-slate-300 flex items-center justify-between py-1">
                                          <span>
                                            STREET: {street.name}{' '}
                                            <span className="text-[10px] text-slate-400 font-normal">
                                              ({street.street_type})
                                            </span>
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {filteredPoles.length} Poles
                                          </span>
                                        </div>

                                        {/* Poles list */}
                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                          {filteredPoles.map((p: any, idx: number) => {
                                            const wattage = p.luminaires?.[0]?.wattage ?? p.luminaireWattage ?? 70;
                                            return (
                                              <div
                                                key={idx}
                                                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[11px] text-slate-300 flex items-center gap-2 transition-colors shadow-sm"
                                              >
                                                <MapPin className="w-3 h-3 text-amber-400" />
                                                <span className="font-semibold text-slate-200">{p.external_code}</span>
                                                <span
                                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                    wattage >= 110
                                                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                                                      : wattage >= 70
                                                      ? 'bg-sky-950/80 text-sky-300 border border-sky-800/40'
                                                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                                                  }`}
                                                >
                                                  {wattage}W
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                  {p.height_meters || 8.5}m
                                                </span>
                                              </div>
                                            );
                                          })}
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CCMS Feeder Panels List (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              CCMS Feeder Panels
            </h2>
            <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/40 rounded">
              {feeders.length} Active
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[620px] pr-1">
            {feeders.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No feeder panels registered.</div>
            ) : (
              feeders.map((f, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-lg text-xs space-y-2 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{f.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded">
                      {f.phase || '3-PHASE'}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex justify-between items-center pt-1 border-t border-slate-900">
                    <span className="text-slate-300 font-semibold">{f.panel_code}</span>
                    <span className="text-emerald-400 font-bold">{f.capacity_kw} kW Rating</span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Meter: {f.meter_number || 'UNMETERED'}</span>
                    <span className="text-[10px] text-slate-500">CCMS Monitored</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL: Add Feeder Panel --- */}
      {showFeederModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Register CCMS Feeder Panel
              </h3>
              <button onClick={() => setShowFeederModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFeeder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Panel Code (Unique)</label>
                <input
                  type="text"
                  required
                  value={feederForm.panelCode}
                  onChange={(e) => setFeederForm({ ...feederForm, panelCode: e.target.value })}
                  placeholder="e.g. GBL-FP-03"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Feeder Name / Location</label>
                <input
                  type="text"
                  required
                  value={feederForm.name}
                  onChange={(e) => setFeederForm({ ...feederForm, name: e.target.value })}
                  placeholder="e.g. Feeder Panel FP-03 North Corridor"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Capacity (kW)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={feederForm.capacityKw}
                    onChange={(e) => setFeederForm({ ...feederForm, capacityKw: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Electrical Phase</label>
                  <select
                    value={feederForm.phase}
                    onChange={(e: any) => setFeederForm({ ...feederForm, phase: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="3-PHASE">3-PHASE</option>
                    <option value="SINGLE-PHASE">SINGLE-PHASE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Utility Meter Number</label>
                <input
                  type="text"
                  value={feederForm.meterNumber}
                  onChange={(e) => setFeederForm({ ...feederForm, meterNumber: e.target.value })}
                  placeholder="e.g. JKPDD-MTR-99412"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFeederModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition-colors"
                >
                  {submitting ? 'Registering...' : 'Register Feeder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add Pole & Luminaire --- */}
      {showPoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Provision Streetlight Pole & Luminaire
              </h3>
              <button onClick={() => setShowPoleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePole} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Pole External Code (Unique)</label>
                <input
                  type="text"
                  required
                  value={poleForm.externalCode}
                  onChange={(e) => setPoleForm({ ...poleForm, externalCode: e.target.value })}
                  placeholder="e.g. GBL-POLE-101"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Luminaire Wattage</label>
                  <select
                    value={poleForm.wattage}
                    onChange={(e) => setPoleForm({ ...poleForm, wattage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value={35}>35W (Residential)</option>
                    <option value={70}>70W (Arterial)</option>
                    <option value={110}>110W (Highway)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Height (Meters)</label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    step="0.5"
                    value={poleForm.heightMeters}
                    onChange={(e) => setPoleForm({ ...poleForm, heightMeters: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Associated Feeder Panel</label>
                <select
                  value={poleForm.feederId}
                  onChange={(e) => setPoleForm({ ...poleForm, feederId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Auto-Assign Feeder --</option>
                  {feeders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.panel_code} ({f.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Latitude (WGS 84)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={poleForm.latitude}
                    onChange={(e) => setPoleForm({ ...poleForm, latitude: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Longitude (WGS 84)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={poleForm.longitude}
                    onChange={(e) => setPoleForm({ ...poleForm, longitude: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPoleModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded transition-colors"
                >
                  {submitting ? 'Provisioning...' : 'Provision Pole'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Bulk Asset Import --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-sky-400" />
                Bulk Asset Import Engine
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Target ULB: <strong className="text-white">{selectedUlb?.name}</strong>
                </span>
                <button
                  onClick={handleLoadSampleBatch}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded border border-slate-700 text-[11px]"
                >
                  Load Sample Batch
                </button>
              </div>

              <textarea
                rows={10}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste JSON Batch with externalCode, wattage, latitude, longitude..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-400"
              />

              {importResult && (
                <div
                  className={`p-3 rounded-lg border ${
                    importResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    Import Results: {importResult.importedCount} Imported, {importResult.failedCount} Errors
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1 font-mono text-[11px] max-h-28 overflow-y-auto pr-1">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx} className="text-red-400">
                          Row {err.row} {err.code ? `[${err.code}]` : ''}: {err.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Close
                </button>
                <button
                  type="submit"
                  onClick={handleExecuteImport}
                  disabled={submitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded transition-colors"
                >
                  {submitting ? 'Validating & Importing...' : 'Validate & Import Batch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
