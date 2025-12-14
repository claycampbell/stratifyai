-- Migration: Fix missing tags columns in production database
-- Description: Add tags columns to tables that are missing them
-- Date: 2025-12-11
-- Author: Claude Code

-- Check and add tags column to kpis table if missing
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

-- Check and add tags column to risks table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'risks' AND column_name = 'tags'
    ) THEN
        ALTER TABLE risks ADD COLUMN tags VARCHAR(255)[];
        RAISE NOTICE 'Added tags column to risks table';
    ELSE
        RAISE NOTICE 'tags column already exists in risks table';
    END IF;
END $$;

-- Check and add tags column to initiatives table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'initiatives' AND column_name = 'tags'
    ) THEN
        ALTER TABLE initiatives ADD COLUMN tags VARCHAR(255)[];
        RAISE NOTICE 'Added tags column to initiatives table';
    ELSE
        RAISE NOTICE 'tags column already exists in initiatives table';
    END IF;
END $$;

-- Check and add tags column to scenarios table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scenarios' AND column_name = 'tags'
    ) THEN
        ALTER TABLE scenarios ADD COLUMN tags VARCHAR(255)[];
        RAISE NOTICE 'Added tags column to scenarios table';
    ELSE
        RAISE NOTICE 'tags column already exists in scenarios table';
    END IF;
END $$;

-- Check and add tags column to budgets table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'budgets' AND column_name = 'tags'
    ) THEN
        ALTER TABLE budgets ADD COLUMN tags VARCHAR(255)[];
        RAISE NOTICE 'Added tags column to budgets table';
    ELSE
        RAISE NOTICE 'tags column already exists in budgets table';
    END IF;
END $$;

-- Check and add tags column to resources table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'resources' AND column_name = 'tags'
    ) THEN
        ALTER TABLE resources ADD COLUMN tags VARCHAR(255)[];
        RAISE NOTICE 'Added tags column to resources table';
    ELSE
        RAISE NOTICE 'tags column already exists in resources table';
    END IF;
END $$;

-- Check and add tags column to ogsm_templates table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ogsm_templates' AND column_name = 'tags'
    ) THEN
        ALTER TABLE ogsm_templates ADD COLUMN tags VARCHAR(255)[];
        RAISE NOTICE 'Added tags column to ogsm_templates table';
    ELSE
        RAISE NOTICE 'tags column already exists in ogsm_templates table';
    END IF;
END $$;

-- Check and add tags column to strategy_knowledge table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'strategy_knowledge' AND column_name = 'tags'
    ) THEN
        ALTER TABLE strategy_knowledge ADD COLUMN tags VARCHAR(255)[];
        RAISE NOTICE 'Added tags column to strategy_knowledge table';
    ELSE
        RAISE NOTICE 'tags column already exists in strategy_knowledge table';
    END IF;
END $$;

-- Create GIN indexes for tags columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_kpis_tags ON kpis USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_risks_tags ON risks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_initiatives_tags ON initiatives USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ogsm_templates_tags ON ogsm_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_strategy_knowledge_tags ON strategy_knowledge USING GIN(tags);

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: All tags columns have been checked and added where missing';
END $$;
