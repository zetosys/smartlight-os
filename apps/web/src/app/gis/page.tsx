'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useUlb } from '../../components/context/UlbContext';
import { ApiClient } from '../../lib/api-client';
import { SimulatedBadge, StateComparison } from '@smartlight/ui';

const LeafletOsmMap = dynamic(() => import('./LeafletOsmMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs text-slate-300">Loading Leaflet OpenStreetMap Engine...</span>
    </div>
  ),
});
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
  X,
  Code,
  Radio,
  Power,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Activity,
  Filter,
  Compass,
  Cpu,
  ShieldAlert,
  Search,
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
  streetName?: string;
  gatewayId?: string;
  gatewayExternalCode?: string;
  connectedDevicesCount?: number;
  maxDevicesCapacity?: number;
  protocol?: string;
  backhaul?: string;
  dutyCyclePct?: number;
  rssiAvgDbm?: number;
  snrAvgDb?: number;
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
  const [seedingFleet, setSeedingFleet] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'osm' | 'canvas'>('osm');

  // Layer & Visual Filter States
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'poles' | 'feeders' | 'gateways' | 'zones'>('all');
  const [phaseFilter, setPhaseFilter] = useState<'ALL' | 'R' | 'Y' | 'B'>('ALL');
  const [wattageFilter, setWattageFilter] = useState<'ALL' | '35' | '70' | '110'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON' | 'OFF' | 'FAULT' | 'OFFLINE'>('ALL');
  const [selectedFeederCircuit, setSelectedFeederCircuit] = useState<string>('ALL');
  const [selectedGatewayCluster, setSelectedGatewayCluster] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Visualization Toggles
  const [showHalos, setShowHalos] = useState<boolean>(true);
  const [showPhaseLines, setShowPhaseLines] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [showLoraLinks, setShowLoraLinks] = useState<boolean>(true);

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

  const isGbl = (selectedUlb?.code || 'ULB-GBL') === 'ULB-GBL';

  const ulbCoords = useMemo(() => {
    return isGbl
      ? { lat: 34.2165, lng: 74.7725, centerName: 'Ganderbal Valley (NH-1D & Beehama)', targetFleet: 2740 }
      : { lat: 32.9925, lng: 74.9318, centerName: 'Katra Trikuta Foothills (Banganga Corridor)', targetFleet: 1868 };
  }, [isGbl]);

  // Load GeoJSON from API
  const loadGeoJson = useCallback(async () => {
    setLoading(true);
    try {
      const ulbQuery = selectedUlb?.id ? `ulbId=${selectedUlb.id}&` : '';
      const layerParam = selectedLayer === 'all' ? (showZones ? 'all,zones' : 'all') : selectedLayer;
      const data = await ApiClient.fetch<GisFeatureCollection>(
        `assets/geojson?${ulbQuery}type=${layerParam}`,
      );

      if (data && data.features && data.features.length > 0) {
        setGeoData(data);
        if (!selectedFeature) {
          const firstPole = data.features.find((f) => f.properties.assetType === 'POLE');
          setSelectedFeature(firstPole || data.features[0]);
        }
      } else {
        throw new Error('Empty feature set');
      }
    } catch {
      // High-density realistic corridor fallback if backend connection drops
      const fallbackFeatures: GisFeature[] = [];
      const centerLat = ulbCoords.lat;
      const centerLng = ulbCoords.lng;
      const phases: ('R' | 'Y' | 'B')[] = ['R', 'Y', 'B'];

      // 3 Feeders
      for (let f = 1; f <= 3; f++) {
        const feederId = `fdr-fallback-${f}`;
        const panelCode = `${isGbl ? 'GBL' : 'KTR'}-FP-${String(f).padStart(2, '0')}`;
        const fLat = centerLat + (f - 2) * 0.007;
        const fLng = centerLng + (f - 2) * 0.009;

        fallbackFeatures.push({
          type: 'Feature',
          id: feederId,
          geometry: { type: 'Point', coordinates: [fLng, fLat] },
          properties: {
            assetType: 'FEEDER',
            id: feederId,
            panelCode,
            name: `CCMS Feeder Panel ${panelCode}`,
            capacityKw: 30.0,
            meterNumber: `JKPDD-MTR-${1000 + f}`,
            phase: '3-PHASE',
            connectedLuminairesCount: 26,
            activeLuminairesCount: 23,
            activeLoadKw: 1.8,
            status: 'healthy',
          },
        });

        // 26 Poles per Feeder along the street corridor (78 poles total)
        for (let p = 1; p <= 26; p++) {
          const idx = (f - 1) * 26 + p;
          const poleId = `pole-fallback-${idx}`;
          const pCode = `${isGbl ? 'GBL' : 'KTR'}-POL-${String(idx).padStart(4, '0')}`;
          const offsetLat = (p - 13) * 0.00045 + (f - 2) * 0.001;
          const offsetLng = (p - 13) * 0.00065 + (f - 2) * 0.0012;
          const pLat = +(fLat + offsetLat).toFixed(6);
          const pLng = +(fLng + offsetLng).toFixed(6);
          const phase = phases[p % 3];
          const wattage = p % 5 === 0 ? 110 : p % 2 === 0 ? 70 : 35;
          const isReportedOn = p % 8 !== 0;

          fallbackFeatures.push({
            type: 'Feature',
            id: poleId,
            geometry: { type: 'Point', coordinates: [pLng, pLat] },
            properties: {
              assetType: 'POLE',
              id: poleId,
              externalCode: pCode,
              wattage,
              heightMeters: wattage === 110 ? 10.0 : wattage === 70 ? 8.5 : 7.0,
              lampType: 'LED',
              feederId,
              feederName: `CCMS Feeder Panel ${panelCode}`,
              feederPanelCode: panelCode,
              phaseConnection: phase,
              deviceExternalId: `SIM-${isGbl ? 'GBL' : 'KTR'}-${String(idx).padStart(4, '0')}`,
              isOnline: true,
              reportedOn: isReportedOn,
              desiredOn: isReportedOn,
              status: isReportedOn ? 'online_on' : 'online_off',
              voltage: isReportedOn ? +(228.0 + (p % 4) * 1.2).toFixed(1) : 230.1,
              currentAmps: isReportedOn ? +(wattage / (228 * 0.98)).toFixed(2) : 0,
              powerFactor: isReportedOn ? 0.98 : 0,
              temperatureC: 34.5,
              streetName: isGbl ? 'Srinagar-Leh Highway (NH-1D)' : 'Banganga Pilgrimage Track Road',
            },
          });
        }
      }

      setGeoData({ type: 'FeatureCollection', features: fallbackFeatures });
      if (fallbackFeatures.length > 0 && !selectedFeature) {
        setSelectedFeature(fallbackFeatures[1]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedUlb, selectedLayer, showZones, ulbCoords, isGbl, selectedFeature]);

  useEffect(() => {
    void loadGeoJson();
  }, [loadGeoJson]);

  // Seed full fleet in memory via Simulator endpoint
  const handleSeedFullFleet = async () => {
    setSeedingFleet(true);
    try {
      await ApiClient.fetch('simulator/seed-fleet', {
        method: 'POST',
        body: JSON.stringify({ seed: 365 }),
      });
      await loadGeoJson();
      setActionMessage({
        text: `Full municipal fleet of ${ulbCoords.targetFleet} streetlights loaded into GIS spatial layer.`,
        type: 'success',
      });
    } catch (e: unknown) {
      setActionMessage({ text: `Fleet Seeding failed: ${e instanceof Error ? e.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setSeedingFleet(false);
      setTimeout(() => {
        setActionMessage(null);
      }, 6000);
    }
  };

  // Filter features based on user filters
  const filteredFeatures = useMemo(() => {
    if (!geoData) return [];

    return geoData.features.filter((f) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = (f.properties.externalCode || f.properties.panelCode || f.properties.name || '').toLowerCase();
        if (!code.includes(q)) return false;
      }

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
          f.properties.feederPanelCode !== selectedFeederCircuit &&
          f.properties.feederId !== selectedFeederCircuit
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

      // LoRa Gateway 45-device cluster isolation
      if (selectedGatewayCluster !== 'ALL') {
        if (f.properties.assetType === 'POLE') {
          if (
            f.properties.gatewayExternalCode !== selectedGatewayCluster &&
            f.properties.gatewayId !== selectedGatewayCluster
          ) {
            return false;
          }
        } else if (f.properties.assetType === 'GATEWAY') {
          if (
            f.properties.externalCode !== selectedGatewayCluster &&
            f.id !== selectedGatewayCluster
          ) {
            return false;
          }
        }
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
    selectedGatewayCluster,
    showZones,
    searchQuery,
  ]);

  // Aggregated Category Counts
  const allGateways = useMemo(() => geoData?.features.filter((f) => f.properties.assetType === 'GATEWAY') || [], [geoData]);
  const poles = useMemo(() => filteredFeatures.filter((f) => f.properties.assetType === 'POLE'), [filteredFeatures]);
  const feeders = useMemo(() => filteredFeatures.filter((f) => f.properties.assetType === 'FEEDER'), [filteredFeatures]);
  const gateways = useMemo(() => filteredFeatures.filter((f) => f.properties.assetType === 'GATEWAY'), [filteredFeatures]);
  const zones = useMemo(() => filteredFeatures.filter((f) => f.properties.assetType === 'ZONE'), [filteredFeatures]);

  const activePoles = useMemo(() => poles.filter((p) => p.properties.reportedOn), [poles]);
  const faultPoles = useMemo(
    () =>
      poles.filter(
        (p) =>
          p.properties.status === 'critical_fault' ||
          p.properties.status === 'major_fault' ||
          p.properties.status === 'warning',
      ),
    [poles],
  );
  const totalActiveLoadKw = useMemo(
    () =>
      feeders.reduce((acc, f) => acc + (f.properties.activeLoadKw || 0), 0) ||
      activePoles.reduce((acc, p) => acc + (p.properties.wattage || 70) / 1000, 0),
    [feeders, activePoles],
  );

  // Robust Spatial Bounding Box (Focus strictly on points to prevent zone polygons from squishing the map)
  const bounds = useMemo(() => {
    const centerLng = ulbCoords.lng;
    const centerLat = ulbCoords.lat;

    // Use point features for tight, accurate bounds
    const pts = geoData?.features.filter((f) => f.geometry.type === 'Point') || [];

    if (pts.length === 0) {
      return {
        minLng: centerLng - 0.012,
        maxLng: centerLng + 0.012,
        minLat: centerLat - 0.008,
        maxLat: centerLat + 0.008,
        meanLat: centerLat,
        cosLat: Math.cos((centerLat * Math.PI) / 180),
      };
    }

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    pts.forEach((f) => {
      const [lng, lat] = (f.geometry as any).coordinates;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    const spanLng = Math.max(maxLng - minLng, 0.005);
    const spanLat = Math.max(maxLat - minLat, 0.004);
    const meanLat = (minLat + maxLat) / 2;

    return {
      minLng: minLng - spanLng * 0.08,
      maxLng: maxLng + spanLng * 0.08,
      minLat: minLat - spanLat * 0.08,
      maxLat: maxLat + spanLat * 0.08,
      meanLat,
      cosLat: Math.cos((meanLat * Math.PI) / 180),
    };
  }, [geoData, ulbCoords]);

  // True Geographic Metric Projection (Preserves 1:1 Aspect Ratio without squishing)
  const projectCoords = useCallback(
    (lng: number, lat: number) => {
      const svgWidth = 900;
      const svgHeight = 600;
      const padding = 45;

      const availWidth = svgWidth - padding * 2;
      const availHeight = svgHeight - padding * 2;

      const dLngGeo = (bounds.maxLng - bounds.minLng) * bounds.cosLat;
      const dLatGeo = bounds.maxLat - bounds.minLat;

      // Uniform metric scale
      const scale = Math.min(availWidth / (dLngGeo || 0.001), availHeight / (dLatGeo || 0.001));

      const cxGeo = (bounds.minLng + bounds.maxLng) / 2;
      const cyGeo = (bounds.minLat + bounds.maxLat) / 2;

      const x = svgWidth / 2 + (lng - cxGeo) * bounds.cosLat * scale;
      const y = svgHeight / 2 - (lat - cyGeo) * scale;

      return { x, y };
    },
    [bounds],
  );

  // Municipal Road Corridors Data (Traced along real municipal geography)
  const roadCorridors = useMemo(() => {
    if (isGbl) {
      return [
        {
          id: 'road-nh1d',
          name: 'Srinagar-Leh National Highway (NH-1D)',
          type: 'HIGHWAY',
          points: [
            [74.755, 34.211],
            [74.763, 34.214],
            [74.7725, 34.2165],
            [74.781, 34.219],
            [74.792, 34.223],
          ],
        },
        {
          id: 'road-beehama',
          name: 'Beehama Chowk to Tullamulla Arterial',
          type: 'ARTERIAL',
          points: [
            [74.7725, 34.2165],
            [74.771, 34.224],
            [74.768, 34.232],
          ],
        },
        {
          id: 'road-duderhama',
          name: 'Duderhama Central Market Avenue',
          type: 'ARTERIAL',
          points: [
            [74.7725, 34.2165],
            [74.774, 34.209],
            [74.777, 34.202],
          ],
        },
        {
          id: 'road-sindh',
          name: 'Sindh River Boulevard Corridor',
          type: 'LOCAL',
          points: [
            [74.760, 34.219],
            [74.772, 34.221],
            [74.785, 34.225],
          ],
        },
      ];
    } else {
      return [
        {
          id: 'road-banganga',
          name: 'Banganga Shrine Pilgrimage Track',
          type: 'HIGHWAY',
          points: [
            [74.922, 32.986],
            [74.927, 32.989],
            [74.9318, 32.9925],
            [74.937, 32.997],
            [74.942, 33.002],
          ],
        },
        {
          id: 'road-railway',
          name: 'Katra Railway Station Expressway',
          type: 'ARTERIAL',
          points: [
            [74.9318, 32.9925],
            [74.936, 32.987],
            [74.941, 32.982],
          ],
        },
        {
          id: 'road-busstand',
          name: 'Main Bazaar Bus Stand Corridor',
          type: 'ARTERIAL',
          points: [
            [74.9318, 32.9925],
            [74.926, 32.995],
            [74.921, 32.998],
          ],
        },
      ];
    }
  }, [isGbl]);

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  // Wheel zoom handling
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.18 : -0.18;
    setZoomLevel((z) => Math.max(0.65, Math.min(5.5, +(z + zoomFactor).toFixed(2))));
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedFeature(null);
    setSelectedFeederCircuit('ALL');
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
          type: targetState ? 'TURN_ON' : 'TURN_OFF',
          idempotencyKey: `gis-toggle-${feature.id}-${Date.now()}`,
          payload: { brightness: targetState ? 100 : 0 },
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
        text: `Command Confirmed: ${feature.properties.externalCode || feature.id} switched ${targetState ? 'ON' : 'OFF'}.`,
        type: 'success',
      });
    } catch (e: unknown) {
      setActionMessage({ text: `Command failed: ${e instanceof Error ? e.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setActionPending(false);
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
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
          description: workOrderDescription || `Dispatched from GIS spatial map for field inspection.`,
          priority: workOrderPriority,
        }),
      });

      setShowWorkOrderModal(false);
      setActionMessage({
        text: `Work order dispatched to municipal field maintenance team.`,
        type: 'success',
      });
    } catch (e: unknown) {
      setActionMessage({ text: `Failed to create ticket: ${e instanceof Error ? e.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setActionPending(false);
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
    }
  };

  // Center view on selected feature
  const centerOnFeature = (feature: GisFeature) => {
    setSelectedFeature(feature);
    const [lng, lat] = getPointCoords(feature.geometry);
    const pt = projectCoords(lng, lat);
    setPanOffset({
      x: 450 - pt.x,
      y: 300 - pt.y,
    });
    setZoomLevel(2.2);
  };

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
            onClick={() => {
              setActionMessage(null);
            }}
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
            GIS Spatial Network &amp; Fleet Topology
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
              {selectedUlb?.name}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            WGS 84 (EPSG:4326) PostGIS Vector Engine: 3-Phase CCMS Circuits, Corridors, Feeder Panels, and Luminaires.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Engine View Switcher (Leaflet OSM vs SCADA Vector Canvas) */}
          <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-lg p-0.5 font-mono text-xs shadow-inner">
            <button
              onClick={() => {
                setMapMode('osm');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                mapMode === 'osm'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Interactive Leaflet OpenStreetMap view with dark, standard, and satellite base layers"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>OpenStreetMap</span>
            </button>
            <button
              onClick={() => {
                setMapMode('canvas');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                mapMode === 'canvas'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="SCADA Vector Canvas schematic projection"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vector Canvas</span>
            </button>
          </div>

          {poles.length < 500 && (
            <button
              onClick={() => {
                void handleSeedFullFleet();
              }}
              disabled={seedingFleet}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-semibold rounded text-xs flex items-center gap-1.5 shadow"
              title={`Load entire municipal fleet of ${ulbCoords.targetFleet} lights`}
            >
              <Cpu className={`w-3.5 h-3.5 ${seedingFleet ? 'animate-spin' : ''}`} />
              {seedingFleet ? 'Generating Fleet...' : `Load Full Fleet (${ulbCoords.targetFleet})`}
            </button>
          )}

          <button
            onClick={() => {
              setShowRoads(!showRoads);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showRoads ? 'bg-amber-950/80 text-amber-300 border-amber-800/60' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle municipal road network & corridors"
          >
            <Navigation className="w-3.5 h-3.5" />
            Corridors
          </button>

          <button
            onClick={() => {
              setShowHalos(!showHalos);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showHalos ? 'bg-amber-950/80 text-amber-300 border-amber-800/60' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle radiant illumination halos"
          >
            <Eye className="w-3.5 h-3.5" />
            Halos
          </button>

          <button
            onClick={() => {
              setShowPhaseLines(!showPhaseLines);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showPhaseLines ? 'bg-sky-950/80 text-sky-300 border-sky-800/60' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle 3-phase feeder circuit lines"
          >
            <Activity className="w-3.5 h-3.5" />
            Phase Circuits
          </button>

          <button
            onClick={() => {
              setShowZones(!showZones);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showZones ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle administrative municipal zone boundaries"
          >
            <Compass className="w-3.5 h-3.5" />
            Zones
          </button>

          <button
            onClick={() => {
              setShowLoraLinks(!showLoraLinks);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showLoraLinks ? 'bg-purple-950/80 text-purple-300 border-purple-800/60' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle LoRa RF star topology (Gateway to 45 Luminaire Nodes)"
          >
            <Radio className="w-3.5 h-3.5" />
            LoRa Links (45/GW)
          </button>

          <button
            onClick={() => {
              setShowJsonModal(true);
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5"
            title="Inspect RFC 7946 GeoJSON FeatureCollection"
          >
            <Code className="w-3.5 h-3.5 text-sky-400" />
            GeoJSON
          </button>

          <button
            onClick={() => {
              void loadGeoJson();
            }}
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
          {/* Quick Search */}
          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search pole / panel..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Layer Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Layer:
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded p-0.5 flex items-center">
              {(['all', 'poles', 'feeders', 'gateways', 'zones'] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => {
                    setSelectedLayer(layer);
                  }}
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
              onChange={(e) => {
                setSelectedFeederCircuit(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-amber-500 max-w-xs"
            >
              <option value="ALL">All Feeder Circuits ({feeders.length})</option>
              {feeders.map((f) => (
                <option key={f.id} value={f.properties.panelCode || f.id}>
                  {f.properties.panelCode || f.id} — {f.properties.name?.slice(0, 24)}...
                </option>
              ))}
            </select>
          </div>

          {/* LoRa Gateway (45-Device Cluster) Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-purple-400" /> LoRa GW:
            </span>
            <select
              value={selectedGatewayCluster}
              onChange={(e) => {
                setSelectedGatewayCluster(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 text-purple-300 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-purple-500 max-w-xs"
            >
              <option value="ALL">All LoRa Gateways ({allGateways.length || gateways.length})</option>
              {(allGateways.length > 0 ? allGateways : gateways).map((gw) => (
                <option key={gw.id} value={gw.properties.externalCode || gw.id}>
                  {gw.properties.externalCode || gw.id} (45 Nodes)
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
                  onClick={() => {
                    setPhaseFilter(phase);
                  }}
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
                  onClick={() => {
                    setWattageFilter(w);
                  }}
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
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ON' | 'OFF' | 'FAULT' | 'OFFLINE');
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ON">Illuminated (ON)</option>
              <option value="OFF">Standby (OFF)</option>
              <option value="FAULT">Faults &amp; Alarms</option>
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
            <span className="text-slate-400 font-mono">EPSG:4326 (WGS 84 Metric)</span>
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
          {mapMode === 'osm' ? (
            <div className="flex-1 w-full h-full relative">
              <LeafletOsmMap
                features={filteredFeatures}
                allFeatures={geoData?.features || []}
                selectedFeature={selectedFeature}
                onSelectFeature={setSelectedFeature}
                onSwitchPole={handleToggleState}
                onOpenWorkOrder={(feature) => {
                  setSelectedFeature(feature);
                  setShowWorkOrderModal(true);
                }}
                centerCoords={ulbCoords}
                ulbCode={selectedUlb?.code}
                showHalos={showHalos}
                showPhaseLines={showPhaseLines}
                showZones={showZones}
                showLoraLinks={showLoraLinks}
                actionPending={actionPending}
              />
            </div>
          ) : (
            <div
              ref={svgContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className={`flex-1 bg-slate-950 flex flex-col items-center justify-center relative select-none overflow-hidden ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Control Room Grid Overlay */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />

            {/* Floating Navigation & Zoom Controls */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 shadow-xl backdrop-blur">
              <button
                onClick={() => {
                  setZoomLevel((z) => Math.min(z + 0.35, 5.5));
                }}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                title="Zoom In (or use mouse wheel)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel((z) => Math.max(z - 0.35, 0.65));
                }}
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
              <span>Pan: [{panOffset.x.toFixed(0)}, {panOffset.y.toFixed(0)}]</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400">PostGIS Vector Canvas (60 FPS)</span>
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
                <span>Streaming RFC 7946 PostGIS Spatial Network...</span>
              </div>
            ) : (
              <svg
                viewBox="0 0 900 600"
                className="w-full h-full z-10"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* GPU-Accelerated Hardware Transform Group for Buttery Pan & Zoom */}
                <g
                  transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
                  style={{ transformOrigin: '450px 300px' }}
                >
                  {/* 1. Municipal Road Network / Street Corridors */}
                  {showRoads && (
                    <g id="road-network" opacity="0.85">
                      {roadCorridors.map((road) => {
                        const pathD = road.points
                          .map(([lng, lat], i) => {
                            const pt = projectCoords(lng, lat);
                            return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                          })
                          .join(' ');

                        const midIdx = Math.floor(road.points.length / 2);
                        const labelPt = projectCoords(road.points[midIdx][0], road.points[midIdx][1]);

                        return (
                          <g key={road.id}>
                            {/* Road Bed / Asphalt Border */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#1e293b"
                              strokeWidth={road.type === 'HIGHWAY' ? 18 : 12}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Road Surface */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#0f172a"
                              strokeWidth={road.type === 'HIGHWAY' ? 14 : 9}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Centerline Dash */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#475569"
                              strokeWidth={road.type === 'HIGHWAY' ? 1.4 : 1.0}
                              strokeDasharray="6,5"
                              strokeLinecap="round"
                            />
                            {/* Street Label */}
                            <text
                              x={labelPt.x}
                              y={labelPt.y - 12}
                              textAnchor="middle"
                              fill="#94a3b8"
                              fontSize="8"
                              fontFamily="monospace"
                              fontWeight="bold"
                              className="pointer-events-none select-none opacity-80"
                            >
                              {road.name}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* 2. Administrative Zone Polygons */}
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
                        <g
                          key={`zone-${zone.id}`}
                          onClick={() => {
                            centerOnFeature(zone);
                          }}
                        >
                          <polygon
                            points={pointsStr}
                            fill="#38bdf8"
                            fillOpacity="0.04"
                            stroke="#0284c7"
                            strokeWidth="1.2"
                            strokeDasharray="6,4"
                            className="cursor-pointer hover:fill-opacity-10 transition-all"
                          />
                          {/* Zone Label */}
                          <text
                            x={projectCoords(coords[0][0], coords[0][1]).x + 25}
                            y={projectCoords(coords[0][0], coords[0][1]).y + 25}
                            fill="#38bdf8"
                            opacity="0.6"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {zone.properties.name}
                          </text>
                        </g>
                      );
                    })}

                  {/* 3. 3-Phase CCMS Feeder Circuit Lines */}
                  {showPhaseLines &&
                    feeders.map((feeder) => {
                      const [fLng, fLat] = getPointCoords(feeder.geometry);
                      const fPt = projectCoords(fLng, fLat);
                      const isFeederSelected =
                        selectedFeature?.id === feeder.id ||
                        selectedFeederCircuit === feeder.properties.panelCode ||
                        selectedFeederCircuit === feeder.id;

                      const connectedPoles = poles.filter(
                        (p) =>
                          p.properties.feederPanelCode === feeder.properties.panelCode ||
                          p.properties.feederId === feeder.id,
                      );

                      // Only draw dense lines when this circuit is isolated, or draw light branch lines
                      return (
                        <g key={`circuit-lines-${feeder.id}`}>
                          {connectedPoles.map((pole) => {
                            const [pLng, pLat] = getPointCoords(pole.geometry);
                            const pPt = projectCoords(pLng, pLat);
                            const phase = pole.properties.phaseConnection || 'R';

                            const phaseColor =
                              phase === 'R' ? '#ef4444' : phase === 'Y' ? '#eab308' : '#3b82f6';

                            // Clean visual styling: only show prominent branch lines when selected
                            if (!isFeederSelected && selectedFeederCircuit !== 'ALL') return null;

                            return (
                              <line
                                key={`line-${feeder.id}-${pole.id}`}
                                x1={fPt.x}
                                y1={fPt.y}
                                x2={pPt.x}
                                y2={pPt.y}
                                stroke={phaseColor}
                                strokeWidth={isFeederSelected ? 1.8 : 0.7}
                                strokeDasharray={isFeederSelected ? undefined : '2,3'}
                                opacity={isFeederSelected ? 0.8 : 0.18}
                              />
                            );
                          })}
                        </g>
                      );
                    })}

                  {/* 4. Render CCMS Feeder Panels (Electrical Substations) */}
                  {feeders.map((feeder) => {
                    const [lng, lat] = getPointCoords(feeder.geometry);
                    const pt = projectCoords(lng, lat);
                    const isSelected =
                      selectedFeature?.id === feeder.id ||
                      selectedFeederCircuit === feeder.properties.panelCode;

                    return (
                      <g
                        key={feeder.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          centerOnFeature(feeder);
                        }}
                      >
                        {/* Feeder Radiant Aura */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? 22 : 16}
                          fill="#10b981"
                          opacity={isSelected ? 0.35 : 0.15}
                        />
                        {/* Feeder Enclosure Box */}
                        <rect
                          x={pt.x - 10}
                          y={pt.y - 10}
                          width="20"
                          height="20"
                          rx="4"
                          fill="#064e3b"
                          stroke={isSelected ? '#f59e0b' : '#10b981'}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Zap
                          x={pt.x - 6}
                          y={pt.y - 6}
                          width="12"
                          height="12"
                          className={isSelected ? 'text-amber-400' : 'text-emerald-300'}
                        />
                        {/* Panel Code Label */}
                        <text
                          x={pt.x}
                          y={pt.y + 18}
                          textAnchor="middle"
                          fill={isSelected ? '#f59e0b' : '#34d399'}
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {feeder.properties.panelCode || feeder.id}
                        </text>
                      </g>
                    );
                  })}

                  {/* 4.5. Render LoRa Star-Topology Radio Beams (45 Nodes per Gateway) */}
                  {showLoraLinks && (
                    <g className="lora-star-topology pointer-events-none">
                      {gateways
                        .filter((gw) =>
                          selectedFeature?.id === gw.id ||
                          (selectedGatewayCluster !== 'ALL' &&
                            (gw.properties.externalCode === selectedGatewayCluster || gw.id === selectedGatewayCluster))
                        )
                        .map((gw) => {
                          const [gwLng, gwLat] = getPointCoords(gw.geometry);
                          const gwPt = projectCoords(gwLng, gwLat);
                          const connectedPoles = poles.filter(
                            (p) =>
                              p.properties.gatewayId === gw.id ||
                              p.properties.gatewayExternalCode === gw.properties.externalCode,
                          );

                          return (
                            <g key={`lora-cluster-${gw.id}`}>
                              {/* 500m RF Coverage Aura Bubble */}
                              <circle
                                cx={gwPt.x}
                                cy={gwPt.y}
                                r="55"
                                fill="#8b5cf6"
                                fillOpacity="0.10"
                                stroke="#a855f7"
                                strokeWidth="1.2"
                                strokeDasharray="3 3"
                              />
                              {connectedPoles.map((p) => {
                                const [pLng, pLat] = getPointCoords(p.geometry);
                                const pPt = projectCoords(pLng, pLat);
                                return (
                                  <line
                                    key={`rf-link-${gw.id}-${p.id}`}
                                    x1={gwPt.x}
                                    y1={gwPt.y}
                                    x2={pPt.x}
                                    y2={pPt.y}
                                    stroke="#c084fc"
                                    strokeWidth="0.8"
                                    strokeDasharray="2 2"
                                    opacity="0.65"
                                  />
                                );
                              })}
                            </g>
                          );
                        })}
                    </g>
                  )}

                  {/* 5. Render LoRaWAN Gateways */}
                  {gateways.map((gw) => {
                    const [lng, lat] = getPointCoords(gw.geometry);
                    const pt = projectCoords(lng, lat);
                    const isSelected = selectedFeature?.id === gw.id;

                    return (
                      <g
                        key={gw.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          centerOnFeature(gw);
                        }}
                      >
                        <circle cx={pt.x} cy={pt.y} r="14" fill="#8b5cf6" opacity={isSelected ? 0.35 : 0.12} />
                        <polygon
                          points={`${pt.x},${pt.y - 9} ${pt.x + 9},${pt.y} ${pt.x},${pt.y + 9} ${pt.x - 9},${pt.y}`}
                          fill="#4c1d95"
                          stroke="#a855f7"
                          strokeWidth={isSelected ? 2.2 : 1.2}
                        />
                        <Radio x={pt.x - 5} y={pt.y - 5} width="10" height="10" className="text-purple-300" />
                        <text
                          x={pt.x}
                          y={pt.y + 17}
                          textAnchor="middle"
                          fill="#c084fc"
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {gw.properties.externalCode || gw.id}
                        </text>
                      </g>
                    );
                  })}

                  {/* 6. Render Streetlights / Poles */}
                  {poles.map((pole) => {
                    const [lng, lat] = getPointCoords(pole.geometry);
                    const pt = projectCoords(lng, lat);
                    const isSelected = selectedFeature?.id === pole.id;
                    const isReportedOn = pole.properties.reportedOn === true;
                    const wattage = pole.properties.wattage || 70;
                    const status = pole.properties.status;
                    const phase = pole.properties.phaseConnection || 'R';

                    // Phase color
                    const phaseColor = phase === 'R' ? '#ef4444' : phase === 'Y' ? '#eab308' : '#3b82f6';

                    let baseColor = isReportedOn
                      ? wattage >= 110
                        ? '#f59e0b'
                        : wattage >= 70
                        ? '#10b981'
                        : '#38bdf8'
                      : '#64748b';
                    let isFault = false;

                    if (status === 'critical_fault') {
                      baseColor = '#f43f5e';
                      isFault = true;
                    } else if (status === 'major_fault' || status === 'warning') {
                      baseColor = '#f59e0b';
                      isFault = true;
                    } else if (status === 'comm_loss') {
                      baseColor = '#9333ea';
                    }

                    // Adaptive radius: crisp at 1.0x, prominent when zoomed in
                    const r = zoomLevel >= 2.5 ? 4.8 : zoomLevel >= 1.6 ? 3.4 : 2.4;
                    const haloR = wattage >= 110 ? 20 : wattage >= 70 ? 15 : 10;

                    return (
                      <g
                        key={pole.id}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFeature(pole);
                        }}
                      >
                        {/* Radiant Illumination Halo */}
                        {showHalos && isReportedOn && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={haloR}
                            fill={baseColor}
                            opacity={isFault ? 0.35 : 0.16}
                            className={isFault ? 'animate-pulse' : undefined}
                          />
                        )}

                        {/* Selected Indicator Ring */}
                        {isSelected && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={r + 5.5}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeDasharray="3,2"
                          />
                        )}

                        {/* Outer Phase Ring */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={r + 1.2}
                          fill="none"
                          stroke={phaseColor}
                          strokeWidth="1.2"
                          opacity="0.85"
                        />

                        {/* Pole Pin Core */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={r}
                          fill={isReportedOn ? baseColor : '#0f172a'}
                          stroke={isSelected ? '#ffffff' : baseColor}
                          strokeWidth="1"
                        />

                        {/* Inner Optical Dot */}
                        <circle cx={pt.x} cy={pt.y} r={r * 0.4} fill={isReportedOn ? '#ffffff' : '#64748b'} />

                        {/* Label when zoomed in */}
                        {zoomLevel >= 2.2 && (
                          <text
                            x={pt.x}
                            y={pt.y - r - 4}
                            textAnchor="middle"
                            fill={isSelected ? '#ffffff' : '#cbd5e1'}
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {pole.properties.externalCode || pole.id}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}
          </div>
        )}

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
                    onClick={() => {
                      setSelectedFeature(null);
                    }}
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
                      onClick={() => {
                        void handleToggleState(selectedFeature);
                      }}
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
                          Phase {selectedFeature.properties.phaseConnection || 'R'} (415V)
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
                          <span className="text-slate-400 block text-[10px]">Active Current:</span>
                          <span className="text-white font-bold">
                            {selectedFeature.properties.currentAmps || 0.31} A
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Active Power:</span>
                          <span className="text-amber-400 font-bold">
                            {selectedFeature.properties.reportedOn
                              ? `${selectedFeature.properties.wattage || 70} W`
                              : '0.0 W'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Power Factor:</span>
                          <span className="text-emerald-400 font-bold">
                            {selectedFeature.properties.powerFactor || 0.98}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Feeder & Street Association */}
                    <div className="space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-500">Feeder Panel:</span>
                        <span className="font-mono text-emerald-400 font-medium">
                          {selectedFeature.properties.feederPanelCode || 'FP-01'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-500">Street Name:</span>
                        <span className="font-medium text-right text-slate-300 max-w-[160px] truncate">
                          {selectedFeature.properties.streetName || 'Municipal Route'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-500">IoT Controller Node:</span>
                        <span className="font-mono text-sky-400">
                          {selectedFeature.properties.deviceExternalId || 'SIM-DEV'} (LoRa Node)
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">LoRa Gateway:</span>
                        <button
                          onClick={() => {
                            if (selectedFeature.properties.gatewayExternalCode) {
                              setSelectedGatewayCluster(selectedFeature.properties.gatewayExternalCode);
                            }
                          }}
                          className="font-mono text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 hover:underline text-xs"
                          title="Click to isolate this gateway and its 45 connected lights"
                        >
                          <Radio className="w-3 h-3" />
                          {selectedFeature.properties.gatewayExternalCode || 'GW-GBL-01'} (45 Nodes)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feeder Panel Details */}
                {selectedFeature.properties.assetType === 'FEEDER' && (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Panel Code</span>
                      <span className="font-mono text-base font-bold text-emerald-400">
                        {selectedFeature.properties.panelCode}
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5">{selectedFeature.properties.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Capacity</span>
                        <span className="text-emerald-400 font-bold">
                          {selectedFeature.properties.capacityKw || 30} kW
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-400 block">Connected Lights</span>
                        <span className="text-white font-bold">
                          {selectedFeature.properties.connectedLuminairesCount || 78} Poles
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Meter Number:</span>
                        <span className="font-mono text-white">{selectedFeature.properties.meterNumber || 'JKPDD-MTR'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phase System:</span>
                        <span className="font-mono text-amber-400">3-Phase 415V AC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active Load:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {(selectedFeature.properties.activeLoadKw || 5.4).toFixed(1)} kW
                        </span>
                      </div>
                    </div>

                    {/* Circuit Isolation Button */}
                    <button
                      onClick={() => {
                        setSelectedFeederCircuit(selectedFeature.properties.panelCode || 'ALL');
                      }}
                      className="w-full py-2 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800/80 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Isolate Circuit On Canvas
                    </button>
                  </div>
                )}

                {/* Gateway Details */}
                {selectedFeature.properties.assetType === 'GATEWAY' && (
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Gateway Code</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/30">
                          LoRa Micro-Gateway
                        </span>
                      </div>
                      <span className="font-mono text-base font-bold text-purple-400">
                        {selectedFeature.properties.externalCode}
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5">{selectedFeature.properties.name}</span>
                    </div>

                    {/* LoRa Device Cluster Capacity */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">LoRa Node Capacity:</span>
                        <span className="font-mono font-bold text-white">
                          <strong className="text-emerald-400">{selectedFeature.properties.connectedDevicesCount || 45}</strong> / 45 Nodes
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-emerald-400 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (((selectedFeature.properties.connectedDevicesCount || 45) / 45) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Cluster: 100% Filled</span>
                        <span>SF7 / 865-867 MHz</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">IP Address:</span>
                        <span className="text-white">{selectedFeature.properties.ipAddress || '10.14.20.101'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">4G Backhaul:</span>
                        <span className="text-emerald-400 font-bold">LTE-M (Connected)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duty Cycle:</span>
                        <span className="text-sky-300">0.38% (&lt; 1% WPC SLA)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg RSSI / SNR:</span>
                        <span className="text-amber-300">-74 dBm / +9.2 dB</span>
                      </div>
                    </div>

                    {/* Cluster Isolation Button */}
                    <button
                      onClick={() => {
                        const code = selectedFeature.properties.externalCode || selectedFeature.id;
                        setSelectedGatewayCluster(selectedGatewayCluster === code ? 'ALL' : (code || 'ALL'));
                      }}
                      className="w-full py-2 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800/80 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5 text-purple-400" />
                      {selectedGatewayCluster === selectedFeature.properties.externalCode
                        ? 'Clear Cluster Filter'
                        : 'Isolate 45-Node Cluster On Canvas'}
                    </button>
                  </div>
                )}
              </div>

              {/* Inspector Bottom Actions */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => {
                    setWorkOrderTitle(`Maintenance repair for ${selectedFeature.properties.externalCode || selectedFeature.properties.panelCode}`);
                    setShowWorkOrderModal(true);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Dispatch Emergency Work Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RFC 7946 GeoJSON Raw Inspector Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  RFC 7946 GeoJSON FeatureCollection Inspector
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowJsonModal(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-[11px] text-emerald-400">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    type: 'FeatureCollection',
                    count: filteredFeatures.length,
                    features: filteredFeatures.slice(0, 30),
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Work Order Dispatch Modal */}
      {showWorkOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWorkOrder}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Create Field Maintenance Work Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWorkOrderModal(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Work Order Title</label>
                <input
                  type="text"
                  required
                  value={workOrderTitle}
                  onChange={(e) => {
                    setWorkOrderTitle(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Priority</label>
                <select
                  value={workOrderPriority}
                  onChange={(e) => {
                    setWorkOrderPriority(e.target.value as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Dispatch)</option>
                  <option value="HIGH">HIGH (Within 4 Hours)</option>
                  <option value="MEDIUM">MEDIUM (Within 24 Hours)</option>
                  <option value="LOW">LOW (Scheduled Routine)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Issue Description &amp; Notes</label>
                <textarea
                  rows={3}
                  value={workOrderDescription}
                  onChange={(e) => {
                    setWorkOrderDescription(e.target.value);
                  }}
                  placeholder="Specify symptoms: blown MOV surge protector, driver failure, physical mast damage..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowWorkOrderModal(false);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionPending}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-xs"
              >
                {actionPending ? 'Dispatching...' : 'Dispatch Work Order'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
