# Fiscal Year Planning Mode - Design Document

**Date:** 2026-01-08
**Status:** Design Complete - Ready for Implementation
**Priority:** High

## Overview

Creates a structured fiscal year planning workflow where the athletic department can build next year's strategic plan by selecting 3 core priorities, generating AI-powered strategies for each, and converting those into formal OGSM components with trackable KPIs.

## User Workflow

### 1. Enter Planning Mode
- New "Fiscal Year Planning" section accessible from main navigation
- Dashboard shows current fiscal year status and planning progress

### 2. Set Fiscal Year Context
- Define FY27 (or current year)
- Set start/end dates for fiscal year
- Optionally import/reference last year's objectives

### 3. Define 3 Core Priorities
- Enter 3 high-level objectives
- Examples: "Hockey Revenue Growth," "Turf Field Marketing," "Operational Excellence"
- Can import priorities from last year's OGSM or create new ones

### 4. Generate Strategies Per Priority
- For each priority, use AI Strategy Generator to create 3-5 tactical strategies
- Batch generation (all 3 priorities at once) or one-by-one
- Each strategy includes implementation steps, KPIs, risks, resources, timeline

### 5. Review & Refine
- See all 9-15 generated strategies in one place
- Edit/combine/discard strategies as needed
- Team review with status workflow: Draft → Under Review → Approved → Rejected

### 6. Convert to OGSM
- One-click conversion of approved strategies into formal OGSM components
- Creates proper hierarchy: Objective → Goal → Strategy → Measures

### 7. Create KPIs
- AI suggests KPIs based on each strategy's success_metrics
- Team adds/refines KPIs with targets and tracking frequency
- KPIs automatically linked to parent strategies

### 8. Finalize & Activate
- Lock in the plan for FY27
- Makes it the active strategic plan
- Previous year's plan marked as 'completed'

## AI Strategy Generator Integration

### Easy Button Feature
- When a fiscal year plan is active, show banner: "Generating strategies for FY27 Plan"
- Each generated strategy card gets "Add to FY27 Plan" button
- Dropdown allows assigning to specific priorities:
  - Priority 1: Hockey Revenue
  - Priority 2: Turf Field Marketing
  - Priority 3: Operational Excellence
  - Or create new priority

### Bulk Operations
- Select multiple generated strategies
- "Add Selected to Plan" button
- Choose which priority each goes under
- All added at once with linked KPIs

### Status Tracking
- Strategies in fiscal plan have status: Draft → Under Review → Approved → Active
- Team can discuss/refine before finalizing
- Once plan "Activated," all approved strategies become official OGSM components

## Database Schema

### fiscal_year_plans
Tracks each planning cycle (FY27, FY28, etc.)

```sql
CREATE TABLE fiscal_year_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscal_year VARCHAR(10) NOT NULL UNIQUE,  -- 'FY27', 'FY28'
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### fiscal_year_priorities
Stores the 3 core objectives

```sql
CREATE TABLE fiscal_year_priorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscal_plan_id UUID REFERENCES fiscal_year_plans(id) ON DELETE CASCADE,
  priority_number INTEGER NOT NULL CHECK (priority_number BETWEEN 1 AND 3),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  imported_from_ogsm_id UUID REFERENCES ogsm_components(id), -- If carried over
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fiscal_plan_id, priority_number)
);
```

### fiscal_year_draft_strategies
Holds AI-generated strategies before conversion to formal OGSM

```sql
CREATE TABLE fiscal_year_draft_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscal_plan_id UUID REFERENCES fiscal_year_plans(id) ON DELETE CASCADE,
  priority_id UUID REFERENCES fiscal_year_priorities(id) ON DELETE CASCADE,

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
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'under_review', 'approved', 'rejected', 'converted'
  converted_to_ogsm_id UUID REFERENCES ogsm_components(id), -- Link to final OGSM strategy

  -- Metadata
  generated_from_ai BOOLEAN DEFAULT TRUE,
  ai_generation_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT
);

CREATE INDEX idx_draft_strategies_plan ON fiscal_year_draft_strategies(fiscal_plan_id);
CREATE INDEX idx_draft_strategies_priority ON fiscal_year_draft_strategies(priority_id);
CREATE INDEX idx_draft_strategies_status ON fiscal_year_draft_strategies(status);
```

## API Endpoints

### `/api/fiscal-planning` Routes

```typescript
// Create a new fiscal year plan
POST /api/fiscal-planning/plans
Body: { fiscal_year: "FY27", start_date, end_date }
Returns: { id, fiscal_year, status, ... }

// Get active or specific fiscal year plan
GET /api/fiscal-planning/plans/active
GET /api/fiscal-planning/plans/:planId
Returns: Plan with priorities and draft strategies

// Add/update priorities for a plan
POST /api/fiscal-planning/plans/:planId/priorities
Body: { priorities: [{ priority_number, title, description }] }
Returns: Created priorities

// Import priority from last year's OGSM
POST /api/fiscal-planning/plans/:planId/priorities/import
Body: { ogsm_component_id, priority_number }
Returns: Priority linked to old objective

// Add AI-generated strategy to plan
POST /api/fiscal-planning/plans/:planId/strategies
Body: { priority_id, strategy: { title, description, ... }, ai_generation_id }
Returns: Draft strategy

// Bulk add strategies
POST /api/fiscal-planning/plans/:planId/strategies/bulk
Body: { strategies: [{ priority_id, ...strategy_data }] }
Returns: Array of created draft strategies

// Update draft strategy status
PATCH /api/fiscal-planning/strategies/:strategyId
Body: { status, review_notes }
Returns: Updated strategy

// Convert approved strategies to OGSM
POST /api/fiscal-planning/plans/:planId/convert-to-ogsm
Body: { strategy_ids: [...] }
Returns: { created_objectives, created_strategies, created_kpis }

// Activate plan (make it live)
POST /api/fiscal-planning/plans/:planId/activate
Returns: Activated plan with all converted OGSM components

// Get plan summary/dashboard
GET /api/fiscal-planning/plans/:planId/summary
Returns: {
  priorities: [...],
  draft_strategies_count: { by_status },
  converted_count,
  kpis_created_count
}
```

## Backend Logic

### Strategy Conversion
When converting draft strategies to OGSM:
1. Create OGSM Objective from priority (if not exists)
2. Create OGSM Strategy from draft strategy
3. Create KPIs from `success_metrics` array
4. Link everything with proper parent relationships
5. Mark draft strategy as 'converted' with link to OGSM component

### Plan Activation
When activating a plan:
1. Validate: All approved draft strategies must be converted first
2. Mark plan status as 'active'
3. Previous year's plan becomes 'completed'
4. All OGSM components become the active strategic plan

### KPI Creation from Success Metrics
For each success_metric in draft strategy:
- Create KPI with name from metric
- Link to parent OGSM Strategy
- Suggest tracking frequency based on timeframe
- Pre-populate target based on objective context

## Frontend Components

### New Pages

#### 1. Fiscal Planning Dashboard (`/fiscal-planning`)
- Shows current fiscal year plan status
- Progress indicators: Priorities defined, Strategies generated, Conversion complete
- Quick stats: X/3 priorities, Y draft strategies, Z approved, N converted
- Action buttons: Start New Plan, Continue Current Plan, View Archive

#### 2. Plan Setup (`/fiscal-planning/setup/:planId`)
- Fiscal year selection and date range
- Import from last year option (shows previous objectives)
- Define 3 priorities form
- Progress stepper showing completion status

#### 3. Strategy Bank (`/fiscal-planning/strategies/:planId`)
- Grid view of all draft strategies grouped by priority
- Filter by status (draft, under review, approved, rejected)
- Bulk actions: Approve selected, Reject selected, Convert to OGSM
- Each strategy card shows:
  - Title, description, rationale
  - Success probability, cost, timeframe
  - Status badge
  - Action buttons: Edit, Approve, Convert

#### 4. Conversion Review (`/fiscal-planning/convert/:planId`)
- Preview of OGSM structure before conversion
- Shows hierarchy: Priority → Draft Strategies → Suggested KPIs
- Edit KPI details before finalizing
- "Finalize & Activate Plan" button

### Modified Components

#### AI Strategy Generator (`/ai-strategy`)
- Detects active fiscal plan
- Shows banner: "🎯 Generating strategies for FY27 Plan"
- Adds "Add to Plan" button to each generated strategy
- Dropdown to select which priority to assign to

## Key Features

### Side-by-Side Comparison
- View last year's objectives alongside this year's priorities
- Highlight what's carried over vs new
- Show performance data from last year's KPIs

### Collaborative Review
- Team members can comment on draft strategies
- Status workflow: Draft → Under Review → Approved
- Track who reviewed and when
- Review notes captured for each strategy

### Smart KPI Suggestions
- AI analyzes strategy success_metrics
- Suggests appropriate KPI names, targets, and tracking frequency
- Pre-fills baseline values from last year if available
- Validates KPIs against existing measures to avoid duplicates

### Data Validation
- Prevents activating plan without converting all approved strategies
- Warns if priorities don't have sufficient strategies (recommend 3-5 per priority)
- Validates fiscal year uniqueness
- Ensures all KPIs have owners assigned

## User Manual Section

Create documentation section covering:
1. How to start fiscal year planning
2. Defining priorities and importing from last year
3. Using AI Strategy Generator within planning mode
4. Reviewing and approving strategies
5. Converting strategies to OGSM
6. Activating the new fiscal year plan
7. Archiving completed fiscal years

## Implementation Phases

### Phase 1: Core Infrastructure
- Database schema and migrations
- API endpoints for plans, priorities, draft strategies
- Basic CRUD operations

### Phase 2: UI & Workflow
- Fiscal planning dashboard
- Plan setup and priority definition
- Strategy bank with filtering and status management

### Phase 3: AI Integration
- Connect AI Strategy Generator to fiscal planning
- Easy button "Add to Plan" functionality
- Bulk operations for strategies

### Phase 4: Conversion & Activation
- Strategy to OGSM conversion logic
- KPI creation from success metrics
- Plan activation workflow
- Archive previous fiscal years

### Phase 5: Polish & Documentation
- User manual
- Review workflow and collaboration features
- Performance data comparison (last year vs this year)
- Validation and error handling

## Success Metrics

- Time to create fiscal year plan (target: <2 hours)
- Number of AI-generated strategies used in final plan
- Team engagement (number of reviews, comments)
- Plan activation success rate
- User satisfaction with planning workflow

## Technical Considerations

- **YAGNI**: Start with core workflow, add collaboration features later if needed
- **Data integrity**: Ensure draft strategies and OGSM components stay in sync
- **Performance**: Lazy load strategy details, paginate strategy bank
- **Security**: Validate user permissions for plan creation/activation
- **Scalability**: Index fiscal plan queries by status and fiscal_year

## Future Enhancements

- Multi-year planning (FY27-29 strategic horizon)
- What-if scenario modeling (compare different priority combinations)
- Automated progress tracking throughout fiscal year
- Integration with 30/60/90-day plans tied to fiscal priorities
- Budget allocation per priority
- Risk assessment dashboard
