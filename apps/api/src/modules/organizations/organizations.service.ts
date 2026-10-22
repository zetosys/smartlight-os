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
}
