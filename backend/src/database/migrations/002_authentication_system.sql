-- Migration: 002 - Authentication & User Management System
-- Adds comprehensive user authentication, roles, and permissions
-- Date: 2025-11-03

-- Roles table (define organizational roles)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'director', 'manager', 'staff', 'viewer'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]', -- Array of permission strings
    is_system_role BOOLEAN DEFAULT FALSE, -- Cannot be deleted if true
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    department VARCHAR(100), -- 'Athletics', 'Marketing', 'Operations', etc.
    title VARCHAR(100), -- Job title
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}', -- User preferences (theme, notifications, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table (for JWT token management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for user actions
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'login', 'create_kpi', 'update_ogsm', etc.
    entity_type VARCHAR(50), -- 'kpi', 'ogsm_component', 'report', etc.
    entity_id UUID,
    details JSONB, -- Additional context about the action
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team/Department structure (optional - for multi-department organizations)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team membership
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'lead', 'member', 'contributor'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, permissions, is_system_role) VALUES
    ('super_admin', 'Super Administrator', 'Full system access with all permissions',
     '["*"]', TRUE),

    ('athletics_director', 'Athletics Director', 'Full access to all athletics data and strategy',
     '["view_all", "edit_all", "manage_users", "manage_teams", "view_reports", "create_reports", "manage_strategies", "manage_kpis"]', TRUE),

    ('department_director', 'Department Director', 'Director-level access to assigned departments',
     '["view_department", "edit_department", "view_reports", "create_reports", "manage_strategies", "manage_kpis", "manage_team"]', TRUE),

    ('manager', 'Manager', 'Manager access to strategies and KPIs',
     '["view_department", "edit_assigned", "view_reports", "manage_strategies", "manage_kpis"]', TRUE),

    ('staff', 'Staff Member', 'Standard staff access to view and update assigned items',
     '["view_assigned", "edit_assigned", "view_kpis", "update_kpis"]', TRUE),

    ('viewer', 'Viewer', 'Read-only access to public information',
     '["view_public"]', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_teams_parent ON teams(parent_team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- Add user_id to existing tables for ownership tracking
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ogsm_components ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE strategic_reports ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for user ownership
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ogsm_created_by ON ogsm_components(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_kpis_created_by ON kpis(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON strategic_reports(created_by_user_id);

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with authentication and profile information';
COMMENT ON TABLE roles IS 'System roles with associated permissions';
COMMENT ON TABLE user_sessions IS 'Active user sessions with refresh tokens';
COMMENT ON TABLE audit_log IS 'Audit trail of all user actions in the system';
COMMENT ON TABLE teams IS 'Organizational teams/departments structure';
COMMENT ON TABLE team_members IS 'Team membership and roles';
