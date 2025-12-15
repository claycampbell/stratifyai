-- Migration 007: Add advanced KPI fields to production database
-- Adds fields for enhanced KPI management features

-- Add owner_email column
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);

-- Add tags column for categorization
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add validation_rules column for data validation
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS validation_rules JSONB;

-- Add ownership tracking
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS ownership VARCHAR(255);

-- Add persons_responsible for accountability
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS persons_responsible TEXT[];

-- Add category_id for grouping
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES ogsm_components(id) ON DELETE SET NULL;

-- Add threshold columns for auto-calculation
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS at_risk_threshold DECIMAL DEFAULT 0.8;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS off_track_threshold DECIMAL DEFAULT 0.6;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS auto_calculate_status BOOLEAN DEFAULT true;

-- Add trend tracking
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS trend_direction VARCHAR(20);
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS last_calculated TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kpis_owner_email ON kpis(owner_email);
CREATE INDEX IF NOT EXISTS idx_kpis_category_id ON kpis(category_id);
CREATE INDEX IF NOT EXISTS idx_kpis_tags ON kpis USING GIN(tags);

-- Add comments for documentation
COMMENT ON COLUMN kpis.owner_email IS 'Email of the KPI owner responsible for updates';
COMMENT ON COLUMN kpis.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN kpis.validation_rules IS 'JSON validation rules for KPI values';
COMMENT ON COLUMN kpis.ownership IS 'Ownership type or team name';
COMMENT ON COLUMN kpis.persons_responsible IS 'Array of people responsible for this KPI';
COMMENT ON COLUMN kpis.category_id IS 'Reference to OGSM component category';
COMMENT ON COLUMN kpis.at_risk_threshold IS 'Threshold percentage for at-risk status (0.0-1.0)';
COMMENT ON COLUMN kpis.off_track_threshold IS 'Threshold percentage for off-track status (0.0-1.0)';
COMMENT ON COLUMN kpis.auto_calculate_status IS 'Whether to automatically calculate status based on thresholds';
COMMENT ON COLUMN kpis.trend_direction IS 'Direction of trend: improving, declining, stable';
COMMENT ON COLUMN kpis.last_calculated IS 'Last time auto-calculation was performed';
