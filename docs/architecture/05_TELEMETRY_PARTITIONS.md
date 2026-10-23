# Telemetry Storage, Range Partitioning & Continuous Aggregations

## 1. High-Frequency Telemetry Ingestion Architecture

In a municipal deployment of 4,608 luminaires and 60 CCMS feeder panels:
- Luminaires transmit telemetry at 60-second intervals.
- CCMS feeder panels transmit 3-phase electrical samples every 30 seconds.
- Total ingestion throughput: **~4,700 messages/minute** or **~6.8 million readings/day**.

To maintain sub-100ms analytics queries and prevent catastrophic B-Tree index bloat, the data layer utilizes **monthly declarative range partitioning** combined with automated rollups.

```
+---------------------------------------------------------------------------------+
|                               telemetry_readings                                |
|                        PARTITION BY RANGE (observed_at)                         |
+---------------------------------------------------------------------------------+
          |                                     |
          v                                     v
+-------------------------------+     +-------------------------------+
| telemetry_readings_2026_10    |     | telemetry_readings_2026_11    |
| (2026-10-01 to 2026-11-01)    |     | (2026-11-01 to 2026-12-01)    |
+-------------------------------+     +-------------------------------+
```

---

## 2. PostgreSQL DDL & Partitioning Strategy

### Master Partition Table
```sql
CREATE TABLE IF NOT EXISTS telemetry_readings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL,
    voltage NUMERIC(6, 2),
    current_amp NUMERIC(6, 3),
    power_watts NUMERIC(8, 2),
    power_factor NUMERIC(4, 3),
    frequency NUMERIC(5, 2),
    temperature NUMERIC(5, 2),
    energy_kwh NUMERIC(12, 3),
    burning_hours NUMERIC(10, 2),
    reported_on BOOLEAN,
    online BOOLEAN NOT NULL DEFAULT true,
    fault_codes TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, observed_at)
) PARTITION BY RANGE (observed_at);
```

### Partition Pruning & Query Optimization
When queries include `WHERE observed_at >= '2026-10-01' AND observed_at < '2026-10-31'`, PostgreSQL's query planner automatically prunes all partitions outside that temporal window. No index pages for past or future months are loaded into PostgreSQL shared buffers.

---

## 3. Continuous Rollups & Summaries

To service control room dashboards and executive reports without running sequential scans over millions of raw telemetry rows, the system computes pre-aggregated summaries:

### Aggregation Resolutions
1. **Raw (`raw`)**: High-resolution event stream, retained for 90 days.
2. **5-Minute (`5m`)**: Average voltage, RMS current, active power, and status flags. Serves live chart widgets.
3. **Hourly (`1h`)**: Aggregates energy consumption (kWh) and burning hours per ward/feeder.
4. **Daily (`1d`)**: Municipal billing rollups, SLA availability metrics, and carbon reduction figures.

### SLA Uptime Calculation
Municipal streetlight concession contracts specify strict uptime criteria (typically $\ge 98.5\%$ uptime during scheduled burning hours).
The SLA availability percentage is computed as:

$$\text{SLA Uptime \%} = \frac{\sum \text{Reported Burning Hours}}{\sum \text{Scheduled Burning Hours}} \times 100$$

If uptime falls below the contract threshold (e.g. 95%), automated penalties are highlighted in monthly municipal billing summaries.

---

## 4. In-Memory Store & Buffer Management
For fast testing and development environments without a live PostgreSQL cluster:
- `DatabaseService.memoryStore.telemetry` maintains a high-performance in-memory ring buffer (up to 5,000 recent samples).
- When the buffer reaches capacity, the oldest records are pruned to maintain constant memory overhead.
- All analytical queries (`getOverviewKpis`, `getTimeSeries`, `getFeederLoadProfile`, `getEnergySummary`, `getBurningHoursSummary`) execute transparently against both PostgreSQL and the in-memory store.
