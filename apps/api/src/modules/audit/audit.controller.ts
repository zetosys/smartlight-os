import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermissions, UlbScoped } from '../../common/decorators/require-permissions.decorator';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  @UlbScoped()
  getLogs(
    @Query('ulbId') ulbId?: string,
    @Query('limit') limit: string = '50',
  ) {
    return this.auditService.getLogs(ulbId, parseInt(limit, 10));
  }
}
