-- Migration: Ensure KPI History table exists with correct schema
-- This migration is idempotent and safe to run multiple times

-- Create KPI History table if it doesn't exist
CREATE TABLE IF NOT EXISTS kpi_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
    value DECIMAL NOT NULL,
    recorded_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries by KPI
CREATE INDEX IF NOT EXISTS idx_kpi_history_kpi_id ON kpi_history(kpi_id);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_kpi_history_recorded_date ON kpi_history(recorded_date);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_kpi_history_kpi_date ON kpi_history(kpi_id, recorded_date DESC);

-- Add comment for documentation
COMMENT ON TABLE kpi_history IS 'Stores historical data points for KPIs to enable trending and forecasting';
COMMENT ON COLUMN kpi_history.kpi_id IS 'Reference to the KPI this history entry belongs to';
COMMENT ON COLUMN kpi_history.value IS 'The measured value at this point in time';
COMMENT ON COLUMN kpi_history.recorded_date IS 'The date this value was recorded or applies to';
COMMENT ON COLUMN kpi_history.notes IS 'Optional notes or context about this data point';
