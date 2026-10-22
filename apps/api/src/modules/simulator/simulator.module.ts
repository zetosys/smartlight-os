import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorServiceModule } from './simulator.service';

@Module({
  controllers: [SimulatorController],
  providers: [SimulatorServiceModule],
  exports: [SimulatorServiceModule],
})
export class SimulatorModule {}
