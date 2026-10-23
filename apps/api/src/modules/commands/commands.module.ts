import { Module } from '@nestjs/common';
import { CommandsController } from './commands.controller';
import { SchedulesController } from './schedules.controller';
import { CommandsService } from './commands.service';

@Module({
  controllers: [CommandsController, SchedulesController],
  providers: [CommandsService],
  exports: [CommandsService],
})
export class CommandModule {}
