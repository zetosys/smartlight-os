import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { UlbScoped } from '../../common/decorators/require-permissions.decorator';
import { BatchTelemetryIngestDto } from '@smartlight/shared-types';

@Controller()
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('dashboard/overview')
  @UlbScoped()
  getOverview(@Query('ulbId') ulbId?: string) {
    return this.telemetryService.getDashboardOverview(ulbId);
  }

  @Post('telemetry/ingest')
  ingestTelemetry(@Body() dto: BatchTelemetryIngestDto) {
    return this.telemetryService.ingestTelemetry(dto);
  }

  @Get('telemetry/latest')
  getLatestTelemetry(@Query('deviceId') deviceId: string) {
    return this.telemetryService.getLatestTelemetry(deviceId);
  }

  @Get('telemetry/history')
  getTelemetryHistory(
    @Query('deviceId') deviceId: string,
    @Query('limit') limit: string = '50',
  ) {
    return this.telemetryService.getTelemetryHistory(deviceId, Number(limit));
  }

  @Get('alerts')
  @UlbScoped()
  getAlerts(
    @Query('ulbId') ulbId?: string,
    @Query('status') status?: string,
  ) {
    return this.telemetryService.getAlerts(ulbId, status);
  }

  @Post('alerts/:id/acknowledge')
  acknowledgeAlert(@Param('id') id: string) {
    return this.telemetryService.acknowledgeAlert(id);
  }

  @Get('tickets')
  @UlbScoped()
  getTickets(@Query('ulbId') ulbId?: string) {
    return this.telemetryService.getTickets(ulbId);
  }
}
