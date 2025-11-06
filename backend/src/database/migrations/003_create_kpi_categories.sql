-- Migration: Create KPI Categories System
-- This creates the category table and adds category support to KPIs

-- Create kpi_categories table
CREATE TABLE IF NOT EXISTS kpi_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20), -- Hex color for UI theming (e.g., '#3B82F6')
    icon VARCHAR(50), -- Optional icon name (e.g., 'TrendingUp', 'DollarSign')
    order_index INTEGER DEFAULT 0, -- For custom sorting
    is_default BOOLEAN DEFAULT false, -- Mark default "Uncategorized" category
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_kpi_categories_order ON kpi_categories(order_index);

-- Add category_id to kpis table
ALTER TABLE kpis
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES kpi_categories(id) ON DELETE SET NULL;

-- Create index for efficient category filtering
CREATE INDEX IF NOT EXISTS idx_kpis_category_id ON kpis(category_id);

-- Insert default categories
INSERT INTO kpi_categories (name, description, color, icon, order_index, is_default) VALUES
('Uncategorized', 'KPIs that have not been assigned to a category', '#6B7280', 'Folder', 0, true),
('Financial', 'Revenue, budget, and financial performance metrics', '#10B981', 'DollarSign', 1, false),
('Academic', 'Student-athlete academic performance and success metrics', '#6366F1', 'GraduationCap', 2, false),
('Athletics', 'Athletic performance, competitions, and team metrics', '#F59E0B', 'Trophy', 3, false),
('Marketing', 'Brand awareness, social media, and fan engagement metrics', '#EC4899', 'Megaphone', 4, false),
('Operations', 'Facility management, equipment, and operational efficiency', '#8B5CF6', 'Settings', 5, false)
ON CONFLICT DO NOTHING;
