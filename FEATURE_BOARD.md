# Stratify AI - Feature Board

**Last Updated**: 2025-11-03
**Source**: Customer Feedback (Chris King & Stephen's Notes)

## Feature Status Legend
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Completed
- 🔵 Blocked
- ⚪ On Hold

---

## Phase 0: Quick Wins (2-4 weeks)

### P0-001: KPI Terminology Updates ✅ COMPLETE
**Priority**: High | **Effort**: Low | **Impact**: High
**Status**: ✅ Deployed to Production (Azure PostgreSQL)

**Description**: Replace "Lead" terminology with "Ownership" (Primary) and "Persons Responsible" (Secondary) throughout KPI module.

**Affected Components**:
- Frontend: KPI forms, KPI display cards, KPI detail views
- Backend: Database schema, API responses
- Database: `kpis` table column renaming

**Technical Spec**: See [specs/P0-001-kpi-terminology.md](specs/P0-001-kpi-terminology.md)

**Acceptance Criteria**:
- [x] Database schema updated with new column names
- [x] Backend API returns new field names
- [x] Frontend forms use new terminology
- [x] All existing KPIs migrated to new schema (94/130 KPIs migrated)
- [x] No references to "Lead" remain in codebase

**Actual Hours**: ~8 hours | **Completed**: 2025-11-03

---

### P0-002: KPI Description Formatting ✅ COMPLETE
**Priority**: Medium | **Effort**: Low | **Impact**: Medium
**Status**: ✅ Deployed

**Description**: Display KPI description items in individual rows instead of one long text format.

**Affected Components**:
- Frontend: KPI detail modal/view ✅
- Backend: No changes needed

**Implementation Details**:
- Parses description by pipe delimiters (|), newlines (\n), or bullet points (•)
- Displays each item with a bullet point in its own row
- Falls back to plain text if no delimiters found
- Improves readability for multi-item descriptions

**Acceptance Criteria**:
- [x] Description text parsed by line breaks, pipes, or bullets
- [x] Each item displayed as separate row with bullet point
- [x] Maintains proper spacing and readability
- [x] Works with existing and new KPIs
- [x] Gracefully handles single-item descriptions

**Actual Hours**: ~0.5 hours | **Completed**: 2025-11-03

---

### P0-003: Report PDF Export Enhancement ✅ COMPLETE
**Priority**: High | **Effort**: Medium | **Impact**: High
**Status**: ✅ Deployed

**Description**: Improve report generation to produce clean, professional PDF exports instead of code-like appearance.

**Affected Components**:
- Frontend: Report formatting, PDF export, print support ✅
- Backend: No changes needed (reports already generated)

**Implementation Details**:
- Added professional report layout with header/footer
- Implemented PDF export using jsPDF and html2canvas
- Added print functionality
- Parses markdown formatting (headers, bullet lists, paragraphs)
- Includes Robert Morris University Athletics branding
- Multi-page PDF support with automatic page breaks
- Preserves formatting and styling in PDF output

**Acceptance Criteria**:
- [x] PDF exports with proper formatting
- [x] Professional header/footer with RMU Athletics branding
- [x] Clean typography and spacing
- [x] Markdown content renders correctly (headers, lists, paragraphs)
- [x] Downloadable PDF with date-stamped filename
- [x] Printable report view
- [x] Export/print buttons in report view

**Actual Hours**: ~1.5 hours | **Completed**: 2025-11-03

---

### P0-004: KPI Dashboard View Options ✅ COMPLETE
**Priority**: Medium | **Effort**: Low | **Impact**: Medium
**Status**: ✅ Deployed

**Description**: Add multiple view options for KPI dashboard (boxes, list, compact) with current values and percentage visible.

**Affected Components**:
- Frontend: KPI dashboard page, view switcher component ✅
- Backend: User preferences API ✅

**Technical Implementation**:
- Created KPIViews component with 3 view modes (boxes/list/compact)
- Added view switcher with icon buttons (LayoutGrid/List/Rows)
- Integrated with user preferences system for database persistence
- View selection persists across sessions and devices
- Fixed authentication interceptor for API calls

**Acceptance Criteria**:
- [x] Box view (card-based grid layout)
- [x] List view (row-based with inline details)
- [x] Compact/table view (high-density display)
- [x] View preference persists per user in database
- [x] Shows all KPI details in each view

**Actual Hours**: ~6 hours | **Completed**: 2025-11-05

---

### P0-005: Chat History UI Improvements 🔴
**Priority**: Medium | **Effort**: Low | **Impact**: Medium
**Status**: Not Started

**Description**: Make AI chat history easily accessible and searchable for reference.

**Affected Components**:
- Frontend: Chat interface, history sidebar
- Backend: Chat history API (already exists)

**Technical Spec**: See [specs/P0-005-chat-history.md](specs/P0-005-chat-history.md)

**Acceptance Criteria**:
- [ ] Chat history sidebar/panel
- [ ] Search functionality
- [ ] Date filtering
- [ ] Click to view past conversations
- [ ] Export conversation feature

**Estimated Hours**: 10-12 hours

---

## Phase 1: Core Features (2-3 months)

### P1-001: KPI Categorization System ✅ COMPLETE
**Priority**: High | **Effort**: Medium | **Impact**: High
**Status**: ✅ Deployed

**Description**: Allow KPIs to be organized into categories/tabs for better organization.

**Affected Components**:
- Database: New `kpi_categories` table, `category_id` in `kpis` ✅
- Backend: Category CRUD APIs ✅
- Frontend: Category management, filtered KPI views ✅

**Technical Spec**: See [specs/P1-001-kpi-categories.md](specs/P1-001-kpi-categories.md)

**Implementation Details**:
- Created kpi_categories table with 6 default categories
- Built CategoryManagementModal for full CRUD operations
- Added KPICategoryTabs component for filtering
- Integrated category selector in KPI forms
- Smart auto-categorization script for existing KPIs
- Color-coded tabs with live KPI counts

**Acceptance Criteria**:
- [x] Create/edit/delete categories
- [x] Assign KPIs to categories
- [x] Filter KPIs by category
- [x] Tab navigation for categories
- [x] Default "Uncategorized" category

**Actual Hours**: ~10 hours | **Completed**: 2025-11-06

---

### P1-002: OGSM Terminology Updates 🔴
**Priority**: High | **Effort**: Medium | **Impact**: High
**Status**: Not Started

**Description**: Update OGSM framework to use "Core Priorities" instead of "Objectives" in the hierarchy.

**Affected Components**:
- Database: `ogsm_components` table (type field)
- Backend: OGSM service, AI extraction logic
- Frontend: All OGSM displays, forms, AI prompts

**Technical Spec**: See [specs/P1-002-ogsm-terminology.md](specs/P1-002-ogsm-terminology.md)

**Acceptance Criteria**:
- [ ] Database migration for terminology
- [ ] Frontend displays "Core Priorities"
- [ ] AI extraction updated to recognize term
- [ ] Existing components migrated
- [ ] Documentation updated

**Estimated Hours**: 16-24 hours

---

### P1-003: User Access Control & Permissions 🔴
**Priority**: Critical | **Effort**: High | **Impact**: Critical
**Status**: Not Started

**Description**: Implement role-based access control (RBAC) and document-level permissions.

**Affected Components**:
- Database: New `users`, `roles`, `permissions`, `user_roles` tables
- Backend: Authentication, authorization middleware
- Frontend: Login, role management, permission checks

**Technical Spec**: See [specs/P1-003-access-control.md](specs/P1-003-access-control.md)

**Acceptance Criteria**:
- [ ] User authentication system
- [ ] Role definition (Admin, Manager, Viewer, etc.)
- [ ] Document-level permissions
- [ ] Department-based access
- [ ] Audit logging for access

**Estimated Hours**: 80-120 hours

---

### P1-004: 30/60/90 Day Plans Module 🔴
**Priority**: High | **Effort**: High | **Impact**: High
**Status**: Not Started

**Description**: Add individual staff member planning with 30/60/90 day plans linked to strategies and KPIs.

**Affected Components**:
- Database: New `staff_plans`, `plan_items` tables
- Backend: Plans CRUD, progress tracking APIs
- Frontend: Plan creation, timeline view, progress tracking

**Technical Spec**: See [specs/P1-004-day-plans.md](specs/P1-004-day-plans.md)

**Acceptance Criteria**:
- [ ] Create plans per staff member
- [ ] Link plans to strategies/KPIs
- [ ] 30/60/90 day milestones
- [ ] Progress tracking
- [ ] Individual plan reports

**Estimated Hours**: 60-80 hours

---

### P1-005: Automated Notifications System 🔴
**Priority**: High | **Effort**: Medium | **Impact**: High
**Status**: Not Started

**Description**: Implement automated reminders and notifications for deadlines, updates, and KPI milestones.

**Affected Components**:
- Database: New `notifications`, `notification_rules` tables
- Backend: Notification service, email integration, scheduler
- Frontend: Notification center, notification preferences

**Technical Spec**: See [specs/P1-005-notifications.md](specs/P1-005-notifications.md)

**Acceptance Criteria**:
- [ ] Email notifications
- [ ] In-app notification center
- [ ] Customizable alert rules
- [ ] KPI threshold alerts
- [ ] Deadline reminders
- [ ] User notification preferences

**Estimated Hours**: 40-60 hours

---

### P1-006: Events Management Module 🔴
**Priority**: High | **Effort**: High | **Impact**: High
**Status**: Not Started

**Description**: New Events module to track competitions, department events, student-athlete events, academic calendar, camps/clinics, and revenue events.

**Affected Components**:
- Database: New `events`, `event_categories`, `event_kpi_links` tables
- Backend: Events CRUD, countdown logic, KPI linking
- Frontend: Events calendar, countdown dashboard, event management

**Technical Spec**: See [specs/P1-006-events-module.md](specs/P1-006-events-module.md)

**Acceptance Criteria**:
- [ ] Create/edit/delete events
- [ ] Event categories (6 types)
- [ ] Link events to KPIs/strategies
- [ ] Countdown timer with color coding (gray/yellow/red)
- [ ] Calendar view
- [ ] Event dashboard widget

**Estimated Hours**: 80-100 hours

---

## Phase 2: Integrations (3-4 months)

### P2-001: Asana Integration 🔴
**Priority**: High | **Effort**: High | **Impact**: High
**Status**: Not Started

**Description**: Connect Asana for project management sync with strategies and plans.

**Technical Spec**: See [specs/P2-001-asana-integration.md](specs/P2-001-asana-integration.md)

**Estimated Hours**: 60-80 hours

---

### P2-002: Sprout Social Integration 🔴
**Priority**: High | **Effort**: High | **Impact**: High
**Status**: Not Started

**Description**: Connect Sprout Social for social media metrics tracking in KPIs.

**Technical Spec**: See [specs/P2-002-sprout-integration.md](specs/P2-002-sprout-integration.md)

**Estimated Hours**: 60-80 hours

---

### P2-003: Real-Time Analytics Dashboard 🔴
**Priority**: High | **Effort**: High | **Impact**: High
**Status**: Not Started

**Description**: Live dashboard for revenue, ticket sales, and academic benchmarks with real-time data.

**Technical Spec**: See [specs/P2-003-realtime-analytics.md](specs/P2-003-realtime-analytics.md)

**Estimated Hours**: 80-100 hours

---

### P2-004: Fiscal Year Management 🔴
**Priority**: High | **Effort**: High | **Impact**: High
**Status**: Not Started

**Description**: Multi-year data management with archiving, rollover, and historical comparison.

**Technical Spec**: See [specs/P2-004-fiscal-year.md](specs/P2-004-fiscal-year.md)

**Estimated Hours**: 60-80 hours

---

### P2-005: Mobile Optimization 🔴
**Priority**: High | **Effort**: Medium | **Impact**: High
**Status**: Not Started

**Description**: Full mobile responsiveness and PWA capabilities for on-the-go access.

**Technical Spec**: See [specs/P2-005-mobile-optimization.md](specs/P2-005-mobile-optimization.md)

**Estimated Hours**: 40-60 hours

---

### P2-006: Event Intern Scheduling 🔴
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium
**Status**: Not Started

**Description**: Intern availability tracking and automated event assignment based on event requirements.

**Technical Spec**: See [specs/P2-006-intern-scheduling.md](specs/P2-006-intern-scheduling.md)

**Estimated Hours**: 40-50 hours

---

## Phase 3: Advanced Features (4-6 months)

### P3-001: In-Platform Collaboration Tools 🔴
**Priority**: Medium | **Effort**: High | **Impact**: Medium
**Status**: Not Started

**Description**: Comments, @mentions, activity feeds for team collaboration.

**Technical Spec**: See [specs/P3-001-collaboration.md](specs/P3-001-collaboration.md)

**Estimated Hours**: 60-80 hours

---

### P3-002: Resource Allocation Dashboard 🔴
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium
**Status**: Not Started

**Description**: Track and optimize resource allocation across athletic programs.

**Technical Spec**: See [specs/P3-002-resource-allocation.md](specs/P3-002-resource-allocation.md)

**Estimated Hours**: 40-60 hours

---

### P3-003: Financial Software Integration 🔴
**Priority**: Medium | **Effort**: High | **Impact**: High
**Status**: Not Started

**Description**: Connect financial systems for budget tracking and revenue analysis.

**Technical Spec**: See [specs/P3-003-financial-integration.md](specs/P3-003-financial-integration.md)

**Estimated Hours**: 80-100 hours

---

### P3-004: Ticketing System Integration 🔴
**Priority**: Medium | **Effort**: High | **Impact**: High
**Status**: Not Started

**Description**: Connect ticketing systems for real-time sales tracking.

**Technical Spec**: See [specs/P3-004-ticketing-integration.md](specs/P3-004-ticketing-integration.md)

**Estimated Hours**: 60-80 hours

---

### P3-005: Risk Management Integration 🔴
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium
**Status**: Not Started

**Description**: Integrate risk management with strategic planning.

**Technical Spec**: See [specs/P3-005-risk-management.md](specs/P3-005-risk-management.md)

**Estimated Hours**: 40-60 hours

---

### P3-006: Expanded Template Library 🔴
**Priority**: Low | **Effort**: Low | **Impact**: Medium
**Status**: Not Started

**Description**: Add NIL education, mental health, and compliance templates.

**Technical Spec**: See [specs/P3-006-templates.md](specs/P3-006-templates.md)

**Estimated Hours**: 20-30 hours

---

### P3-007: Training & Support System 🔴
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium
**Status**: Not Started

**Description**: Tutorials, guides, and live support for user onboarding.

**Technical Spec**: See [specs/P3-007-training.md](specs/P3-007-training.md)

**Estimated Hours**: 40-60 hours

---

### P3-008: User Feedback Feature 🔴
**Priority**: Low | **Effort**: Low | **Impact**: Low
**Status**: Not Started

**Description**: In-app feedback collection and feature request system.

**Technical Spec**: See [specs/P3-008-feedback.md](specs/P3-008-feedback.md)

**Estimated Hours**: 16-24 hours

---

## Summary Statistics

**Total Features**: 32
**Phase 0**: 5 features (50-66 hours)
**Phase 1**: 6 features (320-466 hours)
**Phase 2**: 6 features (340-450 hours)
**Phase 3**: 8 features (356-534 hours)

**Total Estimated Hours**: 1,066-1,516 hours
**Total Estimated Months**: 6-9 months (with 1-2 developers)

---

## Next Steps

1. Review and prioritize with stakeholders
2. Begin Phase 0 implementation
3. Create detailed technical specifications for each feature
4. Set up development sprint cycles
5. Establish QA and testing protocols
