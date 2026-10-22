'use client';

import React from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { SimulatedBadge } from '@smartlight/ui';
import { MapPin, Layers, Navigation, Eye } from 'lucide-react';

export default function GisPage() {
  const { selectedUlb } = useUlb();

  const coords =
    selectedUlb?.code === 'ULB-GBL'
      ? { lat: '34.2165° N', lng: '74.7725° E', center: 'Ganderbal Town Center' }
      : { lat: '32.9925° N', lng: '74.9318° E', center: 'Katra Shrine Base' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            GIS Asset Visualization & Spatial Network
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            MapLibre PostGIS spatial layers: Feeders, Gateways, Poles, and Luminaires.
          </p>
        </div>
        <SimulatedBadge />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-[650px] relative">
        {/* Map Toolbar */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-300 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              Center: {coords.center} ({coords.lat}, {coords.lng})
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Projection: EPSG:4326 (WGS 84)</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Layers: Poles, Feeders, Wards
            </button>
          </div>
        </div>

        {/* GIS Canvas Visual Representation */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center relative p-8">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Simulated Map Markers */}
          <div className="relative z-10 text-center max-w-lg space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <MapPin className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">
                MapLibre GIS Engine Initialized
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                PostGIS spatial tables (<code className="text-amber-400">geography(Point, 4326)</code>) are configured for feeders and poles with GIST spatial indexes. In Prompt 2 & 4, dynamic vector tile clustering will render all 4,608 streetlight points.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block">Poles Seeded</span>
                <span className="text-white font-bold">5 Initial</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block">Feeders</span>
                <span className="text-emerald-400 font-bold">2 CCMS Panels</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block">SRID</span>
                <span className="text-sky-400 font-bold">EPSG:4326</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
