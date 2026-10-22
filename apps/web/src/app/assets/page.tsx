'use client';

import React, { useState, useEffect } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge } from '@smartlight/ui';
import { Layers, Folder, ChevronRight, MapPin, Zap } from 'lucide-react';

export default function AssetsPage() {
  const { selectedUlb } = useUlb();
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [feeders, setFeeders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      try {
        const [hData, fData] = await Promise.all([
          ApiClient.fetch(`assets/hierarchy?ulbId=${selectedUlb?.id || ''}`),
          ApiClient.fetch(`assets/feeders?ulbId=${selectedUlb?.id || ''}`),
        ]);
        setHierarchy(hData || []);
        setFeeders(fData || []);
      } catch {
        // Fallback tree for development preview
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
                      { external_code: `${selectedUlb?.code}-POLE-001`, height_meters: 9.0, luminaires: [{ wattage: 110, lamp_type: 'LED' }] },
                      { external_code: `${selectedUlb?.code}-POLE-002`, height_meters: 9.0, luminaires: [{ wattage: 70, lamp_type: 'LED' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ]);
        setFeeders([
          {
            name: selectedUlb?.code === 'ULB-GBL' ? 'Feeder Panel FP-01 Beehama' : 'Feeder Panel FP-01 Katra Banganga',
            panel_code: `${selectedUlb?.code}-FP-01`,
            capacity_kw: 25.0,
            meter_number: 'JKPDD-MTR-90812',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [selectedUlb]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            Asset Hierarchy Explorer
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Structural topology: ULB &rarr; Zones &rarr; Wards &rarr; Streets &rarr; Poles &rarr; Luminaires &amp; Feeders.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hierarchy Tree */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Administrative &amp; Physical Tree
          </h2>

          <div className="space-y-3 font-mono text-xs">
            {hierarchy.map((zone) => (
              <div key={zone.id} className="border border-slate-800 rounded p-3 bg-slate-950/40">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <Folder className="w-4 h-4 text-amber-400" />
                  <span>ZONE: {zone.name}</span>
                  <span className="text-[10px] text-slate-400">({zone.code})</span>
                </div>

                <div className="ml-5 mt-3 space-y-3 border-l border-slate-800 pl-3">
                  {zone.wards?.map((ward: any) => (
                    <div key={ward.id} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>WARD {ward.ward_number}: {ward.name}</span>
                      </div>

                      <div className="ml-5 space-y-2 border-l border-slate-800/80 pl-3">
                        {ward.streets?.map((street: any) => (
                          <div key={street.id} className="text-slate-300">
                            <div className="font-medium text-slate-200">
                              STREET: {street.name} ({street.street_type})
                            </div>

                            <div className="ml-4 mt-1.5 flex flex-wrap gap-2">
                              {street.poles?.map((p: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="px-2 py-1 bg-slate-900 border border-slate-700/80 rounded text-[11px] text-slate-300 flex items-center gap-1.5"
                                >
                                  <MapPin className="w-3 h-3 text-amber-400" />
                                  <span>{p.external_code}</span>
                                  <span className="text-emerald-400 font-bold">
                                    {p.luminaires?.[0]?.wattage ?? 70}W
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CCMS Feeder Panels List */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            CCMS Feeder Panels
          </h2>

          <div className="space-y-3">
            {feeders.map((f, i) => (
              <div key={i} className="p-3 bg-slate-950/60 border border-slate-800 rounded text-xs space-y-1.5">
                <div className="font-semibold text-white">{f.name}</div>
                <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                  <span>Code: {f.panel_code}</span>
                  <span className="text-emerald-400 font-bold">{f.capacity_kw} kW</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Meter: {f.meter_number || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
