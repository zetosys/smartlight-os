import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AuthContextUser,
} from '@smartlight/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequirePermissions,
  UlbScoped,
} from '../../common/decorators/require-permissions.decorator';

@Controller()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // --- Alerts Endpoints ---

  @Get('alerts')
  @UlbScoped()
  getAlerts(
    @Query('ulbId') ulbId?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('code') code?: string,
  ) {
    return this.maintenanceService.getAlerts(ulbId, status, severity, code);
  }

  @Get('alerts/:id')
  getAlertById(@Param('id') id: string) {
    return this.maintenanceService.getAlertById(id);
  }

  @Post('alerts/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('alerts.acknowledge')
  acknowledgeAlert(
    @Param('id') id: string,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.maintenanceService.acknowledgeAlert(id, user);
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('alerts.acknowledge')
  resolveAlert(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.maintenanceService.resolveAlert(id, user, notes);
  }

  @Post('alerts/:id/ticket')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('tickets.create')
  createTicketFromAlert(
    @Param('id') id: string,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.maintenanceService.createTicketFromAlert(id, user);
  }

  // --- Maintenance Tickets & Work Orders Endpoints ---

  @Get('tickets')
  @UlbScoped()
  getTickets(
    @Query('ulbId') ulbId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.maintenanceService.getTickets(ulbId, status, priority, assignedTo);
  }

  @Get('tickets/:id')
  getTicketById(@Param('id') id: string) {
    return this.maintenanceService.getTicketById(id);
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('tickets.create')
  @UlbScoped()
  createTicket(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.maintenanceService.createTicket(dto, user);
  }

  @Put('tickets/:id')
  @RequirePermissions('tickets.create')
  updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.maintenanceService.updateTicket(id, dto, user);
  }

  @Post('tickets/:id/assign')
  @RequirePermissions('tickets.assign')
  assignTicket(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.maintenanceService.assignTicket(id, assignedTo, user);
  }

  @Post('tickets/:id/status')
  @RequirePermissions('tickets.resolve')
  updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.maintenanceService.updateTicket(id, dto, user);
  }

  // --- Spare Parts Inventory Endpoints ---

  @Get('maintenance/spare-parts')
  getSpareParts() {
    return this.maintenanceService.getSpareParts();
  }

  @Post('maintenance/spare-parts/:id/restock')
  @RequirePermissions('org.manage')
  restockSparePart(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.maintenanceService.restockSparePart(id, quantity, user);
  }
}
