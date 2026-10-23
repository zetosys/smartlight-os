export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface ULB {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  state: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface Zone {
  id: string;
  ulbId: string;
  name: string;
  code?: string;
  createdAt: string;
}

export interface Ward {
  id: string;
  zoneId: string;
  ulbId?: string;
  name: string;
  wardNumber?: number;
  createdAt: string;
}

export interface Street {
  id: string;
  wardId: string;
  name: string;
  type?: 'HIGHWAY' | 'ARTERIAL' | 'COLLECTOR' | 'LOCAL';
  createdAt: string;
}

export interface Feeder {
  id: string;
  ulbId: string;
  name: string;
  panelCode?: string;
  location?: GeoLocation;
  capacityKw?: number;
  meterNumber?: string;
  phase?: '3-PHASE' | 'SINGLE-PHASE';
  createdAt: string;
}

export interface Pole {
  id: string;
  ulbId: string;
  streetId?: string;
  externalCode: string;
  location?: GeoLocation;
  heightMeters?: number;
  poleType?: string;
  createdAt: string;
  // Enriched properties
  streetName?: string;
  wardName?: string;
  zoneName?: string;
  feederName?: string;
  feederPanelCode?: string;
  luminaireWattage?: number;
  deviceExternalId?: string;
  isOnline?: boolean;
  reportedOn?: boolean;
  desiredOn?: boolean;
}

export interface Luminaire {
  id: string;
  ulbId: string;
  poleId?: string;
  feederId?: string;
  wattage: number;
  lampType?: 'LED' | 'HPS' | 'OTHER';
  phaseConnection?: 'R' | 'Y' | 'B';
  createdAt: string;
}

export interface Gateway {
  id: string;
  ulbId: string;
  feederId?: string;
  externalCode: string;
  name: string;
  ipAddress?: string;
  protocol?: string;
  isOnline: boolean;
  location?: GeoLocation;
  createdAt: string;
}

// GeoJSON Types for MapLibre GIS Integration
export interface GeoJsonGeometryPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat] per GeoJSON RFC 7946
}

export interface GeoJsonGeometryPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export type GeoJsonGeometry = GeoJsonGeometryPoint | GeoJsonGeometryPolygon;

export interface GeoJsonFeature<P = Record<string, unknown>> {
  type: 'Feature';
  id?: string;
  geometry: GeoJsonGeometry;
  properties: P;
}

export interface GeoJsonFeatureCollection<P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<P>[];
}

// DTOs for Creation & Import
export interface CreateZoneDto {
  ulbId: string;
  name: string;
  code?: string;
}

export interface CreateWardDto {
  zoneId: string;
  name: string;
  wardNumber?: number;
}

export interface CreateStreetDto {
  wardId: string;
  name: string;
  type?: 'HIGHWAY' | 'ARTERIAL' | 'COLLECTOR' | 'LOCAL';
}

export interface CreateFeederDto {
  ulbId: string;
  name: string;
  panelCode: string;
  capacityKw: number;
  meterNumber?: string;
  location?: GeoLocation;
  phase?: '3-PHASE' | 'SINGLE-PHASE';
}

export interface CreateGatewayDto {
  ulbId: string;
  feederId?: string;
  externalCode: string;
  name: string;
  ipAddress?: string;
  location?: GeoLocation;
}

export interface CreatePoleDto {
  ulbId: string;
  streetId?: string;
  externalCode: string;
  heightMeters?: number;
  poleType?: string;
  location?: GeoLocation;
  wattage?: number;
  feederId?: string;
}

export interface CreateLuminaireDto {
  ulbId: string;
  poleId?: string;
  feederId?: string;
  wattage: number;
  lampType?: 'LED' | 'HPS' | 'OTHER';
  phaseConnection?: 'R' | 'Y' | 'B';
}

export interface ImportPolesItem {
  externalCode: string;
  streetName?: string;
  wardName?: string;
  zoneName?: string;
  wattage: number;
  feederPanelCode?: string;
  latitude: number;
  longitude: number;
  heightMeters?: number;
  lampType?: 'LED' | 'HPS' | 'OTHER';
}

export interface BulkImportDto {
  ulbId: string;
  items: ImportPolesItem[];
}

export interface BulkImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: { row: number; code?: string; message: string }[];
}
