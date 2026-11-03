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
}
