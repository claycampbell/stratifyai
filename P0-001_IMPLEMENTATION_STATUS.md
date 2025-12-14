# P0-001: KPI Terminology Updates - Implementation Status

**Status**: 75% Complete
**Date**: 2025-11-03

---

## ✅ Completed

### 1. Database Migration
- ✅ Created migration file: `backend/src/database/migrations/001_kpi_terminology_update.sql`
- ✅ Created rollback file: `backend/src/database/migrations/001_kpi_terminology_update_rollback.sql`
- ✅ Migration adds `ownership` and `persons_responsible` columns
- ✅ Migration migrates existing "Lead" data from description to `ownership`
- ✅ Created indexes for performance

### 2. Backend Type Definitions
- ✅ Updated `backend/src/types/index.ts`:
  - Added `ownership?: string`
  - Added `persons_responsible?: string[]`
  - Kept `owner_email` for backward compatibility

### 3. Backend API Updates
- ✅ Updated `backend/src/routes/kpis.ts`:
  - ✅ CREATE endpoint accepts `ownership` and `persons_responsible`
  - ✅ UPDATE endpoint accepts `ownership` and `persons_responsible`
  - ✅ IMPORT function extracts "Ownership" or "Lead" from CSV and maps to `ownership` field
  - ✅ IMPORT function no longer adds "Lead:" to description

### 4. Frontend Type Definitions
- ✅ Updated `frontend/src/types/index.ts`:
  - Added `ownership?: string`
  - Added `persons_responsible?: string[]`

### 5. Migration Runner Script
- ✅ Created `backend/src/scripts/runMigration.ts` for easy migration execution

---

## 🚧 Remaining Work

### Frontend Updates (Estimated: 2-4 hours)

#### 1. Update `frontend/src/pages/KPIs.tsx` (Lines 50-94, 306-339, 531-536)

**Current State**: Parses "Lead" from description field
**Required Changes**:

```typescript
// REPLACE Lines 50-65 (availablePersons)
const availablePersons = useMemo(() => {
  if (!kpis) return [];
  const persons = new Set<string>();
  kpis.forEach((kpi: any) => {
    // Use new ownership field directly
    if (kpi.ownership) {
      persons.add(kpi.ownership);
    }
    // Also include persons_responsible
    if (kpi.persons_responsible) {
      kpi.persons_responsible.forEach((person: string) => persons.add(person));
    }
  });
  return Array.from(persons).sort();
}, [kpis]);

// REPLACE Lines 77-90 (personFilter logic)
if (personFilter !== 'all') {
  // Check ownership or persons_responsible
  const hasMatch =
    kpi.ownership === personFilter ||
    (kpi.persons_responsible && kpi.persons_responsible.includes(personFilter));

  if (!hasMatch) {
    return false;
  }
}

// UPDATE Line 307 label from "Lead:" to "Ownership:"
<label className="text-sm font-medium text-gray-600">Ownership:</label>

// UPDATE Line 313 option text
<option value="all">All Owners</option>

// UPDATE Lines 338-339 filter badge text
<span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
  Owner: {personFilter}

// REPLACE Lines 531-536 (display logic)
{kpi.ownership && (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Ownership</span>
    <span className="font-semibold">{kpi.ownership}</span>
  </div>
)}
{kpi.persons_responsible && kpi.persons_responsible.length > 0 && (
  <div className="flex flex-col text-sm">
    <span className="text-gray-600 mb-1">Persons Responsible</span>
    <div className="flex flex-wrap gap-1">
      {kpi.persons_responsible.map((person, idx) => (
        <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
          {person}
        </span>
      ))}
    </div>
  </div>
)}
```

#### 2. Update Create Form in `frontend/src/pages/KPIs.tsx`

**Add after line 416 (description textarea)**:

```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Ownership (Primary)
  </label>
  <input
    type="text"
    value={newKPI.ownership || ''}
    onChange={(e) => setNewKPI({ ...newKPI, ownership: e.target.value })}
    className="input"
    placeholder="Primary person responsible"
  />
</div>
<div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Persons Responsible (Secondary)
  </label>
  <input
    type="text"
    value={newKPI.persons_responsible?.join(', ') || ''}
    onChange={(e) => setNewKPI({
      ...newKPI,
      persons_responsible: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
    })}
    className="input"
    placeholder="Enter names separated by commas"
  />
  <p className="text-xs text-gray-500 mt-1">Separate multiple names with commas</p>
</div>
```

**Update newKPI state (line 33)**:
```typescript
const [newKPI, setNewKPI] = useState({
  name: '',
  description: '',
  target_value: '',
  current_value: '',
  unit: '',
  frequency: 'monthly',
  status: 'on_track',
  ownership: '',
  persons_responsible: [] as string[],
});
```

#### 3. Update `frontend/src/components/KPIDetailModal.tsx`

**Required**: Read this file and update display logic similar to the above changes.

Look for:
- Parsing of "Lead" from description
- Display of lead information
- Edit form fields

Replace with:
- Direct use of `ownership` and `persons_responsible` fields
- New labels "Ownership" and "Persons Responsible"
- Form inputs for both fields

---

## 🧪 Testing Checklist

### After Completing Frontend Updates

- [ ] **Database Migration**
  ```bash
  cd backend
  npm run build
  npm run migrate
  # Or manually:
  # npx ts-node src/scripts/runMigration.ts 001_kpi_terminology_update.sql
  ```

- [ ] **Backend Testing**
  - [ ] Create new KPI with `ownership` and `persons_responsible`
  - [ ] Update existing KPI to add `ownership` and `persons_responsible`
  - [ ] Verify GET /api/kpis returns new fields
  - [ ] Import CSV with "Ownership" column
  - [ ] Import CSV with old "Lead" column (backward compatibility)

- [ ] **Frontend Testing**
  - [ ] Create KPI form shows new fields
  - [ ] KPI cards display ownership (not "Lead")
  - [ ] KPI cards display persons_responsible as badges
  - [ ] Filter by ownership works
  - [ ] Filter includes persons_responsible in search
  - [ ] KPI detail modal shows new fields
  - [ ] KPI edit form allows editing ownership and persons_responsible
  - [ ] No references to "Lead" visible in UI

- [ ] **Data Migration Testing**
  - [ ] Existing KPIs with "Lead: John" in description now have `ownership: "John"`
  - [ ] Description no longer contains "Lead: X" after migration
  - [ ] All existing KPIs still functional

---

## 🔄 Rollback Procedure

If issues arise:

```bash
cd backend
npx ts-node src/scripts/runMigration.ts 001_kpi_terminology_update_rollback.sql
```

Then:
1. Revert backend route changes
2. Revert frontend changes
3. Revert type definition changes

---

## 📝 Next Steps

1. Complete remaining frontend updates (2-4 hours)
2. Run database migration
3. Test all functionality
4. Update documentation
5. Mark P0-001 as complete
6. Move to P0-002: KPI Description Formatting

---

## 📚 Related Files

- Migration: `backend/src/database/migrations/001_kpi_terminology_update.sql`
- Backend Types: `backend/src/types/index.ts`
- Backend Routes: `backend/src/routes/kpis.ts`
- Frontend Types: `frontend/src/types/index.ts`
- Frontend Pages: `frontend/src/pages/KPIs.tsx`
- Frontend Components: `frontend/src/components/KPIDetailModal.tsx`

---

## ⚠️ Important Notes

1. **Backward Compatibility**: The `owner_email` field is kept for notifications. It's separate from `ownership` which is just a name string.

2. **Migration Safety**: The migration attempts to extract "Lead" from existing descriptions. Review migrated data after running.

3. **CSV Import**: Now supports both "Ownership" and "Lead" column names for backward compatibility.

4. **Description Field**: No longer stores ownership information. It's purely for KPI notes/goals/dates.

5. **Persons Responsible**: Stored as PostgreSQL array. Frontend handles as JavaScript array of strings.

---

## 🎯 Acceptance Criteria

- [x] Database schema updated with new columns
- [x] Backend API returns new field names
- [ ] Frontend forms use new terminology
- [ ] Frontend displays use new terminology
- [x] No references to "Lead" in backend code
- [ ] No references to "Lead" in frontend code
- [ ] All existing KPIs migrated to new schema
- [ ] CSV import supports both old and new terminology

**Status**: 6/8 criteria met (75% complete)
