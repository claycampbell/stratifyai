# P1-004: 30/60/90 Day Plans Module

**Priority**: High | **Effort**: High (60-80 hours) | **Impact**: High
**Status**: Planning
**Created**: 2025-11-06

## Overview

Implement a comprehensive 30/60/90 day planning system that allows staff members to create and track personal development plans aligned with organizational strategies and KPIs. This feature enables individual accountability, progress tracking, and clear visibility into how individual work contributes to strategic goals.

## Business Context

### Problem Statement
Staff members need a structured way to:
- Plan their work in 30, 60, and 90-day increments
- Align individual efforts with departmental strategies
- Track progress on personal goals and initiatives
- Connect daily work to organizational KPIs
- Provide visibility to managers on staff priorities and progress

### User Stories

**As a Staff Member:**
- I want to create a 30/60/90 day plan so I can organize my priorities
- I want to link my plan items to strategies and KPIs to show alignment
- I want to track my progress on plan items
- I want to mark plan items as complete and add notes
- I want to view my historical plans to see my growth

**As a Manager:**
- I want to view my team members' plans to understand their priorities
- I want to see how staff work aligns with strategic goals
- I want to track progress across my team
- I want to provide feedback on plan items
- I want to generate reports on team progress

**As an Administrator:**
- I want to see all active plans across the department
- I want to identify gaps in strategic coverage
- I want to generate analytics on plan completion rates
- I want to export plan data for reporting

## Database Schema

### New Tables

#### `staff_plans` Table
```sql
CREATE TABLE staff_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- Status: active, completed, archived, on_hold
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'archived', 'on_hold'))
);

CREATE INDEX idx_staff_plans_user_id ON staff_plans(user_id);
CREATE INDEX idx_staff_plans_status ON staff_plans(status);
CREATE INDEX idx_staff_plans_dates ON staff_plans(start_date, end_date);
```

#### `plan_items` Table
```sql
CREATE TABLE plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES staff_plans(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    timeframe VARCHAR(20) NOT NULL,
    -- Timeframe: 30_days, 60_days, 90_days
    priority VARCHAR(20) DEFAULT 'medium',
    -- Priority: critical, high, medium, low
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    -- Status: not_started, in_progress, completed, blocked, cancelled
    completion_percentage INTEGER DEFAULT 0,
    target_completion_date DATE,
    actual_completion_date DATE,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_timeframe CHECK (timeframe IN ('30_days', '60_days', '90_days')),
    CONSTRAINT valid_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'cancelled')),
    CONSTRAINT valid_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

CREATE INDEX idx_plan_items_plan_id ON plan_items(plan_id);
CREATE INDEX idx_plan_items_timeframe ON plan_items(timeframe);
CREATE INDEX idx_plan_items_status ON plan_items(status);
CREATE INDEX idx_plan_items_order ON plan_items(plan_id, order_index);
```

#### `plan_item_links` Table (for linking to strategies/KPIs)
```sql
CREATE TABLE plan_item_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_item_id UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL,
    -- link_type: strategy, kpi, initiative, ogsm_component
    link_id UUID NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_link_type CHECK (link_type IN ('strategy', 'kpi', 'initiative', 'ogsm_component')),
    UNIQUE(plan_item_id, link_type, link_id)
);

CREATE INDEX idx_plan_item_links_item_id ON plan_item_links(plan_item_id);
CREATE INDEX idx_plan_item_links_target ON plan_item_links(link_type, link_id);
```

#### `plan_updates` Table (for tracking progress updates)
```sql
CREATE TABLE plan_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_item_id UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
    update_type VARCHAR(50) NOT NULL,
    -- update_type: status_change, progress_update, note_added, completion
    previous_value TEXT,
    new_value TEXT,
    notes TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_update_type CHECK (update_type IN ('status_change', 'progress_update', 'note_added', 'completion', 'blocked'))
);

CREATE INDEX idx_plan_updates_item_id ON plan_updates(plan_item_id);
CREATE INDEX idx_plan_updates_date ON plan_updates(created_at DESC);
```

## API Endpoints

### Staff Plans

#### `GET /api/staff-plans`
Get all plans (with filtering)
```typescript
Query Parameters:
- user_id?: string
- status?: 'active' | 'completed' | 'archived' | 'on_hold'
- start_date?: string (ISO date)
- end_date?: string (ISO date)

Response: StaffPlan[]
```

#### `GET /api/staff-plans/:id`
Get single plan with all plan items
```typescript
Response: {
  ...StaffPlan,
  items: PlanItem[],
  statistics: {
    total_items: number,
    completed_items: number,
    in_progress_items: number,
    avg_completion_percentage: number
  }
}
```

#### `POST /api/staff-plans`
Create new plan
```typescript
Body: {
  user_id: string,
  title: string,
  description?: string,
  start_date: string,
  end_date: string
}

Response: StaffPlan
```

#### `PUT /api/staff-plans/:id`
Update plan
```typescript
Body: {
  title?: string,
  description?: string,
  status?: string,
  end_date?: string
}

Response: StaffPlan
```

#### `DELETE /api/staff-plans/:id`
Delete plan (soft delete by archiving)

### Plan Items

#### `GET /api/staff-plans/:planId/items`
Get all items for a plan

#### `POST /api/staff-plans/:planId/items`
Create new plan item
```typescript
Body: {
  title: string,
  description?: string,
  timeframe: '30_days' | '60_days' | '90_days',
  priority?: string,
  target_completion_date?: string
}

Response: PlanItem
```

#### `PUT /api/plan-items/:id`
Update plan item
```typescript
Body: {
  title?: string,
  description?: string,
  status?: string,
  completion_percentage?: number,
  priority?: string,
  notes?: string,
  actual_completion_date?: string
}

Response: PlanItem
```

#### `POST /api/plan-items/:id/links`
Add link to strategy/KPI
```typescript
Body: {
  link_type: 'strategy' | 'kpi' | 'initiative' | 'ogsm_component',
  link_id: string,
  description?: string
}

Response: PlanItemLink
```

#### `GET /api/plan-items/:id/updates`
Get update history for plan item

#### `POST /api/plan-items/:id/updates`
Add progress update
```typescript
Body: {
  update_type: string,
  notes?: string
}

Response: PlanUpdate
```

### Analytics & Reporting

#### `GET /api/staff-plans/analytics/completion-rates`
Get completion statistics

#### `GET /api/staff-plans/analytics/alignment`
Get strategic alignment metrics

## Frontend Components

### Pages

#### `StaffPlans.tsx` - Main Plans Page
- List of all plans (current user or team)
- Filter by status, timeframe, user
- Create new plan button
- Quick stats cards (active plans, completion rate, overdue items)

#### `PlanDetail.tsx` - Individual Plan View
- Plan header with title, dates, status
- Three columns: 30 Days, 60 Days, 90 Days
- Drag-and-drop to reorder items
- Add item button for each timeframe
- Progress indicators for each timeframe
- Link items to strategies/KPIs

### Components

#### `PlanCard.tsx`
- Plan summary card for list view
- Shows progress bar, key stats, timeframe
- Click to open detail view

#### `PlanItemCard.tsx`
- Individual plan item display
- Editable inline
- Status indicator, priority badge
- Link indicators (strategy/KPI icons)
- Progress slider
- Notes section

#### `PlanItemForm.tsx`
- Create/edit plan item modal
- Title, description, timeframe selector
- Priority selector
- Target completion date picker
- Link to strategies/KPIs (searchable dropdowns)

#### `PlanTimeline.tsx`
- Visual timeline view of plan
- Shows 30/60/90 day milestones
- Item completion markers
- Progress visualization

#### `PlanProgressChart.tsx`
- Chart showing completion over time
- Breakdown by timeframe
- Comparison to target pace

#### `StrategicAlignmentView.tsx`
- Shows which strategies/KPIs are linked
- Visual connection map
- Identifies unlinked items

### User Workflows

#### Creating a New Plan
1. Click "Create New Plan"
2. Enter plan title, description, date range
3. Click "Create Plan"
4. Add 30-day items
5. Add 60-day items
6. Add 90-day items
7. Link items to strategies/KPIs
8. Save plan

#### Tracking Progress
1. Open plan
2. Click on item to update
3. Update status and/or completion percentage
4. Add notes about progress
5. Mark as complete when done
6. System records update history

#### Manager Review
1. Navigate to team plans view
2. Filter by team member
3. View plan details
4. See strategic alignment
5. Add comments/feedback
6. Generate progress report

## Implementation Phases

### Phase 1: Core Infrastructure (20-25 hours)
- [ ] Database schema and migrations
- [ ] TypeScript type definitions
- [ ] Backend API routes (CRUD for plans and items)
- [ ] Basic authentication and authorization

### Phase 2: Basic UI (15-20 hours)
- [ ] Plans list page
- [ ] Plan detail page with 3-column layout
- [ ] Plan item cards
- [ ] Create/edit forms
- [ ] Basic status updates

### Phase 3: Strategic Linking (10-12 hours)
- [ ] Link items to strategies/KPIs
- [ ] Display linked items
- [ ] Strategic alignment view
- [ ] Filter by linked strategy/KPI

### Phase 4: Progress Tracking (8-10 hours)
- [ ] Progress updates and history
- [ ] Completion tracking
- [ ] Timeline view
- [ ] Progress charts

### Phase 5: Team Features (7-10 hours)
- [ ] Team plans view for managers
- [ ] Analytics and reporting
- [ ] Export functionality
- [ ] Notifications for overdue items

## Acceptance Criteria

### Functional Requirements
- [x] Staff members can create 30/60/90 day plans
- [x] Plans contain items organized by timeframe
- [x] Items can be linked to strategies and KPIs
- [x] Progress can be tracked with percentage and status
- [x] Managers can view team member plans
- [x] Update history is maintained for each item
- [x] Plans can be completed and archived

### Non-Functional Requirements
- [x] Responsive design for mobile access
- [x] Fast loading (< 2s for plan detail view)
- [x] Intuitive drag-and-drop interface
- [x] Real-time updates for collaborative viewing
- [x] Export plans to PDF

## Technical Considerations

### Performance
- Index on user_id, status, and dates for fast filtering
- Paginate plan lists for users with many plans
- Lazy load plan item details
- Cache strategic alignment calculations

### Security
- Users can only view/edit their own plans
- Managers can view plans of their direct reports
- Admins can view all plans
- Audit log all updates

### Data Migration
- No existing data to migrate
- Seed with example template plans

## Future Enhancements (Out of Scope)

- AI-generated plan suggestions based on strategies
- Templates for common role types
- Integration with calendar for deadlines
- Email reminders for approaching deadlines
- Slack/Teams integration for updates
- Mobile app for quick updates
- Goal cascading from manager to team

## Dependencies

- User authentication system (prerequisite)
- Existing strategies and KPIs in database
- OGSM components for linking

## Testing Strategy

### Unit Tests
- API endpoint tests for all CRUD operations
- Business logic tests for calculations
- Validation tests for data integrity

### Integration Tests
- Full workflow tests (create plan → add items → update → complete)
- Strategic linking tests
- Team view permission tests

### Manual Testing
- Create plans as different user roles
- Test drag-and-drop functionality
- Verify all links work correctly
- Test on mobile devices
- Performance testing with 100+ plans

## Documentation Needs

- User guide for creating plans
- Manager guide for team review
- API documentation
- Database schema diagram
- Strategic alignment guide
