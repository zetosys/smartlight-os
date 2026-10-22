import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorServiceModule } from './simulator.service';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [TelemetryModule],
  controllers: [SimulatorController],
  providers: [SimulatorServiceModule],
  exports: [SimulatorServiceModule],
})
export class SimulatorModule {}
