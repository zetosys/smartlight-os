'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type * as LeafletType from 'leaflet';
import { GisFeature, GisFeatureProperties } from './page';
import {
  Layers,
  Radio,
  Zap,
  Eye,
  Activity,
  Maximize2,
  Power,
  Wrench,
  Navigation,
  Compass,
  MapPin,
} from 'lucide-react';

interface LeafletOsmMapProps {
  features: GisFeature[];
  allFeatures: GisFeature[];
  selectedFeature: GisFeature | null;
  onSelectFeature: (feature: GisFeature) => void;
  onSwitchPole: (feature: GisFeature, targetState: boolean) => void;
  onOpenWorkOrder: (feature: GisFeature) => void;
  centerCoords: { lat: number; lng: number; centerName: string };
  ulbCode?: string;
  showHalos: boolean;
  showPhaseLines: boolean;
  showZones: boolean;
  showLoraLinks: boolean;
  actionPending?: boolean;
}

type TileLayerKey = 'osm_standard' | 'satellite';

const TILE_LAYERS: Record<
  TileLayerKey,
  { name: string; url: string; attribution: string; maxZoom: number; subdomains?: string[] }
> = {
  osm_standard: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
};

const escapeHtml = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getFeaturePoint = (feature: GisFeature): [number, number] => {
  const geom = feature.geometry;
  if (geom.type === 'Point') {
    return [geom.coordinates[1], geom.coordinates[0]]; // [lat, lng]
  }
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return [0, 0];
  const sumLng = ring.reduce((acc, c) => acc + c[0], 0);
  const sumLat = ring.reduce((acc, c) => acc + c[1], 0);
  return [sumLat / ring.length, sumLng / ring.length]; // [lat, lng]
};

export default function LeafletOsmMap({
  features,
  allFeatures,
  selectedFeature,
  onSelectFeature,
  onSwitchPole,
  onOpenWorkOrder,
  centerCoords,
  ulbCode,
  showHalos,
  showPhaseLines,
  showZones,
  showLoraLinks,
  actionPending,
}: LeafletOsmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletType.Map | null>(null);
  const LRef = useRef<typeof LeafletType | null>(null);

  const [activeTileKey, setActiveTileKey] = useState<TileLayerKey>('osm_standard');
  const [mapReady, setMapReady] = useState<boolean>(false);

  // Layer groups refs to easily clear and re-render without tearing down the entire map
  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);
  const zonesLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const loraLinesLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const loraCirclesLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const circuitLinesLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const feedersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const gatewaysLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const polesLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const selectionMarkerRef = useRef<LeafletType.CircleMarker | null>(null);

  // Initialize Map on mount
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !containerRef.current) return;
      LRef.current = L;

      // Create Map instance
      const map = L.map(containerRef.current, {
        center: [centerCoords.lat, centerCoords.lng],
        zoom: 15,
        zoomControl: false, // We'll add custom positioned zoom control
        attributionControl: true,
        preferCanvas: true,
      });

      // Add Zoom control at top-left
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Add Tile Layer
      const cfg = activeTileKey === 'satellite' ? TILE_LAYERS.satellite : TILE_LAYERS.osm_standard;
      const tileLayer = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
        subdomains: cfg.subdomains || 'abc',
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Initialize Layer Groups in proper z-order
      zonesLayerRef.current = L.layerGroup().addTo(map);
      loraCirclesLayerRef.current = L.layerGroup().addTo(map);
      loraLinesLayerRef.current = L.layerGroup().addTo(map);
      circuitLinesLayerRef.current = L.layerGroup().addTo(map);
      feedersLayerRef.current = L.layerGroup().addTo(map);
      gatewaysLayerRef.current = L.layerGroup().addTo(map);
      polesLayerRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;
      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Handle Tile Layer Switch
  const switchTileLayer = useCallback((key: TileLayerKey) => {
    setActiveTileKey(key);
    if (!mapRef.current || !LRef.current) return;

    const L = LRef.current;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const cfg = key === 'satellite' ? TILE_LAYERS.satellite : TILE_LAYERS.osm_standard;
    const newTile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains || 'abc',
    }).addTo(mapRef.current);

    // Bring tile to back so vectors stay on top
    newTile.bringToBack();
    tileLayerRef.current = newTile;
  }, []);

  // Fit bounds to current features or center
  const fitFleetBounds = useCallback(() => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;

    const pts = features.filter((f) => f.geometry.type === 'Point');
    if (pts.length > 0) {
      const latLngs = pts.map((p) => getFeaturePoint(p));
      const bounds = L.latLngBounds(latLngs);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true });
    } else {
      mapRef.current.setView([centerCoords.lat, centerCoords.lng], 15, { animate: true });
    }
  }, [features, centerCoords]);

  // Center change when ULB changes
  useEffect(() => {
    if (mapRef.current) {
      fitFleetBounds();
    }
  }, [centerCoords.lat, centerCoords.lng]);

  // Render & Update Vector Features
  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;

    // Clear previous layers
    zonesLayerRef.current?.clearLayers();
    loraCirclesLayerRef.current?.clearLayers();
    loraLinesLayerRef.current?.clearLayers();
    circuitLinesLayerRef.current?.clearLayers();
    feedersLayerRef.current?.clearLayers();
    gatewaysLayerRef.current?.clearLayers();
    polesLayerRef.current?.clearLayers();

    const poles = features.filter((f) => f.properties.assetType === 'POLE');
    const feeders = features.filter((f) => f.properties.assetType === 'FEEDER');
    const gateways = features.filter((f) => f.properties.assetType === 'GATEWAY');
    const zones = features.filter((f) => f.properties.assetType === 'ZONE');

    // 1. Administrative Municipal Zones (GeoJSON Polygons)
    if (showZones && zonesLayerRef.current) {
      zones.forEach((z) => {
        if (z.geometry.type === 'Polygon') {
          const latLngs = z.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
          const polygon = L.polygon(latLngs, {
            color: '#38bdf8',
            weight: 1.5,
            dashArray: '5, 5',
            fillColor: '#0284c7',
            fillOpacity: 0.08,
          });

          polygon.bindTooltip(
            `<div class="font-mono text-xs font-bold text-sky-300">📍 ${z.properties.name || z.properties.code || 'Municipal Zone'}</div>`,
            { sticky: true, opacity: 0.95 },
          );

          polygon.on('click', () => onSelectFeature(z));
          zonesLayerRef.current?.addLayer(polygon);
        }
      });
    }

    // 2. LoRa Micro-Gateways & Coverage Bubbles (45-Device Micro-Clusters)
    gateways.forEach((gw) => {
      const latLng = getFeaturePoint(gw);

      // 500m RF Coverage Bubble
      if (showLoraLinks && loraCirclesLayerRef.current) {
        const circle = L.circle(latLng, {
          radius: 500, // 500m realistic urban coverage radius
          color: '#a855f7',
          weight: 1.2,
          dashArray: '4, 4',
          fillColor: '#9333ea',
          fillOpacity: 0.07,
        });
        circle.bindTooltip(
          `<div class="font-mono text-[11px] text-purple-300">📡 LoRa 500m RF Coverage: <strong>${gw.properties.externalCode || gw.id}</strong></div>`,
          { sticky: true, opacity: 0.9 },
        );
        loraCirclesLayerRef.current.addLayer(circle);
      }

      // Gateway Custom DivIcon
      const gwIcon = L.divIcon({
        className: 'custom-gw-marker',
        html: `
          <div class="relative group cursor-pointer flex items-center justify-center">
            <div class="w-8 h-8 rounded-lg bg-slate-950 border-2 border-purple-500 shadow-lg shadow-purple-500/30 flex items-center justify-center text-purple-300 hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
              </svg>
            </div>
            <div class="absolute -bottom-4 px-1.5 py-0.2 bg-purple-950/90 border border-purple-500/50 rounded text-[9px] font-mono font-bold text-purple-300 whitespace-nowrap shadow pointer-events-none">
              ${gw.properties.externalCode || 'GW'}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(latLng, { icon: gwIcon });

      const popupHtml = `
        <div class="p-3 text-xs font-sans space-y-2 min-w-[240px]">
          <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
            <span class="font-bold text-white flex items-center gap-1.5 font-mono">
              <span class="w-2 h-2 rounded-full bg-purple-400"></span>
              ${gw.properties.externalCode || gw.id}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              MICRO-GATEWAY
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div><span class="text-slate-400 block text-[10px]">LoRa Nodes:</span><strong class="text-white">${gw.properties.connectedDevicesCount || 45} / 45</strong></div>
            <div><span class="text-slate-400 block text-[10px]">Frequency:</span><strong class="text-purple-300">865–867 MHz</strong></div>
            <div><span class="text-slate-400 block text-[10px]">Backhaul:</span><strong class="text-emerald-400">4G LTE-M</strong></div>
            <div><span class="text-slate-400 block text-[10px]">Duty Cycle:</span><strong class="text-sky-300">0.38% (Met)</strong></div>
          </div>
          <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Avg RSSI: <strong class="text-emerald-400">-88 dBm</strong></span>
            <span>SNR: <strong class="text-emerald-400">+9.4 dB</strong></span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => onSelectFeature(gw));
      gatewaysLayerRef.current?.addLayer(marker);

      // Draw LoRa Star Topology Radio Beams to child streetlight nodes
      if (showLoraLinks && loraLinesLayerRef.current) {
        const childPoles = allFeatures.filter(
          (p) =>
            p.properties.assetType === 'POLE' &&
            (p.properties.gatewayExternalCode === gw.properties.externalCode ||
              p.properties.gatewayId === gw.id),
        );

        childPoles.forEach((cp) => {
          const cpLatLng = getFeaturePoint(cp);
          const line = L.polyline([latLng, cpLatLng], {
            color: '#c084fc',
            weight: 1.1,
            opacity: 0.35,
            dashArray: '3, 4',
          });
          loraLinesLayerRef.current?.addLayer(line);
        });
      }
    });

    // 3. CCMS Feeder Panels & Circuit Lines
    feeders.forEach((feeder) => {
      const latLng = getFeaturePoint(feeder);

      const fdrIcon = L.divIcon({
        className: 'custom-feeder-marker',
        html: `
          <div class="relative group cursor-pointer flex items-center justify-center">
            <div class="w-8 h-8 rounded-lg bg-slate-950 border-2 border-emerald-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-emerald-400 hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div class="absolute -bottom-4 px-1.5 py-0.2 bg-emerald-950/90 border border-emerald-500/50 rounded text-[9px] font-mono font-bold text-emerald-300 whitespace-nowrap shadow pointer-events-none">
              ${feeder.properties.panelCode || 'CCMS'}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(latLng, { icon: fdrIcon });

      const popupHtml = `
        <div class="p-3 text-xs font-sans space-y-2 min-w-[240px]">
          <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
            <span class="font-bold text-white flex items-center gap-1.5 font-mono">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              ${feeder.properties.panelCode || feeder.properties.name}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              CCMS PANEL
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div><span class="text-slate-400 block text-[10px]">Capacity:</span><strong class="text-white">${feeder.properties.capacityKw || 30} kW</strong></div>
            <div><span class="text-slate-400 block text-[10px]">Connected Poles:</span><strong class="text-amber-400">${feeder.properties.connectedLuminairesCount || 26}</strong></div>
            <div><span class="text-slate-400 block text-[10px]">Active Load:</span><strong class="text-emerald-400">${(feeder.properties.activeLoadKw || 1.8).toFixed(1)} kW</strong></div>
            <div><span class="text-slate-400 block text-[10px]">Energy Meter:</span><strong class="text-slate-300">${feeder.properties.meterNumber || 'MTR-1001'}</strong></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => onSelectFeature(feeder));
      feedersLayerRef.current?.addLayer(marker);

      // Feeder Circuit Distribution Lines to connected poles
      if (showPhaseLines && circuitLinesLayerRef.current) {
        const childPoles = allFeatures.filter(
          (p) =>
            p.properties.assetType === 'POLE' &&
            (p.properties.feederPanelCode === feeder.properties.panelCode ||
              p.properties.feederId === feeder.id),
        );

        childPoles.forEach((cp) => {
          const cpLatLng = getFeaturePoint(cp);
          const phase = cp.properties.phaseConnection || 'R';
          const phaseColor = phase === 'R' ? '#ef4444' : phase === 'Y' ? '#f59e0b' : '#38bdf8';

          const line = L.polyline([latLng, cpLatLng], {
            color: phaseColor,
            weight: 1.4,
            opacity: 0.5,
          });
          circuitLinesLayerRef.current?.addLayer(line);
        });
      }
    });

    // 4. Streetlight Poles with Luminaire Halos, Phase Colors, and Quick Commands
    poles.forEach((pole) => {
      const latLng = getFeaturePoint(pole);
      const isReportedOn = !!pole.properties.reportedOn;
      const phase = pole.properties.phaseConnection || 'R';
      const isFault =
        pole.properties.status === 'critical_fault' ||
        pole.properties.status === 'major_fault' ||
        pole.properties.status === 'warning';
      const isOffline = pole.properties.status === 'comm_loss';

      const phaseColor = phase === 'R' ? '#ef4444' : phase === 'Y' ? '#f59e0b' : '#38bdf8';
      const wattage = pole.properties.wattage || 70;
      const markerSize = wattage === 110 ? 18 : wattage === 70 ? 15 : 13;

      // Glow Halo effect when light is illuminated (ON)
      const haloStyle =
        showHalos && isReportedOn
          ? `box-shadow: 0 0 16px 5px rgba(245, 158, 11, 0.85);`
          : isFault
          ? `box-shadow: 0 0 14px 4px rgba(239, 68, 68, 0.85);`
          : '';

      const poleIcon = L.divIcon({
        className: 'custom-pole-marker',
        html: `
          <div class="relative cursor-pointer flex items-center justify-center" style="width: ${markerSize + 8}px; height: ${markerSize + 8}px;">
            ${
              showHalos && isReportedOn
                ? `<div class="absolute inset-0 rounded-full luminaire-halo bg-amber-400/30"></div>`
                : ''
            }
            ${
              isFault
                ? `<div class="absolute inset-0 rounded-full fault-ring bg-rose-500/40"></div>`
                : ''
            }
            <div
              class="rounded-full flex items-center justify-center transition-all ${
                isReportedOn
                  ? 'bg-amber-300 border-2 border-white text-slate-950 font-bold'
                  : isFault
                  ? 'bg-rose-600 border-2 border-white text-white'
                  : isOffline
                  ? 'bg-slate-700 border-2 border-slate-500 opacity-60'
                  : 'bg-slate-900 border-2'
              }"
              style="width: ${markerSize}px; height: ${markerSize}px; border-color: ${
                isReportedOn ? '#fef08a' : phaseColor
              }; ${haloStyle}"
            >
              <div class="w-1.5 h-1.5 rounded-full" style="background-color: ${
                isReportedOn ? '#b45309' : phaseColor
              }"></div>
            </div>
          </div>
        `,
        iconSize: [markerSize + 8, markerSize + 8],
        iconAnchor: [(markerSize + 8) / 2, (markerSize + 8) / 2],
      });

      const marker = L.marker(latLng, { icon: poleIcon });

      // Hover Tooltip
      marker.bindTooltip(
        `
        <div class="font-mono text-[11px] space-y-0.5">
          <div class="font-bold text-white flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" style="background-color: ${phaseColor}"></span>
            ${pole.properties.externalCode || pole.id}
          </div>
          <div class="text-[10px] text-slate-300">Phase ${phase} | ${wattage}W | ${
          isReportedOn ? '💡 ILLUMINATED' : isFault ? '⚠️ FAULT' : 'STANDBY'
        }</div>
        </div>
      `,
        { sticky: true, opacity: 0.95 },
      );

      // Interactive Popup with Real-Time Telemetry and Direct Switching
      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-3 text-xs font-sans space-y-2.5 min-w-[260px]';
      const safeCode = escapeHtml(pole.properties.externalCode || pole.id);
      const safeId = escapeHtml(pole.id?.slice(0, 16));
      const safePhaseColor = escapeHtml(phaseColor);
      const safePhase = escapeHtml(phase);
      const safeWattage = escapeHtml(wattage);
      const safeVoltage = escapeHtml(pole.properties.voltage || 228.4);
      const safeCurrent = escapeHtml(pole.properties.currentAmps || 0.31);
      const safeFeeder = escapeHtml(pole.properties.feederPanelCode || 'FP-01');
      const safeGateway = escapeHtml(pole.properties.gatewayExternalCode || 'GW-01');
      const safePoleId = escapeHtml(pole.id);

      popupDiv.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-700/80 pb-2">
          <div>
            <div class="font-bold text-white font-mono text-xs flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${safePhaseColor}"></span>
              ${safeCode}
            </div>
            <div class="text-[10px] text-slate-400 font-mono">Asset ID: ${safeId}...</div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
            isReportedOn
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : isFault
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }">
            ${isReportedOn ? 'ON (ACTIVE)' : isFault ? 'FAULT' : 'OFF (STANDBY)'}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div class="p-1.5 bg-slate-950/80 rounded border border-slate-800">
            <span class="text-slate-400 block text-[9px]">Phase Line</span>
            <strong style="color: ${safePhaseColor}">Phase ${safePhase} (415V)</strong>
          </div>
          <div class="p-1.5 bg-slate-950/80 rounded border border-slate-800">
            <span class="text-slate-400 block text-[9px]">Luminaire</span>
            <strong class="text-amber-300">${safeWattage}W LED</strong>
          </div>
          <div class="p-1.5 bg-slate-950/80 rounded border border-slate-800">
            <span class="text-slate-400 block text-[9px]">RMS Voltage</span>
            <strong class="text-white">${safeVoltage} V</strong>
          </div>
          <div class="p-1.5 bg-slate-950/80 rounded border border-slate-800">
            <span class="text-slate-400 block text-[9px]">Current / PF</span>
            <strong class="text-emerald-400">${safeCurrent}A / 0.98</strong>
          </div>
        </div>

        <div class="text-[10px] text-slate-400 font-mono space-y-0.5 border-t border-slate-800 pt-1.5">
          <div class="flex justify-between">
            <span>Feeder Panel:</span>
            <span class="text-emerald-400 font-bold">${safeFeeder}</span>
          </div>
          <div class="flex justify-between">
            <span>LoRa Gateway:</span>
            <span class="text-purple-300 font-bold">${safeGateway}</span>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800 flex items-center gap-2">
          <button id="btn-toggle-${safePoleId}" class="flex-1 py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
            isReportedOn
              ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80'
              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80'
          }">
            <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
            <span>${isReportedOn ? 'Switch OFF' : 'Switch ON'}</span>
          </button>
          <button id="btn-inspect-${safePoleId}" class="px-2.5 py-1.5 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition" title="Inspect telemetry & details in side panel">
            Inspect
          </button>
        </div>
      `;

      // Attach event listeners when popup opens
      marker.bindPopup(popupDiv);
      marker.on('popupopen', () => {
        onSelectFeature(pole);
        const toggleBtn = popupDiv.querySelector<HTMLButtonElement>(`#btn-toggle-${pole.id}`);
        if (toggleBtn) {
          toggleBtn.onclick = () => {
            onSwitchPole(pole, !isReportedOn);
            marker.closePopup();
          };
        }
        const inspectBtn = popupDiv.querySelector<HTMLButtonElement>(`#btn-inspect-${pole.id}`);
        if (inspectBtn) {
          inspectBtn.onclick = () => {
            onSelectFeature(pole);
          };
        }
      });

      marker.on('click', () => onSelectFeature(pole));
      polesLayerRef.current?.addLayer(marker);
    });

    // 5. Selected Feature Highlight Circle
    if (selectedFeature && selectionMarkerRef.current) {
      map.removeLayer(selectionMarkerRef.current);
      selectionMarkerRef.current = null;
    }

    if (selectedFeature) {
      const selLatLng = getFeaturePoint(selectedFeature);
      const selCircle = L.circleMarker(selLatLng, {
        radius: 18,
        color: '#f59e0b',
        weight: 2.5,
        fillColor: '#f59e0b',
        fillOpacity: 0.15,
        dashArray: '3, 3',
      }).addTo(map);
      selectionMarkerRef.current = selCircle;
    }
  }, [
    mapReady,
    features,
    allFeatures,
    showHalos,
    showPhaseLines,
    showZones,
    showLoraLinks,
    selectedFeature,
    onSelectFeature,
    onSwitchPole,
    onOpenWorkOrder,
  ]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Floating Map Controls (Tile Switcher, Recenter, Layer Quick Toggles) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Base Tile Layer Switcher */}
        <div className="flex items-center bg-slate-900/95 border border-slate-700/80 rounded-lg p-1 shadow-2xl backdrop-blur font-mono text-xs">
          {(['osm_standard', 'satellite'] as const).map((key) => (
            <button
              key={key}
              onClick={() => switchTileLayer(key)}
              className={`px-3 py-1 rounded text-[11px] font-bold transition flex items-center gap-1.5 ${
                activeTileKey === key
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {key === 'osm_standard' ? 'OpenStreetMap' : 'Satellite'}
            </button>
          ))}
        </div>

        {/* Fit / Recenter Button */}
        <button
          onClick={fitFleetBounds}
          className="px-3 py-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg shadow-xl text-xs font-mono font-semibold flex items-center gap-1.5 backdrop-blur transition"
          title="Fit view to all streetlight poles in fleet"
        >
          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Fit Fleet</span>
        </button>
      </div>

      {/* Floating Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/95 border border-slate-700/80 rounded-lg px-3 py-2 shadow-2xl backdrop-blur font-mono text-[10px] space-y-1.5 pointer-events-auto">
        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-amber-400" /> GIS Map Legend
          </span>
          <span className="text-amber-400">{ulbCode || 'WGS 84'}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Phase R (415V)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Phase Y (415V)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Phase B (415V)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_8px_#f59e0b]"></span>
            <span>Light ON (Halo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
            <span>CCMS Feeder Panel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-500"></span>
            <span>LoRa Micro-Gateway</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map DOM Container */}
      <div ref={containerRef} className="w-full h-full z-0" />
    </div>
  );
}
