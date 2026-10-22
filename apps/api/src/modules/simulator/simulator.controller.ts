import { Controller, Get, Post, Body } from '@nestjs/common';
import { SimulatorServiceModule } from './simulator.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simService: SimulatorServiceModule) {}

  @Get('status')
  getStatus() {
    return this.simService.getStatus();
  }

  @Post('tick')
  @RequirePermissions('simulator.manage')
  triggerTick() {
    return this.simService.triggerTick();
  }

  @Post('fault')
  @RequirePermissions('simulator.manage')
  injectFault(@Body() body: { deviceId: string; faultCode: string }) {
    return this.simService.injectFault(body.deviceId, body.faultCode);
  }
}
