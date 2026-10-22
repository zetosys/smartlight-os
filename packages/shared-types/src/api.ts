export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: 'up' | 'down'; latencyMs?: number };
    redis: { status: 'up' | 'down'; latencyMs?: number };
    mqtt: { status: 'up' | 'down'; latencyMs?: number };
    adapterRegistry: { status: 'up' | 'down'; loadedAdapters: string[] };
  };
}

export interface OverviewDashboardKpi {
  totalLuminaires: number;
  activeLuminairesOn: number;
  activeLuminairesOff: number;
  onlineDevices: number;
  offlineDevices: number;
  openAlerts: number;
  activeTickets: number;
  totalEnergyKwhToday: number;
  currentPowerKw: number;
  uptimePercentage: number;
  complianceNote: string;
}
