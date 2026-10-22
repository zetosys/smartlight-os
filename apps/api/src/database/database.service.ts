import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

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
    ],
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
    ],
    luminaires: [
      { id: 'a0000000-0000-0000-0000-000000000001', ulb_id: '11111111-1111-1111-1111-111111111111', pole_id: '90000000-0000-0000-0000-000000000001', feeder_id: '80000000-0000-0000-0000-000000000001', wattage: 110, lamp_type: 'LED' },
      { id: 'a0000000-0000-0000-0000-000000000002', ulb_id: '11111111-1111-1111-1111-111111111111', pole_id: '90000000-0000-0000-0000-000000000002', feeder_id: '80000000-0000-0000-0000-000000000001', wattage: 70, lamp_type: 'LED' },
      { id: 'a0000000-0000-0000-0000-000000000003', ulb_id: '11111111-1111-1111-1111-111111111111', pole_id: '90000000-0000-0000-0000-000000000003', feeder_id: '80000000-0000-0000-0000-000000000001', wattage: 35, lamp_type: 'LED' },
      { id: 'a0000000-0000-0000-0000-000000000004', ulb_id: '22222222-2222-2222-2222-222222222222', pole_id: '90000000-0000-0000-0000-000000000004', feeder_id: '80000000-0000-0000-0000-000000000002', wattage: 70, lamp_type: 'LED' },
      { id: 'a0000000-0000-0000-0000-000000000005', ulb_id: '22222222-2222-2222-2222-222222222222', pole_id: '90000000-0000-0000-0000-000000000005', feeder_id: '80000000-0000-0000-0000-000000000002', wattage: 35, lamp_type: 'LED' },
    ],
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
    ],
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
    auditLogs: [] as any[],
  };

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
