export interface AuditLog {
  id: string;
  ulbId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details: Record<string, unknown>;
  occurredAt: string;
}

export interface SimulationRun {
  id: string;
  ulbId?: string | null;
  scenario: string;
  seed: number;
  status: 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  startedAt?: string | null;
  devicesCount?: number;
  activeFaultsCount?: number;
}
