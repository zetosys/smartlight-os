-- Migration: 006_alerts_maintenance.sql
-- Description: Spare parts inventory, ticket resolution notes, and maintenance work orders.

-- 1. Alter maintenance_tickets to include device_id, resolution_notes, and resolved_at
ALTER TABLE maintenance_tickets
    ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 2. Spare Parts Catalog & Inventory
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('LUMINAIRE','DRIVER','PROTECTION','SWITCHGEAR','CABLE')),
    quantity_in_stock INT NOT NULL DEFAULT 100,
    unit_cost_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Ticket Spare Parts Consumption Logging
CREATE TABLE IF NOT EXISTS ticket_spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
    spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Initial Seed Spare Parts
INSERT INTO spare_parts (code, name, category, quantity_in_stock, unit_cost_inr) VALUES
  ('PART-LED-35W', '35W High-Efficiency LED Modular Luminaire', 'LUMINAIRE', 120, 2400.00),
  ('PART-LED-70W', '70W High-Efficiency LED Modular Luminaire', 'LUMINAIRE', 150, 3800.00),
  ('PART-LED-110W', '110W High-Efficiency LED Modular Luminaire', 'LUMINAIRE', 80, 5200.00),
  ('PART-SPD-10KV', '10kV / 10kA Surge Protection Device (SPD)', 'PROTECTION', 250, 650.00),
  ('PART-DRV-100W', 'Constant-Current Dimmable LED Driver 100W', 'DRIVER', 140, 1450.00),
  ('PART-CON-63A', 'CCMS Contactor 63A 3-Phase 4-Pole', 'SWITCHGEAR', 60, 2100.00),
  ('PART-FUSE-32A', 'Phase Protection Fast-Blow Fuse 32A', 'PROTECTION', 300, 180.00)
ON CONFLICT (code) DO NOTHING;
