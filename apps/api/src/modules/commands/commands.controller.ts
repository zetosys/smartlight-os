import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandsService } from './commands.service';
import {
  CreateCommandDto,
  CreateBatchCommandDto,
  AuthContextUser,
} from '@smartlight/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  UlbScoped,
} from '../../common/decorators/require-permissions.decorator';

@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions('devices.command')
  @UlbScoped()
  async submitCommand(
    @Body() dto: CreateCommandDto,
    @CurrentUser() user: AuthContextUser,
    @Headers('x-ulb-id') ulbIdHeader?: string,
  ) {
    return this.commandsService.submitCommand(dto, user, ulbIdHeader);
  }

  @Post('batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions('devices.command')
  @UlbScoped()
  async submitBatchCommand(
    @Body() dto: CreateBatchCommandDto,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.commandsService.submitBatchCommand(dto, user);
  }

  @Get(':id')
  async getCommandById(@Param('id') id: string) {
    return this.commandsService.getCommandById(id);
  }

  @Get()
  @UlbScoped()
  async getCommands(
    @Query('ulbId') ulbId?: string,
    @Query('limit') limit: string = '20',
  ) {
    return this.commandsService.getCommands(ulbId, parseInt(limit, 10));
  }
}
