-- Migration: 005_telemetry_partitions.sql
-- Description: Time-partitioned telemetry storage, continuous hourly/daily rollups, indexes, and retention pruning.

-- 1. Create Monthly Partitions for 2026 on telemetry_readings
CREATE TABLE IF NOT EXISTS telemetry_y2026m01 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m02 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m03 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m04 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m05 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m06 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m07 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m08 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m09 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m10 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m11 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS telemetry_y2026m12 PARTITION OF telemetry_readings
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- 2. Performance Indexes across Partition Key and Devices
CREATE INDEX IF NOT EXISTS idx_telemetry_observed_at_desc ON telemetry_readings (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_observed ON telemetry_readings (device_id, observed_at DESC);

-- 3. Continuous Aggregate: Hourly Rollups Table
CREATE TABLE IF NOT EXISTS telemetry_hourly_rollups (
    bucket_hour TIMESTAMPTZ NOT NULL,
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE CASCADE,
    feeder_id UUID REFERENCES feeders(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    energy_kwh_delta NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    avg_voltage NUMERIC(6, 2),
    min_voltage NUMERIC(6, 2),
    max_voltage NUMERIC(6, 2),
    avg_current NUMERIC(6, 2),
    avg_power_watts NUMERIC(8, 2),
    peak_power_watts NUMERIC(8, 2),
    avg_power_factor NUMERIC(4, 2),
    burning_minutes INT NOT NULL DEFAULT 0,
    samples_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY(bucket_hour, ulb_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_hourly_ulb_time ON telemetry_hourly_rollups (ulb_id, bucket_hour DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_hourly_feeder_time ON telemetry_hourly_rollups (feeder_id, bucket_hour DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_hourly_device_time ON telemetry_hourly_rollups (device_id, bucket_hour DESC);

-- 4. Continuous Aggregate: Daily Rollups Table
CREATE TABLE IF NOT EXISTS telemetry_daily_rollups (
    bucket_date DATE NOT NULL,
    ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE CASCADE,
    feeder_id UUID REFERENCES feeders(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    total_energy_kwh NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    burning_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    uptime_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    avg_power_factor NUMERIC(4, 2),
    peak_power_watts NUMERIC(8, 2),
    PRIMARY KEY(bucket_date, ulb_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_daily_ulb_date ON telemetry_daily_rollups (ulb_id, bucket_date DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_daily_feeder_date ON telemetry_daily_rollups (feeder_id, bucket_date DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_daily_device_date ON telemetry_daily_rollups (device_id, bucket_date DESC);

-- 5. Automated Data Pruning Function for Telemetry Retention Policy
CREATE OR REPLACE FUNCTION prune_telemetry_partitions(retention_days INT DEFAULT 90)
RETURNS INT AS $$
DECLARE
    cutoff_date TIMESTAMPTZ := now() - (retention_days || ' days')::INTERVAL;
    rows_deleted INT := 0;
BEGIN
    -- Delete raw telemetry older than retention threshold (rollups are kept indefinitely)
    DELETE FROM telemetry_readings WHERE observed_at < cutoff_date;
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;
