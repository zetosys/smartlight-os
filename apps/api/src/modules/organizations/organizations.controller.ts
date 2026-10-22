import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

@Controller()
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get('organizations')
  getOrganizations() {
    return this.orgService.getAllOrganizations();
  }

  @Get('ulbs')
  getUlbs(@Query('organizationId') orgId?: string) {
    return this.orgService.getAllUlbs(orgId);
  }

  @Get('ulbs/:id')
  getUlbById(@Param('id') id: string) {
    return this.orgService.getUlbById(id);
  }
}
