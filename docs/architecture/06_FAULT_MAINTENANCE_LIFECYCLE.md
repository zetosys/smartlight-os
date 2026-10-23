# Fault Detection, Anomaly Rules & Closed-Loop Maintenance

## 1. Real-Time Anomaly Detection Engine

SmartLight OS features an active rule-based anomaly detection engine embedded directly into the telemetry ingestion pipeline (`TelemetryService.evaluateAnomalies`). Every incoming reading is evaluated against electrical physics models and operational state constraints.

```
Incoming Telemetry Reading
           |
           v
+--------------------------+
|  Anomaly Rules Engine    |
+------------+-------------+
             |
   [Threshold Tripped?]
     /              \
   Yes               No -> Buffer Telemetry & Update Device State
    |
    v
+--------------------------+
|  Alert Upsert Engine     | -> Checks for existing active alert on device
+------------+-------------+
             |
             +---> CRITICAL / MAJOR / WARNING Alert Generated
             |
             v
+-------------------------------------------------------------+
|  Closed-Loop Work Order (MaintenanceService.createTicket)   |
+-------------------------------------------------------------+
```

### Anomaly Rule Specifications

| Rule Code | Evaluation Criteria | Severity | Operational Cause |
| :--- | :--- | :--- | :--- |
| **`LAMP_FAILURE`** | `desired_on == true` AND `power_watts < 5.0W` (while `online == true`) | **`MAJOR`** | LED driver failure, burnt emitter board, or open secondary circuit. |
| **`DAY_BURNING`** | `desired_on == false` AND `power_watts > 20.0W` | **`WARNING`** | Welded relay contacts, bypassed manual switch, or stuck contractor. |
| **`VOLTAGE_ANOMALY`**| `voltage < 185V` (Sag) OR `voltage > 260V` (Surge) | **`CRITICAL`** | Grid transformer tap malfunction, open neutral, or phase imbalance. |
| **`LOW_POWER_FACTOR`**| `power_factor < 0.80` (while `power_watts > 20.0W`) | **`WARNING`** | Deteriorated power factor correction capacitor in luminaire driver. |
| **`DEVICE_OFFLINE`** | `now - last_seen_at > 15 minutes` | **`MAJOR`** | Cellular/LoRaWAN gateway outage, blown feeder fuse, or stolen cable. |

---

## 2. Closed-Loop Maintenance Lifecycle

Maintenance tickets follow a formal closed-loop workflow ensuring accountability from initial anomaly detection through field technician dispatch and spare part consumption:

```
[ALERT OPEN]
     |
     v
[TICKET CREATED] (Status: OPEN, Priority mapped from Alert Severity)
     |
     v
[ASSIGNED] (Field Technician assigned based on ULB jurisdiction)
     |
     v
[IN_PROGRESS] (Technician on-site, troubleshooting luminaire)
     |
     v
[RESOLVED] (Spare parts deducted from inventory, notes recorded)
     |
     +---> [LINKED ALERT AUTOMATICALLY MARKED RESOLVED]
     |
     v
[CLOSED] (Audited and approved by Municipal Ward Supervisor)
```

---

## 3. Spare Parts Inventory & Stock Deduction

Municipal maintenance yards maintain stock of critical replacement components:
- **`PART-SPD-10KV`**: 10kV Surge Protection Device (common grid surge replacement)
- **`PART-DRV-70W`**: 70W DALI/1-10V Constant Current Dimmable LED Driver
- **`PART-DRV-110W`**: 110W Industrial Streetlight Driver
- **`PART-FUSE-16A`**: 16A HRC Feeder Panel Protection Fuse
- **`PART-MOD-NEMA`**: 7-Pin NEMA Smart Lighting Controller Node

When a technician marks a ticket as `RESOLVED` and specifies `sparePartsUsed: [{ partCode: 'PART-SPD-10KV', quantity: 1 }]`, the system atomically deducts inventory from the warehouse stock and logs the transaction to the audit trail.

---

## 4. Operational KPIs: MTTR & MTBF
- **MTTR (Mean Time to Repair)**: Measured in hours from `alert.openedAt` to `ticket.resolvedAt`. Municipal SLA contracts typically mandate MTTR $< 24$ hours for critical highway feeders and $< 48$ hours for residential streets.
- **MTBF (Mean Time Between Failures)**: Calculated per device model and feeder panel to identify batch hardware defects or problematic electrical substations.
