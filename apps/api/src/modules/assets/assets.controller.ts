import { Controller, Get, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { UlbScoped } from '../../common/decorators/require-permissions.decorator';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('hierarchy')
  @UlbScoped()
  getHierarchy(@Query('ulbId') ulbId?: string) {
    return this.assetsService.getHierarchy(ulbId);
  }

  @Get('feeders')
  @UlbScoped()
  getFeeders(@Query('ulbId') ulbId?: string) {
    return this.assetsService.getFeeders(ulbId);
  }

  @Get('gateways')
  @UlbScoped()
  getGateways(@Query('ulbId') ulbId?: string) {
    return this.assetsService.getGateways(ulbId);
  }

  @Get('poles')
  @UlbScoped()
  getPoles(@Query('ulbId') ulbId?: string) {
    return this.assetsService.getPoles(ulbId);
  }
}
