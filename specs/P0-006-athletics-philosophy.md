# P0-006: RMU Athletics Philosophy & Non-Negotiables Integration

**Feature ID**: P0-006
**Priority**: Critical
**Phase**: Phase 0
**Estimated Effort**: 80-120 hours
**Status**: Planned

---

## Overview

Integrate RMU Athletics' foundational philosophy (mission, vision, values, principles) and Director of Athletics' Non-Negotiables into the CSO BOT's decision-making framework. This creates a "cultural intelligence layer" that ensures all AI-generated recommendations are aligned with institutional identity, values, and operational standards.

---

## Problem Statement

The CSO BOT currently operates without understanding RMU Athletics' organizational identity and non-negotiable operational standards. While technically proficient at analyzing data and generating strategic recommendations, it lacks:

1. **Cultural Context**: Understanding of mission, vision, and core values
2. **Operational Constraints**: Knowledge of absolute rules (non-negotiables) that govern decision-making
3. **Decision Hierarchy**: Awareness of the required prioritization (University → Department → Individual)
4. **Transparency**: Ability to explain "why" a recommendation aligns with organizational values

This creates a risk of recommendations that are strategically sound but culturally misaligned or operationally inappropriate.

---

## Goals

1. **Foundational Training**: Train the CSO BOT on all RMU Athletics philosophy documents
2. **Hard Constraints**: Implement Non-Negotiables as absolute validation filters
3. **Priority Logic**: Enforce decision-making hierarchy in all recommendations
4. **Transparency**: Ensure AI recommendations cite relevant values/principles
5. **Conflict Resolution**: Handle competing principles intelligently
6. **Feedback Loop**: Enable continuous refinement of BOT's cultural understanding

---

## Technical Design

### 1. Database Schema

#### New Tables

##### `philosophy_documents`
Stores foundational philosophy texts with hierarchical structure.

```sql
CREATE TABLE philosophy_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL, -- 'mission', 'vision', 'purpose', 'value', 'guiding_principle', 'operating_principle', 'theme'
  category VARCHAR(100), -- For values: 'community', 'connection', etc.
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority_weight INTEGER DEFAULT 50, -- 0-100, higher = more important
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example: Core Value "Integrity"
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('value', 'integrity', 'Integrity', 'Commitment to be ethical, fair, honest, authentic, accessible and exhibit sportsmanship', 90);
```

##### `non_negotiables`
Stores Director of Athletics' absolute operational rules (hard constraints).

```sql
CREATE TABLE non_negotiables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_number INTEGER UNIQUE NOT NULL, -- 1-12
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  enforcement_type VARCHAR(50) NOT NULL, -- 'hard_constraint', 'priority_rule', 'operational_expectation'
  auto_reject BOOLEAN DEFAULT false, -- If true, recommendations violating this are auto-rejected
  validation_keywords TEXT[], -- Keywords that trigger validation checks
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example: Non-Negotiable #11
INSERT INTO non_negotiables (rule_number, title, description, enforcement_type, auto_reject, validation_keywords) VALUES
(11, 'Student-Athlete Welfare', 'Any action and/or decision that compromises student-athlete well-being will not be tolerated', 'hard_constraint', true, ARRAY['student-athlete', 'welfare', 'wellbeing', 'health', 'safety', 'mental health', 'academic support']);
```

##### `decision_hierarchy`
Defines the required prioritization order for decision-making.

```sql
CREATE TABLE decision_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level INTEGER UNIQUE NOT NULL, -- 1 = highest priority, 3 = lowest
  stakeholder VARCHAR(100) NOT NULL, -- 'University', 'Department', 'Individual'
  description TEXT,
  weight INTEGER NOT NULL, -- Used in scoring: Level 1 = 100, Level 2 = 70, Level 3 = 40
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO decision_hierarchy (level, stakeholder, description, weight) VALUES
(1, 'University', 'Decisions must first prioritize the best interest of Robert Morris University', 100),
(2, 'Department', 'Decisions must second prioritize the best interest of RMU Athletics Department', 70),
(3, 'Individual', 'Decisions may third prioritize individual programs or staff, but never above Department or University', 40);
```

##### `ai_recommendation_validations`
Logs how each AI recommendation was validated against philosophy and non-negotiables.

```sql
CREATE TABLE ai_recommendation_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_history_id UUID REFERENCES chat_history(id),
  recommendation_text TEXT NOT NULL,
  validation_status VARCHAR(50) NOT NULL, -- 'approved', 'flagged', 'rejected'
  cited_values UUID[], -- Array of philosophy_documents.id
  cited_non_negotiables UUID[], -- Array of non_negotiables.id
  violated_constraints UUID[], -- Array of non_negotiables.id that were violated
  decision_hierarchy_alignment JSONB, -- {"university": 80, "department": 60, "individual": 20}
  conflict_resolution TEXT, -- Explanation of how competing principles were resolved
  transparency_score INTEGER, -- 0-100, how well the recommendation explained its reasoning
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. Backend Implementation

#### Philosophy Service (`backend/src/services/philosophyService.ts`)

```typescript
import { db } from '../database/db';

export class PhilosophyService {
  /**
   * Get all active philosophy documents for AI context
   */
  async getActivePhilosophy(): Promise<PhilosophyDocument[]> {
    return db.query(`
      SELECT * FROM philosophy_documents
      WHERE is_active = true
      ORDER BY priority_weight DESC, type, category
    `);
  }

  /**
   * Get all active non-negotiables for validation
   */
  async getActiveNonNegotiables(): Promise<NonNegotiable[]> {
    return db.query(`
      SELECT * FROM non_negotiables
      WHERE is_active = true
      ORDER BY rule_number
    `);
  }

  /**
   * Get decision hierarchy for prioritization logic
   */
  async getDecisionHierarchy(): Promise<DecisionHierarchyLevel[]> {
    return db.query(`
      SELECT * FROM decision_hierarchy
      ORDER BY level ASC
    `);
  }

  /**
   * Build contextual prompt for Gemini with philosophy
   */
  async buildPhilosophyContext(): Promise<string> {
    const philosophy = await this.getActivePhilosophy();
    const nonNegotiables = await this.getActiveNonNegotiables();
    const hierarchy = await this.getDecisionHierarchy();

    let context = `# RMU Athletics Foundational Philosophy\n\n`;
    context += `You are the Chief Strategy Officer for Robert Morris University Athletics. All your recommendations must be aligned with the following foundational documents and operational rules.\n\n`;

    // Group philosophy by type
    const grouped = philosophy.reduce((acc, doc) => {
      if (!acc[doc.type]) acc[doc.type] = [];
      acc[doc.type].push(doc);
      return acc;
    }, {} as Record<string, PhilosophyDocument[]>);

    // Mission & Vision
    if (grouped.mission) {
      context += `## Mission Statement\n${grouped.mission[0].content}\n\n`;
    }
    if (grouped.vision) {
      context += `## Vision Statement\n${grouped.vision[0].content}\n\n`;
    }
    if (grouped.purpose) {
      context += `## Purpose Statement\n${grouped.purpose[0].content}\n\n`;
    }

    // Core Values (high priority)
    if (grouped.value) {
      context += `## Core Values (Non-negotiable characteristics)\n`;
      grouped.value.forEach(v => {
        context += `- **${v.category}**: ${v.content}\n`;
      });
      context += `\n`;
    }

    // Guiding Principles
    if (grouped.guiding_principle) {
      context += `## Guiding Principles (Department philosophy)\n`;
      grouped.guiding_principle.forEach(p => {
        context += `- ${p.title}\n`;
      });
      context += `\n`;
    }

    // Operating Principles
    if (grouped.operating_principle) {
      context += `## Operating Principles (Concrete actions)\n`;
      grouped.operating_principle.forEach(p => {
        context += `- ${p.title}\n`;
      });
      context += `\n`;
    }

    // Decision Hierarchy
    context += `## Decision-Making Hierarchy (ABSOLUTE PRIORITY ORDER)\n`;
    context += `All decisions and recommendations MUST prioritize stakeholders in this exact order:\n`;
    hierarchy.forEach(h => {
      context += `${h.level}. **${h.stakeholder}** (Weight: ${h.weight}) - ${h.description}\n`;
    });
    context += `\n`;

    // Non-Negotiables (Hard Constraints)
    context += `## Director of Athletics' Non-Negotiables (ABSOLUTE RULES)\n`;
    context += `These are hard constraints. Any recommendation that violates these rules is IMMEDIATELY INVALID:\n\n`;
    nonNegotiables.forEach(nn => {
      context += `${nn.rule_number}. **${nn.title}**\n   ${nn.description}\n`;
      if (nn.auto_reject) {
        context += `   ⚠️ AUTO-REJECT: Violations of this rule will automatically invalidate recommendations.\n`;
      }
      context += `\n`;
    });

    context += `\n---\n\n`;
    context += `**IMPORTANT**: When providing recommendations:\n`;
    context += `1. Cite which Core Values, Principles, or Non-Negotiables support your recommendation\n`;
    context += `2. Explain how your recommendation aligns with the Decision Hierarchy\n`;
    context += `3. Identify any potential conflicts between principles and explain your resolution\n`;
    context += `4. If a recommendation would violate a Non-Negotiable, clearly state why it's not viable\n\n`;

    return context;
  }

  /**
   * Validate a recommendation against non-negotiables
   */
  async validateRecommendation(
    recommendationText: string,
    chatHistoryId: string
  ): Promise<ValidationResult> {
    const nonNegotiables = await this.getActiveNonNegotiables();
    const violations: NonNegotiable[] = [];

    // Simple keyword-based validation (can be enhanced with AI analysis)
    for (const nn of nonNegotiables) {
      if (nn.validation_keywords && nn.validation_keywords.length > 0) {
        const violationDetected = this.checkForViolation(recommendationText, nn);
        if (violationDetected) {
          violations.push(nn);
        }
      }
    }

    // Check for auto-reject violations
    const autoRejectViolations = violations.filter(v => v.auto_reject);
    const status = autoRejectViolations.length > 0 ? 'rejected' :
                   violations.length > 0 ? 'flagged' : 'approved';

    // Log validation
    await db.query(`
      INSERT INTO ai_recommendation_validations
      (chat_history_id, recommendation_text, validation_status, violated_constraints)
      VALUES ($1, $2, $3, $4)
    `, [chatHistoryId, recommendationText, status, violations.map(v => v.id)]);

    return {
      status,
      violations,
      autoReject: autoRejectViolations.length > 0
    };
  }

  private checkForViolation(text: string, nonNegotiable: NonNegotiable): boolean {
    // Enhanced logic would use Gemini to analyze semantic violations
    // For now, simple keyword detection
    const lowerText = text.toLowerCase();

    // Special cases for specific non-negotiables
    if (nonNegotiable.rule_number === 6) { // "Do not cheat"
      const unethicalKeywords = ['bypass', 'circumvent', 'violate ncaa', 'hide', 'fake', 'falsify'];
      return unethicalKeywords.some(kw => lowerText.includes(kw));
    }

    if (nonNegotiable.rule_number === 11) { // Student-Athlete Welfare
      const harmfulKeywords = ['reduce support', 'cut academic', 'eliminate wellness', 'compromise safety'];
      return harmfulKeywords.some(kw => lowerText.includes(kw));
    }

    return false;
  }
}
```

#### Enhanced Gemini Service Integration

Update `backend/src/services/geminiService.ts` to include philosophy context:

```typescript
import { PhilosophyService } from './philosophyService';

export class GeminiService {
  private philosophyService: PhilosophyService;

  constructor() {
    this.philosophyService = new PhilosophyService();
  }

  /**
   * Enhanced chat with philosophy-aware responses
   */
  async chatWithPhilosophy(
    message: string,
    userId: string,
    includeContext: boolean = true
  ): Promise<string> {
    let systemPrompt = '';

    if (includeContext) {
      // Add philosophy context to every AI interaction
      systemPrompt = await this.philosophyService.buildPhilosophyContext();
    }

    systemPrompt += `\nUser Question: ${message}\n\n`;
    systemPrompt += `Provide a response that:\n`;
    systemPrompt += `1. Directly answers the question\n`;
    systemPrompt += `2. Cites relevant Core Values or Principles that support your answer\n`;
    systemPrompt += `3. Explains how your recommendation aligns with the Decision Hierarchy (University → Department → Individual)\n`;
    systemPrompt += `4. Identifies any Non-Negotiables that are relevant\n`;
    systemPrompt += `5. If there are competing principles, explain how you resolved the conflict\n\n`;
    systemPrompt += `Format your response with clear sections for transparency.\n`;

    const response = await this.generateContent(systemPrompt);

    // Validate response against non-negotiables
    const chatHistory = await this.saveChatHistory(userId, message, response);
    const validation = await this.philosophyService.validateRecommendation(response, chatHistory.id);

    if (validation.autoReject) {
      return `⚠️ RECOMMENDATION REJECTED\n\nThe proposed recommendation violates the following Non-Negotiables:\n\n${
        validation.violations.map(v => `- ${v.title}: ${v.description}`).join('\n')
      }\n\nPlease provide an alternative approach that aligns with RMU Athletics' operational standards.`;
    }

    if (validation.status === 'flagged') {
      return `⚠️ RECOMMENDATION FLAGGED FOR REVIEW\n\n${response}\n\n---\n**Validation Notice**: This recommendation may conflict with:\n${
        validation.violations.map(v => `- ${v.title}`).join('\n')
      }\n\nPlease review carefully before implementation.`;
    }

    return response;
  }

  /**
   * Generate strategic recommendation with philosophy alignment
   */
  async generatePhilosophyAlignedRecommendation(
    scenario: string,
    constraints?: string[]
  ): Promise<RecommendationWithAlignment> {
    const philosophyContext = await this.philosophyService.buildPhilosophyContext();

    const prompt = `${philosophyContext}\n\n`;
    prompt += `## Scenario\n${scenario}\n\n`;
    if (constraints && constraints.length > 0) {
      prompt += `## Additional Constraints\n${constraints.join('\n')}\n\n`;
    }

    prompt += `\n## Task\n`;
    prompt += `Provide a strategic recommendation that:\n`;
    prompt += `1. Addresses the scenario effectively\n`;
    prompt += `2. Aligns with RMU Athletics' Mission and Vision\n`;
    prompt += `3. Upholds all relevant Core Values\n`;
    prompt += `4. Follows the Decision Hierarchy (University → Department → Individual)\n`;
    prompt += `5. Does not violate any Non-Negotiables\n`;
    prompt += `6. Explains your reasoning with citations to specific values/principles\n\n`;
    prompt += `Respond in JSON format:\n`;
    prompt += `{\n`;
    prompt += `  "recommendation": "Your strategic recommendation",\n`;
    prompt += `  "alignment": {\n`;
    prompt += `    "mission_vision": "How this aligns with mission/vision",\n`;
    prompt += `    "core_values": ["List of relevant core values"],\n`;
    prompt += `    "decision_hierarchy": {"university": 85, "department": 75, "individual": 40},\n`;
    prompt += `    "cited_principles": ["Principle 1", "Principle 2"],\n`;
    prompt += `    "non_negotiables_check": "Confirmation that no non-negotiables are violated"\n`;
    prompt += `  },\n`;
    prompt += `  "potential_conflicts": "Any competing principles and how they were resolved",\n`;
    prompt += `  "implementation_notes": "Additional considerations for implementation"\n`;
    prompt += `}\n`;

    const response = await this.generateContent(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse philosophy-aligned recommendation');
  }
}
```

---

### 3. API Routes

#### Philosophy Management Routes (`backend/src/routes/philosophy.ts`)

```typescript
import express from 'express';
import { PhilosophyService } from '../services/philosophyService';

const router = express.Router();
const philosophyService = new PhilosophyService();

// Get all philosophy documents (for admin management)
router.get('/documents', async (req, res) => {
  const docs = await philosophyService.getActivePhilosophy();
  res.json(docs);
});

// Create/update philosophy document
router.post('/documents', async (req, res) => {
  const { type, category, title, content, priority_weight } = req.body;
  // Implementation...
  res.json({ success: true });
});

// Get all non-negotiables
router.get('/non-negotiables', async (req, res) => {
  const rules = await philosophyService.getActiveNonNegotiables();
  res.json(rules);
});

// Get decision hierarchy
router.get('/decision-hierarchy', async (req, res) => {
  const hierarchy = await philosophyService.getDecisionHierarchy();
  res.json(hierarchy);
});

// Validate a recommendation against philosophy
router.post('/validate', async (req, res) => {
  const { recommendationText, chatHistoryId } = req.body;
  const validation = await philosophyService.validateRecommendation(recommendationText, chatHistoryId);
  res.json(validation);
});

export default router;
```

Add to `backend/src/index.ts`:
```typescript
import philosophyRoutes from './routes/philosophy';
app.use('/api/philosophy', philosophyRoutes);
```

---

### 4. Frontend Implementation

#### Philosophy Management UI (`frontend/src/pages/PhilosophyManagement.tsx`)

Admin interface for managing philosophy documents and non-negotiables.

```typescript
import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export const PhilosophyManagement: React.FC = () => {
  const [philosophyDocs, setPhilosophyDocs] = useState([]);
  const [nonNegotiables, setNonNegotiables] = useState([]);

  useEffect(() => {
    loadPhilosophy();
  }, []);

  const loadPhilosophy = async () => {
    const docs = await api.get('/philosophy/documents');
    const rules = await api.get('/philosophy/non-negotiables');
    setPhilosophyDocs(docs.data);
    setNonNegotiables(rules.data);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">RMU Athletics Philosophy</h1>

      {/* Mission & Vision Display */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Mission & Vision</h2>
        {/* Display mission/vision documents */}
      </section>

      {/* Core Values Display */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Core Values</h2>
        {/* Display values with priority weights */}
      </section>

      {/* Non-Negotiables Display */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Non-Negotiables (Hard Constraints)</h2>
        {/* Display non-negotiables with enforcement types */}
      </section>

      {/* Decision Hierarchy Display */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Decision Hierarchy</h2>
        {/* Display decision hierarchy pyramid */}
      </section>
    </div>
  );
};
```

#### Enhanced Chat UI with Philosophy Transparency

Update `frontend/src/components/AIChat.tsx` to show philosophy citations:

```typescript
interface AIResponse {
  message: string;
  alignment?: {
    core_values: string[];
    cited_principles: string[];
    decision_hierarchy: { university: number; department: number; individual: number };
  };
  validation_status?: 'approved' | 'flagged' | 'rejected';
}

export const AIChat: React.FC = () => {
  const [response, setResponse] = useState<AIResponse | null>(null);

  const renderPhilosophyAlignment = (alignment: AIResponse['alignment']) => {
    if (!alignment) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Philosophy Alignment</h4>

        <div className="mb-3">
          <span className="font-medium">Core Values: </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {alignment.core_values.map(v => (
              <span key={v} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {v}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <span className="font-medium">Decision Hierarchy Alignment:</span>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{alignment.decision_hierarchy.university}%</div>
              <div className="text-xs text-gray-600">University</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{alignment.decision_hierarchy.department}%</div>
              <div className="text-xs text-gray-600">Department</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{alignment.decision_hierarchy.individual}%</div>
              <div className="text-xs text-gray-600">Individual</div>
            </div>
          </div>
        </div>

        <div>
          <span className="font-medium">Cited Principles: </span>
          <ul className="list-disc list-inside mt-1 text-sm">
            {alignment.cited_principles.map(p => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Chat UI */}
      {response && (
        <div>
          <div className="message">{response.message}</div>
          {renderPhilosophyAlignment(response.alignment)}
          {response.validation_status === 'flagged' && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded">
              ⚠️ This recommendation has been flagged for potential conflicts with Non-Negotiables.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

### 5. Database Migration & Seeding

#### Migration Script (`backend/src/database/migrations/006_philosophy_system.sql`)

```sql
-- Philosophy Documents Table
CREATE TABLE IF NOT EXISTS philosophy_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority_weight INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Non-Negotiables Table
CREATE TABLE IF NOT EXISTS non_negotiables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_number INTEGER UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  enforcement_type VARCHAR(50) NOT NULL,
  auto_reject BOOLEAN DEFAULT false,
  validation_keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Decision Hierarchy Table
CREATE TABLE IF NOT EXISTS decision_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level INTEGER UNIQUE NOT NULL,
  stakeholder VARCHAR(100) NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Recommendation Validations Table
CREATE TABLE IF NOT EXISTS ai_recommendation_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_history_id UUID REFERENCES chat_history(id),
  recommendation_text TEXT NOT NULL,
  validation_status VARCHAR(50) NOT NULL,
  cited_values UUID[],
  cited_non_negotiables UUID[],
  violated_constraints UUID[],
  decision_hierarchy_alignment JSONB,
  conflict_resolution TEXT,
  transparency_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_philosophy_type ON philosophy_documents(type);
CREATE INDEX idx_philosophy_active ON philosophy_documents(is_active);
CREATE INDEX idx_non_negotiables_active ON non_negotiables(is_active);
CREATE INDEX idx_validations_chat ON ai_recommendation_validations(chat_history_id);
CREATE INDEX idx_validations_status ON ai_recommendation_validations(validation_status);
```

#### Seed Data Script (`backend/src/database/seeds/philosophy_seed.sql`)

```sql
-- Seed Mission, Vision, Purpose
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('mission', NULL, 'Mission Statement', 'Our mission is to promote a transformative, inclusive and unparalleled collegiate experience for our student-athletes. We will foster success in the classroom, competition, and the community, while developing today''s exemplary Colonial scholar-athletes into the leaders of tomorrow.', 100),
('purpose', NULL, 'Purpose Statement', 'Developing today''s exemplary Colonial scholar-athletes into the leaders of tomorrow.', 100),
('vision', NULL, 'Vision Statement', 'RMU Athletics aspires to become the preeminent NCAA Division 1 mid-major college athletics department by developing championship-caliber sport programs that enhance the brand, identity, reputation, and visibility of the University.', 100);

-- Seed Core Values
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('value', 'Community', 'Community', 'Commitment to engagement, outreach, relations and service', 90),
('value', 'Connection', 'Connection', 'Commitment to developing meaningful relationships within the athletics department, on campus and in the community', 90),
('value', 'Commitment to Excellence', 'Commitment to Excellence', 'Commitment to our culture - our mission, vision, purpose, values, and principles', 95),
('value', 'Integrity', 'Integrity', 'Commitment to be ethical, fair, honest, authentic, accessible and exhibit sportsmanship', 90),
('value', 'Resilience', 'Resilience', 'Commitment to be the most resourceful athletics department to provide amenities and access far and above what anyone else can offer', 85);

-- Seed Guiding Principles
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('guiding_principle', NULL, 'Develop Meaningful Relationships', 'Build strong connections within and outside the department', 80),
('guiding_principle', NULL, 'Diversity, Equity, Inclusion and Belonging', 'Foster an inclusive environment for all', 80),
('guiding_principle', NULL, 'Health and Well-Being', 'Prioritize physical and mental health', 85),
('guiding_principle', NULL, 'Inclusive and Collaborative Leadership', 'Lead with collaboration and inclusivity', 80),
('guiding_principle', NULL, 'Pride and Tradition', 'Honor RMU Athletics heritage and build pride', 75);

-- Seed Operating Principles
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('operating_principle', NULL, 'Accountability', 'Take responsibility for actions and outcomes', 70),
('operating_principle', NULL, 'Collaboration', 'Work together across departments and programs', 75),
('operating_principle', NULL, 'Innovation', 'Seek creative solutions and continuous improvement', 70),
('operating_principle', NULL, 'Professionalism', 'Maintain high standards in all interactions', 70),
('operating_principle', NULL, 'Resourceful', 'Maximize resources and seek creative solutions', 70);

-- Seed Themes (Department Goals)
INSERT INTO philosophy_documents (type, category, title, content, priority_weight) VALUES
('theme', NULL, 'Branding and Engagement', 'Build RMU Athletics brand and fan engagement', 70),
('theme', NULL, 'Colonial Culture', 'Foster a strong departmental culture', 75),
('theme', NULL, 'Competitive Excellence', 'Achieve excellence in athletic competition', 80),
('theme', NULL, 'Resource Development and Investment', 'Grow resources and strategic investments', 75),
('theme', NULL, 'Student-Athlete Experience', 'Provide exceptional student-athlete experiences', 85),
('theme', NULL, 'Strategic Vision', 'Align on long-term strategic direction', 80);

-- Seed Non-Negotiables
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

-- Seed Decision Hierarchy
INSERT INTO decision_hierarchy (level, stakeholder, description, weight) VALUES
(1, 'University', 'Decisions must first prioritize the best interest of Robert Morris University', 100),
(2, 'Department', 'Decisions must second prioritize the best interest of RMU Athletics Department', 70),
(3, 'Individual', 'Decisions may third prioritize individual programs or staff, but never above Department or University', 40);
```

---

## Implementation Plan

### Phase 1: Database & Backend (40 hours)

1. **Database Schema** (8 hours)
   - Create migration script with all tables
   - Add indexes for performance
   - Create seed data script
   - Test migrations on dev environment

2. **Philosophy Service** (16 hours)
   - Implement `PhilosophyService` class
   - Build context generation logic
   - Create validation methods
   - Add keyword-based violation detection
   - Write unit tests

3. **Gemini Service Enhancement** (12 hours)
   - Integrate philosophy context into prompts
   - Add validation to chat responses
   - Implement philosophy-aligned recommendation generator
   - Add JSON parsing and error handling
   - Write integration tests

4. **API Routes** (4 hours)
   - Create philosophy management endpoints
   - Add validation endpoint
   - Test with Postman/Insomnia

### Phase 2: Frontend UI (30 hours)

1. **Philosophy Management Page** (12 hours)
   - Create admin interface for philosophy documents
   - Build non-negotiables display
   - Add decision hierarchy visualization
   - Implement CRUD operations

2. **Enhanced Chat UI** (10 hours)
   - Add philosophy alignment display
   - Show validation status badges
   - Create interactive core values tags
   - Add decision hierarchy chart

3. **Dashboard Widgets** (8 hours)
   - Create "Philosophy Quick Reference" widget
   - Add "Recent Validations" summary
   - Build "Alignment Score" metrics

### Phase 3: Advanced Features (30 hours)

1. **AI-Powered Validation** (12 hours)
   - Replace keyword detection with Gemini semantic analysis
   - Implement conflict resolution logic
   - Add multi-principle balancing

2. **Feedback Loop** (10 hours)
   - Create admin feedback interface
   - Allow marking validations as correct/incorrect
   - Use feedback to refine validation rules

3. **Analytics & Reporting** (8 hours)
   - Build philosophy alignment dashboard
   - Track most-cited values
   - Show validation trends over time

### Phase 4: Testing & Documentation (20 hours)

1. **Testing** (12 hours)
   - Unit tests for all services
   - Integration tests for API endpoints
   - E2E tests for UI workflows
   - Validation accuracy testing

2. **Documentation** (8 hours)
   - API documentation
   - User guide for philosophy management
   - Developer guide for extending validation logic

---

## Acceptance Criteria

### Must-Have (MVP)

- [x] Database schema with all tables created
- [x] Seed data for all RMU philosophy documents loaded
- [x] Philosophy context automatically included in all AI prompts
- [x] Non-negotiables implemented as validation filters
- [x] Auto-reject mechanism for hard constraint violations
- [x] Decision hierarchy enforced in recommendations
- [x] AI responses cite relevant values/principles
- [x] Admin UI for viewing philosophy documents
- [x] Validation status displayed in chat responses

### Should-Have (Enhanced)

- [ ] AI-powered semantic validation (beyond keywords)
- [ ] Philosophy alignment scoring (0-100)
- [ ] Conflict resolution explanations
- [ ] Admin feedback loop for validation refinement
- [ ] Analytics dashboard for philosophy usage

### Could-Have (Future Enhancements)

- [ ] Machine learning model for violation detection
- [ ] Historical trend analysis of value alignment
- [ ] Integration with document uploads to auto-extract philosophy
- [ ] Multi-language support for international staff

---

## Risks & Mitigation

### Risk 1: Validation False Positives
**Risk**: Keyword-based validation may incorrectly flag valid recommendations.
**Mitigation**:
- Start with high-confidence keywords only
- Add AI semantic analysis in Phase 3
- Implement admin review and feedback loop
- Allow override with justification

### Risk 2: Philosophy Context Overwhelms Token Limits
**Risk**: Adding full philosophy to every prompt may exceed Gemini token limits.
**Mitigation**:
- Implement "smart context" that only includes relevant sections
- Use embeddings to find most relevant philosophy for each query
- Cache philosophy context to reduce token usage

### Risk 3: Conflict Between Principles
**Risk**: Multiple principles may compete in complex scenarios.
**Mitigation**:
- Implement weighted priority system
- Use Gemini to explain conflict resolution
- Provide transparency in decision rationale

### Risk 4: Maintenance Burden
**Risk**: Philosophy documents may need frequent updates.
**Mitigation**:
- Build admin UI for easy updates
- Version control for philosophy documents
- Audit log for changes
- Require approval workflow for changes

---

## Success Metrics

### Technical Metrics
- **Validation Accuracy**: 95%+ of flagged recommendations are actual violations
- **Response Time**: <3 seconds for philosophy-aware chat responses
- **Context Inclusion Rate**: 100% of AI interactions include philosophy context
- **Auto-Reject Precision**: 100% of auto-rejected recommendations are valid rejections

### Business Metrics
- **Cultural Alignment Score**: 85%+ of recommendations align with core values
- **User Trust**: Survey shows 90%+ confidence in AI recommendations
- **Violation Prevention**: Zero recommendations implemented that violate non-negotiables
- **Transparency Rating**: Users rate 90%+ satisfaction with explanation quality

---

## Future Enhancements

1. **Philosophy Evolution Tracking**: Version control and historical view of how philosophy has evolved
2. **Scenario Simulation**: Test how BOT would respond to hypothetical scenarios against philosophy
3. **Multi-Stakeholder Alignment**: Show how recommendations affect different stakeholders
4. **Integration with Performance Reviews**: Link staff performance to philosophy alignment
5. **Philosophy Quiz/Training**: Interactive training module for new staff on RMU values

---

## Related Features

- **P1-003: User Access Control** - Philosophy management requires admin permissions
- **P1-005: Notifications** - Alert admins when validation failures occur
- **P3-001: Collaboration** - Allow team feedback on philosophy alignment
- **P3-008: User Feedback** - Collect feedback on validation accuracy

---

## References

- [User Feedback FB-001: RMU Athletics Philosophy Integration](../USER_FEEDBACK.md#fb-001)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [OGSM Framework Background](../README.md)
- [RMU Athletics Strategic Plan](./Fw_Documents_for_Phase_Zero_RMU_Athletics_AI_Chief_Strategy_Officer_Project/)
