import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { generateFleet } from '@smartlight/device-contracts';

export interface MemoryFeeder {
  id: string;
  ulb_id: string;
  name: string;
  panel_code: string;
  capacity_kw: number;
  meter_number?: string;
  phase?: '3-PHASE' | 'SINGLE-PHASE';
  location?: { latitude: number; longitude: number };
  created_at?: string;
}

export interface MemoryPole {
  id: string;
  ulb_id: string;
  street_id?: string;
  external_code: string;
  height_meters: number;
  latitude: number;
  longitude: number;
  created_at?: string;
}

export interface MemoryLuminaire {
  id: string;
  ulb_id: string;
  pole_id?: string;
  feeder_id?: string;
  wattage: number;
  lamp_type: string;
  phase_connection?: 'R' | 'Y' | 'B';
  created_at?: string;
}

export interface MemoryDevice {
  id: string;
  ulb_id: string;
  luminaire_id: string;
  feeder_id?: string | null;
  gateway_id?: string | null;
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
    ],
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
    ],
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
    ] as any[],
    sessions: [] as any[],
    auditLogs: [] as any[],
    telemetry: [] as any[],
  };

  public seedFullFleet(seed: number = 365) {
    const fleet = generateFleet(seed);
    this.memoryStore.zones = fleet.zones as any[];
    this.memoryStore.wards = fleet.wards as any[];
    this.memoryStore.streets = fleet.streets as any[];
    this.memoryStore.feeders = fleet.feeders as any[];
    this.memoryStore.gateways = fleet.gateways as any[];
    this.memoryStore.poles = fleet.poles as any[];
    this.memoryStore.luminaires = fleet.luminaires as any[];
    this.memoryStore.devices = fleet.devices as any[];
    this.logger.log(`[DatabaseService] Seeded full fleet of ${fleet.totalLuminaires} streetlights (seed: ${seed})`);
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
