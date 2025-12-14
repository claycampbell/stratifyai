# P0-001: KPI Terminology Updates

**Status**: 🔴 Not Started
**Priority**: High | **Effort**: Low | **Impact**: High
**Estimated Hours**: 8-12 hours

---

## Overview

Replace "Lead" terminology with "Ownership" (Primary) and "Persons Responsible" (Secondary) throughout the KPI module to align with organizational terminology preferences.

---

## Business Requirements

### Current State
- KPIs use a "Lead" field to identify the person responsible
- Single person assignment model

### Desired State
- Replace "Lead" with "Ownership" (Primary owner)
- Add "Persons Responsible" field for secondary/supporting team members
- Support multiple persons responsible per KPI

---

## Technical Specification

### Database Changes

#### Table: `kpis`

**Schema Migration**:
```sql
-- Migration: rename lead column and add persons_responsible
ALTER TABLE kpis
  RENAME COLUMN lead TO ownership;

ALTER TABLE kpis
  ADD COLUMN persons_responsible TEXT[];

-- Optional: Migrate existing lead data to array format if needed
UPDATE kpis
  SET persons_responsible = ARRAY[ownership]
  WHERE persons_responsible IS NULL AND ownership IS NOT NULL;
```

**Updated Schema**:
```typescript
interface KPI {
  id: string;
  name: string;
  description: string;
  ownership: string;              // Primary owner (formerly "lead")
  persons_responsible: string[];  // Secondary team members (NEW)
  goal: number;
  current_value: number;
  unit: string;
  start_date: Date;
  end_date: Date;
  category_id?: string;
  created_at: Date;
  updated_at: Date;
}
```

---

### Backend Changes

#### File: `backend/src/types/index.ts`

**Update KPI interface**:
```typescript
export interface KPI {
  id: string;
  name: string;
  description: string;
  ownership: string;              // Changed from 'lead'
  persons_responsible: string[];  // NEW
  goal: number;
  current_value: number;
  unit: string;
  start_date: Date;
  end_date: Date;
  category_id?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### File: `backend/src/routes/kpis.ts`

**Update API endpoints**:
- All KPI CRUD operations should accept/return new field names
- Validation for `ownership` (required, non-empty string)
- Validation for `persons_responsible` (optional array of strings)

**Example Update**:
```typescript
router.post('/kpis', async (req, res) => {
  const {
    name,
    description,
    ownership,              // Changed from 'lead'
    persons_responsible,    // NEW
    goal,
    unit,
    start_date,
    end_date
  } = req.body;

  // Validation
  if (!ownership || ownership.trim() === '') {
    return res.status(400).json({ error: 'Ownership is required' });
  }

  // Insert with new schema
  // ...
});
```

#### File: `backend/src/services/geminiService.ts`

**Update AI extraction prompts**:
```typescript
// Update extractKPIsFromText method
const prompt = `
Extract KPIs from the following text and return as JSON array with:
- name
- description
- ownership (primary person responsible)
- persons_responsible (array of secondary team members)
- goal
- unit
- start_date
- end_date

Text: ${text}
`;
```

---

### Frontend Changes

#### File: `frontend/src/types/index.ts`

**Update KPI interface** (same as backend):
```typescript
export interface KPI {
  id: string;
  name: string;
  description: string;
  ownership: string;              // Changed from 'lead'
  persons_responsible: string[];  // NEW
  goal: number;
  current_value: number;
  unit: string;
  start_date: Date;
  end_date: Date;
  category_id?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### File: `frontend/src/lib/api.ts`

**Update API calls** - No functional changes needed if using TypeScript interfaces correctly, but verify all API calls use new field names.

#### Files to Update in `frontend/src/components/`:

1. **KPI Form Component** (create/edit forms)
   - Replace "Lead" label with "Ownership"
   - Add "Persons Responsible" field with multi-select or comma-separated input

2. **KPI Card Component** (dashboard display)
   - Display "Ownership" instead of "Lead"
   - Show "Persons Responsible" as pills/badges below ownership

3. **KPI Detail View** (modal/detail page)
   - Show both fields with clear labels
   - Format persons_responsible as a list or comma-separated names

**Example Form Update**:
```tsx
// Before
<FormField
  label="Lead"
  value={kpi.lead}
  onChange={(e) => setKpi({ ...kpi, lead: e.target.value })}
/>

// After
<FormField
  label="Ownership (Primary)"
  value={kpi.ownership}
  onChange={(e) => setKpi({ ...kpi, ownership: e.target.value })}
  required
/>

<FormField
  label="Persons Responsible (Secondary)"
  value={kpi.persons_responsible.join(', ')}
  onChange={(e) => setKpi({
    ...kpi,
    persons_responsible: e.target.value.split(',').map(s => s.trim())
  })}
  placeholder="Enter names separated by commas"
/>
```

**Example Display Update**:
```tsx
// KPI Card
<div className="kpi-card">
  <h3>{kpi.name}</h3>
  <div className="ownership">
    <label>Ownership:</label>
    <span>{kpi.ownership}</span>
  </div>
  {kpi.persons_responsible.length > 0 && (
    <div className="persons-responsible">
      <label>Team:</label>
      <div className="badges">
        {kpi.persons_responsible.map(person => (
          <span key={person} className="badge">{person}</span>
        ))}
      </div>
    </div>
  )}
</div>
```

---

## Testing Requirements

### Unit Tests
- [ ] Backend: Test KPI CRUD with new field names
- [ ] Backend: Test validation for ownership (required) and persons_responsible (optional)
- [ ] Frontend: Test form submission with new fields
- [ ] Frontend: Test display of persons_responsible array

### Integration Tests
- [ ] Create KPI with ownership and persons_responsible
- [ ] Update KPI to add/remove persons_responsible
- [ ] Retrieve KPI and verify correct field names
- [ ] AI extraction returns new field names

### Migration Tests
- [ ] Existing KPIs migrated correctly
- [ ] No data loss during migration
- [ ] Old API calls fail gracefully (if versioning not implemented)

### Manual Testing
- [ ] Create new KPI with both fields
- [ ] Edit existing KPI to add persons_responsible
- [ ] View KPI on dashboard shows both fields correctly
- [ ] Search/filter KPIs by ownership
- [ ] Export/report generation includes new fields

---

## Migration Strategy

### Step 1: Database Migration
```bash
# Run migration script
npm run migrate:add-ownership-terminology
```

### Step 2: Backend Deployment
- Deploy updated backend with new field names
- Maintain backward compatibility if needed (temporary)

### Step 3: Frontend Deployment
- Deploy updated frontend
- Clear any cached data

### Step 4: Validation
- Verify all existing KPIs display correctly
- Test CRUD operations
- Check AI extraction with new terminology

---

## Rollback Plan

If issues arise:
1. Revert frontend deployment
2. Revert backend deployment
3. Run rollback migration:
```sql
ALTER TABLE kpis RENAME COLUMN ownership TO lead;
ALTER TABLE kpis DROP COLUMN persons_responsible;
```

---

## Success Criteria

- [ ] All references to "Lead" replaced with "Ownership"
- [ ] Persons Responsible field functional and visible
- [ ] No regression in existing KPI functionality
- [ ] AI extraction updated to use new terminology
- [ ] All tests passing
- [ ] Documentation updated

---

## Dependencies

- None (standalone change)

---

## Future Enhancements

- Link persons to user accounts (when authentication implemented)
- Team member notifications when assigned as responsible
- Workload view per person showing all assigned KPIs
