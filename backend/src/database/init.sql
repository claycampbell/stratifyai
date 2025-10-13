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

-- ============================================================
-- STRATEGIC PLANNING TOOLS TABLES
-- ============================================================

-- Risk Register table
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogsm_component_id UUID REFERENCES ogsm_components(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'strategic', 'operational', 'financial', 'compliance', 'reputational', 'technology'
    likelihood VARCHAR(20) NOT NULL, -- 'very_low', 'low', 'medium', 'high', 'very_high'
    impact VARCHAR(20) NOT NULL, -- 'very_low', 'low', 'medium', 'high', 'very_high'
    risk_score DECIMAL GENERATED ALWAYS AS (
        CASE likelihood
            WHEN 'very_low' THEN 1
            WHEN 'low' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'high' THEN 4
            WHEN 'very_high' THEN 5
        END *
        CASE impact
            WHEN 'very_low' THEN 1
            WHEN 'low' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'high' THEN 4
            WHEN 'very_high' THEN 5
        END
    ) STORED,
    status VARCHAR(50) DEFAULT 'identified', -- 'identified', 'assessing', 'mitigating', 'monitoring', 'closed'
    mitigation_strategy TEXT,
    contingency_plan TEXT,
    owner_email VARCHAR(255),
    review_date DATE,
    residual_likelihood VARCHAR(20), -- After mitigation
    residual_impact VARCHAR(20), -- After mitigation
    tags VARCHAR(255)[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Strategic Initiatives table
CREATE TABLE IF NOT EXISTS initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogsm_component_id UUID REFERENCES ogsm_components(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    objective TEXT, -- Initiative objective
    status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    start_date DATE,
    target_end_date DATE,
    actual_end_date DATE,
    completion_percentage DECIMAL DEFAULT 0,
    budget_allocated DECIMAL,
    budget_spent DECIMAL DEFAULT 0,
    owner_email VARCHAR(255),
    team_members VARCHAR(255)[], -- Array of email addresses
    expected_benefits TEXT,
    success_criteria TEXT,
    dependencies TEXT, -- Description of dependencies
    risks TEXT, -- Associated risks
    tags VARCHAR(255)[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initiative Milestones table
CREATE TABLE IF NOT EXISTS initiative_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    deliverables TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initiative-KPI relationship table
CREATE TABLE IF NOT EXISTS initiative_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
    kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
    target_impact_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(initiative_id, kpi_id)
);

-- Strategic Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_type VARCHAR(50) DEFAULT 'custom', -- 'best_case', 'worst_case', 'most_likely', 'custom'
    assumptions TEXT, -- Key assumptions for this scenario
    is_baseline BOOLEAN DEFAULT FALSE, -- Mark one scenario as the baseline
    probability DECIMAL, -- Likelihood of this scenario (0-1)
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'archived'
    created_by VARCHAR(255),
    tags VARCHAR(255)[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scenario KPI Projections table
CREATE TABLE IF NOT EXISTS scenario_kpi_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
    projected_value DECIMAL NOT NULL,
    projection_date DATE NOT NULL,
    confidence_level VARCHAR(20), -- 'low', 'medium', 'high'
    assumptions TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scenario_id, kpi_id, projection_date)
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogsm_component_id UUID REFERENCES ogsm_components(id) ON DELETE SET NULL,
    initiative_id UUID REFERENCES initiatives(id) ON DELETE SET NULL,
    budget_name VARCHAR(255) NOT NULL,
    description TEXT,
    budget_type VARCHAR(50) DEFAULT 'project', -- 'project', 'operational', 'capital', 'discretionary'
    fiscal_year INTEGER,
    fiscal_quarter INTEGER, -- 1-4
    allocated_amount DECIMAL NOT NULL,
    spent_amount DECIMAL DEFAULT 0,
    committed_amount DECIMAL DEFAULT 0, -- Committed but not yet spent
    remaining_amount DECIMAL GENERATED ALWAYS AS (allocated_amount - spent_amount - committed_amount) STORED,
    variance_amount DECIMAL GENERATED ALWAYS AS (spent_amount + committed_amount - allocated_amount) STORED,
    variance_percentage DECIMAL GENERATED ALWAYS AS (
        CASE
            WHEN allocated_amount = 0 THEN 0
            ELSE ((spent_amount + committed_amount - allocated_amount) / allocated_amount) * 100
        END
    ) STORED,
    status VARCHAR(50) DEFAULT 'active', -- 'draft', 'active', 'depleted', 'closed'
    owner_email VARCHAR(255),
    approval_required BOOLEAN DEFAULT TRUE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    tags VARCHAR(255)[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget Transactions table
CREATE TABLE IF NOT EXISTS budget_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'allocation', 'expenditure', 'commitment', 'adjustment', 'refund'
    amount DECIMAL NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    category VARCHAR(100), -- Expense category
    reference_number VARCHAR(100),
    approved_by VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'human', 'equipment', 'facility', 'software', 'consultant', 'other'
    description TEXT,
    department VARCHAR(100),
    email VARCHAR(255), -- For human resources
    skills VARCHAR(255)[], -- For human resources
    capacity_hours_per_week DECIMAL, -- Available hours per week
    cost_per_hour DECIMAL,
    availability_status VARCHAR(50) DEFAULT 'available', -- 'available', 'partially_allocated', 'fully_allocated', 'unavailable'
    total_allocation_percentage DECIMAL DEFAULT 0, -- Sum of all allocations
    location VARCHAR(255),
    tags VARCHAR(255)[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource Allocations table
CREATE TABLE IF NOT EXISTS resource_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
    allocation_percentage DECIMAL NOT NULL, -- Percentage of resource's time (0-100)
    hours_per_week DECIMAL,
    start_date DATE NOT NULL,
    end_date DATE,
    role VARCHAR(100), -- Role in this initiative
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'planned', 'active', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_allocation_percentage CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100)
);

-- Dependencies table (for tracking dependencies between OGSM components, initiatives, KPIs)
CREATE TABLE IF NOT EXISTS dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL, -- 'ogsm_component', 'initiative', 'kpi', 'risk'
    source_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- 'ogsm_component', 'initiative', 'kpi', 'risk'
    target_id UUID NOT NULL,
    dependency_type VARCHAR(50) DEFAULT 'depends_on', -- 'depends_on', 'blocks', 'related_to', 'supports', 'conflicts_with'
    description TEXT,
    strength VARCHAR(20), -- 'weak', 'medium', 'strong', 'critical'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved', 'broken'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, target_type, target_id, dependency_type)
);

-- ============================================================
-- OGSM COMPONENT TEMPLATES
-- ============================================================

-- OGSM Component Templates table
CREATE TABLE IF NOT EXISTS ogsm_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'business', 'athletics', 'education', 'nonprofit', 'healthcare', 'technology', etc.
    structure JSONB NOT NULL, -- JSON structure of the template with components and hierarchy
    is_public BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_by VARCHAR(255),
    tags VARCHAR(255)[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OGSM Component Versions table (for component versioning)
CREATE TABLE IF NOT EXISTS ogsm_component_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES ogsm_components(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    parent_id UUID,
    order_index INTEGER,
    changed_by VARCHAR(255),
    change_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(component_id, version_number)
);

-- ============================================================
-- ADVANCED AI FEATURES - STRATEGY KNOWLEDGE BASE
-- ============================================================

-- Strategy Knowledge Base table (for RAG)
CREATE TABLE IF NOT EXISTS strategy_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    strategy_text TEXT NOT NULL,
    industry VARCHAR(100), -- 'technology', 'healthcare', 'finance', 'retail', etc.
    company_size VARCHAR(50), -- 'startup', 'small', 'medium', 'enterprise'
    objective_type VARCHAR(100), -- 'growth', 'efficiency', 'innovation', 'market_share', etc.
    success_metrics JSONB, -- { "metric": "value", "timeframe": "6 months" }
    outcomes JSONB, -- { "revenue_impact": "+25%", "customer_growth": "+40%" }
    implementation_cost VARCHAR(50), -- 'low', 'medium', 'high'
    timeframe VARCHAR(50), -- '3-6 months', '6-12 months', '1-2 years'
    difficulty_level VARCHAR(50), -- 'easy', 'moderate', 'challenging', 'complex'
    success_rate DECIMAL, -- 0.0 to 1.0
    case_study_source TEXT, -- Reference to original case study
    tags VARCHAR(255)[], -- ['digital marketing', 'customer acquisition', 'b2b']
    embedding VECTOR(768), -- Vector embedding for semantic search (using pgvector extension)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Generated Strategies table (track what AI has generated)
CREATE TABLE IF NOT EXISTS ai_generated_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ogsm_component_id UUID REFERENCES ogsm_components(id) ON DELETE CASCADE,
    user_prompt TEXT NOT NULL,
    context JSONB, -- Original request context
    generated_strategies JSONB NOT NULL, -- Array of generated strategy objects
    selected_strategy_id UUID, -- Which one user chose
    feedback VARCHAR(50), -- 'accepted', 'rejected', 'modified'
    feedback_notes TEXT,
    model_version VARCHAR(100), -- 'gemini-2.0-flash-exp'
    generation_params JSONB, -- Temperature, top_k, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Strategy Feedback table (for continuous learning)
CREATE TABLE IF NOT EXISTS ai_strategy_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_strategy_id UUID REFERENCES ai_generated_strategies(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type VARCHAR(50), -- 'quality', 'relevance', 'actionability', 'originality'
    comments TEXT,
    outcome_achieved BOOLEAN, -- Did the strategy work?
    outcome_data JSONB, -- Actual results if implemented
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

-- Indexes for strategic planning tables
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner_email);
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_score ON risks(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risks_ogsm ON risks(ogsm_component_id);
CREATE INDEX IF NOT EXISTS idx_risks_tags ON risks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON initiatives(status);
CREATE INDEX IF NOT EXISTS idx_initiatives_owner ON initiatives(owner_email);
CREATE INDEX IF NOT EXISTS idx_initiatives_priority ON initiatives(priority);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, target_end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_ogsm ON initiatives(ogsm_component_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_tags ON initiatives USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_initiative_milestones_initiative ON initiative_milestones(initiative_id, target_date);
CREATE INDEX IF NOT EXISTS idx_initiative_kpis_initiative ON initiative_kpis(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiative_kpis_kpi ON initiative_kpis(kpi_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);
CREATE INDEX IF NOT EXISTS idx_scenarios_type ON scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_scenarios_baseline ON scenarios(is_baseline);
CREATE INDEX IF NOT EXISTS idx_scenario_projections_scenario ON scenario_kpi_projections(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_projections_kpi ON scenario_kpi_projections(kpi_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_owner ON budgets(owner_email);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal ON budgets(fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_budgets_ogsm ON budgets(ogsm_component_id);
CREATE INDEX IF NOT EXISTS idx_budgets_initiative ON budgets(initiative_id);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_budget ON budget_transactions(budget_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_availability ON resources(availability_status);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_resource ON resource_allocations(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_initiative ON resource_allocations(initiative_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates ON resource_allocations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_type ON dependencies(dependency_type);
CREATE INDEX IF NOT EXISTS idx_ogsm_templates_category ON ogsm_templates(category);
CREATE INDEX IF NOT EXISTS idx_ogsm_templates_public ON ogsm_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_ogsm_templates_tags ON ogsm_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ogsm_component_versions_component ON ogsm_component_versions(component_id, version_number DESC);

-- Indexes for AI Strategy Knowledge Base
CREATE INDEX IF NOT EXISTS idx_strategy_knowledge_industry ON strategy_knowledge(industry);
CREATE INDEX IF NOT EXISTS idx_strategy_knowledge_objective ON strategy_knowledge(objective_type);
CREATE INDEX IF NOT EXISTS idx_strategy_knowledge_tags ON strategy_knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_strategy_knowledge_success ON strategy_knowledge(success_rate DESC);
-- CREATE INDEX IF NOT EXISTS idx_strategy_knowledge_embedding ON strategy_knowledge USING ivfflat (embedding vector_cosine_ops); -- Requires pgvector extension
CREATE INDEX IF NOT EXISTS idx_ai_generated_strategies_component ON ai_generated_strategies(ogsm_component_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_strategies_created ON ai_generated_strategies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_strategy_feedback_generated ON ai_strategy_feedback(generated_strategy_id);
CREATE INDEX IF NOT EXISTS idx_ai_strategy_feedback_rating ON ai_strategy_feedback(rating DESC);
