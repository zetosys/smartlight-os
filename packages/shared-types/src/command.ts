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
}
