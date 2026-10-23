import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CommandsService } from './commands.service';
import {
  CreateScheduleDto,
  Schedule,
  SolarTimes,
  AuthContextUser,
} from '@smartlight/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  UlbScoped,
} from '../../common/decorators/require-permissions.decorator';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly commandsService: CommandsService) {}

  @Get('solar')
  async getSolarTimes(
    @Query('ulbId') ulbId?: string,
    @Query('date') date?: string,
  ): Promise<SolarTimes> {
    if (!ulbId) {
      throw new BadRequestException('ulbId query parameter is required');
    }
    return this.commandsService.getSolarTimes(ulbId, date);
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('devices.command')
  async evaluateSchedules(
    @Query('date') date?: string,
    @CurrentUser() user?: AuthContextUser,
  ) {
    return this.commandsService.evaluateSchedules(date, user);
  }

  @Get()
  @UlbScoped()
  async getSchedules(@Query('ulbId') ulbId?: string): Promise<Schedule[]> {
    return this.commandsService.getSchedules(ulbId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('schedules.manage')
  @UlbScoped()
  async createSchedule(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: AuthContextUser,
  ): Promise<Schedule> {
    return this.commandsService.createSchedule(dto, user);
  }

  @Get(':id')
  async getScheduleById(@Param('id') id: string): Promise<Schedule> {
    return this.commandsService.getScheduleById(id);
  }

  @Put(':id')
  @RequirePermissions('schedules.manage')
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: Partial<CreateScheduleDto>,
    @CurrentUser() user: AuthContextUser,
  ): Promise<Schedule> {
    return this.commandsService.updateSchedule(id, dto, user);
  }

  @Post(':id/toggle')
  @RequirePermissions('schedules.manage')
  async toggleSchedule(
    @Param('id') id: string,
    @CurrentUser() user: AuthContextUser,
  ): Promise<Schedule> {
    return this.commandsService.toggleSchedule(id, user);
  }

  @Delete(':id')
  @RequirePermissions('schedules.manage')
  async deleteSchedule(
    @Param('id') id: string,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.commandsService.deleteSchedule(id, user);
  }
}
