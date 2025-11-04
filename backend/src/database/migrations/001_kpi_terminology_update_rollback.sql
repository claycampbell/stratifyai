-- Rollback Migration: P0-001 KPI Terminology Updates
-- Removes ownership and persons_responsible columns
-- Date: 2025-11-03

-- Remove indexes
DROP INDEX IF EXISTS idx_kpis_ownership;
DROP INDEX IF EXISTS idx_kpis_persons_responsible;

-- Remove columns
ALTER TABLE kpis
  DROP COLUMN IF EXISTS ownership,
  DROP COLUMN IF EXISTS persons_responsible;
