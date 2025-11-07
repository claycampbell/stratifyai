-- Migration: 005_philosophy_system
-- Description: Create tables for RMU Athletics Philosophy & Non-Negotiables Integration
-- Dependencies: Requires chat_history table for AI recommendation validations
-- Author: Claude Code
-- Date: 2025-11-07

-- ============================================================================
-- philosophy_documents table: Stores foundational philosophy texts
-- ============================================================================
CREATE TABLE IF NOT EXISTS philosophy_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority_weight INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_doc_type CHECK (type IN ('mission', 'vision', 'purpose', 'value', 'guiding_principle', 'operating_principle', 'theme')),
    CONSTRAINT valid_priority_weight CHECK (priority_weight >= 0 AND priority_weight <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_philosophy_type ON philosophy_documents(type);
CREATE INDEX IF NOT EXISTS idx_philosophy_active ON philosophy_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_philosophy_priority ON philosophy_documents(priority_weight DESC);
CREATE INDEX IF NOT EXISTS idx_philosophy_category ON philosophy_documents(category);

-- ============================================================================
-- non_negotiables table: Director of Athletics' absolute operational rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS non_negotiables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_number INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    enforcement_type VARCHAR(50) NOT NULL,
    auto_reject BOOLEAN DEFAULT false,
    validation_keywords TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_enforcement_type CHECK (enforcement_type IN ('hard_constraint', 'priority_rule', 'operational_expectation')),
    CONSTRAINT valid_rule_number CHECK (rule_number >= 1)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_non_negotiables_active ON non_negotiables(is_active);
CREATE INDEX IF NOT EXISTS idx_non_negotiables_rule_number ON non_negotiables(rule_number);
CREATE INDEX IF NOT EXISTS idx_non_negotiables_enforcement ON non_negotiables(enforcement_type);
CREATE INDEX IF NOT EXISTS idx_non_negotiables_auto_reject ON non_negotiables(auto_reject);

-- ============================================================================
-- decision_hierarchy table: Required prioritization order for decisions
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INTEGER UNIQUE NOT NULL,
    stakeholder VARCHAR(100) NOT NULL,
    description TEXT,
    weight INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_hierarchy_level CHECK (level >= 1),
    CONSTRAINT valid_hierarchy_weight CHECK (weight >= 0 AND weight <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_decision_hierarchy_level ON decision_hierarchy(level);

-- ============================================================================
-- ai_recommendation_validations table: Logs philosophy validation of AI recommendations
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_recommendation_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_history_id UUID REFERENCES chat_history(id) ON DELETE SET NULL,
    recommendation_text TEXT NOT NULL,
    validation_status VARCHAR(50) NOT NULL,
    cited_values UUID[],
    cited_non_negotiables UUID[],
    violated_constraints UUID[],
    decision_hierarchy_alignment JSONB,
    conflict_resolution TEXT,
    transparency_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_validation_status CHECK (validation_status IN ('approved', 'flagged', 'rejected')),
    CONSTRAINT valid_transparency_score CHECK (transparency_score IS NULL OR (transparency_score >= 0 AND transparency_score <= 100))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_validations_chat ON ai_recommendation_validations(chat_history_id);
CREATE INDEX IF NOT EXISTS idx_validations_status ON ai_recommendation_validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_validations_date ON ai_recommendation_validations(created_at DESC);

-- ============================================================================
-- Seed Data: Mission, Vision, Purpose
-- ============================================================================
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('mission', NULL, 'Mission Statement', 'Our mission is to promote a transformative, inclusive and unparalleled collegiate experience for our student-athletes. We will foster success in the classroom, competition, and the community, while developing today''s exemplary Colonial scholar-athletes into the leaders of tomorrow.', 100),
('purpose', NULL, 'Purpose Statement', 'Developing today''s exemplary Colonial scholar-athletes into the leaders of tomorrow.', 100),
('vision', NULL, 'Vision Statement', 'RMU Athletics aspires to become the preeminent NCAA Division 1 mid-major college athletics department by developing championship-caliber sport programs that enhance the brand, identity, reputation, and visibility of the University.', 100);

-- ============================================================================
-- Seed Data: Core Values
-- ============================================================================
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('value', 'Community', 'Community', 'Commitment to engagement, outreach, relations and service', 90),
('value', 'Connection', 'Connection', 'Commitment to developing meaningful relationships within the athletics department, on campus and in the community', 90),
('value', 'Commitment to Excellence', 'Commitment to Excellence', 'Commitment to our culture - our mission, vision, purpose, values, and principles', 95),
('value', 'Integrity', 'Integrity', 'Commitment to be ethical, fair, honest, authentic, accessible and exhibit sportsmanship', 90),
('value', 'Resilience', 'Resilience', 'Commitment to be the most resourceful athletics department to provide amenities and access far and above what anyone else can offer', 85);

-- ============================================================================
-- Seed Data: Guiding Principles
-- ============================================================================
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('guiding_principle', NULL, 'Develop Meaningful Relationships', 'Build strong connections within and outside the department', 80),
('guiding_principle', NULL, 'Diversity, Equity, Inclusion and Belonging', 'Foster an inclusive environment for all', 80),
('guiding_principle', NULL, 'Health and Well-Being', 'Prioritize physical and mental health', 85),
('guiding_principle', NULL, 'Inclusive and Collaborative Leadership', 'Lead with collaboration and inclusivity', 80),
('guiding_principle', NULL, 'Pride and Tradition', 'Honor RMU Athletics heritage and build pride', 75);

-- ============================================================================
-- Seed Data: Operating Principles
-- ============================================================================
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('operating_principle', NULL, 'Accountability', 'Take responsibility for actions and outcomes', 70),
('operating_principle', NULL, 'Collaboration', 'Work together across departments and programs', 75),
('operating_principle', NULL, 'Innovation', 'Seek creative solutions and continuous improvement', 70),
('operating_principle', NULL, 'Professionalism', 'Maintain high standards in all interactions', 70),
('operating_principle', NULL, 'Resourceful', 'Maximize resources and seek creative solutions', 70);

-- ============================================================================
-- Seed Data: Themes (Department Goals)
-- ============================================================================
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('theme', NULL, 'Branding and Engagement', 'Build RMU Athletics brand and fan engagement', 70),
('theme', NULL, 'Colonial Culture', 'Foster a strong departmental culture', 75),
('theme', NULL, 'Competitive Excellence', 'Achieve excellence in athletic competition', 80),
('theme', NULL, 'Resource Development and Investment', 'Grow resources and strategic investments', 75),
('theme', NULL, 'Student-Athlete Experience', 'Provide exceptional student-athlete experiences', 85),
('theme', NULL, 'Strategic Vision', 'Align on long-term strategic direction', 80);

-- ============================================================================
-- Seed Data: Non-Negotiables (Director of Athletics' Absolute Rules)
-- ============================================================================
INSERT INTO non_negotiables (rule_number, title, description, enforcement_type, auto_reject, validation_keywords) VALUES
(1, 'Believe in Our Culture and Our Process', 'All decisions and actions must align with RMU Athletics'' mission, vision, values, and principles', 'priority_rule', false, ARRAY['culture', 'mission', 'values']),
(2, 'Decision Hierarchy: University → Department → Individual', 'Decisions are made in the best interest of the university, department, then the individual, in that order', 'priority_rule', true, ARRAY['priority', 'decision', 'hierarchy']),
(3, 'No Individual Program Above Department Vision', 'Putting an individual program or internal department before the vision/mission of the department is unacceptable (#UNITE)', 'hard_constraint', true, ARRAY['silo', 'individual program', 'department first']),
(4, 'No One Bigger Than the University', 'No one person in this department is bigger than the university', 'hard_constraint', false, ARRAY['individual', 'ego']),
(5, 'Communication and Collaboration Required', 'Communication, transparency, and collaboration are expected. Operating in silos will not be tolerated', 'operational_expectation', false, ARRAY['silo', 'transparency', 'collaboration', 'communication']),
(6, 'Do Not Cheat', 'Intentional disregard to comply with departmental, university, and NCAA policies and procedures will not be tolerated', 'hard_constraint', true, ARRAY['ncaa', 'compliance', 'violation', 'cheat', 'unethical']),
(7, 'Follow Chain of Command', 'Do not deviate from reporting to superior by going to the next level for advice, information or guidance', 'operational_expectation', false, ARRAY['chain of command', 'reporting structure']),
(8, 'Budget Compliance Required', 'Intentional disregard to manage and stay within allocated budget(s) is not acceptable', 'hard_constraint', false, ARRAY['budget', 'overspend', 'financial']),
(9, 'Respect Deadlines and Office Hours', 'Disrespect for established office hours, deadlines, and/or timely notification is not acceptable', 'operational_expectation', false, ARRAY['deadline', 'late', 'notification']),
(10, 'Be Prepared', 'Do not be unprepared for meetings or important conversations. Do not make excuses for not meeting expectations', 'operational_expectation', false, ARRAY['unprepared', 'meeting', 'excuse']),
(11, 'Student-Athlete Welfare is Paramount', 'Any action and/or decision that compromises student-athlete well-being will not be tolerated', 'hard_constraint', true, ARRAY['student-athlete', 'welfare', 'wellbeing', 'health', 'safety', 'mental health', 'academic support']),
(12, 'No Surprises Rule', 'Do not catch leadership off guard. Do not portray passive aggressive behavior or insubordination', 'operational_expectation', false, ARRAY['surprise', 'passive aggressive', 'insubordination']);

-- ============================================================================
-- Seed Data: Decision Hierarchy
-- ============================================================================
INSERT INTO decision_hierarchy (level, stakeholder, description, weight) VALUES
(1, 'University', 'Decisions must first prioritize the best interest of Robert Morris University', 100),
(2, 'Department', 'Decisions must second prioritize the best interest of RMU Athletics Department', 70),
(3, 'Individual', 'Decisions may third prioritize individual programs or staff, but never above Department or University', 40);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE philosophy_documents IS 'RMU Athletics foundational philosophy texts (mission, vision, values, principles)';
COMMENT ON TABLE non_negotiables IS 'Director of Athletics absolute operational rules (hard constraints)';
COMMENT ON TABLE decision_hierarchy IS 'Required prioritization order for decision-making (University → Department → Individual)';
COMMENT ON TABLE ai_recommendation_validations IS 'Audit trail of AI recommendation validation against philosophy and non-negotiables';

COMMENT ON COLUMN philosophy_documents.type IS 'Type: mission, vision, purpose, value, guiding_principle, operating_principle, theme';
COMMENT ON COLUMN philosophy_documents.priority_weight IS 'Priority weight 0-100, higher = more important';
COMMENT ON COLUMN non_negotiables.enforcement_type IS 'Type: hard_constraint, priority_rule, operational_expectation';
COMMENT ON COLUMN non_negotiables.auto_reject IS 'If true, recommendations violating this are automatically rejected';
COMMENT ON COLUMN ai_recommendation_validations.validation_status IS 'Status: approved, flagged, rejected';
COMMENT ON COLUMN ai_recommendation_validations.decision_hierarchy_alignment IS 'JSON: {"university": 80, "department": 60, "individual": 20}';
