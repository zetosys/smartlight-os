import { Controller, Get, Post, Body } from '@nestjs/common';
import { SimulatorServiceModule } from './simulator.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { FaultInjectionDto } from '@smartlight/shared-types';

@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simService: SimulatorServiceModule) {}

  @Get('status')
  getStatus() {
    return this.simService.getStatus();
  }

  @Post('start')
  @RequirePermissions('simulator.manage')
  startLoop(@Body() body?: { intervalMs?: number }) {
    return this.simService.startLoop(body?.intervalMs || 10000);
  }

  @Post('stop')
  @RequirePermissions('simulator.manage')
  stopLoop() {
    return this.simService.stopLoop();
  }

  @Post('tick')
  @RequirePermissions('simulator.manage')
  triggerTick(@Body() body?: { sampleCount?: number }) {
    return this.simService.triggerTick(body?.sampleCount || 60);
  }

  @Post('seed-fleet')
  @RequirePermissions('simulator.manage')
  seedFleet(@Body() body?: { seed?: number }) {
    return this.simService.seedFleet(body?.seed || 365);
  }

  @Post('fault')
  @RequirePermissions('simulator.manage')
  injectFault(@Body() body: FaultInjectionDto) {
    return this.simService.injectFault(body);
  }

  @Post('fault/clear')
  @RequirePermissions('simulator.manage')
  clearFaults(@Body() body?: { deviceId?: string }) {
    return this.simService.clearFaults(body?.deviceId);
  }
}
