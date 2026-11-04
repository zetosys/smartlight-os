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
  createUlb(
    @Body()
    body: {
      name: string;
      code: string;
      organizationId?: string;
      state?: string;
      latitude?: number;
      longitude?: number;
      fleetCount?: number;
    },
  ) {
    return this.orgService.createUlb(body);
  }

  @Patch('ulbs/:id')
  @RequirePermissions('org.manage')
  updateUlb(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.orgService.updateUlb(id, body);
  }

  @Get('license')
  getLicense() {
    return this.orgService.getPlatformLicense();
  }

  @Post('license/apply')
  @RequirePermissions('org.manage')
  applyLicense(
    @Body()
    body: {
      licenseKey: string;
      tier?: string;
      maxLuminaires?: number;
      maxUlbs?: number;
    },
  ) {
    return this.orgService.updatePlatformLicense(body);
  }

  @Post('license/generate')
  @RequirePermissions('org.manage')
  generateLicense(
    @Body()
    body: {
      licensee?: string;
      tier?: string;
      maxLuminaires?: number;
      maxUlbs?: number;
      maxCcmsPanels?: number;
      validityYears?: number;
    },
  ) {
    return this.orgService.generatePlatformLicense(body);
  }
}
