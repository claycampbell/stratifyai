-- Migration: Add tags column to kpis table
-- Description: Fix missing tags column in kpis table on Azure production database
-- Date: 2025-12-11
-- Author: Claude Code

-- Add tags column to kpis table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'kpis' AND column_name = 'tags'
    ) THEN
        ALTER TABLE kpis ADD COLUMN tags VARCHAR(255)[];
        RAISE NOTICE 'Added tags column to kpis table';
    ELSE
        RAISE NOTICE 'tags column already exists in kpis table';
    END IF;
END $$;

-- Create GIN index for tags column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_kpis_tags ON kpis USING GIN(tags);

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: kpis table tags column has been added successfully';
END $$;
