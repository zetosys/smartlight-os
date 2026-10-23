'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Power,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Activity,
  Filter,
  Check,
  Compass,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import { GeoJsonFeatureCollection, GeoJsonFeature, GeoJsonGeometry } from '@smartlight/shared-types';

export interface GisFeatureProperties {
  assetType: 'POLE' | 'FEEDER' | 'GATEWAY' | 'ZONE';
  id?: string;
  externalCode?: string;
  name?: string;
  code?: string;
  panelCode?: string;
  capacityKw?: number;
  meterNumber?: string;
  phase?: string;
  phaseConnection?: 'R' | 'Y' | 'B';
  wattage?: number;
  heightMeters?: number;
  lampType?: string;
  feederId?: string;
  feederName?: string;
  feederPanelCode?: string;
  deviceExternalId?: string;
  ipAddress?: string;
  isOnline?: boolean;
  reportedOn?: boolean;
  desiredOn?: boolean;
  status?: 'online_on' | 'online_off' | 'critical_fault' | 'major_fault' | 'warning' | 'comm_loss' | 'healthy' | 'online' | 'offline';
  activeAlertCount?: number;
  activeAlertSeverity?: string | null;
  activeAlertCode?: string | null;
  connectedLuminairesCount?: number;
  activeLuminairesCount?: number;
  activeLoadKw?: number;
  voltage?: number;
  currentAmps?: number;
  powerFactor?: number;
  temperatureC?: number;
}

export type GisFeature = GeoJsonFeature<GisFeatureProperties>;
export type GisFeatureCollection = GeoJsonFeatureCollection<GisFeatureProperties>;

const getPointCoords = (geometry: GeoJsonGeometry): [number, number] => {
  if (geometry.type === 'Point') {
    return geometry.coordinates;
  }
  const ring = geometry.coordinates[0];
  if (!ring || ring.length === 0) return [0, 0];
  const sumLng = ring.reduce((acc, c) => acc + c[0], 0);
  const sumLat = ring.reduce((acc, c) => acc + c[1], 0);
  return [sumLng / ring.length, sumLat / ring.length];
};

export default function GisPage() {
  const { selectedUlb } = useUlb();
  const [geoData, setGeoData] = useState<GisFeatureCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fullFleetLoaded, setFullFleetLoaded] = useState<boolean>(false);
  const [seedingFleet, setSeedingFleet] = useState<boolean>(false);

  // Layer & Visual Filter States
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'poles' | 'feeders' | 'gateways' | 'zones'>('all');
  const [phaseFilter, setPhaseFilter] = useState<'ALL' | 'R' | 'Y' | 'B'>('ALL');
  const [wattageFilter, setWattageFilter] = useState<'ALL' | '35' | '70' | '110'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON' | 'OFF' | 'FAULT' | 'OFFLINE'>('ALL');
  const [selectedFeederCircuit, setSelectedFeederCircuit] = useState<string>('ALL');

  // Visualization Toggles
  const [showHalos, setShowHalos] = useState<boolean>(true);
  const [showPhaseLines, setShowPhaseLines] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);

  // Inspector & Modal States
  const [selectedFeature, setSelectedFeature] = useState<GisFeature | null>(null);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState<boolean>(false);
  const [workOrderTitle, setWorkOrderTitle] = useState<string>('');
  const [workOrderDescription, setWorkOrderDescription] = useState<string>('');
  const [workOrderPriority, setWorkOrderPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionPending, setActionPending] = useState<boolean>(false);

  // Canvas Viewport Transformation (Pan & Zoom)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const ulbCoords = useMemo(() => {
    return selectedUlb?.code === 'ULB-GBL'
      ? { lat: 34.2165, lng: 74.7725, centerName: 'Ganderbal Town Center (NH-1D & Beehama)', targetFleet: 2740 }
      : { lat: 32.9925, lng: 74.9318, centerName: 'Katra Shrine Base (Banganga Corridor)', targetFleet: 1868 };
  }, [selectedUlb]);

  // Load GeoJSON from API
  const loadGeoJson = useCallback(async () => {
    setLoading(true);
    try {
      const ulbQuery = selectedUlb?.id ? `ulbId=${selectedUlb.id}&` : '';
      const layerParam = selectedLayer === 'all' ? (showZones ? 'all,zones' : 'all') : selectedLayer;
      const data = await ApiClient.fetch<GisFeatureCollection>(
        `assets/geojson?${ulbQuery}type=${layerParam}`,
      );
      setGeoData(data);
      if (data.features.length > 50) {
        setFullFleetLoaded(true);
      }
      if (data.features.length > 0 && !selectedFeature) {
        setSelectedFeature(data.features[0]);
      }
    } catch {
      // Offline fallback dataset for development or isolated preview
      const isGbl = selectedUlb?.code === 'ULB-GBL';
      const fallbackFeatures: GisFeature[] = isGbl
        ? [
            {
              type: 'Feature',
              id: '90000000-0000-0000-0000-000000000001',
              geometry: { type: 'Point', coordinates: [74.7721, 34.2168] },
              properties: {
                assetType: 'POLE',
                id: '90000000-0000-0000-0000-000000000001',
                externalCode: 'GBL-POLE-001',
                wattage: 110,
                heightMeters: 9.0,
                lampType: 'LED',
                feederName: 'Feeder Panel FP-01 Beehama',
                feederPanelCode: 'GBL-FP-01',
                phaseConnection: 'R',
                deviceExternalId: 'SIM-GBL-0001',
                isOnline: true,
                reportedOn: true,
                desiredOn: true,
                status: 'online_on',
                voltage: 228.4,
                currentAmps: 0.49,
                powerFactor: 0.98,
                temperatureC: 38.5,
              },
            },
            {
              type: 'Feature',
              id: '90000000-0000-0000-0000-000000000002',
              geometry: { type: 'Point', coordinates: [74.7728, 34.217] },
              properties: {
                assetType: 'POLE',
                id: '90000000-0000-0000-0000-000000000002',
                externalCode: 'GBL-POLE-002',
                wattage: 70,
                heightMeters: 8.5,
                lampType: 'LED',
                feederName: 'Feeder Panel FP-01 Beehama',
                feederPanelCode: 'GBL-FP-01',
                phaseConnection: 'Y',
                deviceExternalId: 'SIM-GBL-0002',
                isOnline: true,
                reportedOn: false,
                desiredOn: false,
                status: 'online_off',
                voltage: 230.1,
                currentAmps: 0.0,
                powerFactor: 0.0,
                temperatureC: 24.2,
              },
            },
            {
              type: 'Feature',
              id: '90000000-0000-0000-0000-000000000003',
              geometry: { type: 'Point', coordinates: [74.7735, 34.2175] },
              properties: {
                assetType: 'POLE',
                id: '90000000-0000-0000-0000-000000000003',
                externalCode: 'GBL-POLE-003',
                wattage: 35,
                heightMeters: 7.5,
                lampType: 'LED',
                feederName: 'Feeder Panel FP-01 Beehama',
                feederPanelCode: 'GBL-FP-01',
                phaseConnection: 'B',
                deviceExternalId: 'SIM-GBL-0003',
                isOnline: false,
                reportedOn: false,
                desiredOn: false,
                status: 'comm_loss',
                voltage: 0.0,
                currentAmps: 0.0,
                powerFactor: 0.0,
                temperatureC: 18.0,
              },
            },
            {
              type: 'Feature',
              id: '80000000-0000-0000-0000-000000000001',
              geometry: { type: 'Point', coordinates: [74.7725, 34.2165] },
              properties: {
                assetType: 'FEEDER',
                id: '80000000-0000-0000-0000-000000000001',
                name: 'Feeder Panel FP-01 Beehama',
                panelCode: 'GBL-FP-01',
                capacityKw: 30.0,
                meterNumber: 'JKPDD-MTR-90812',
                phase: '3-PHASE',
                connectedLuminairesCount: 78,
                activeLuminairesCount: 65,
                activeLoadKw: 5.4,
                status: 'healthy',
              },
            },
            {
              type: 'Feature',
              id: '85000000-0000-0000-0000-000000000001',
              geometry: { type: 'Point', coordinates: [74.7724, 34.2164] },
              properties: {
                assetType: 'GATEWAY',
                id: '85000000-0000-0000-0000-000000000001',
                externalCode: 'GW-GBL-01',
                name: 'CCMS Gateway 01 Beehama',
                ipAddress: '10.14.20.101',
                isOnline: true,
                status: 'online',
              },
            },
            {
              type: 'Feature',
              id: 'zone-gbl-01',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [74.755, 34.205],
                    [74.79, 34.205],
                    [74.79, 34.228],
                    [74.755, 34.228],
                    [74.755, 34.205],
                  ],
                ],
              },
              properties: {
                assetType: 'ZONE',
                id: 'zone-gbl-01',
                code: 'GBL-Z1',
                name: 'Zone 1 - Main Town & Beehama',
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
                id: '90000000-0000-0000-0000-000000000004',
                externalCode: 'KTR-POLE-001',
                wattage: 70,
                heightMeters: 8.5,
                lampType: 'LED',
                feederName: 'Feeder Panel FP-01 Katra Banganga',
                feederPanelCode: 'KTR-FP-01',
                phaseConnection: 'R',
                deviceExternalId: 'SIM-KTR-0001',
                isOnline: true,
                reportedOn: true,
                desiredOn: true,
                status: 'online_on',
                voltage: 228.1,
                currentAmps: 0.31,
                powerFactor: 0.98,
                temperatureC: 37.8,
              },
            },
            {
              type: 'Feature',
              id: '90000000-0000-0000-0000-000000000005',
              geometry: { type: 'Point', coordinates: [74.9325, 32.9935] },
              properties: {
                assetType: 'POLE',
                id: '90000000-0000-0000-0000-000000000005',
                externalCode: 'KTR-POLE-002',
                wattage: 35,
                heightMeters: 7.5,
                lampType: 'LED',
                feederName: 'Feeder Panel FP-01 Katra Banganga',
                feederPanelCode: 'KTR-FP-01',
                phaseConnection: 'Y',
                deviceExternalId: 'SIM-KTR-0002',
                isOnline: true,
                reportedOn: false,
                desiredOn: false,
                status: 'online_off',
                voltage: 230.2,
                currentAmps: 0.0,
                powerFactor: 0.0,
                temperatureC: 22.4,
              },
            },
            {
              type: 'Feature',
              id: '80000000-0000-0000-0000-000000000002',
              geometry: { type: 'Point', coordinates: [74.9318, 32.9925] },
              properties: {
                assetType: 'FEEDER',
                id: '80000000-0000-0000-0000-000000000002',
                name: 'Feeder Panel FP-01 Katra Banganga',
                panelCode: 'KTR-FP-01',
                capacityKw: 30.0,
                meterNumber: 'JKPDD-MTR-81723',
                phase: '3-PHASE',
                connectedLuminairesCount: 72,
                activeLuminairesCount: 60,
                activeLoadKw: 4.8,
                status: 'healthy',
              },
            },
            {
              type: 'Feature',
              id: '85000000-0000-0000-0000-000000000002',
              geometry: { type: 'Point', coordinates: [74.9317, 32.9924] },
              properties: {
                assetType: 'GATEWAY',
                id: '85000000-0000-0000-0000-000000000002',
                externalCode: 'GW-KTR-01',
                name: 'CCMS Gateway 01 Katra',
                ipAddress: '10.14.30.101',
                isOnline: true,
                status: 'online',
              },
            },
            {
              type: 'Feature',
              id: 'zone-ktr-01',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [74.915, 32.98],
                    [74.945, 32.98],
                    [74.945, 33.008],
                    [74.915, 33.008],
                    [74.915, 32.98],
                  ],
                ],
              },
              properties: {
                assetType: 'ZONE',
                id: 'zone-ktr-01',
                code: 'KTR-Z1',
                name: 'Zone 1 - Shrine Base & Banganga Track',
              },
            },
          ];

      setGeoData({ type: 'FeatureCollection', features: fallbackFeatures });
      if (fallbackFeatures.length > 0) {
        setSelectedFeature(fallbackFeatures[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedUlb, selectedLayer, showZones]);

  useEffect(() => {
    loadGeoJson();
  }, [loadGeoJson]);

  // Seed full fleet in memory via Simulator endpoint
  const handleSeedFullFleet = async () => {
    setSeedingFleet(true);
    try {
      await ApiClient.fetch('simulator/seed-fleet', {
        method: 'POST',
        body: JSON.stringify({ seed: 365 }),
      });
      setFullFleetLoaded(true);
      await loadGeoJson();
      setActionMessage({
        text: `Full municipal fleet of ${ulbCoords.targetFleet} streetlights loaded into GIS spatial layer.`,
        type: 'success',
      });
    } catch (e: any) {
      setActionMessage({ text: `Fleet Seeding failed: ${e.message}`, type: 'error' });
    } finally {
      setSeedingFleet(false);
      setTimeout(() => setActionMessage(null), 6000);
    }
  };

  // Filter features based on active user filters
  const filteredFeatures = useMemo(() => {
    if (!geoData) return [];

    return geoData.features.filter((f) => {
      // Layer filter
      if (selectedLayer !== 'all') {
        if (selectedLayer === 'poles' && f.properties.assetType !== 'POLE') return false;
        if (selectedLayer === 'feeders' && f.properties.assetType !== 'FEEDER') return false;
        if (selectedLayer === 'gateways' && f.properties.assetType !== 'GATEWAY') return false;
        if (selectedLayer === 'zones' && f.properties.assetType !== 'ZONE') return false;
      }

      // Zone visibility toggle
      if (!showZones && f.properties.assetType === 'ZONE') return false;

      // Pole-specific filters
      if (f.properties.assetType === 'POLE') {
        // Feeder circuit isolation
        if (
          selectedFeederCircuit !== 'ALL' &&
          f.properties.feederPanelCode !== selectedFeederCircuit
        ) {
          return false;
        }

        // Phase filter
        if (phaseFilter !== 'ALL' && f.properties.phaseConnection !== phaseFilter) {
          return false;
        }

        // Wattage filter
        if (wattageFilter !== 'ALL' && String(f.properties.wattage) !== wattageFilter) {
          return false;
        }

        // Status filter
        if (statusFilter === 'ON' && !f.properties.reportedOn) return false;
        if (statusFilter === 'OFF' && f.properties.reportedOn) return false;
        if (
          statusFilter === 'FAULT' &&
          f.properties.status !== 'critical_fault' &&
          f.properties.status !== 'major_fault' &&
          f.properties.status !== 'warning'
        ) {
          return false;
        }
        if (statusFilter === 'OFFLINE' && f.properties.status !== 'comm_loss') return false;
      }

      return true;
    });
  }, [
    geoData,
    selectedLayer,
    phaseFilter,
    wattageFilter,
    statusFilter,
    selectedFeederCircuit,
    showZones,
  ]);

  // Spatial Projection bounds computation
  const bounds = useMemo(() => {
    const isGbl = selectedUlb?.code === 'ULB-GBL';
    const fallbackCenterLng = isGbl ? 74.7725 : 74.9318;
    const fallbackCenterLat = isGbl ? 34.2165 : 32.9925;

    if (!geoData || geoData.features.length === 0) {
      return {
        minLng: fallbackCenterLng - 0.015,
        maxLng: fallbackCenterLng + 0.015,
        minLat: fallbackCenterLat - 0.015,
        maxLat: fallbackCenterLat + 0.015,
      };
    }

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    geoData.features.forEach((f) => {
      if (f.geometry.type === 'Point') {
        const [lng, lat] = f.geometry.coordinates;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      } else if (f.geometry.type === 'Polygon') {
        const coords = f.geometry.coordinates[0];
        coords.forEach(([lng, lat]) => {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });
      }
    });

    const padLng = Math.max((maxLng - minLng) * 0.15, 0.003);
    const padLat = Math.max((maxLat - minLat) * 0.15, 0.003);

    return {
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
    };
  }, [geoData, selectedUlb]);

  // Transform Geo Coordinates [lng, lat] to SVG ViewBox (900 x 600)
  const projectCoords = useCallback(
    (lng: number, lat: number) => {
      const svgWidth = 900;
      const svgHeight = 600;
      const padding = 50;

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

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Quick Command Submission: Toggle Pole State Directly on Map
  const handleToggleState = async (feature: GisFeature) => {
    setActionPending(true);
    try {
      const targetState = !feature.properties.reportedOn;
      await ApiClient.fetch('commands', {
        method: 'POST',
        body: JSON.stringify({
          ulbId: selectedUlb?.id,
          deviceId: feature.properties.deviceExternalId || feature.id,
          commandType: 'SET_STATE',
          payload: { on: targetState },
        }),
      });

      // Update local state optimistically
      if (geoData) {
        const updated = geoData.features.map((f) => {
          if (f.id === feature.id) {
            return {
              ...f,
              properties: {
                ...f.properties,
                reportedOn: targetState,
                desiredOn: targetState,
                status: targetState ? ('online_on' as const) : ('online_off' as const),
              },
            };
          }
          return f;
        });
        setGeoData({ ...geoData, features: updated });
        setSelectedFeature({
          ...feature,
          properties: {
            ...feature.properties,
            reportedOn: targetState,
            desiredOn: targetState,
            status: targetState ? 'online_on' : 'online_off',
          },
        });
      }

      setActionMessage({
        text: `Command dispatched: ${feature.properties.externalCode} switched ${targetState ? 'ON' : 'OFF'}.`,
        type: 'success',
      });
    } catch (e: any) {
      setActionMessage({ text: `Command failed: ${e.message}`, type: 'error' });
    } finally {
      setActionPending(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  // Quick Dispatch: Create Maintenance Work Order
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeature) return;

    setActionPending(true);
    try {
      await ApiClient.fetch('maintenance/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ulbId: selectedUlb?.id,
          title: workOrderTitle || `Repair inspection for ${selectedFeature.properties.externalCode || selectedFeature.properties.panelCode}`,
          description: workOrderDescription || `Work order dispatched from GIS spatial viewer for pole/panel inspection.`,
          priority: workOrderPriority,
        }),
      });

      setShowWorkOrderModal(false);
      setActionMessage({
        text: `Work order dispatched successfully to municipal maintenance team.`,
        type: 'success',
      });
    } catch (e: any) {
      setActionMessage({ text: `Failed to create ticket: ${e.message}`, type: 'error' });
    } finally {
      setActionPending(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  // Aggregated Category Counts
  const poles = filteredFeatures.filter((f) => f.properties.assetType === 'POLE');
  const feeders = filteredFeatures.filter((f) => f.properties.assetType === 'FEEDER');
  const gateways = filteredFeatures.filter((f) => f.properties.assetType === 'GATEWAY');
  const zones = filteredFeatures.filter((f) => f.properties.assetType === 'ZONE');

  const activePoles = poles.filter((p) => p.properties.reportedOn);
  const faultPoles = poles.filter(
    (p) =>
      p.properties.status === 'critical_fault' ||
      p.properties.status === 'major_fault' ||
      p.properties.status === 'warning',
  );
  const totalActiveLoadKw = feeders.reduce(
    (acc, f) => acc + (f.properties.activeLoadKw || 0),
    0,
  );

  // Feeder Panels for Circuit Selector
  const allFeeders = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.filter((f) => f.properties.assetType === 'FEEDER');
  }, [geoData]);

  return (
    <div className="space-y-4">
      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-xl backdrop-blur-md text-xs font-medium transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60'
              : 'bg-rose-950/90 text-rose-200 border-rose-700/60'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header & Municipal Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            GIS Spatial Network & Fleet Topology
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time WGS 84 (EPSG:4326) PostGIS GIS Layer: CCMS Feeders, 3-Phase Circuits, LoRaWAN Gateways, and Streetlights.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {!fullFleetLoaded && (
            <button
              onClick={handleSeedFullFleet}
              disabled={seedingFleet}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-semibold rounded text-xs flex items-center gap-1.5 shadow"
              title={`Load entire municipal fleet of ${ulbCoords.targetFleet} lights`}
            >
              <Cpu className={`w-3.5 h-3.5 ${seedingFleet ? 'animate-spin' : ''}`} />
              {seedingFleet ? 'Generating Fleet...' : `Load Full Fleet (${ulbCoords.targetFleet})`}
            </button>
          )}

          <button
            onClick={() => setShowHalos(!showHalos)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showHalos
                ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle radiant illumination halos"
          >
            <Eye className="w-3.5 h-3.5" />
            Halos
          </button>

          <button
            onClick={() => setShowPhaseLines(!showPhaseLines)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showPhaseLines
                ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle 3-phase feeder circuit lines"
          >
            <Activity className="w-3.5 h-3.5" />
            Phase Lines
          </button>

          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showZones
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle administrative municipal zone boundaries"
          >
            <Compass className="w-3.5 h-3.5" />
            Zones
          </button>

          <button
            onClick={() => setShowJsonModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5"
            title="Inspect RFC 7946 GeoJSON FeatureCollection"
          >
            <Code className="w-3.5 h-3.5 text-sky-400" />
            GeoJSON
          </button>

          <button
            onClick={loadGeoJson}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="Refresh GIS spatial data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <SimulatedBadge />
        </div>
      </div>

      {/* Control Room Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Layer Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Layer:
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded p-0.5 flex items-center">
              {(['all', 'poles', 'feeders', 'gateways', 'zones'] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => setSelectedLayer(layer)}
                  className={`px-2.5 py-0.5 rounded capitalize font-medium transition-colors ${
                    selectedLayer === layer
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>

          {/* Feeder Circuit Tracing Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> Circuit:
            </span>
            <select
              value={selectedFeederCircuit}
              onChange={(e) => setSelectedFeederCircuit(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Feeder Circuits ({allFeeders.length})</option>
              {allFeeders.map((f) => (
                <option key={f.id} value={f.properties.panelCode}>
                  {f.properties.panelCode} — {f.properties.name?.slice(0, 24)}...
                </option>
              ))}
            </select>
          </div>

          {/* Phase Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Phase:</span>
            <div className="bg-slate-950 border border-slate-800 rounded p-0.5 flex items-center font-mono">
              {(['ALL', 'R', 'Y', 'B'] as const).map((phase) => (
                <button
                  key={phase}
                  onClick={() => setPhaseFilter(phase)}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    phaseFilter === phase
                      ? phase === 'R'
                        ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                        : phase === 'Y'
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                        : phase === 'B'
                        ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50'
                        : 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {phase}
                </button>
              ))}
            </div>
          </div>

          {/* Wattage Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Wattage:</span>
            <div className="bg-slate-950 border border-slate-800 rounded p-0.5 flex items-center font-mono">
              {(['ALL', '35', '70', '110'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setWattageFilter(w)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    wattageFilter === w
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w === 'ALL' ? 'All' : `${w}W`}
                </button>
              ))}
            </div>
          </div>

          {/* Operational Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ON">Illuminated (ON)</option>
              <option value="OFF">Standby (OFF)</option>
              <option value="FAULT">Faults & Alarms</option>
              <option value="OFFLINE">Communication Loss</option>
            </select>
          </div>
        </div>

        {/* Live Filter Summary Pills */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-300">
            Visible: <strong className="text-white">{filteredFeatures.length}</strong> / {geoData?.features.length || 0}
          </span>
          {faultPoles.length > 0 && (
            <span className="px-2 py-0.5 bg-rose-950/80 border border-rose-800/60 rounded text-rose-300 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" /> {faultPoles.length} Alarms
            </span>
          )}
        </div>
      </div>

      {/* Main Interactive Map Viewer Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-[740px] relative shadow-2xl">
        {/* Top Status & Telemetry Readout Bar */}
        <div className="bg-slate-800/95 border-b border-slate-700 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3 z-10 backdrop-blur">
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
            <span className="text-slate-400 font-mono">EPSG:4326 (WGS 84)</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-slate-400">
              Poles: <strong className="text-amber-400">{poles.length}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Active: <strong className="text-emerald-400">{activePoles.length}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Feeders: <strong className="text-sky-400">{feeders.length}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Gateways: <strong className="text-purple-400">{gateways.length}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Active Load: <strong className="text-amber-300">{totalActiveLoadKw.toFixed(1)} kW</strong>
            </span>
          </div>
        </div>

        {/* Map Canvas & Asset Inspector Container */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Spatial Vector Canvas with Pan & Zoom */}
          <div
            ref={svgContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex-1 bg-slate-950 flex flex-col items-center justify-center relative select-none overflow-hidden ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Control Room Grid Overlay */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

            {/* Floating Navigation & Zoom Controls */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 shadow-xl backdrop-blur">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.35, 4.5))}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.35, 0.65))}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="h-px bg-slate-800 my-0.5" />
              <button
                onClick={resetView}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                title="Fit to Bounds / Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Left Coordinate & Scale Readout */}
            <div className="absolute bottom-4 left-4 z-20 font-mono text-[10px] bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-slate-300 shadow backdrop-blur flex items-center gap-3">
              <span>Zoom: {(zoomLevel * 100).toFixed(0)}%</span>
              <span className="text-slate-600">|</span>
              <span>Pan: [{panOffset.x}, {panOffset.y}]</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400">PostGIS Vector Canvas</span>
            </div>

            {/* Interactive Minimap / Radar in Bottom-Right */}
            <div className="absolute bottom-4 right-4 z-20 w-36 h-24 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 shadow-2xl backdrop-blur hidden md:flex flex-col justify-between pointer-events-none">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-1 border-b border-slate-800 pb-0.5">
                <span>RADAR OVERVIEW</span>
                <span className="text-amber-400">1:50,000</span>
              </div>
              <svg viewBox="0 0 140 80" className="w-full h-full opacity-70">
                {feeders.map((f) => {
                  const [lng, lat] = getPointCoords(f.geometry);
                  const fX = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 0.001)) * 130 + 5;
                  const fY = 75 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 0.001)) * 70;
                  return <circle key={`mini-${f.id}`} cx={fX} cy={fY} r="3" fill="#10b981" />;
                })}
                {/* Viewport indicator box */}
                <rect
                  x={Math.max(10 - panOffset.x / 15, 2)}
                  y={Math.max(10 - panOffset.y / 15, 2)}
                  width={Math.max(120 / zoomLevel, 20)}
                  height={Math.max(60 / zoomLevel, 15)}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="2,2"
                />
              </svg>
            </div>

            {/* SVG Vector Map Rendering */}
            {loading ? (
              <div className="z-10 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                <span>Loading RFC 7946 PostGIS GeoJSON Spatial Network...</span>
              </div>
            ) : (
              <svg
                viewBox="0 0 900 600"
                className="w-full h-full z-10"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* 1. Administrative Zone Polygons */}
                {showZones &&
                  zones.map((zone) => {
                    if (zone.geometry.type !== 'Polygon') return null;
                    const coords = zone.geometry.coordinates[0];
                    const pointsStr = coords
                      .map(([lng, lat]) => {
                        const pt = projectCoords(lng, lat);
                        return `${pt.x},${pt.y}`;
                      })
                      .join(' ');

                    return (
                      <g key={`zone-${zone.id}`} onClick={() => setSelectedFeature(zone)}>
                        <polygon
                          points={pointsStr}
                          fill="#38bdf8"
                          fillOpacity="0.06"
                          stroke="#0284c7"
                          strokeWidth="1.5"
                          strokeDasharray="6,4"
                          className="cursor-pointer hover:fill-opacity-15 transition-all"
                        />
                        {/* Zone Label at centroid */}
                        <text
                          x={projectCoords(coords[0][0], coords[0][1]).x + 30}
                          y={projectCoords(coords[0][0], coords[0][1]).y + 30}
                          fill="#38bdf8"
                          opacity="0.6"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {zone.properties.name}
                        </text>
                      </g>
                    );
                  })}

                {/* 2. 3-Phase CCMS Feeder Circuit Lines */}
                {showPhaseLines &&
                  feeders.map((feeder) => {
                    const [fLng, fLat] = getPointCoords(feeder.geometry);
                    const fPt = projectCoords(fLng, fLat);
                    const isFeederSelected =
                      selectedFeature?.id === feeder.id ||
                      selectedFeederCircuit === feeder.properties.panelCode;

                    const connectedPoles = poles.filter(
                      (p) =>
                        p.properties.feederPanelCode === feeder.properties.panelCode ||
                        p.properties.feederId === feeder.id,
                    );

                    return (
                      <g key={`circuit-lines-${feeder.id}`}>
                        {connectedPoles.map((pole) => {
                          const [pLng, pLat] = getPointCoords(pole.geometry);
                          const pPt = projectCoords(pLng, pLat);
                          const phase = pole.properties.phaseConnection || 'R';

                          // Color based on electrical phase line
                          const phaseColor =
                            phase === 'R' ? '#ef4444' : phase === 'Y' ? '#eab308' : '#3b82f6';

                          return (
                            <line
                              key={`line-${feeder.id}-${pole.id}`}
                              x1={fPt.x}
                              y1={fPt.y}
                              x2={pPt.x}
                              y2={pPt.y}
                              stroke={phaseColor}
                              strokeWidth={isFeederSelected ? '1.8' : '0.9'}
                              strokeDasharray={isFeederSelected ? undefined : '3,3'}
                              opacity={isFeederSelected ? '0.75' : '0.25'}
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                {/* 3. Render CCMS Feeder Panels */}
                {feeders.map((feeder) => {
                  const [lng, lat] = getPointCoords(feeder.geometry);
                  const pt = projectCoords(lng, lat);
                  const isSelected = selectedFeature?.id === feeder.id;

                  return (
                    <g
                      key={feeder.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedFeature(feeder)}
                    >
                      {/* Feeder Radiant Aura */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="24"
                        fill="#10b981"
                        opacity={isSelected ? '0.35' : '0.12'}
                      />
                      {/* Feeder Enclosure Box */}
                      <rect
                        x={pt.x - 12}
                        y={pt.y - 12}
                        width="24"
                        height="24"
                        rx="4"
                        fill="#064e3b"
                        stroke={isSelected ? '#f59e0b' : '#10b981'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                      />
                      <Zap
                        x={pt.x - 7}
                        y={pt.y - 7}
                        width="14"
                        height="14"
                        className="text-emerald-300"
                      />
                      {/* Feeder Panel Code Tag */}
                      <text
                        x={pt.x}
                        y={pt.y + 22}
                        textAnchor="middle"
                        fill={isSelected ? '#f59e0b' : '#34d399'}
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {feeder.properties.panelCode}
                      </text>
                    </g>
                  );
                })}

                {/* 4. Render LoRaWAN Gateways */}
                {gateways.map((gw) => {
                  const [lng, lat] = getPointCoords(gw.geometry);
                  const pt = projectCoords(lng, lat);
                  const isSelected = selectedFeature?.id === gw.id;

                  return (
                    <g
                      key={gw.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedFeature(gw)}
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="18"
                        fill="#8b5cf6"
                        opacity={isSelected ? '0.35' : '0.15'}
                      />
                      {/* Diamond Lozenge */}
                      <rect
                        x={pt.x - 9}
                        y={pt.y - 9}
                        width="18"
                        height="18"
                        rx="3"
                        transform={`rotate(45 ${pt.x} ${pt.y})`}
                        fill="#4c1d95"
                        stroke={isSelected ? '#ffffff' : '#c084fc'}
                        strokeWidth={isSelected ? '2' : '1.5'}
                      />
                      <Radio
                        x={pt.x - 6}
                        y={pt.y - 6}
                        width="12"
                        height="12"
                        className="text-purple-200"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 14}
                        textAnchor="middle"
                        fill="#c084fc"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {gw.properties.externalCode}
                      </text>
                    </g>
                  );
                })}

                {/* 5. Render Streetlights / Poles */}
                {poles.map((pole) => {
                  const [lng, lat] = getPointCoords(pole.geometry);
                  const pt = projectCoords(lng, lat);
                  const isSelected = selectedFeature?.id === pole.id;
                  const isReportedOn = pole.properties.reportedOn === true;
                  const wattage = pole.properties.wattage || 70;
                  const status = pole.properties.status;

                  // Dynamic color symbology based on operational state
                  let baseColor = '#64748b'; // Standby slate
                  let isFault = false;

                  if (status === 'critical_fault') {
                    baseColor = '#f43f5e'; // Crimson alert
                    isFault = true;
                  } else if (status === 'major_fault' || status === 'warning') {
                    baseColor = '#f59e0b'; // Amber warning
                    isFault = true;
                  } else if (status === 'comm_loss') {
                    baseColor = '#9333ea'; // Offline purple
                  } else if (isReportedOn) {
                    baseColor = wattage >= 110 ? '#f59e0b' : wattage >= 70 ? '#10b981' : '#38bdf8';
                  }

                  const haloRadius = wattage >= 110 ? 34 : wattage >= 70 ? 26 : 18;

                  return (
                    <g
                      key={pole.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedFeature(pole)}
                    >
                      {/* Radiant Illumination Halo */}
                      {showHalos && isReportedOn && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={haloRadius}
                          fill={baseColor}
                          opacity={isFault ? '0.35' : '0.18'}
                          className={isFault ? 'animate-pulse' : undefined}
                        />
                      )}

                      {/* Selection Ring Indicator */}
                      {isSelected && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="15"
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
                        r="6.5"
                        fill={isReportedOn ? baseColor : '#1e293b'}
                        stroke={isSelected ? '#ffffff' : baseColor}
                        strokeWidth="1.5"
                      />

                      {/* Inner Optical Dot */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="2.2"
                        fill={isReportedOn ? '#ffffff' : '#64748b'}
                      />

                      {/* Label if zoomed in */}
                      {zoomLevel >= 1.7 && (
                        <text
                          x={pt.x}
                          y={pt.y - 11}
                          textAnchor="middle"
                          fill={isSelected ? '#ffffff' : '#cbd5e1'}
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {pole.properties.externalCode}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Right Slide-over: Spatial Asset Inspector */}
          {selectedFeature && (
            <div className="w-88 bg-slate-900 border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto z-20 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    {selectedFeature.properties.assetType === 'FEEDER' ? (
                      <div className="p-1.5 bg-emerald-950/80 border border-emerald-800/60 rounded text-emerald-400">
                        <Zap className="w-4 h-4" />
                      </div>
                    ) : selectedFeature.properties.assetType === 'GATEWAY' ? (
                      <div className="p-1.5 bg-purple-950/80 border border-purple-800/60 rounded text-purple-400">
                        <Radio className="w-4 h-4" />
                      </div>
                    ) : selectedFeature.properties.assetType === 'ZONE' ? (
                      <div className="p-1.5 bg-sky-950/80 border border-sky-800/60 rounded text-sky-400">
                        <Compass className="w-4 h-4" />
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

                {/* Pole / Luminaire Asset Details */}
                {selectedFeature.properties.assetType === 'POLE' && (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        External Pole Identifier
                      </span>
                      <span className="font-mono text-sm font-bold text-white">
                        {selectedFeature.properties.externalCode}
                      </span>
                    </div>

                    {/* Operational State Comparison */}
                    <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded space-y-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Command State Verification
                      </span>
                      <StateComparison
                        desiredOn={selectedFeature.properties.desiredOn}
                        reportedOn={selectedFeature.properties.reportedOn}
                      />
                    </div>

                    {/* Quick Command Switching Button */}
                    <button
                      onClick={() => handleToggleState(selectedFeature)}
                      disabled={actionPending}
                      className={`w-full py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                        selectedFeature.properties.reportedOn
                          ? 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border border-rose-800/60'
                          : 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800/60'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {actionPending
                        ? 'Dispatching Command...'
                        : selectedFeature.properties.reportedOn
                        ? 'Turn Luminaire OFF'
                        : 'Turn Luminaire ON'}
                    </button>

                    {/* Electrical & Hardware Specs */}
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Luminaire Rating</span>
                        <span className="text-amber-400 font-bold">
                          {selectedFeature.properties.wattage || 70}W LED
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Phase Line</span>
                        <span
                          className={`font-bold ${
                            selectedFeature.properties.phaseConnection === 'R'
                              ? 'text-red-400'
                              : selectedFeature.properties.phaseConnection === 'Y'
                              ? 'text-amber-400'
                              : 'text-sky-400'
                          }`}
                        >
                          Phase {selectedFeature.properties.phaseConnection || 'R'}
                        </span>
                      </div>
                    </div>

                    {/* Live Telemetry Meters */}
                    <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block flex items-center justify-between">
                        <span>Live Telemetry Gauges</span>
                        <span className="text-emerald-400 font-mono">
                          {selectedFeature.properties.reportedOn ? 'Illuminated' : 'Standby'}
                        </span>
                      </span>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">RMS Voltage:</span>
                          <span className="text-white font-bold">
                            {selectedFeature.properties.voltage || 228.4} V
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Current:</span>
                          <span className="text-white font-bold">
                            {selectedFeature.properties.currentAmps || 0.3} A
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Power Factor:</span>
                          <span className="text-white font-bold">
                            {selectedFeature.properties.powerFactor || 0.98}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Heatsink Temp:</span>
                          <span className="text-amber-400 font-bold">
                            {selectedFeature.properties.temperatureC || 38.2}°C
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Feeder Panel Association
                      </span>
                      <span className="text-slate-200 font-medium">
                        {selectedFeature.properties.feederName || 'Direct CCMS Connection'}
                      </span>
                      <span className="text-xs font-mono text-emerald-400 block">
                        [{selectedFeature.properties.feederPanelCode}]
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        WGS-84 Coordinates
                      </span>
                      {(() => {
                        const [featLng, featLat] = getPointCoords(selectedFeature.geometry);
                        return (
                          <>
                            <span className="text-slate-300 font-mono text-[11px] block">
                              Lat: {featLat.toFixed(5)}° N
                            </span>
                            <span className="text-slate-300 font-mono text-[11px] block">
                              Lng: {featLng.toFixed(5)}° E
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Feeder Panel Asset Details */}
                {selectedFeature.properties.assetType === 'FEEDER' && (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Feeder Panel Designation
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

                    <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded space-y-1.5 font-mono">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Circuit Electrical Balancing
                      </span>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Connected Luminaires:</span>
                        <strong className="text-white">
                          {selectedFeature.properties.connectedLuminairesCount || 78}
                        </strong>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Illuminated (Active):</span>
                        <strong className="text-emerald-400">
                          {selectedFeature.properties.activeLuminairesCount || 65}
                        </strong>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Active Circuit Load:</span>
                        <strong className="text-amber-400">
                          {selectedFeature.properties.activeLoadKw || 5.4} kW
                        </strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Utility Revenue Meter
                      </span>
                      <span className="text-slate-300 font-mono">
                        {selectedFeature.properties.meterNumber || 'UNMETERED'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Phase Configuration
                      </span>
                      <span className="text-slate-200 font-mono">
                        {selectedFeature.properties.phase || '3-PHASE'}
                      </span>
                    </div>
                  </div>
                )}

                {/* LoRaWAN Gateway Asset Details */}
                {selectedFeature.properties.assetType === 'GATEWAY' && (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Gateway Identity
                      </span>
                      <span className="text-sm font-bold text-white">
                        {selectedFeature.properties.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Gateway Code</span>
                        <span className="text-purple-400 font-bold">
                          {selectedFeature.properties.externalCode}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Network Status</span>
                        <span className="text-emerald-400 font-bold uppercase">
                          {selectedFeature.properties.status || 'ONLINE'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Static IP Address
                      </span>
                      <span className="text-slate-300 font-mono">
                        {selectedFeature.properties.ipAddress || '10.14.20.101'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Municipal Zone Details */}
                {selectedFeature.properties.assetType === 'ZONE' && (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Administrative Zone
                      </span>
                      <span className="text-sm font-bold text-white">
                        {selectedFeature.properties.name}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-950/60 border border-slate-800 rounded font-mono">
                      <span className="text-[10px] text-slate-400 block">Zone Code</span>
                      <span className="text-sky-400 font-bold">
                        {selectedFeature.properties.code}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector Footer Actions */}
              <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
                <button
                  onClick={() => setShowWorkOrderModal(true)}
                  className="w-full py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 rounded text-center block transition-colors font-medium flex items-center justify-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Dispatch Work Order &rarr;
                </button>
                <a
                  href="/assets"
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-center block transition-colors"
                >
                  Inspect in Asset Hierarchy
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL: Work Order Dispatch --- */}
      {showWorkOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Dispatch Field Maintenance Work Order
              </h3>
              <button
                onClick={() => setShowWorkOrderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Asset Code</label>
                <input
                  type="text"
                  readOnly
                  value={
                    selectedFeature?.properties.externalCode ||
                    selectedFeature?.properties.panelCode ||
                    selectedFeature?.id
                  }
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-slate-300"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Work Order Title</label>
                <input
                  type="text"
                  required
                  defaultValue={`Maintenance check for ${
                    selectedFeature?.properties.externalCode || selectedFeature?.properties.panelCode
                  }`}
                  onChange={(e) => setWorkOrderTitle(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Priority Tier</label>
                <select
                  value={workOrderPriority}
                  onChange={(e) => setWorkOrderPriority(e.target.value as any)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="CRITICAL">CRITICAL (Immediate safety hazard)</option>
                  <option value="HIGH">HIGH (Feeder or multiple lamps out)</option>
                  <option value="MEDIUM">MEDIUM (Single luminaire inspection)</option>
                  <option value="LOW">LOW (Scheduled preventative inspection)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description / Technician Notes</label>
                <textarea
                  rows={3}
                  defaultValue={`Dispatched directly from GIS Spatial Network Viewer for ${selectedUlb?.name}. Inspect optical enclosure, surge protection device, and driver output.`}
                  onChange={(e) => setWorkOrderDescription(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWorkOrderModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold rounded"
                >
                  {actionPending ? 'Dispatching...' : 'Dispatch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Raw GeoJSON FeatureCollection Inspector --- */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-400" />
                RFC 7946 GeoJSON FeatureCollection
              </h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Features count: {geoData?.features.length || 0}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(geoData, null, 2));
                    setActionMessage({ text: 'GeoJSON copied to clipboard', type: 'success' });
                    setTimeout(() => setActionMessage(null), 3000);
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
