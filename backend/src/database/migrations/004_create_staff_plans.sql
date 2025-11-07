-- Migration: 004_create_staff_plans
-- Description: Create tables for 30/60/90 day staff planning system
-- Dependencies: Requires users table from authentication system
-- Author: Claude Code
-- Date: 2025-11-06

-- ============================================================================
-- staff_plans table: Top-level plan container for each staff member
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_plan_status CHECK (status IN ('active', 'completed', 'archived', 'on_hold'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_plans_user_id ON staff_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_plans_status ON staff_plans(status);
CREATE INDEX IF NOT EXISTS idx_staff_plans_dates ON staff_plans(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_plans_created_by ON staff_plans(created_by);

-- ============================================================================
-- plan_items table: Individual action items within a plan (30/60/90 day buckets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES staff_plans(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    timeframe VARCHAR(20) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    completion_percentage INTEGER DEFAULT 0,
    target_completion_date DATE,
    actual_completion_date DATE,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_timeframe CHECK (timeframe IN ('30_days', '60_days', '90_days')),
    CONSTRAINT valid_item_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT valid_item_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'cancelled')),
    CONSTRAINT valid_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plan_items_plan_id ON plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_timeframe ON plan_items(timeframe);
CREATE INDEX IF NOT EXISTS idx_plan_items_status ON plan_items(status);
CREATE INDEX IF NOT EXISTS idx_plan_items_order ON plan_items(plan_id, order_index);

-- ============================================================================
-- plan_item_links table: Links plan items to strategies, KPIs, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_item_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_item_id UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL,
    link_id UUID NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_link_type CHECK (link_type IN ('strategy', 'kpi', 'initiative', 'ogsm_component')),
    CONSTRAINT unique_link UNIQUE(plan_item_id, link_type, link_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plan_item_links_item_id ON plan_item_links(plan_item_id);
CREATE INDEX IF NOT EXISTS idx_plan_item_links_target ON plan_item_links(link_type, link_id);

-- ============================================================================
-- plan_updates table: Track progress updates and change history
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_item_id UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
    update_type VARCHAR(50) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    notes TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_update_type CHECK (update_type IN ('status_change', 'progress_update', 'note_added', 'completion', 'blocked'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plan_updates_item_id ON plan_updates(plan_item_id);
CREATE INDEX IF NOT EXISTS idx_plan_updates_date ON plan_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_updates_user ON plan_updates(updated_by);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE staff_plans IS 'Top-level 30/60/90 day plans for staff members';
COMMENT ON TABLE plan_items IS 'Individual action items within a plan, organized by 30/60/90 day timeframes';
COMMENT ON TABLE plan_item_links IS 'Links connecting plan items to organizational strategies and KPIs';
COMMENT ON TABLE plan_updates IS 'Audit trail of updates and progress changes for plan items';

COMMENT ON COLUMN staff_plans.status IS 'Status: active, completed, archived, on_hold';
COMMENT ON COLUMN plan_items.timeframe IS 'Timeframe: 30_days, 60_days, 90_days';
COMMENT ON COLUMN plan_items.priority IS 'Priority: critical, high, medium, low';
COMMENT ON COLUMN plan_items.status IS 'Status: not_started, in_progress, completed, blocked, cancelled';
COMMENT ON COLUMN plan_item_links.link_type IS 'Type: strategy, kpi, initiative, ogsm_component';
COMMENT ON COLUMN plan_updates.update_type IS 'Type: status_change, progress_update, note_added, completion, blocked';
