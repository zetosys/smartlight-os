import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

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

  @Post('ulbs')
  @RequirePermissions('org.manage')
  createUlb(@Body() body: { name: string; code: string; organizationId?: string; latitude?: number; longitude?: number }) {
    return this.orgService.createUlb(body);
  }

  @Patch('ulbs/:id')
  @RequirePermissions('org.manage')
  updateUlb(@Param('id') id: string, @Body() body: any) {
    return this.orgService.updateUlb(id, body);
  }
}
