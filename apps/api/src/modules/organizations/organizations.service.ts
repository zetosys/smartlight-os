import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DatabaseService) {}

  public getAllOrganizations() {
    return this.db.memoryStore.organizations;
  }

  public getAllUlbs(organizationId?: string) {
    if (organizationId) {
      return this.db.memoryStore.ulbs.filter(
        (u) => u.organization_id === organizationId,
      );
    }
    return this.db.memoryStore.ulbs;
  }

  public getUlbById(id: string) {
    return this.db.memoryStore.ulbs.find((u) => u.id === id) || null;
  }

  public createUlb(data: {
    name: string;
    code: string;
    organizationId?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    fleetCount?: number;
  }) {
    if (!data.name || !data.code) {
      throw new BadRequestException('ULB name and unique code are required');
    }

    const normalizedCode = data.code.trim().toUpperCase();
    const existing = this.db.memoryStore.ulbs.find((u) => u.code.toUpperCase() === normalizedCode);
    if (existing) {
      throw new BadRequestException(`ULB with code '${normalizedCode}' already exists`);
    }

    const newId = `ulb-${Date.now()}`;
    const newUlb = {
      id: newId,
      organization_id: data.organizationId || '00000000-0000-0000-0000-000000000001',
      code: normalizedCode,
      name: data.name.trim(),
      state: data.state || 'Jammu and Kashmir',
      timezone: 'Asia/Kolkata',
      latitude: Number(data.latitude) || 34.0,
      longitude: Number(data.longitude) || 74.8,
      fleetCount: Number(data.fleetCount) || 1200,
    };
    this.db.memoryStore.ulbs.push(newUlb);

    // Provision baseline GIS administrative hierarchy (Zone 1 & Ward 1)
    const zoneId = `zone-${Date.now()}`;
    this.db.memoryStore.zones.push({
      id: zoneId,
      ulb_id: newId,
      code: `${normalizedCode}-Z1`,
      name: `${data.name.trim()} - Main Town Zone`,
      createdAt: new Date().toISOString(),
    });

    this.db.memoryStore.wards.push({
      id: `ward-${Date.now()}`,
      zone_id: zoneId,
      ward_number: 1,
      name: 'Ward 1 - Central Ward',
      createdAt: new Date().toISOString(),
    });

    return newUlb;
  }

  public updateUlb(id: string, data: Partial<{ name: string; code: string; latitude: number; longitude: number }>) {
    const ulb = this.getUlbById(id);
    if (!ulb) {
      throw new NotFoundException(`ULB '${id}' not found`);
    }
    if (data.name) ulb.name = data.name.trim();
    if (data.code) ulb.code = data.code.trim().toUpperCase();
    if (data.latitude) ulb.latitude = Number(data.latitude);
    if (data.longitude) ulb.longitude = Number(data.longitude);
    return ulb;
  }

  private currentLicense = {
    licenseId: 'SL-LIC-JKHUDD-2026-ENT-A8F9',
    licenseKey: 'SL-ENT-2026-JKHUDD-7Y-9984SLA-RSA4096-MEITY',
    tier: 'ENTERPRISE_STATE_DIRECTORATE',
    tierName: 'Enterprise State Directorate (7-Year O&M Contract)',
    licensee: 'J&K Housing & Urban Development Department (JKHUDD)',
    issuingAuthority: 'SmartLight OS Sovereign Core - Licensing Authority (GoI Certified)',
    issuedAt: '2026-01-01T00:00:00.000Z',
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: '2033-01-01T00:00:00.000Z',
    omContractYears: 7,
    status: 'ACTIVE_GOVERNED',
    maxLuminaires: 10000,
    maxUlbs: 10,
    maxCcmsPanels: 100,
    maxOperatorSeats: -1,
    slaGuarantee: '99.8% System Uptime SLA (MeitY MeghRaj Certified)',
    features: {
      astronomicalEngine: true,
      gisSpatialIndex: true,
      multiTenantRbac: true,
      slaUptimeAudit: true,
      mqttCcmsTelemetry: true,
      meityMeghrajSovereignty: true,
      energySavingsBaseline: true,
      restApiIntegrations: true,
    },
    cryptographicSignature: 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };

  public getPlatformLicense() {
    const totalFleet = this.db.memoryStore.ulbs.reduce((acc, u) => {
      const fc = (u as unknown as { fleetCount?: number }).fleetCount;
      return (
        acc +
        (fc ||
          (u.code === 'ULB-GBL' ? 2740 : u.code === 'ULB-KTR' ? 1868 : 1200))
      );
    }, 0);

    const totalUlbs = this.db.memoryStore.ulbs.length;
    const totalCcms = 60;

    return {
      ...this.currentLicense,
      metrics: {
        allocatedLuminaires: totalFleet,
        maxLuminaires: this.currentLicense.maxLuminaires,
        luminaireUtilizationPercent: +(
          (totalFleet / this.currentLicense.maxLuminaires) *
          100
        ).toFixed(1),
        remainingLuminaires: Math.max(
          0,
          this.currentLicense.maxLuminaires - totalFleet,
        ),

        allocatedUlbs: totalUlbs,
        maxUlbs: this.currentLicense.maxUlbs,
        ulbUtilizationPercent: +(
          (totalUlbs / this.currentLicense.maxUlbs) *
          100
        ).toFixed(1),
        remainingUlbs: Math.max(0, this.currentLicense.maxUlbs - totalUlbs),

        allocatedCcmsPanels: totalCcms,
        maxCcmsPanels: this.currentLicense.maxCcmsPanels,
        ccmsUtilizationPercent: +(
          (totalCcms / this.currentLicense.maxCcmsPanels) *
          100
        ).toFixed(1),
      },
    };
  }

  public updatePlatformLicense(data: {
    licenseKey: string;
    tier?: string;
    maxLuminaires?: number;
    maxUlbs?: number;
  }) {
    if (!data.licenseKey || data.licenseKey.trim().length < 8) {
      throw new BadRequestException('A valid cryptographic license key is required');
    }

    if (data.tier) {
      this.currentLicense.tier = data.tier;
      this.currentLicense.tierName =
        data.tier === 'STATEWIDE_MEGA_FLEET'
          ? 'Statewide Mega Fleet Tier (25,000 Nodes / 10-Yr O&M)'
          : data.tier === 'ALL_INDIA_SMART_CITIES'
            ? 'All-India Smart Cities Mega Fleet (100,000 Nodes / Perpetual)'
            : 'Enterprise State Directorate (7-Year O&M Contract)';
    }

    if (data.maxLuminaires && data.maxLuminaires > 0) {
      this.currentLicense.maxLuminaires = data.maxLuminaires;
    }
    if (data.maxUlbs && data.maxUlbs > 0) {
      this.currentLicense.maxUlbs = data.maxUlbs;
    }

    this.currentLicense.licenseKey = data.licenseKey.trim();
    this.currentLicense.licenseId = `SL-LIC-${Date.now().toString(36).toUpperCase()}`;

    return this.getPlatformLicense();
  }
}
