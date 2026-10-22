import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/require-permissions.decorator';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('health')
  getHealth() {
    return this.healthService.getSystemHealth();
  }

  @Public()
  @Get('health/ready')
  getReadiness() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('health/live')
  getLiveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }
}
