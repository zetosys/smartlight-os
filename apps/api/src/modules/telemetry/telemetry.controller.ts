import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { UlbScoped } from '../../common/decorators/require-permissions.decorator';

@Controller()
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('dashboard/overview')
  @UlbScoped()
  getOverview(@Query('ulbId') ulbId?: string) {
    return this.telemetryService.getDashboardOverview(ulbId);
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
