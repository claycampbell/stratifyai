# KPI Creation from Fiscal Plan Strategies - Design Document

**Date:** 2026-01-09
**Status:** Approved for implementation
**Feature:** Allow users to create KPIs from AI-generated strategies in fiscal plans

## Overview

After generating strategies using the AI Strategy Generator and adding them to fiscal plans, users need a way to create KPIs based on those strategies' success metrics. This feature adds a button-driven workflow to convert success metrics into trackable KPIs.

## User Flow

1. User navigates to Fiscal Planning Dashboard
2. Views draft strategies within a fiscal plan
3. Each strategy card shows available actions
4. If strategy has success_metrics:
   - **No KPIs created yet:** Shows "Create KPIs (N)" button
   - **KPIs already created:** Shows "View KPIs (N)" button linking to KPI dashboard
5. User clicks "Create KPIs" button
6. Modal opens with pre-populated success metrics
7. User can:
   - Select/deselect metrics to convert
   - Edit KPI names
   - Set target values (optional)
   - Choose frequency (monthly/quarterly/annual)
   - Add units (%, $, count, etc.)
8. User clicks "Create Selected KPIs"
9. KPIs are created and linked to strategy
10. Success notification appears
11. Button updates to "View KPIs (N)"

## Technical Architecture

### Database Changes

**Add column to `kpis` table:**
```sql
ALTER TABLE kpis ADD COLUMN source_strategy_id UUID REFERENCES fiscal_year_draft_strategies(id);
CREATE INDEX idx_kpis_source_strategy ON kpis(source_strategy_id);
```

This tracks which fiscal strategy generated each KPI, enabling:
- Preventing duplicate KPI creation
- Showing KPI count per strategy
- Linking back to origin strategy

### Backend Implementation

**New endpoint:**
```
POST /api/fiscal-planning/strategies/:strategyId/create-kpis
```

**Request body:**
```typescript
{
  kpis: [
    {
      name: string;
      target_value?: number;
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
      unit?: string;
    }
  ]
}
```

**Response:**
```typescript
{
  created_kpis: KPI[];
  message: string;
}
```

**Service method:** `fiscalPlanningService.createKPIsFromStrategy()`
- Validates strategy exists
- Checks if strategy converted to OGSM (has `converted_to_ogsm_id`)
  - If YES: Links KPIs to OGSM component
  - If NO: Creates KPIs without OGSM linkage (can be linked later)
- Creates KPIs with `source_strategy_id` set
- Returns created KPIs

**Additional endpoint for counting:**
```
GET /api/fiscal-planning/strategies/:strategyId/kpis/count
```

Returns count of KPIs created from this strategy.

### Frontend Implementation

**New component:** `frontend/src/components/CreateKPIsModal.tsx`
- Modal dialog with form
- Displays success_metrics as editable list
- Each row:
  - Checkbox (checked by default)
  - Name input (pre-filled from metric)
  - Target value input (optional)
  - Frequency dropdown (default: monthly)
  - Unit input (optional)
- Submit button: "Create Selected KPIs"

**Updates to:** `frontend/src/pages/FiscalPlanningDashboard.tsx`
- Fetch KPI counts per strategy on load
- Add "Create KPIs" or "View KPIs" button to strategy cards
- Handle modal open/close
- Refresh data after KPI creation

**API client update:** `frontend/src/lib/api.ts`
```typescript
fiscalPlanningApi: {
  // ... existing methods
  createKPIsFromStrategy: (strategyId: string, data: { kpis: CreateKPIRequest[] }) =>
    axios.post(`/fiscal-planning/strategies/${strategyId}/create-kpis`, data),
  getStrategyKPIsCount: (strategyId: string) =>
    axios.get(`/fiscal-planning/strategies/${strategyId}/kpis/count`),
}
```

## UI/UX Details

**Button states:**
- Has metrics, no KPIs: `Create KPIs (3)` - primary blue button
- Has KPIs: `View KPIs (3)` - secondary gray button with link icon
- No metrics: Button not shown

**Modal design:**
- Title: "Create KPIs from Strategy"
- Subtitle: Shows strategy name
- Table/list of metrics with form fields
- "Select All" / "Deselect All" helper buttons
- Cancel and "Create Selected KPIs" buttons
- Loading state while creating

**Success notification:**
- Toast message: "Successfully created 3 KPIs from strategy"
- Auto-closes after 3 seconds
- Provides link to view KPIs

## Error Handling

**Backend errors:**
- Strategy not found: 404
- Strategy has no success_metrics: 400
- Database connection issues: 500

**Frontend validation:**
- At least one KPI must be selected
- KPI names cannot be empty
- Frequency must be selected
- Target value must be numeric if provided

**User feedback:**
- Show validation errors inline
- Display server errors in error toast
- Disable submit button during creation

## Implementation Order

1. **Database migration** - Add `source_strategy_id` column
2. **Backend service** - Add `createKPIsFromStrategy()` method
3. **Backend routes** - Add API endpoints
4. **Frontend API client** - Add methods
5. **Frontend modal component** - Build CreateKPIsModal
6. **Frontend dashboard** - Integrate button and modal
7. **Testing** - End-to-end workflow testing

## Future Enhancements (Not in Scope)

- Bulk KPI creation across multiple strategies
- KPI templates for common metrics
- AI suggestions for target values based on industry benchmarks
- Auto-link KPIs when strategy is converted to OGSM
- Edit/update KPIs from fiscal planning view

## Testing Checklist

- [ ] Strategy with 3 success_metrics creates 3 KPIs
- [ ] KPI count updates after creation
- [ ] Button changes to "View KPIs" after creation
- [ ] Can uncheck metrics to create subset of KPIs
- [ ] Can edit KPI names before creation
- [ ] Target values and units are saved correctly
- [ ] KPIs appear in KPI dashboard
- [ ] KPIs linked to strategy via `source_strategy_id`
- [ ] If strategy converted to OGSM, KPIs linked to OGSM component
- [ ] Error handling for invalid inputs
- [ ] Prevents duplicate creation (button disabled after creation)
