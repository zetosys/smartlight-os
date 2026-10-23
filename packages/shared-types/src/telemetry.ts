export interface TelemetryReading {
  deviceId: string;
  observedAt: string;
  powerWatts?: number;
  voltage?: number;
  currentAmp?: number;
  energyKwh?: number;
  burningHours?: number;
  powerFactor?: number;
  frequency?: number;
  temperature?: number;
  online: boolean;
  reportedOn?: boolean;
  faultCodes: string[];
  source: 'SIMULATOR' | 'OEM';
}

export interface BatchTelemetryIngestDto {
  readings: TelemetryReading[];
}

export interface IngestionResult {
  accepted: number;
  anomaliesDetected: number;
  timestamp: string;
}

export interface FaultInjectionDto {
  deviceId?: string;
  ulbId?: string;
  faultCode: 'COMMUNICATION_LOSS' | 'LAMP_FAILURE' | 'DAY_BURNING' | 'VOLTAGE_SAG' | 'OVERVOLTAGE' | 'LOW_POWER_FACTOR';
  percentage?: number;
}

export interface SimulatorFleetStatus {
  adapterId: string;
  scenarioName: string;
  seed: number;
  activeDevices: number;
  isRunning: boolean;
  emissionIntervalMs: number;
  ulbBreakdown: {
    ganderbal: { total: number; '35W': number; '70W': number; '110W': number };
    katra: { total: number; '35W': number; '70W': number; '110W': number };
  };
  fleetBreakdown: {
    '35W': number;
    '70W': number;
    '110W': number;
  };
  activeFaults: { deviceId: string; faultCode: string; injectedAt: string }[];
  lastTickAt?: string;
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

export type ScheduleMode = 'ASTRONOMICAL' | 'FIXED';
export type ScheduleScope = 'ULB' | 'FEEDER' | 'ZONE' | 'WARD';

export interface ScheduleRule {
  mode: ScheduleMode;
  turnOnOffsetMinutes?: number;
  turnOffOffsetMinutes?: number;
  turnOnTime?: string;
  turnOffTime?: string;
  dimmingCurve?: { time: string; brightness: number }[];
  cronExpression?: string;
}

export interface Schedule {
  id: string;
  ulbId: string;
  name: string;
  scope: ScheduleScope;
  targetId?: string;
  targetName?: string;
  timezone: string;
  rule: ScheduleRule;
  enabled: boolean;
  targetCount?: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateScheduleDto {
  ulbId: string;
  name: string;
  scope: ScheduleScope;
  targetId?: string;
  rule: ScheduleRule;
  enabled?: boolean;
}

export interface SolarTimes {
  date: string;
  latitude: number;
  longitude: number;
  sunrise: string;
  sunset: string;
  dawnCivil: string;
  duskCivil: string;
  solarNoon: string;
  dayLengthMinutes: number;
}

export type TelemetryResolution = 'raw' | '5m' | '1h' | '1d';

export interface TelemetryQueryDto {
  ulbId?: string;
  deviceId?: string;
  feederId?: string;
  from?: string;
  to?: string;
  resolution?: TelemetryResolution;
  limit?: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  voltage: number;
  currentAmp: number;
  powerWatts: number;
  energyKwh: number;
  powerFactor: number;
  frequency: number;
  temperature?: number;
  burningHours?: number;
  onlineCount?: number;
  totalCount?: number;
}

export interface FeederLoadProfile {
  feederId: string;
  feederCode: string;
  feederName: string;
  ulbId: string;
  totalLuminaires: number;
  activeLuminairesOn: number;
  currentPowerKw: number;
  totalEnergyKwhToday: number;
  avgPowerFactor: number;
  phaseDistribution: { phaseR: number; phaseY: number; phaseB: number };
  hourlyLoad: { hour: string; powerKw: number; energyKwh: number }[];
}

export interface EnergySummary {
  ulbId: string;
  period: 'day' | 'week' | 'month' | 'year';
  totalEnergyKwh: number;
  baselineEnergyKwh: number;
  energySavingsKwh: number;
  energySavingsPercent: number;
  co2SavedKg: number;
  costSavingsInr: number;
  dailyTrend: { date: string; actualKwh: number; baselineKwh: number; savingsKwh: number }[];
}

export interface BurningHoursSummary {
  ulbId: string;
  averageBurningHoursPerDay: number;
  slaTargetHours: number;
  slaComplianceRate: number;
  dayBurningIncidents: number;
  lampFailureCount: number;
  feederBreakdown: { feederId: string; feederCode: string; avgBurningHours: number; compliance: number }[];
}

export interface TelemetryHourlyRollup {
  bucketHour: string;
  ulbId: string;
  feederId?: string;
  deviceId?: string;
  energyKwhDelta: number;
  avgVoltage: number;
  minVoltage: number;
  maxVoltage: number;
  avgCurrent: number;
  avgPowerWatts: number;
  peakPowerWatts: number;
  avgPowerFactor: number;
  burningMinutes: number;
  samplesCount: number;
}

export interface TelemetryDailyRollup {
  bucketDate: string;
  ulbId: string;
  feederId?: string;
  deviceId?: string;
  totalEnergyKwh: number;
  burningHours: number;
  uptimePercentage: number;
  avgPowerFactor: number;
  peakPowerWatts: number;
}

