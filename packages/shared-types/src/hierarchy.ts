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
}

export interface Luminaire {
  id: string;
  ulbId: string;
  poleId?: string;
  feederId?: string;
  wattage: number;
  lampType?: 'LED' | 'HPS' | 'OTHER';
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
