import { Controller, Get, Param, Query } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { UlbScoped } from '../../common/decorators/require-permissions.decorator';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @UlbScoped()
  getDevices(
    @Query('ulbId') ulbId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.devicesService.getDevices(ulbId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get(':id')
  getDeviceById(@Param('id') id: string) {
    return this.devicesService.getDeviceById(id);
  }

  @Get(':id/telemetry')
  getDeviceTelemetry(@Param('id') id: string) {
    return this.devicesService.getDeviceTelemetry(id);
  }
}
