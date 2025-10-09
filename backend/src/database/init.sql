-- Create tables for OGSM Management Platform

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    metadata JSONB
);

-- OGSM Components table
CREATE TABLE IF NOT EXISTS ogsm_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL, -- 'objective', 'goal', 'strategy', 'measure'
    title TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES ogsm_components(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPIs table
CREATE TABLE IF NOT EXISTS kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogsm_component_id UUID REFERENCES ogsm_components(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL,
    current_value DECIMAL,
    unit VARCHAR(50),
    frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
    status VARCHAR(50) DEFAULT 'on_track', -- 'on_track', 'at_risk', 'off_track'
    auto_calculate_status BOOLEAN DEFAULT TRUE, -- Enable/disable auto-calculation
    at_risk_threshold DECIMAL DEFAULT 0.8, -- % of target that triggers at_risk (e.g., 0.8 = 80%)
    off_track_threshold DECIMAL DEFAULT 0.6, -- % of target that triggers off_track (e.g., 0.6 = 60%)
    trend_direction VARCHAR(20), -- 'up', 'down', 'stable' - calculated from history
    last_calculated TIMESTAMP,
    validation_rules JSONB, -- Custom validation rules (min, max, required, etc.)
    tags VARCHAR(255)[], -- Array of tags for categorization
    owner_email VARCHAR(255), -- KPI owner for notifications
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI History table
CREATE TABLE IF NOT EXISTS kpi_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
    value DECIMAL NOT NULL,
    recorded_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Chat History table
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    message TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Strategic Reports table
CREATE TABLE IF NOT EXISTS strategic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL, -- '30_day', '60_day', '90_day', 'weekly', 'custom'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    generated_by VARCHAR(50) DEFAULT 'ai',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI Templates table
CREATE TABLE IF NOT EXISTS kpi_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'sales', 'marketing', 'operations', 'finance', 'hr', etc.
    target_value DECIMAL,
    unit VARCHAR(50),
    frequency VARCHAR(50),
    at_risk_threshold DECIMAL DEFAULT 0.8,
    off_track_threshold DECIMAL DEFAULT 0.6,
    validation_rules JSONB,
    is_public BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI Alerts table
CREATE TABLE IF NOT EXISTS kpi_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'status_change', 'threshold_breach', 'overdue', 'milestone'
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    message TEXT NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP,
    metadata JSONB
);

-- Bulk Operations Log table
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL, -- 'update', 'delete', 'status_change', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'kpis', 'ogsm_components', etc.
    affected_count INTEGER,
    success_count INTEGER,
    error_count INTEGER,
    performed_by VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_ogsm_components_type ON ogsm_components(component_type);
CREATE INDEX IF NOT EXISTS idx_ogsm_components_parent ON ogsm_components(parent_id);
CREATE INDEX IF NOT EXISTS idx_kpis_status ON kpis(status);
CREATE INDEX IF NOT EXISTS idx_kpis_tags ON kpis USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kpis_owner ON kpis(owner_email);
CREATE INDEX IF NOT EXISTS idx_kpi_history_date ON kpi_history(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_history_kpi ON kpi_history(kpi_id, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kpi_templates_category ON kpi_templates(category);
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_kpi ON kpi_alerts(kpi_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_alerts_acknowledged ON kpi_alerts(acknowledged, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_date ON bulk_operations(created_at DESC);
