'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StateComparison, StatusBadge } from '@smartlight/ui';
import {
  MapPin,
  Layers,
  Navigation,
  Eye,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Zap,
  Info,
  X,
  Code,
  Radio,
  Sliders,
} from 'lucide-react';
import { GeoJsonFeatureCollection, GeoJsonFeature } from '@smartlight/shared-types';

export interface GisFeatureProperties {
  assetType: 'POLE' | 'FEEDER' | 'GATEWAY';
  id?: string;
  externalCode?: string;
  name?: string;
  panelCode?: string;
  capacityKw?: number;
  meterNumber?: string;
  phase?: string;
  wattage?: number;
  heightMeters?: number;
  feederName?: string;
  feederPanelCode?: string;
  deviceExternalId?: string;
  isOnline?: boolean;
  reportedOn?: boolean;
  desiredOn?: boolean;
}

export type GisFeature = GeoJsonFeature<GisFeatureProperties>;
export type GisFeatureCollection = GeoJsonFeatureCollection<GisFeatureProperties>;

export default function GisPage() {
  const { selectedUlb } = useUlb();
  const [geoData, setGeoData] = useState<GisFeatureCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'poles' | 'feeders'>('all');
  const [showHalos, setShowHalos] = useState<boolean>(true);
  const [selectedFeature, setSelectedFeature] = useState<GisFeature | null>(null);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const ulbCoords = useMemo(() => {
    return selectedUlb?.code === 'ULB-GBL'
      ? { lat: 34.2165, lng: 74.7725, centerName: 'Ganderbal Town Center (NH-1D)' }
      : { lat: 32.9925, lng: 74.9318, centerName: 'Katra Shrine Base (Banganga)' };
  }, [selectedUlb]);

  const loadGeoJson = useCallback(async () => {
    setLoading(true);
    try {
      const ulbQuery = selectedUlb?.id ? `ulbId=${selectedUlb.id}&` : '';
      const data = await ApiClient.fetch<GisFeatureCollection>(
        `assets/geojson?${ulbQuery}type=${selectedLayer}`,
      );
      setGeoData(data);
      if (data.features.length > 0 && !selectedFeature) {
        setSelectedFeature(data.features[0]);
      }
    } catch {
      // Deterministic fallback GeoJSON for development / offline preview
      const fallbackFeatures: GisFeature[] =
        selectedUlb?.code === 'ULB-GBL'
          ? [
              {
                type: 'Feature',
                id: '90000000-0000-0000-0000-000000000001',
                geometry: { type: 'Point', coordinates: [74.7721, 34.2168] },
                properties: {
                  assetType: 'POLE',
                  externalCode: 'GBL-POLE-001',
                  wattage: 110,
                  heightMeters: 9.0,
                  feederName: 'Feeder Panel FP-01 Beehama',
                  feederPanelCode: 'GBL-FP-01',
                  deviceExternalId: 'SIM-GBL-0001',
                  isOnline: true,
                  reportedOn: true,
                  desiredOn: true,
                },
              },
              {
                type: 'Feature',
                id: '90000000-0000-0000-0000-000000000002',
                geometry: { type: 'Point', coordinates: [74.7728, 34.217] },
                properties: {
                  assetType: 'POLE',
                  externalCode: 'GBL-POLE-002',
                  wattage: 70,
                  heightMeters: 9.0,
                  feederName: 'Feeder Panel FP-01 Beehama',
                  feederPanelCode: 'GBL-FP-01',
                  deviceExternalId: 'SIM-GBL-0002',
                  isOnline: true,
                  reportedOn: false,
                  desiredOn: false,
                },
              },
              {
                type: 'Feature',
                id: '90000000-0000-0000-0000-000000000003',
                geometry: { type: 'Point', coordinates: [74.7735, 34.2175] },
                properties: {
                  assetType: 'POLE',
                  externalCode: 'GBL-POLE-003',
                  wattage: 35,
                  heightMeters: 7.5,
                  feederName: 'Feeder Panel FP-01 Beehama',
                  feederPanelCode: 'GBL-FP-01',
                  deviceExternalId: 'SIM-GBL-0003',
                  isOnline: true,
                  reportedOn: true,
                  desiredOn: true,
                },
              },
              {
                type: 'Feature',
                id: '80000000-0000-0000-0000-000000000001',
                geometry: { type: 'Point', coordinates: [74.7725, 34.2165] },
                properties: {
                  assetType: 'FEEDER',
                  name: 'Feeder Panel FP-01 Beehama',
                  panelCode: 'GBL-FP-01',
                  capacityKw: 25.0,
                  meterNumber: 'JKPDD-MTR-90812',
                  phase: '3-PHASE',
                },
              },
            ]
          : [
              {
                type: 'Feature',
                id: '90000000-0000-0000-0000-000000000004',
                geometry: { type: 'Point', coordinates: [74.932, 32.993] },
                properties: {
                  assetType: 'POLE',
                  externalCode: 'KTR-POLE-001',
                  wattage: 70,
                  heightMeters: 9.0,
                  feederName: 'Feeder Panel FP-01 Katra Banganga',
                  feederPanelCode: 'KTR-FP-01',
                  deviceExternalId: 'SIM-KTR-0001',
                  isOnline: true,
                  reportedOn: false,
                  desiredOn: false,
                },
              },
              {
                type: 'Feature',
                id: '90000000-0000-0000-0000-000000000005',
                geometry: { type: 'Point', coordinates: [74.9325, 32.9935] },
                properties: {
                  assetType: 'POLE',
                  externalCode: 'KTR-POLE-002',
                  wattage: 35,
                  heightMeters: 8.0,
                  feederName: 'Feeder Panel FP-01 Katra Banganga',
                  feederPanelCode: 'KTR-FP-01',
                  deviceExternalId: 'SIM-KTR-0002',
                  isOnline: true,
                  reportedOn: true,
                  desiredOn: true,
                },
              },
              {
                type: 'Feature',
                id: '80000000-0000-0000-0000-000000000002',
                geometry: { type: 'Point', coordinates: [74.9318, 32.9925] },
                properties: {
                  assetType: 'FEEDER',
                  name: 'Feeder Panel FP-01 Katra Banganga',
                  panelCode: 'KTR-FP-01',
                  capacityKw: 30.0,
                  meterNumber: 'JKPDD-MTR-81723',
                  phase: '3-PHASE',
                },
              },
            ];

      const fallbackCollection: GisFeatureCollection = {
        type: 'FeatureCollection',
        features: fallbackFeatures.filter((f) => {
          if (selectedLayer === 'all') return true;
          if (selectedLayer === 'poles') return f.properties.assetType === 'POLE';
          if (selectedLayer === 'feeders') return f.properties.assetType === 'FEEDER';
          return true;
        }),
      };
      setGeoData(fallbackCollection);
      if (fallbackCollection.features.length > 0) {
        setSelectedFeature(fallbackCollection.features[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedUlb, selectedLayer]);

  useEffect(() => {
    loadGeoJson();
  }, [loadGeoJson]);

  // Spatial Projection bounds computation
  const bounds = useMemo(() => {
    if (!geoData || geoData.features.length === 0) {
      return {
        minLng: ulbCoords.lng - 0.005,
        maxLng: ulbCoords.lng + 0.005,
        minLat: ulbCoords.lat - 0.005,
        maxLat: ulbCoords.lat + 0.005,
      };
    }

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    geoData.features.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    const padLng = Math.max((maxLng - minLng) * 0.25, 0.002);
    const padLat = Math.max((maxLat - minLat) * 0.25, 0.002);

    return {
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
    };
  }, [geoData, ulbCoords]);

  // Transform Geo Coordinates [lng, lat] to SVG ViewBox (800 x 500)
  const projectCoords = useCallback(
    (lng: number, lat: number) => {
      const svgWidth = 800;
      const svgHeight = 500;
      const padding = 60;

      const lngSpan = bounds.maxLng - bounds.minLng || 0.001;
      const latSpan = bounds.maxLat - bounds.minLat || 0.001;

      const rawX = ((lng - bounds.minLng) / lngSpan) * (svgWidth - padding * 2) + padding;
      // Invert Y because latitude increases northward while SVG Y increases downward
      const rawY =
        svgHeight - (((lat - bounds.minLat) / latSpan) * (svgHeight - padding * 2) + padding);

      const centerX = svgWidth / 2;
      const centerY = svgHeight / 2;

      const x = (rawX - centerX) * zoomLevel + centerX + panOffset.x;
      const y = (rawY - centerY) * zoomLevel + centerY + panOffset.y;

      return { x, y };
    },
    [bounds, zoomLevel, panOffset],
  );

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Metrics summary
  const poles = geoData?.features.filter((f) => f.properties.assetType === 'POLE') || [];
  const feeders = geoData?.features.filter((f) => f.properties.assetType === 'FEEDER') || [];
  const activePoles = poles.filter((p) => p.properties.reportedOn === true);
  const totalLoadKw = feeders.reduce((acc, f) => acc + (f.properties.capacityKw || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            GIS Spatial Network & Topology Viewer
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            MapLibre EPSG:4326 PostGIS spatial layer: Feeders, Gateways, Poles, and Luminaires.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Filter Buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center text-xs">
            <button
              onClick={() => setSelectedLayer('all')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedLayer === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Layers
            </button>
            <button
              onClick={() => setSelectedLayer('poles')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedLayer === 'poles'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Poles Only
            </button>
            <button
              onClick={() => setSelectedLayer('feeders')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedLayer === 'feeders'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Feeders Only
            </button>
          </div>

          <button
            onClick={() => setShowHalos(!showHalos)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showHalos
                ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle illumination halos"
          >
            <Eye className="w-3.5 h-3.5" />
            Halos
          </button>

          <button
            onClick={() => setShowJsonModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5"
            title="Inspect RFC 7946 GeoJSON"
          >
            <Code className="w-3.5 h-3.5 text-sky-400" />
            GeoJSON
          </button>

          <button
            onClick={loadGeoJson}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="Refresh spatial data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <SimulatedBadge />
        </div>
      </div>

      {/* Main Map Viewer Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-[700px] relative shadow-2xl">
        {/* Top Status Bar */}
        <div className="bg-slate-800/95 border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3 z-10">
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-300 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              Center: {ulbCoords.centerName}
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-400">
              {ulbCoords.lat.toFixed(4)}° N, {ulbCoords.lng.toFixed(4)}° E
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">SRID: EPSG:4326 (WGS 84)</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-slate-400">
              Poles: <strong className="text-amber-400">{poles.length}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Feeders: <strong className="text-emerald-400">{feeders.length}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Illuminated: <strong className="text-white">{activePoles.length}</strong>
            </span>
          </div>
        </div>

        {/* Map Canvas and Inspector Container */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Spatial Vector Canvas */}
          <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center relative select-none">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Map Controls Floating Overlay */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 shadow-lg backdrop-blur">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="h-px bg-slate-800 my-0.5" />
              <button
                onClick={resetView}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Scale & Coordinate Badge */}
            <div className="absolute bottom-4 left-4 z-20 font-mono text-[10px] bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-slate-400 shadow backdrop-blur">
              Zoom: {(zoomLevel * 100).toFixed(0)}% | PostGIS Spatial Canvas
            </div>

            {/* SVG Vector Map Rendering */}
            {loading ? (
              <div className="z-10 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                <span>Loading PostGIS GeoJSON Layer...</span>
              </div>
            ) : (
              <svg
                viewBox="0 0 800 500"
                className="w-full h-full cursor-crosshair z-10"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Connecting feeder lines */}
                {feeders.map((feeder) => {
                  const [fLng, fLat] = feeder.geometry.coordinates;
                  const fPt = projectCoords(fLng, fLat);

                  return (
                    <g key={`lines-${feeder.id}`}>
                      {poles.map((pole) => {
                        const [pLng, pLat] = pole.geometry.coordinates;
                        const pPt = projectCoords(pLng, pLat);

                        return (
                          <line
                            key={`line-${feeder.id}-${pole.id}`}
                            x1={fPt.x}
                            y1={fPt.y}
                            x2={pPt.x}
                            y2={pPt.y}
                            stroke="#334155"
                            strokeWidth="1.5"
                            strokeDasharray="4,4"
                            opacity="0.4"
                          />
                        );
                      })}
                    </g>
                  );
                })}

                {/* Render Feeder Panels */}
                {feeders.map((feeder) => {
                  const [lng, lat] = feeder.geometry.coordinates;
                  const pt = projectCoords(lng, lat);
                  const isSelected = selectedFeature?.id === feeder.id;

                  return (
                    <g
                      key={feeder.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedFeature(feeder)}
                    >
                      {/* Feeder Aura */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="22"
                        fill="#10b981"
                        opacity={isSelected ? '0.3' : '0.15'}
                      />
                      {/* Feeder Marker Box */}
                      <rect
                        x={pt.x - 12}
                        y={pt.y - 12}
                        width="24"
                        height="24"
                        rx="4"
                        fill="#064e3b"
                        stroke={isSelected ? '#34d399' : '#10b981'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                      />
                      <Zap x={pt.x - 7} y={pt.y - 7} width="14" height="14" className="text-emerald-300" />
                      {/* Feeder Label */}
                      <text
                        x={pt.x}
                        y={pt.y + 22}
                        textAnchor="middle"
                        fill="#34d399"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {feeder.properties.panelCode}
                      </text>
                    </g>
                  );
                })}

                {/* Render Poles / Luminaires */}
                {poles.map((pole) => {
                  const [lng, lat] = pole.geometry.coordinates;
                  const pt = projectCoords(lng, lat);
                  const isSelected = selectedFeature?.id === pole.id;
                  const isReportedOn = pole.properties.reportedOn === true;
                  const wattage = pole.properties.wattage || 70;

                  // Color based on wattage
                  const baseColor =
                    wattage >= 110 ? '#f59e0b' : wattage >= 70 ? '#38bdf8' : '#10b981';

                  return (
                    <g
                      key={pole.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedFeature(pole)}
                    >
                      {/* Illumination Halo */}
                      {showHalos && isReportedOn && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={wattage >= 110 ? '36' : wattage >= 70 ? '28' : '20'}
                          fill={baseColor}
                          opacity="0.18"
                        />
                      )}

                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="14"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2"
                          strokeDasharray="2,2"
                        />
                      )}

                      {/* Pole Pin Core */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="7"
                        fill={isReportedOn ? baseColor : '#334155'}
                        stroke={isSelected ? '#ffffff' : baseColor}
                        strokeWidth="1.5"
                      />

                      {/* Inner dot */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="2.5"
                        fill={isReportedOn ? '#ffffff' : '#94a3b8'}
                      />

                      {/* Pole Code Label */}
                      <text
                        x={pt.x}
                        y={pt.y - 12}
                        textAnchor="middle"
                        fill={isSelected ? '#ffffff' : '#cbd5e1'}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {pole.properties.externalCode}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Right Slide-over: Spatial Asset Inspector */}
          {selectedFeature && (
            <div className="w-80 bg-slate-900 border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto z-20 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    {selectedFeature.properties.assetType === 'FEEDER' ? (
                      <div className="p-1.5 bg-emerald-950/80 border border-emerald-800/60 rounded text-emerald-400">
                        <Zap className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-amber-950/80 border border-amber-800/60 rounded text-amber-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        {selectedFeature.properties.assetType} INSPECTOR
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {(selectedFeature.id || '').slice(0, 18)}...
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Pole Details */}
                {selectedFeature.properties.assetType === 'POLE' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        External Pole Code
                      </span>
                      <span className="font-mono text-sm font-bold text-white">
                        {selectedFeature.properties.externalCode}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded space-y-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Command State Verification
                      </span>
                      <StateComparison
                        desiredOn={selectedFeature.properties.desiredOn}
                        reportedOn={selectedFeature.properties.reportedOn}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Luminaire</span>
                        <span className="text-amber-400 font-bold">
                          {selectedFeature.properties.wattage || 70}W LED
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Pole Height</span>
                        <span className="text-white font-bold">
                          {selectedFeature.properties.heightMeters || 8.5}m
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Feeder Panel Association
                      </span>
                      <span className="text-slate-200 font-medium">
                        {selectedFeature.properties.feederName || 'Direct CCMS Connection'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Device Virtual Identity
                      </span>
                      <span className="text-sky-400 font-mono text-[11px]">
                        {selectedFeature.properties.deviceExternalId || 'SIM-DEV-UNASSIGNED'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        WGS-84 Coordinates
                      </span>
                      <span className="text-slate-300 font-mono text-[11px] block">
                        Lat: {selectedFeature.geometry.coordinates[1].toFixed(5)}° N
                      </span>
                      <span className="text-slate-300 font-mono text-[11px] block">
                        Lng: {selectedFeature.geometry.coordinates[0].toFixed(5)}° E
                      </span>
                    </div>
                  </div>
                )}

                {/* Feeder Details */}
                {selectedFeature.properties.assetType === 'FEEDER' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Feeder Name
                      </span>
                      <span className="text-sm font-bold text-white">
                        {selectedFeature.properties.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Panel Code</span>
                        <span className="text-emerald-400 font-bold">
                          {selectedFeature.properties.panelCode}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Capacity</span>
                        <span className="text-white font-bold">
                          {selectedFeature.properties.capacityKw} kW
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Phase Configuration
                      </span>
                      <span className="text-slate-200 font-mono">
                        {selectedFeature.properties.phase || '3-PHASE'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Utility Meter Number
                      </span>
                      <span className="text-slate-300 font-mono">
                        {selectedFeature.properties.meterNumber || 'UNMETERED'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        WGS-84 Coordinates
                      </span>
                      <span className="text-slate-300 font-mono text-[11px] block">
                        Lat: {selectedFeature.geometry.coordinates[1].toFixed(5)}° N
                      </span>
                      <span className="text-slate-300 font-mono text-[11px] block">
                        Lng: {selectedFeature.geometry.coordinates[0].toFixed(5)}° E
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector Footer Actions */}
              <div className="pt-4 border-t border-slate-800 text-xs">
                <a
                  href="/assets"
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center block transition-colors"
                >
                  Manage in Asset Hierarchy &rarr;
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL: Raw GeoJSON FeatureCollection Inspector --- */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-400" />
                RFC 7946 GeoJSON FeatureCollection
              </h3>
              <button onClick={() => setShowJsonModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Features count: {geoData?.features.length || 0}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(geoData, null, 2));
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded border border-slate-700"
                >
                  Copy to Clipboard
                </button>
              </div>

              <textarea
                readOnly
                rows={16}
                value={JSON.stringify(geoData, null, 2)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded text-slate-300 font-mono text-[11px] focus:outline-none"
              />

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
