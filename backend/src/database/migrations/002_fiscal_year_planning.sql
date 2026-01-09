-- Migration: Fiscal Year Planning Mode
-- Description: Creates tables for fiscal year planning workflow
-- Date: 2026-01-08

-- Note: Using gen_random_uuid() which is built-in to PostgreSQL 13+
-- Azure PostgreSQL doesn't require uuid-ossp extension

-- Table: fiscal_year_plans
-- Tracks each planning cycle (FY27, FY28, etc.)
CREATE TABLE IF NOT EXISTS fiscal_year_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year VARCHAR(10) NOT NULL UNIQUE,  -- 'FY27', 'FY28'
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Table: fiscal_year_priorities
-- Stores the 3 core objectives for each fiscal year
CREATE TABLE IF NOT EXISTS fiscal_year_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_plan_id UUID NOT NULL REFERENCES fiscal_year_plans(id) ON DELETE CASCADE,
  priority_number INTEGER NOT NULL CHECK (priority_number BETWEEN 1 AND 3),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  imported_from_ogsm_id UUID REFERENCES ogsm_components(id), -- If carried over from last year
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fiscal_plan_id, priority_number)
);

-- Table: fiscal_year_draft_strategies
-- Holds AI-generated strategies before conversion to formal OGSM
CREATE TABLE IF NOT EXISTS fiscal_year_draft_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_plan_id UUID NOT NULL REFERENCES fiscal_year_plans(id) ON DELETE CASCADE,
  priority_id UUID NOT NULL REFERENCES fiscal_year_priorities(id) ON DELETE CASCADE,

  -- Strategy details from AI generation
  title VARCHAR(255) NOT NULL,
  description TEXT,
  rationale TEXT,
  implementation_steps JSONB, -- Array of steps
  success_probability DECIMAL(3,2),
  estimated_cost VARCHAR(20),
  timeframe VARCHAR(100),
  risks JSONB,
  required_resources JSONB,
  success_metrics JSONB, -- Array of KPI names that will be created
  supporting_evidence JSONB,

  -- Workflow status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'rejected', 'converted')),
  converted_to_ogsm_id UUID REFERENCES ogsm_components(id), -- Link to final OGSM strategy

  -- Metadata
  generated_from_ai BOOLEAN DEFAULT TRUE,
  ai_generation_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fiscal_plans_status ON fiscal_year_plans(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_plans_fiscal_year ON fiscal_year_plans(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_fiscal_priorities_plan ON fiscal_year_priorities(fiscal_plan_id);
CREATE INDEX IF NOT EXISTS idx_draft_strategies_plan ON fiscal_year_draft_strategies(fiscal_plan_id);
CREATE INDEX IF NOT EXISTS idx_draft_strategies_priority ON fiscal_year_draft_strategies(priority_id);
CREATE INDEX IF NOT EXISTS idx_draft_strategies_status ON fiscal_year_draft_strategies(status);

-- Comments for documentation
COMMENT ON TABLE fiscal_year_plans IS 'Tracks fiscal year planning cycles (FY27, FY28, etc.)';
COMMENT ON TABLE fiscal_year_priorities IS 'Stores the 3 core priorities/objectives for each fiscal year';
COMMENT ON TABLE fiscal_year_draft_strategies IS 'AI-generated strategies before conversion to formal OGSM components';
COMMENT ON COLUMN fiscal_year_draft_strategies.converted_to_ogsm_id IS 'Links to the OGSM strategy component after conversion';
COMMENT ON COLUMN fiscal_year_draft_strategies.ai_generation_id IS 'References the ai_generated_strategies table entry';
