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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_ogsm_components_type ON ogsm_components(component_type);
CREATE INDEX IF NOT EXISTS idx_ogsm_components_parent ON ogsm_components(parent_id);
CREATE INDEX IF NOT EXISTS idx_kpis_status ON kpis(status);
CREATE INDEX IF NOT EXISTS idx_kpi_history_date ON kpi_history(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id, created_at);
