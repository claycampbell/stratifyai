-- Migration: P0-001 KPI Terminology Updates
-- Replace "Lead" with "Ownership" (Primary) and add "Persons Responsible" (Secondary)
-- Date: 2025-11-03

-- Add new columns to kpis table
ALTER TABLE kpis
  ADD COLUMN IF NOT EXISTS ownership VARCHAR(255),
  ADD COLUMN IF NOT EXISTS persons_responsible VARCHAR(255)[];

-- Migrate data: Extract Lead from description and populate ownership
-- This is a best-effort migration for existing data
DO $$
DECLARE
  kpi_record RECORD;
  lead_value TEXT;
  description_parts TEXT[];
  part TEXT;
BEGIN
  FOR kpi_record IN SELECT id, description FROM kpis WHERE ownership IS NULL LOOP
    -- Try to extract Lead from description
    IF kpi_record.description IS NOT NULL AND kpi_record.description LIKE '%Lead:%' THEN
      -- Extract the Lead value from description
      lead_value := NULL;

      -- Parse description for "Lead: value" pattern
      description_parts := string_to_array(kpi_record.description, ' | ');
      FOREACH part IN ARRAY description_parts LOOP
        IF part LIKE 'Lead:%' THEN
          lead_value := trim(substring(part from 6));
          EXIT;
        END IF;
      END LOOP;

      -- Update ownership if we found a lead value
      IF lead_value IS NOT NULL AND lead_value != '' THEN
        UPDATE kpis SET ownership = lead_value WHERE id = kpi_record.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- NOTE: We preserve owner_email as-is for backward compatibility with notifications
-- No data will be lost or overwritten - we're only adding new columns

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_kpis_ownership ON kpis(ownership);
CREATE INDEX IF NOT EXISTS idx_kpis_persons_responsible ON kpis USING GIN(persons_responsible);

-- Add comments for documentation
COMMENT ON COLUMN kpis.ownership IS 'Primary owner responsible for the KPI';
COMMENT ON COLUMN kpis.persons_responsible IS 'Array of secondary team members responsible for the KPI';
