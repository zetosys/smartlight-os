export type CommandType =
  | 'TURN_ON'
  | 'TURN_OFF'
  | 'GET_STATUS'
  | 'SET_SCHEDULE'
  | 'UPDATE_CONFIG'
  | 'SET_DIMMING';

export type CommandStatus =
  | 'QUEUED'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'TIMED_OUT';

export interface DeviceCommand {
  commandId: string;
  deviceId: string;
  ulbId?: string;
  type: CommandType;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  status?: CommandStatus;
  requestedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommandAttempt {
  id: string;
  commandId: string;
  attemptedAt: string;
  result: string;
  transportReference?: string;
}

export interface CreateCommandDto {
  deviceId: string;
  type: CommandType;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface CommandSubmissionResponse {
  commandId: string;
  deviceId: string;
  status: CommandStatus;
  idempotencyKey: string;
  createdAt: string;
  isIdempotentReplay: boolean;
}

export type BatchCommandTargetType = 'ULB' | 'FEEDER' | 'ZONE' | 'WARD' | 'STREET' | 'DEVICES';

export interface CreateBatchCommandDto {
  ulbId: string;
  type: CommandType;
  targetType: BatchCommandTargetType;
  targetId?: string;
  deviceIds?: string[];
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

export interface BatchCommandResponse {
  batchId: string;
  ulbId: string;
  type: CommandType;
  targetType: BatchCommandTargetType;
  targetCount: number;
  queuedCount: number;
  confirmedCount: number;
  failedCount: number;
  idempotencyKey: string;
  isIdempotentReplay: boolean;
  createdAt: string;
}
