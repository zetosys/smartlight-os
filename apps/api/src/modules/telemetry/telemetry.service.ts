import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { OverviewDashboardKpi } from '@smartlight/shared-types';

@Injectable()
export class TelemetryService {
  constructor(private readonly db: DatabaseService) {}

  public getDashboardOverview(ulbId?: string): OverviewDashboardKpi {
    let devices = this.db.memoryStore.devices;
    let alerts = this.db.memoryStore.alerts;
    let tickets = this.db.memoryStore.tickets;
    let luminaires = this.db.memoryStore.luminaires;

    if (ulbId) {
      devices = devices.filter((d) => d.ulb_id === ulbId);
      alerts = alerts.filter((a) => a.ulb_id === ulbId);
      tickets = tickets.filter((t) => t.ulb_id === ulbId);
      luminaires = luminaires.filter((l) => l.ulb_id === ulbId);
    }

    const totalLuminaires = luminaires.length;
    const onlineDevices = devices.filter((d) => d.is_online).length;
    const offlineDevices = devices.length - onlineDevices;
    const activeLuminairesOn = devices.filter((d) => d.reported_on).length;
    const activeLuminairesOff = devices.length - activeLuminairesOn;
    const openAlerts = alerts.filter((a) => a.status === 'OPEN').length;
    const activeTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

    // Calculate simulated active wattage
    let currentPowerWatts = 0;
    for (const d of devices) {
      if (d.reported_on) {
        const lum = luminaires.find((l) => l.id === d.luminaire_id);
        currentPowerWatts += lum?.wattage ?? 70;
      }
    }

    return {
      totalLuminaires,
      activeLuminairesOn,
      activeLuminairesOff,
      onlineDevices,
      offlineDevices,
      openAlerts,
      activeTickets,
      currentPowerKw: Number((currentPowerWatts / 1000).toFixed(2)),
      totalEnergyKwhToday: Number(((currentPowerWatts * 6.5) / 1000).toFixed(2)),
      uptimePercentage: 99.8,
      complianceNote:
        'Engineering prototype with deterministic simulated IoT fleet. Tender certification pending field validation.',
    };
  }

  public getAlerts(ulbId?: string, status?: string) {
    let list = this.db.memoryStore.alerts;
    if (ulbId) {
      list = list.filter((a) => a.ulb_id === ulbId);
    }
    if (status) {
      list = list.filter((a) => a.status === status);
    }
    return list;
  }

  public acknowledgeAlert(id: string) {
    const alert = this.db.memoryStore.alerts.find((a) => a.id === id);
    if (!alert) {
      throw new NotFoundException(`Alert '${id}' not found`);
    }
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledged_at = new Date().toISOString();
    return alert;
  }

  public getTickets(ulbId?: string) {
    if (ulbId) {
      return this.db.memoryStore.tickets.filter((t) => t.ulb_id === ulbId);
    }
    return this.db.memoryStore.tickets;
  }
}
