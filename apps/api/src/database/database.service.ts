import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { generateFleet } from '@smartlight/device-contracts';

export interface MemoryFeeder {
  id: string;
  ulb_id: string;
  ulbId?: string;
  name: string;
  panel_code?: string;
  panelCode?: string;
  capacity_kw?: number;
  capacityKw?: number;
  meter_number?: string;
  meterNumber?: string;
  phase?: '3-PHASE' | 'SINGLE-PHASE';
  location?: { latitude: number; longitude: number };
  created_at?: string;
  createdAt?: string;
}

export interface MemoryPole {
  id: string;
  ulb_id: string;
  ulbId?: string;
  street_id?: string;
  streetId?: string;
  external_code?: string;
  externalCode?: string;
  height_meters?: number;
  latitude: number;
  longitude: number;
  created_at?: string;
  createdAt?: string;
}

export interface MemoryLuminaire {
  id: string;
  ulb_id: string;
  ulbId?: string;
  pole_id?: string;
  poleId?: string;
  feeder_id?: string;
  feederId?: string;
  wattage: number;
  lamp_type?: string;
  lampType?: string;
  phase_connection?: 'R' | 'Y' | 'B';
  created_at?: string;
  createdAt?: string;
}

export interface MemoryDevice {
  id: string;
  ulb_id: string;
  ulbId?: string;
  luminaire_id: string;
  luminaireId?: string;
  feeder_id?: string | null;
  feederId?: string | null;
  gateway_id?: string | null;
  gatewayId?: string | null;
  adapter_key: string;
  external_id: string;
  desired_on: boolean;
  reported_on: boolean;
  desired_brightness: number;
  reported_brightness: number;
  is_online: boolean;
  last_seen_at: string;
  simulated: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.seedHistoricalRollups();
  }

  // In-memory fallback dataset for isolated sandbox tests or when Postgres is not started
  public memoryStore = {
    organizations: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Jammu & Kashmir Housing and Urban Development Department (JKHUDD)' },
    ],
    ulbs: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        organization_id: '00000000-0000-0000-0000-000000000001',
        code: 'ULB-GBL',
        name: 'Ganderbal Municipal Council',
        state: 'Jammu and Kashmir',
        timezone: 'Asia/Kolkata',
        latitude: 34.2165,
        longitude: 74.7725,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        organization_id: '00000000-0000-0000-0000-000000000001',
        code: 'ULB-KTR',
        name: 'Katra Municipal Committee',
        state: 'Jammu and Kashmir',
        timezone: 'Asia/Kolkata',
        latitude: 32.9925,
        longitude: 74.9318,
      },
    ],
    zones: [
      { id: '50000000-0000-0000-0000-000000000001', ulb_id: '11111111-1111-1111-1111-111111111111', code: 'GBL-Z1', name: 'Zone 1 - Main Town' },
      { id: '50000000-0000-0000-0000-000000000003', ulb_id: '22222222-2222-2222-2222-222222222222', code: 'KTR-Z1', name: 'Zone 1 - Shrine Route' },
    ],
    wards: [
      { id: '60000000-0000-0000-0000-000000000001', zone_id: '50000000-0000-0000-0000-000000000001', ward_number: 1, name: 'Ward 1 - Beehama' },
      { id: '60000000-0000-0000-0000-000000000003', zone_id: '50000000-0000-0000-0000-000000000003', ward_number: 1, name: 'Ward 1 - Bus Stand & Banganga Road' },
    ],
    streets: [
      { id: '70000000-0000-0000-0000-000000000001', ward_id: '60000000-0000-0000-0000-000000000001', name: 'Srinagar-Leh Highway (NH-1D)', street_type: 'HIGHWAY' },
      { id: '70000000-0000-0000-0000-000000000003', ward_id: '60000000-0000-0000-0000-000000000003', name: 'Banganga Pilgrimage Track Road', street_type: 'ARTERIAL' },
    ],
    feeders: [
      { id: '80000000-0000-0000-0000-000000000001', ulb_id: '11111111-1111-1111-1111-111111111111', name: 'Feeder Panel FP-01 Beehama', panel_code: 'GBL-FP-01', capacity_kw: 25.0, meter_number: 'JKPDD-MTR-90812' },
      { id: '80000000-0000-0000-0000-000000000002', ulb_id: '22222222-2222-2222-2222-222222222222', name: 'Feeder Panel FP-01 Katra Banganga', panel_code: 'KTR-FP-01', capacity_kw: 30.0, meter_number: 'JKPDD-MTR-81723' },
    ] as MemoryFeeder[],
    gateways: [
      { id: '85000000-0000-0000-0000-000000000001', ulb_id: '11111111-1111-1111-1111-111111111111', feeder_id: '80000000-0000-0000-0000-000000000001', external_code: 'GW-GBL-01', name: 'CCMS Gateway 01 Beehama', ip_address: '10.14.20.101', is_online: true },
      { id: '85000000-0000-0000-0000-000000000002', ulb_id: '22222222-2222-2222-2222-222222222222', feeder_id: '80000000-0000-0000-0000-000000000002', external_code: 'GW-KTR-01', name: 'CCMS Gateway 01 Katra', ip_address: '10.14.30.101', is_online: true },
    ],
    poles: [
      { id: '90000000-0000-0000-0000-000000000001', ulb_id: '11111111-1111-1111-1111-111111111111', street_id: '70000000-0000-0000-0000-000000000001', external_code: 'GBL-POLE-001', height_meters: 9.0, latitude: 34.2168, longitude: 74.7721 },
      { id: '90000000-0000-0000-0000-000000000002', ulb_id: '11111111-1111-1111-1111-111111111111', street_id: '70000000-0000-0000-0000-000000000001', external_code: 'GBL-POLE-002', height_meters: 9.0, latitude: 34.2170, longitude: 74.7728 },
      { id: '90000000-0000-0000-0000-000000000003', ulb_id: '11111111-1111-1111-1111-111111111111', street_id: '70000000-0000-0000-0000-000000000001', external_code: 'GBL-POLE-003', height_meters: 7.5, latitude: 34.2175, longitude: 74.7735 },
      { id: '90000000-0000-0000-0000-000000000004', ulb_id: '22222222-2222-2222-2222-222222222222', street_id: '70000000-0000-0000-0000-000000000003', external_code: 'KTR-POLE-001', height_meters: 9.0, latitude: 32.9930, longitude: 74.9320 },
      { id: '90000000-0000-0000-0000-000000000005', ulb_id: '22222222-2222-2222-2222-222222222222', street_id: '70000000-0000-0000-0000-000000000003', external_code: 'KTR-POLE-002', height_meters: 8.0, latitude: 32.9935, longitude: 74.9325 },
    ] as MemoryPole[],
    luminaires: [
      { id: 'a0000000-0000-0000-0000-000000000001', ulb_id: '11111111-1111-1111-1111-111111111111', pole_id: '90000000-0000-0000-0000-000000000001', feeder_id: '80000000-0000-0000-0000-000000000001', wattage: 110, lamp_type: 'LED' },
      { id: 'a0000000-0000-0000-0000-000000000002', ulb_id: '11111111-1111-1111-1111-111111111111', pole_id: '90000000-0000-0000-0000-000000000002', feeder_id: '80000000-0000-0000-0000-000000000001', wattage: 70, lamp_type: 'LED' },
      { id: 'a0000000-0000-0000-0000-000000000003', ulb_id: '11111111-1111-1111-1111-111111111111', pole_id: '90000000-0000-0000-0000-000000000003', feeder_id: '80000000-0000-0000-0000-000000000001', wattage: 35, lamp_type: 'LED' },
      { id: 'a0000000-0000-0000-0000-000000000004', ulb_id: '22222222-2222-2222-2222-222222222222', pole_id: '90000000-0000-0000-0000-000000000004', feeder_id: '80000000-0000-0000-0000-000000000002', wattage: 70, lamp_type: 'LED' },
      { id: 'a0000000-0000-0000-0000-000000000005', ulb_id: '22222222-2222-2222-2222-222222222222', pole_id: '90000000-0000-0000-0000-000000000005', feeder_id: '80000000-0000-0000-0000-000000000002', wattage: 35, lamp_type: 'LED' },
    ] as MemoryLuminaire[],
    devices: [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        luminaire_id: 'a0000000-0000-0000-0000-000000000001',
        feeder_id: '80000000-0000-0000-0000-000000000001',
        gateway_id: '85000000-0000-0000-0000-000000000001',
        adapter_key: 'SIMULATOR',
        external_id: 'SIM-GBL-0001',
        desired_on: true,
        reported_on: true,
        desired_brightness: 100,
        reported_brightness: 100,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        simulated: true,
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        luminaire_id: 'a0000000-0000-0000-0000-000000000002',
        feeder_id: '80000000-0000-0000-0000-000000000001',
        gateway_id: '85000000-0000-0000-0000-000000000001',
        adapter_key: 'SIMULATOR',
        external_id: 'SIM-GBL-0002',
        desired_on: true,
        reported_on: true,
        desired_brightness: 100,
        reported_brightness: 100,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        simulated: true,
      },
      {
        id: 'b0000000-0000-0000-0000-000000000003',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        luminaire_id: 'a0000000-0000-0000-0000-000000000003',
        feeder_id: '80000000-0000-0000-0000-000000000001',
        gateway_id: '85000000-0000-0000-0000-000000000001',
        adapter_key: 'SIMULATOR',
        external_id: 'SIM-GBL-0003',
        desired_on: false,
        reported_on: false,
        desired_brightness: 0,
        reported_brightness: 0,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        simulated: true,
      },
      {
        id: 'b0000000-0000-0000-0000-000000000004',
        ulb_id: '22222222-2222-2222-2222-222222222222',
        luminaire_id: 'a0000000-0000-0000-0000-000000000004',
        feeder_id: '80000000-0000-0000-0000-000000000002',
        gateway_id: '85000000-0000-0000-0000-000000000002',
        adapter_key: 'SIMULATOR',
        external_id: 'SIM-KTR-0001',
        desired_on: true,
        reported_on: true,
        desired_brightness: 100,
        reported_brightness: 100,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        simulated: true,
      },
      {
        id: 'b0000000-0000-0000-0000-000000000005',
        ulb_id: '22222222-2222-2222-2222-222222222222',
        luminaire_id: 'a0000000-0000-0000-0000-000000000005',
        feeder_id: '80000000-0000-0000-0000-000000000002',
        gateway_id: '85000000-0000-0000-0000-000000000002',
        adapter_key: 'SIMULATOR',
        external_id: 'SIM-KTR-0002',
        desired_on: false,
        reported_on: false,
        desired_brightness: 0,
        reported_brightness: 0,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        simulated: true,
      },
    ] as MemoryDevice[],
    commands: [] as any[],
    attempts: [] as any[],
    alerts: [
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        device_id: 'b0000000-0000-0000-0000-000000000003',
        code: 'COMMUNICATION_LOSS',
        message: 'No heartbeat received in last 30 minutes',
        severity: 'MAJOR',
        status: 'OPEN',
        opened_at: new Date(Date.now() - 3600000).toISOString(),
        acknowledged_at: undefined as string | undefined,
      },
    ] as any[],
    tickets: [
      {
        id: 'd0000000-0000-0000-0000-000000000001',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        alert_id: 'c0000000-0000-0000-0000-000000000001',
        assigned_to: '40000000-0000-0000-0000-000000000004',
        title: 'Check feeder line at Beehama Ward 1',
        description: 'Verify optical isolation and controller power input',
        priority: 'MEDIUM',
        status: 'OPEN',
        created_at: new Date().toISOString(),
      },
    ] as any[],
    schedules: [
      {
        id: 'sched-gbl-01',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        name: 'Ganderbal Highway & Municipal Astronomical Profile',
        scope: 'ULB',
        timezone: 'Asia/Kolkata',
        enabled: true,
        rule: {
          mode: 'ASTRONOMICAL',
          turnOnOffsetMinutes: -15, // 15m before sunset
          turnOffOffsetMinutes: 15, // 15m after sunrise
          dimmingCurve: [
            { time: '23:00', brightness: 70 },
            { time: '04:30', brightness: 100 },
          ],
        },
        created_at: new Date().toISOString(),
      },
      {
        id: 'sched-ktr-01',
        ulb_id: '22222222-2222-2222-2222-222222222222',
        name: 'Katra Shrine Pilgrimage Track Nightfall Profile',
        scope: 'ULB',
        timezone: 'Asia/Kolkata',
        enabled: true,
        rule: {
          mode: 'ASTRONOMICAL',
          turnOnOffsetMinutes: -10,
          turnOffOffsetMinutes: 10,
          dimmingCurve: [
            { time: '01:00', brightness: 80 },
            { time: '04:00', brightness: 100 },
          ],
        },
        created_at: new Date().toISOString(),
      },
    ] as any[],
    users: [
      {
        id: '40000000-0000-0000-0000-000000000001',
        email: 'admin@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Global',
        last_name: 'Administrator',
        role_code: 'PLATFORM_ADMIN',
        ulb_id: null as string | null,
        active: true,
        mfa_enabled: true,
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 3600000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        email: 'operator.ganderbal@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Tariq',
        last_name: 'Ahmad',
        role_code: 'CONTROL_OPERATOR',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        active: true,
        mfa_enabled: false,
        mfa_secret: null,
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 7200000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000003',
        email: 'operator.katra@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Rajesh',
        last_name: 'Sharma',
        role_code: 'CONTROL_OPERATOR',
        ulb_id: '22222222-2222-2222-2222-222222222222',
        active: true,
        mfa_enabled: false,
        mfa_secret: null,
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 14400000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000004',
        email: 'tech.ganderbal@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Mohammad',
        last_name: 'Iqbal',
        role_code: 'TECHNICIAN',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        active: true,
        mfa_enabled: false,
        mfa_secret: null,
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000005',
        email: 'auditor@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Sunil',
        last_name: 'Verma',
        role_code: 'AUDITOR',
        ulb_id: null,
        active: true,
        mfa_enabled: false,
        mfa_secret: null,
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 172800000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000006',
        email: 'admin.ganderbal@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Farooq',
        last_name: 'Shah',
        role_code: 'ULB_ADMIN',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        active: true,
        mfa_enabled: true,
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 5400000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000007',
        email: 'admin.katra@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Anita',
        last_name: 'Sharma',
        role_code: 'ULB_ADMIN',
        ulb_id: '22222222-2222-2222-2222-222222222222',
        active: true,
        mfa_enabled: true,
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 10800000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000008',
        email: 'ops.manager@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Vikram',
        last_name: 'Singh',
        role_code: 'OPERATIONS_MANAGER',
        ulb_id: null,
        active: true,
        mfa_enabled: false,
        mfa_secret: null,
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 1800000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '40000000-0000-0000-0000-000000000009',
        email: 'maint.supervisor@smartlight.os',
        password: 'SmartLight@2026!',
        first_name: 'Bilal',
        last_name: 'Wani',
        role_code: 'MAINTENANCE_SUPERVISOR',
        ulb_id: '11111111-1111-1111-1111-111111111111',
        active: true,
        mfa_enabled: false,
        mfa_secret: null,
        mfa_method: 'TOTP',
        last_login_at: new Date(Date.now() - 7200000).toISOString(),
        created_at: '2026-01-01T00:00:00Z',
      },
    ] as any[],
    sessions: [] as any[],
    auditLogs: [] as any[],
    telemetry: [] as any[],
    hourlyRollups: [] as any[],
    dailyRollups: [] as any[],
    spareParts: [
      { id: 'part-1', code: 'PART-LED-35W', name: '35W High-Efficiency LED Modular Luminaire', category: 'LUMINAIRE', quantity_in_stock: 120, unit_cost_inr: 2400 },
      { id: 'part-2', code: 'PART-LED-70W', name: '70W High-Efficiency LED Modular Luminaire', category: 'LUMINAIRE', quantity_in_stock: 150, unit_cost_inr: 3800 },
      { id: 'part-3', code: 'PART-LED-110W', name: '110W High-Efficiency LED Modular Luminaire', category: 'LUMINAIRE', quantity_in_stock: 80, unit_cost_inr: 5200 },
      { id: 'part-4', code: 'PART-SPD-10KV', name: '10kV / 10kA Surge Protection Device (SPD)', category: 'PROTECTION', quantity_in_stock: 250, unit_cost_inr: 650 },
      { id: 'part-5', code: 'PART-DRV-100W', name: 'Constant-Current Dimmable LED Driver 100W', category: 'DRIVER', quantity_in_stock: 140, unit_cost_inr: 1450 },
      { id: 'part-6', code: 'PART-CON-63A', name: 'CCMS Contactor 63A 3-Phase 4-Pole', category: 'SWITCHGEAR', quantity_in_stock: 60, unit_cost_inr: 2100 },
      { id: 'part-7', code: 'PART-FUSE-32A', name: 'Phase Protection Fast-Blow Fuse 32A', category: 'PROTECTION', quantity_in_stock: 300, unit_cost_inr: 180 },
    ] as any[],
  };

  public seedHistoricalRollups() {
    const ulbIds = [
      '11111111-1111-1111-1111-111111111111', // Ganderbal
      '22222222-2222-2222-2222-222222222222', // Katra
    ];

    const now = new Date();

    for (const ulbId of ulbIds) {
      const isGbl = ulbId.startsWith('1111');
      const baseKw = isGbl ? 175.3 : 87.9;
      const count = isGbl ? 2740 : 1868;

      // Seed past 7 days of daily rollups
      for (let dayOffset = 7; dayOffset >= 0; dayOffset--) {
        const d = new Date(now.getTime() - dayOffset * 86400000);
        const dateStr = d.toISOString().split('T')[0];

        // Variation factor +/- 3%
        const factor = 0.98 + (dayOffset % 5) * 0.01;
        const burningHours = +(11.0 + (dayOffset % 3) * 0.2).toFixed(2);
        const totalEnergyKwh = +(baseKw * burningHours * factor).toFixed(2);

        this.memoryStore.dailyRollups.push({
          bucket_date: dateStr,
          ulb_id: ulbId,
          total_energy_kwh: totalEnergyKwh,
          burning_hours: burningHours,
          uptime_percentage: 99.2,
          avg_power_factor: 0.97,
          peak_power_watts: +(baseKw * 1000).toFixed(0),
          total_luminaires: count,
        });
      }

      // Seed past 24 hours of hourly rollups
      for (let h = 23; h >= 0; h--) {
        const hDate = new Date(now.getTime() - h * 3600000);
        hDate.setMinutes(0, 0, 0);
        const hourIso = hDate.toISOString();
        const hourOfDay = hDate.getHours();

        // Night hours (18:00 to 06:00) vs Day hours (06:00 to 18:00)
        const isNight = hourOfDay >= 18 || hourOfDay < 6;
        const isMidnightEco = hourOfDay >= 23 || hourOfDay < 4;

        let activePowerKw = 0.5; // standby day load
        let burningMinutes = 0;
        let avgVoltage = 232.0;
        let pf = 0.22;

        if (isNight) {
          burningMinutes = 60;
          pf = 0.97;
          avgVoltage = 228.5 + (hourOfDay % 4);
          if (isMidnightEco) {
            activePowerKw = +(baseKw * 0.65).toFixed(2); // 65% eco dimming
          } else {
            activePowerKw = +(baseKw * 0.98).toFixed(2);
          }
        }

        const energyKwhDelta = +(activePowerKw * (burningMinutes > 0 ? 1.0 : 0.01)).toFixed(3);

        this.memoryStore.hourlyRollups.push({
          bucket_hour: hourIso,
          ulb_id: ulbId,
          energy_kwh_delta: energyKwhDelta,
          avg_voltage: avgVoltage,
          min_voltage: +(avgVoltage - 3.5).toFixed(1),
          max_voltage: +(avgVoltage + 4.2).toFixed(1),
          avg_current: +(activePowerKw * 1000 / (avgVoltage * pf)).toFixed(2),
          avg_power_watts: +(activePowerKw * 1000).toFixed(0),
          peak_power_watts: +(activePowerKw * 1050).toFixed(0),
          avg_power_factor: pf,
          burning_minutes: burningMinutes,
          samples_count: 60,
        });
      }
    }
  }

  public seedFullFleet(seed: number = 365) {
    const fleet = generateFleet(seed);

    this.memoryStore.zones = fleet.zones.map((z) => ({
      ...z,
      code: z.code || 'ZONE',
      ulb_id: (z as any).ulb_id || z.ulbId,
      ulbId: z.ulbId || (z as any).ulb_id,
    }));

    this.memoryStore.wards = fleet.wards.map((w) => ({
      ...w,
      zone_id: (w as any).zone_id || w.zoneId,
      zoneId: w.zoneId || (w as any).zone_id,
      ulb_id: (w as any).ulb_id || w.ulbId,
      ulbId: w.ulbId || (w as any).ulb_id,
      ward_number: (w as any).ward_number || w.wardNumber,
      wardNumber: w.wardNumber || (w as any).ward_number,
    }));

    this.memoryStore.streets = fleet.streets.map((s) => ({
      ...s,
      ward_id: (s as any).ward_id || s.wardId,
      wardId: s.wardId || (s as any).ward_id,
      street_type: (s as any).street_type || s.type,
      type: s.type || (s as any).street_type,
    }));

    this.memoryStore.feeders = fleet.feeders.map((f) => ({
      ...f,
      ulb_id: (f as any).ulb_id || f.ulbId,
      ulbId: f.ulbId || (f as any).ulb_id,
      panel_code: (f as any).panel_code || f.panelCode,
      panelCode: f.panelCode || (f as any).panel_code,
      capacity_kw: (f as any).capacity_kw || f.capacityKw,
      capacityKw: f.capacityKw || (f as any).capacity_kw,
      meter_number: (f as any).meter_number || f.meterNumber,
      meterNumber: f.meterNumber || (f as any).meter_number,
      location: f.location || {
        latitude: (f as any).latitude || 34.2165,
        longitude: (f as any).longitude || 74.7725,
      },
    }));

    this.memoryStore.gateways = fleet.gateways.map((g) => ({
      ...g,
      ulb_id: (g as any).ulb_id || g.ulbId,
      ulbId: g.ulbId || (g as any).ulb_id,
      feeder_id: (g as any).feeder_id || g.feederId,
      feederId: g.feederId || (g as any).feeder_id,
      external_code: (g as any).external_code || g.externalCode,
      externalCode: g.externalCode || (g as any).external_code,
      ip_address: (g as any).ip_address || g.ipAddress,
      ipAddress: g.ipAddress || (g as any).ip_address,
      is_online: (g as any).is_online !== undefined ? (g as any).is_online : g.isOnline,
      isOnline: g.isOnline !== undefined ? g.isOnline : (g as any).is_online,
    }));

    this.memoryStore.poles = fleet.poles.map((p) => {
      const lat = p.location?.latitude || (p as any).latitude || 34.2165;
      const lng = p.location?.longitude || (p as any).longitude || 74.7725;
      return {
        ...p,
        ulb_id: (p as any).ulb_id || p.ulbId,
        ulbId: p.ulbId || (p as any).ulb_id,
        street_id: (p as any).street_id || p.streetId,
        streetId: p.streetId || (p as any).street_id,
        external_code: (p as any).external_code || p.externalCode,
        externalCode: p.externalCode || (p as any).external_code,
        height_meters: (p as any).height_meters || p.heightMeters,
        heightMeters: p.heightMeters || (p as any).height_meters,
        latitude: lat,
        longitude: lng,
        location: { latitude: lat, longitude: lng },
      };
    });

    this.memoryStore.luminaires = fleet.luminaires.map((l) => ({
      ...l,
      ulb_id: (l as any).ulb_id || l.ulbId,
      ulbId: l.ulbId || (l as any).ulb_id,
      pole_id: (l as any).pole_id || l.poleId,
      poleId: l.poleId || (l as any).pole_id,
      feeder_id: (l as any).feeder_id || l.feederId,
      feederId: l.feederId || (l as any).feeder_id,
      lamp_type: (l as any).lamp_type || l.lampType,
      lampType: l.lampType || (l as any).lamp_type,
      phase_connection: (l as any).phase_connection || l.phaseConnection,
      phaseConnection: l.phaseConnection || (l as any).phase_connection,
    }));

    this.memoryStore.devices = fleet.devices.map((d) => ({
      ...d,
      ulb_id: d.ulb_id,
      ulbId: d.ulb_id,
      luminaire_id: d.luminaire_id,
      luminaireId: d.luminaire_id,
      feeder_id: d.feeder_id,
      feederId: d.feeder_id,
      gateway_id: d.gateway_id,
      gatewayId: d.gateway_id,
      adapter_key: d.adapter_key,
      adapterKey: d.adapter_key,
      external_id: d.external_id,
      externalId: d.external_id,
      desired_on: d.desired_on,
      desiredOn: d.desired_on,
      reported_on: d.reported_on,
      reportedOn: d.reported_on,
      is_online: d.is_online,
      isOnline: d.is_online,
    }));

    this.seedHistoricalRollups();
    this.logger.log(`[DatabaseService] Seeded full fleet of ${fleet.totalLuminaires} streetlights (seed: ${seed}) with rollups`);
    return fleet;
  }

  async onModuleInit() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://smartlight:local_dev_secret_2026@localhost:5432/smartlight';

    try {
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 2000,
      });

      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.isConnected = true;
      this.logger.log('Connected to PostgreSQL successfully');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(
        `PostgreSQL not reachable at ${connectionString}. Operating in resilient memory-store mode for development/tests.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  public isPostgresConnected(): boolean {
    return this.isConnected;
  }

  public getPool(): Pool | null {
    return this.pool;
  }
}
