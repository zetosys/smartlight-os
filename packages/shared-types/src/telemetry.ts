export interface TelemetryReading {
  deviceId: string;
  observedAt: string;
  powerWatts?: number;
  voltage?: number;
  currentAmp?: number;
  energyKwh?: number;
  burningHours?: number;
  online: boolean;
  reportedOn?: boolean;
  faultCodes: string[];
  source: 'SIMULATOR' | 'OEM';
}

export type AlertSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING' | 'INFO';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLOSED';

export interface Alert {
  id: string;
  ulbId: string;
  deviceId?: string;
  code: string;
  message?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  openedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'RESOLVED' | 'CLOSED';

export interface MaintenanceTicket {
  id: string;
  ulbId: string;
  alertId?: string;
  assignedTo?: string;
  status: TicketStatus;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleRule {
  cronExpression?: string;
  turnOnTime?: string; // "18:30"
  turnOffTime?: string; // "05:45"
  astronomicalOffsetMinutes?: number;
  dimmingCurve?: { time: string; brightness: number }[];
}

export interface Schedule {
  id: string;
  ulbId: string;
  name: string;
  timezone: string;
  rule: ScheduleRule;
  enabled: boolean;
  targetCount?: number;
  createdAt: string;
}
