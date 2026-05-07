# Backlog — Post-Meeting Feedback (2026-05-07)

Backlog generated from stakeholder review of the deployed site with Stephen (Athletics Dept) and Sid. Tickets are grouped by feature area and intended to be implementable as discrete units. Items flagged **BLOCKED** require Chris's input before scoping or building.

**Source:** Meeting notes, 2026-05-07. **Owner:** TBD per ticket. **Repo touchpoints** are best-effort pointers to current code; verify before editing.

---

## Legend

- **P0** — Bug or broken-on-prod behavior; ship first.
- **P1** — High-impact functional gap; ship after P0.
- **P2** — Quality / polish / strategic improvement.
- **BLOCKED** — Awaiting product decision from Chris.

---

## 1. Validations / Admin Dashboard

### V-1 — Make non-negotiable violations clickable [P0]
**Problem.** On Chris's Admin Dashboard, clicking a non-negotiable violation row currently does nothing. Reviewers can see *that* something violated a rule but not *what action* triggered it.

**Scope.**
- Wire the violation row in `RecentValidations.tsx` (and the equivalent block on `AdminDashboard.tsx`) to navigate to or open a modal showing the originating action/entity (e.g., the KPI update, OGSM edit, or plan-item change that the validator flagged).
- Persist the originating action reference on the validation record at the time of validation. If the data already exists in `validations` (or wherever they're stored), surface it; if not, add a `source_entity_type` + `source_entity_id` (and optionally a snapshot of the action payload) to the validation row.
- Add a deep-link route or modal pattern so the violation can also be opened by URL (useful for emails / reports later).

**Acceptance criteria.**
- Clicking any violation row opens a view that names: who took the action, which entity, what changed, and which rule fired.
- For violations with no recoverable source (legacy rows), show a graceful "source no longer available" state instead of doing nothing.

**Touchpoints.** `frontend/src/components/RecentValidations.tsx`, `frontend/src/pages/AdminDashboard.tsx`, `frontend/src/components/ValidationStatusBadge.tsx`, validation backend service (locate via grep).

---

### V-2 — Surface triggering action in violation detail [P0]
**Problem.** Even on the dashboard tile, the *content* of the offending action isn't shown. Stephen demoed a violation and Chris couldn't tell from the UI what Stephen had tried to do.

**Scope.**
- In the violation detail (modal or page from V-1), render a structured "what happened" block: actor, entity, before → after diff for edits, full payload for creates, deletion target for deletes.
- Reuse existing entity-rendering components (e.g., `KPIDetailModal`, `PlanItemDetailModal`) to display the affected entity in its current state alongside the action.
- The data exists (per meeting notes) — this is wiring, not new persistence.

**Acceptance criteria.**
- Each violation detail answers: "who, what entity, what change, what rule." No clicking through to other tabs to assemble the picture.

**Depends on.** V-1.

---

### V-3 — Keep auto-rejection for objectively-evaluable rules [P2]
**Problem.** Some non-negotiables (e.g., "no individual above the department decision hierarchy") are mechanically checkable; others ("follow chain of command") are subjective and currently produce noisy flags.

**Scope.**
- Audit current non-negotiables and tag each as `auto-reject` or `flag-only` in the philosophy/non-negotiable record schema.
- Update validator to honor the tag: hard-block on auto-reject, surface as a flag/warning on flag-only.
- Default new non-negotiables created via Philosophy Mgmt to `flag-only` (Chris explicitly opts items into hard-block).

**Acceptance criteria.**
- Existing rules continue to behave as today unless re-tagged.
- The Philosophy editor exposes the tag, with helper copy explaining the difference.

**Depends on.** P-1 (Philosophy editability) — if the Philosophy tab isn't editable yet, this is harder.

---

## 2. Document Upload

### D-1 — Add explicit "what should we do with this?" picker on upload [P1]
**Problem.** Auto-detection of doc type works, but there's no user-facing intent capture, so downstream behavior (especially for core priorities) is opaque.

**Scope.**
- After file upload but before processing kicks off, prompt the uploader for the intended action(s): e.g., "extract KPIs," "extract OGSM components," "feed into strategic planning bot," "store as reference only."
- Pre-select based on auto-detected type but allow override.
- Pass the selected intent to backend so the route can branch behavior (already partly modeled in `/api/documents` + extraction methods on `OpenAIService`).

**Acceptance criteria.**
- Upload UI shows a confirmation step with intent checkboxes.
- Backend respects the intent and skips extraction paths the user opted out of.
- Auto-detection still drives defaults — no extra clicks for the common case.

**Touchpoints.** `frontend/src/pages/Documents.tsx`, `backend/src/routes/documents.ts`, `backend/src/services/openaiService.ts`.

---

### D-2 — Wire uploaded core priorities into strategic planning bot **[BLOCKED]**
**Problem.** Working assumption is uploaded core priorities/plans should feed the strategic planning bot (recommendations, risks, three-way analyses), but the desired downstream behavior per doc type isn't confirmed.

**Action.** Get explicit decision from Chris on, for each detected doc type (strategic initiative, core priorities, KPIs, other), what the platform should do with it. Until then, do not change current behavior.

---

## 3. Strategy Platform (OGSM)

### O-1 — Add proper priority/rank field with stack-ranking [P1]
**Problem.** OGSM components currently use the `description` field as a workaround to convey priority. With 50+ items, "everything is priority 1" is meaningless. Users need genuine stack-ranking.

**Scope.**
- Add `rank` (integer) column to `ogsm_components` in `backend/src/database/init.sql` (and a migration script — schema is auto-init only; per `CLAUDE.md` migrations are not built in, so add a one-shot migration consistent with existing migration files in `backend/src/database/migrations/`).
- Update backend types in `backend/src/types/index.ts` and frontend types in `frontend/src/types/index.ts`.
- Update OGSM CRUD routes in `backend/src/routes/ogsm.ts` to accept and return `rank`.
- Update OGSM list views (`frontend/src/pages/OGSMView.tsx`, `frontend/src/components/OGSMTreeView.tsx`) to sort by `rank` and render rank inline.
- Backfill: assign ranks based on current creation order on migration run.

**Acceptance criteria.**
- A user can set rank on any OGSM component; list views default to rank-asc.
- Existing items get sequential ranks on first deploy (no nulls left over).

---

### O-2 — Persist drag-and-drop reordering reliably [P0]
**Problem.** Reordering within Objectives (and presumably other levels) shows lag and reorders sometimes don't stick — observed live in the meeting.

**Scope.**
- Investigate the current DnD handler in `OGSMTreeView.tsx`. Suspected issues: optimistic UI without rollback on failure, missing PATCH on the rank field, or race between sequential PATCHes.
- After O-1 lands, persist drag results as bulk rank updates (single backend call updating affected rows in one transaction).
- Add error toast + revert to last known order on failure.

**Acceptance criteria.**
- Drag a card, refresh the page, order persists.
- If the network call fails, the UI rolls back and shows an error.

**Depends on.** O-1.

---

## 4. KPIs (major focus area)

### K-1 — Make `frequency` editable after creation [P0]
**Problem.** `frequency` (daily/weekly/monthly/quarterly/etc.) is locked at creation. Stephen needs to switch e.g., monthly → quarterly without recreating, which would orphan history.

**Scope.**
- Allow PATCH of `frequency` on `kpis` table.
- Update edit form in `KPIDetailModal.tsx` (or wherever KPI edit lives) to include the dropdown.
- Decide how this interacts with `kpi_history`: existing entries stay attached to the KPI; new expected-cadence calculations use the new frequency forward.

**Acceptance criteria.**
- User can change frequency on any existing KPI.
- History is preserved unchanged.
- Any "is this KPI overdue?" / "expected next entry by" logic recalculates from the new frequency.

**Touchpoints.** `backend/src/routes/kpis.ts`, `frontend/src/components/KPIDetailModal.tsx`.

---

### K-2 — Cleanup pass on existing KPIs [P1]
**Problem.** Production KPIs include duplicate categories, sample/fake KPIs, and items with no owner.

**Scope.** Three sub-tasks, can be one PR:
1. **De-dup categories.** Identify duplicate categories (case-insensitive, whitespace-trimmed) in `kpi_categories`; merge by reassigning KPIs to the canonical row, then deleting the duplicate. Provide a dry-run script first; Sid runs it against prod after review.
2. **Remove sample/fake KPIs.** Identify by naming convention or a `is_sample` flag if present; delete them and their `kpi_history`.
3. **Owner audit.** Find KPIs with null/empty owner. Either assign a default owner (Chris) or surface them in an admin "needs owner" queue.

**Acceptance criteria.**
- Production has no duplicate categories.
- No KPIs are visibly sample/fake.
- Every KPI either has an owner or appears in the admin queue.

**Touchpoints.** `backend/src/routes/kpis.ts`, `backend/src/routes/kpiCategories.ts`, `frontend/src/components/CategoryManagementModal.tsx`.

---

### K-3 — Add fiscal year selector + move/clone actions [P1]
**Problem.** KPIs and initiatives don't have first-class fiscal year handling. Real workflows (Stephen described the 412 campaign pushing FY26→FY27, Women's Success Fund repeating annually) require this.

**Scope.**
- Add `fiscal_year` field (string, e.g., `FY26-27`) to `kpis` and to `initiatives` (already partial fiscal-year scaffolding exists per `docs/plans/2026-01-08-fiscal-year-planning-mode-design.md` — reuse those tables/conventions where possible).
- "Move to fiscal year" — single-action change of the field (preserves identity + history).
- "Duplicate to fiscal year" — deep-copy: new row with reset history, same metadata, new fiscal year.
- Surface a fiscal year selector at the top of `KPIs.tsx` and the equivalent on the initiatives view.

**Acceptance criteria.**
- User can switch the active FY view; KPIs filter by FY.
- "Move" preserves the row identity and history.
- "Duplicate" creates a fresh row with independent history.

**Touchpoints.** `backend/src/routes/kpis.ts`, `backend/src/routes/initiatives.ts`, `frontend/src/pages/KPIs.tsx`, fiscal planning service.

---

### K-4 — Year-over-year KPI comparison view [P2]
**Problem.** When the same KPI exists across years (after K-3 lands), there's no side-by-side view of progress.

**Scope.**
- Define how cross-year matching works: same canonical KPI ID across FY rows, OR a `parent_kpi_id` linking annual instances. (Recommend the latter so each year's KPI keeps its own target/owner.)
- Comparison panel in `KPIDetailModal.tsx` or `KPITrendsChart.tsx` showing prior-year start/end/peak alongside current trajectory.
- Chart overlays prior years as faded lines.

**Acceptance criteria.**
- For any KPI with prior-year siblings, opening the detail view shows YoY context.
- For KPIs with no prior years, the panel hides cleanly.

**Depends on.** K-3.

---

### K-5 — Show historical chart immediately on first entry [P0]
**Problem.** Chart only appears at 2+ data points. The first entry feels invisible; users don't trust that it logged.

**Scope.**
- In `KPITrendsChart.tsx`, render the chart with a single data point (one dot, no line) plus a baseline at the target.
- For zero data points, show an empty-state placeholder ("Add your first value to start tracking").

**Acceptance criteria.**
- After entering one value, the user sees the chart populate with that point and the target line.

---

### K-6 — Investigate and fix missing KPI value entries [P0]
**Problem.** During the meeting, Stephen entered a Facebook game-day attendance value; it didn't appear in history. Likely a real bug.

**Scope.** Use the systematic debugging skill; do not patch symptoms.
- Reproduce: pick a KPI matching the type Stephen used (likely a count-type, possibly with social-media category) and submit a value via the same UI path.
- Inspect: server logs, the request payload, the `kpi_history` insert, and the read path for the history list.
- Likely suspects (ranked): (a) a frontend optimistic update that doesn't trigger a refetch on success, (b) a backend handler that writes successfully but a 200 response shape the frontend interprets as "no data," (c) a category/permission scope issue filtering the history query.

**Acceptance criteria.**
- Root cause identified, written up in the PR description.
- Repro test added (unit or integration) so it stays fixed.

**Touchpoints.** `backend/src/routes/kpis.ts` (history endpoints), `frontend/src/components/KPIDetailModal.tsx`, `frontend/src/components/KPITrendsChart.tsx`.

---

### K-7 — Surface backdating UI more clearly [P2]
**Problem.** Custom-date entry on history works (Stephen confirmed) but is hidden enough that he had to be shown where it lives.

**Scope.**
- Promote the "Add entry with custom date" affordance: visible button on the history tab, not behind a sub-menu.
- Add inline copy explaining when to use it ("Entered today by default. Backdate to log historical values.").

**Acceptance criteria.**
- A new user lands on a KPI's history tab and finds the backdate option without instruction.

---

## 5. Strategy Generator ("Improve [X]")

### S-1 — Hold steady; collect feedback [P2]
**Status.** Stephen validated current output quality. No build work.

**Action.**
- Add a thumbs-up/down + free-text feedback control on each generated suggestion, stored against the prompt + suggestion. We need data before tuning.
- Defer: division/conference variables — needs Chris's input.

**Touchpoints.** `frontend/src/components/AIStrategyGenerator.tsx`, `frontend/src/pages/AIStrategyPage.tsx`.

---

### S-2 — Conference / division variables **[BLOCKED]**
Awaiting Chris on whether this should be added.

---

## 6. Strategic Planning Tool **[BLOCKED — design decision needed]**

### SP-1 — Decide integration model [BLOCKED]
**Problem.** Current Strategic Planning Tool (`StrategicPlanning.tsx` + initiatives/risks/scenarios/budgets/resources/dependencies routes) is disconnected from the rest of the site and contains fake data.

**Two options on the table:**
1. Keep standalone.
2. Connect Initiatives → child KPIs (initiative success measured by linked KPI rollups). Stephen leans this way.

**Action.** Get Chris's vision before any implementation. **Do not delete.**

Once decided, follow-up tickets will cover (a) seed-data cleanup, (b) initiative ↔ KPI linking schema, (c) initiative health rollup display.

---

## 7. 30/60/90 Plans

### T-1 — Make plan items editable after creation [P0]
**Problem.** Once a 30/60/90 plan item is added it can't be edited or moved.

**Scope.**
- Add edit + delete + bucket-move (30↔60↔90) endpoints in `backend/src/routes/staffPlans.ts` / `planItems.ts`.
- Hook up edit modal (`PlanItemDetailModal.tsx`) for in-place edits.
- DnD between buckets persists the new bucket and updated rank.

**Acceptance criteria.**
- User can edit text, change due dates, move between 30/60/90, and delete plan items.

**Touchpoints.** `backend/src/routes/staffPlans.ts`, `backend/src/routes/planItems.ts`, `frontend/src/pages/StaffPlanDetail.tsx`, `frontend/src/components/PlanItemDetailModal.tsx`.

---

### T-2 — Show linked KPI name + health in plan view [P1]
**Problem.** Plan items currently render a generic "KPI was linked" label rather than the KPI's name. Users can't tell which KPIs they're tracking.

**Scope.**
- On the plan-item read endpoint, join through to the KPI and return `{ kpi_id, kpi_name, current_value, target, health_status }`.
- In `StaffPlanDetail.tsx` (and elsewhere plan items render), show the KPI name and a colored health indicator (red/yellow/green).
- Health calc: reuse the same logic as the KPI detail view; if not centralized, extract a helper.

**Acceptance criteria.**
- Plan-item rows display: linked KPI name, current vs target, health color.
- Clicking the KPI name navigates to its detail.

**Touchpoints.** `backend/src/routes/planItems.ts`, `backend/src/routes/planLinks.ts`, `frontend/src/pages/StaffPlanDetail.tsx`, `frontend/src/components/LinkPicker.tsx`.

---

### T-3 — 30/60/90 vs Strategic Planning differentiation **[BLOCKED]**
Likely outcome per meeting: 30/60/90 = individual-level, Strategic Planning = department/cabinet-level. Confirm with Chris before any consolidation or renaming.

---

## 8. Philosophy Tab

### P-1 — Make philosophy fields editable [P0]
**Problem.** Philosophy statements, priorities, and non-negotiables are hardcoded. Chris cannot edit them. Per the meeting, this data governs the dashboard and the validator (see V-3) so editability is on the critical path.

**Scope.**
- Audit `backend/src/routes/philosophy.ts` and `frontend/src/pages/PhilosophyManagement.tsx` for what's already editable vs read-only.
- For any field that's read-only, add CRUD endpoints + edit UI.
- Confirm changes propagate to: `AdminDashboard`, validator service, `PhilosophyAlignmentCard`, `PhilosophyQuickReference`.
- Permission-gate to admin/super-admin only.

**Acceptance criteria.**
- Chris can edit each philosophy field from the UI.
- Changes are immediately reflected on the admin dashboard and in subsequent validator runs.
- Non-admins see the page read-only or 403'd.

---

## 9. Reports (major rework)

### R-1 — Add pre-canned report templates [P0]
**Problem.** Free-text "what report would you like?" produces inconsistent and sometimes incorrect reports.

**Scope.**
- Define a set of named templates with constrained data sources and fixed sections. Initial set:
  - "Stephen's KPI Summary — Last Week" (parameterized by user + time window)
  - "Department Health Report" (parameterized by department)
  - "Monthly Strategic Performance Review" (org-wide, time-windowed)
- Each template = a structured prompt + a whitelist of data the prompt is allowed to reference.
- UI: gallery picker on `Reports.tsx` showing templates with descriptions, then a parameter form, then "Generate."

**Acceptance criteria.**
- User can pick a template, fill parameters, and generate. Output structure is consistent across runs.
- Free-text prompts still available as an "advanced" option.

**Touchpoints.** `frontend/src/pages/Reports.tsx`, `backend/src/routes/ai.ts` (likely the report-generation handler), `backend/src/services/openaiService.ts` (`generateProgressReport` + new template-aware variant).

---

### R-2 — Click-on-name → individual report [P0]
**Problem.** Chris's primary use case is prepping 1:1s. He should click a name on the dashboard and get a tailored report on that person.

**Scope.**
- Define the individual-report template: executive summary, progress on key metrics owned by that person, recent activities, priority actions, areas of responsibility.
- Wire user names on the admin dashboard (and elsewhere they appear) to navigate to `/reports/individual/:userId` (or similar).
- Backend assembles only data scoped to that person (KPIs they own, plan items, validations against them, etc.) — see R-4.

**Acceptance criteria.**
- Click name on dashboard → generated individual report renders within a reasonable time.
- Report sections are populated only with data tied to the clicked user.

---

### R-3 — Add "Refresh" + scheduling [P1]
**Problem.** No way to regenerate a report on demand or auto-generate periodically.

**Scope.**
- Refresh: button on any generated report that re-runs the same template + parameters. Old version archived (don't overwrite — useful for diffing later).
- Scheduling: a config that can run a template on a cron (e.g., every Sunday 9pm) for a list of users / departments and store results. Initial implementation can be a server-side scheduled job (node-cron or similar) — does not need a full job system for v1.
- Surface scheduled reports in a "Scheduled" tab in `Reports.tsx`.

**Acceptance criteria.**
- Refresh works; refreshed runs are stored alongside the original.
- A scheduled report runs on its cron and is viewable when the recipient opens the app.

---

### R-4 — Scope report data sources to subject [P0]
**Problem.** "Stephen Morrison" report mixed in inaccurate data — e.g., GPA showing as a KPI when it isn't his.

**Scope.**
- Define a "data scope" per report subject: for an individual report on user X, the prompt is allowed to reference only KPIs where X is owner, plans where X is the staff member, etc.
- Enforce in the backend by passing only the scoped data into the prompt context (don't rely on the model to filter — pre-filter).
- Add tests for the scope filter.

**Acceptance criteria.**
- A regenerated "Stephen Morrison" report contains only Stephen-owned/Stephen-relevant entities.
- A regression test asserts that out-of-scope entities don't appear in the prompt input.

**Depends on.** R-2.

---

## 10. Priority Actions / Personal Dashboard (new)

### PA-1 — Health indicators on areas of responsibility [P1]
**Problem.** Cabinet members beyond Chris need a "what needs my attention right now" view. First step: traffic-light health on each area.

**Scope.**
- Define health rollup per area: aggregate of KPI health within that area + open validations + overdue plan items.
- Render on each role dashboard (`StaffDashboard`, `ManagerDashboard`, `AthleticsDirectorDashboard`) — likely reuse `AlignmentScoreWidget` patterns.
- Color-coded badge (red/yellow/green) per area; hover shows the rollup breakdown.

**Acceptance criteria.**
- Every role dashboard shows colored health badges for the user's areas.
- Hover/click drills into the contributing factors.

---

### PA-2 — Priority Actions list as focal element [P1]
**Problem.** Stephen's most-requested addition: a daily-task surfacing of "focus on these today."

**Scope.**
- Algorithm v1: rank items by (a) overdue 30/60/90 plan items, (b) KPIs with red health, (c) flagged validations against the user, (d) explicit Chris-elevated items (PA-3). Cap at 5–7 items.
- Render at top of each role dashboard.
- Each item links to the underlying entity.

**Acceptance criteria.**
- User sees up to 7 prioritized actions on landing.
- Clicking an action navigates to the item.

**Depends on.** PA-1 (uses health calc).

---

### PA-3 — Chris override / forced priority [P2]
**Problem.** Chris should be able to elevate items into anyone's Priority Actions list (e.g., "FedEx partnership" red for Stephen).

**Scope.**
- New table `priority_overrides`: target_user_id, entity_type, entity_id, level (red/yellow/green), set_by, set_at, expires_at (optional).
- Chris-only UI to set overrides (likely from any entity detail view: "Pin to <user>'s priorities").
- PA-2 ranking treats overrides as highest priority.

**Acceptance criteria.**
- Chris pins an item to Stephen; it appears at the top of Stephen's Priority Actions.
- Override is visible/removable by Chris.

**Depends on.** PA-2.

---

### PA-4 — Reorganize main dashboard around Priority Actions **[BLOCKED]**
Chris to weigh in on whether the dashboard's main view should reorganize around Priority Actions. Don't restructure dashboards until decided.

---

## 11. Cross-Cutting

### X-1 — Editability audit [P1]
Sweep all edit forms; list every field that's read-only-after-create and decide per-field: should be editable, intentionally locked, or schema-derived. Output: a table in this doc + any quick-fix tickets.

Known instances to verify: KPI frequency (covered by K-1), philosophy fields (P-1), 30/60/90 items (T-1). Suspect-also: OGSM component type, KPI unit/category, document type after upload.

---

### X-2 — Owner field everywhere [P1]
Ensure `KPIs`, `initiatives`, `staff_plans`, `ogsm_components` all have a non-null owner field exposed in the UI. Surfaces violations in the "needs owner" admin queue from K-2.

---

### X-3 — Elevate Stephen to Athletics Director / Super Admin role [P0]
Operational, not code. Update Stephen's role in production via the admin user-management UI (or direct DB update if that doesn't exist yet). Document the steps after doing it so it's repeatable.

**Touchpoints.** `backend/src/routes/users.ts`, `backend/src/routes/admin.ts`.

---

## Items Pending Chris's Input (Don't Build Yet)

Tracked above as **[BLOCKED]**. Summary:

1. **D-2** — Document upload → desired downstream actions per type.
2. **SP-1** — Strategic Planning Tool: keep, integrate with KPIs, or remove.
3. **T-3** — 30/60/90 vs Strategic Planning role split.
4. **S-2** — Strategy Generator: conference/division variables.
5. **PA-4** — Reorganize main dashboard around Priority Actions.

---

## Suggested Sequencing

**Sprint 1 (P0 bugs + critical editability).** V-1, V-2, O-2, K-1, K-5, K-6, T-1, P-1, R-4, X-3.

**Sprint 2 (data model + report rework).** O-1, K-2, K-3, R-1, R-2, R-3.

**Sprint 3 (priority actions + polish).** PA-1, PA-2, T-2, K-4, K-7, V-3, X-1, X-2.

**Holding pattern.** All BLOCKED items, until Chris decisions land.
