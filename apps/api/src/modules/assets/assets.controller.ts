import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import {
  CreateZoneDto,
  CreateWardDto,
  CreateStreetDto,
  CreateFeederDto,
  CreatePoleDto,
  BulkImportDto,
  AuthContextUser,
} from '@smartlight/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  UlbScoped,
} from '../../common/decorators/require-permissions.decorator';

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

  @Post('feeders')
  @RequirePermissions('assets.write')
  @UlbScoped()
  createFeeder(@Body() dto: CreateFeederDto, @CurrentUser() user: AuthContextUser) {
    return this.assetsService.createFeeder(dto, user);
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

  @Get('poles/:id')
  getPoleById(@Param('id') id: string) {
    return this.assetsService.getPoleById(id);
  }

  @Post('poles')
  @RequirePermissions('assets.write')
  @UlbScoped()
  createPole(@Body() dto: CreatePoleDto, @CurrentUser() user: AuthContextUser) {
    return this.assetsService.createPole(dto, user);
  }

  @Get('geojson')
  @UlbScoped()
  getGeoJson(
    @Query('ulbId') ulbId?: string,
    @Query('type') type: string = 'all',
    @Query('bbox') bbox?: string,
  ) {
    return this.assetsService.getGeoJson(ulbId, type, bbox);
  }

  @Post('import')
  @RequirePermissions('assets.write')
  @UlbScoped()
  importPoles(
    @Body() dto: BulkImportDto,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.assetsService.importPoles(dto, user);
  }

  @Post('zones')
  @RequirePermissions('assets.write')
  @UlbScoped()
  createZone(@Body() dto: CreateZoneDto, @CurrentUser() user: AuthContextUser) {
    return this.assetsService.createZone(dto, user);
  }

  @Post('wards')
  @RequirePermissions('assets.write')
  createWard(@Body() dto: CreateWardDto, @CurrentUser() user: AuthContextUser) {
    return this.assetsService.createWard(dto, user);
  }

  @Post('streets')
  @RequirePermissions('assets.write')
  createStreet(@Body() dto: CreateStreetDto, @CurrentUser() user: AuthContextUser) {
    return this.assetsService.createStreet(dto, user);
  }
}
