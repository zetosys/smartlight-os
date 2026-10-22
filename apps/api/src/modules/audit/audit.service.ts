import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  public getLogs(ulbId?: string, limit: number = 50) {
    let logs = this.db.memoryStore.auditLogs;
    if (ulbId) {
      logs = logs.filter((l) => l.ulb_id === ulbId || !l.ulb_id);
    }
    return logs.slice(-limit).reverse();
  }
}
