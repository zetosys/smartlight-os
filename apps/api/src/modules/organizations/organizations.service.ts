import { Injectable } from '@nestjs/common';
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

  public createUlb(data: { name: string; code: string; organizationId?: string; latitude?: number; longitude?: number }) {
    const newId = `ulb-${Date.now()}`;
    const newUlb = {
      id: newId,
      organization_id: data.organizationId || '00000000-0000-0000-0000-000000000001',
      code: data.code,
      name: data.name,
      state: 'Jammu and Kashmir',
      timezone: 'Asia/Kolkata',
      latitude: data.latitude || 33.5,
      longitude: data.longitude || 74.8,
    };
    this.db.memoryStore.ulbs.push(newUlb);
    return newUlb;
  }

  public updateUlb(id: string, data: Partial<{ name: string; code: string; latitude: number; longitude: number }>) {
    const ulb = this.getUlbById(id);
    if (!ulb) {
      throw new Error(`ULB '${id}' not found`);
    }
    if (data.name) ulb.name = data.name;
    if (data.code) ulb.code = data.code;
    if (data.latitude) ulb.latitude = data.latitude;
    if (data.longitude) ulb.longitude = data.longitude;
    return ulb;
  }
}
