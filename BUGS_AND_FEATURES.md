# StratifyAI Platform - Bugs and Feature Requests

**Last Updated:** 2026-01-08
**Status:** Updated after KPI editing/deletion implementation

---

## 🐛 Bugs

### ✅ FIXED - KPI entries can't be edited after they're saved
**Status:** Fixed and deployed
**Fixed:** 2026-01-08
**Solution:**
- Added `PUT /api/kpis/:kpiId/history/:historyId` endpoint
- Frontend method: `kpisApi.updateHistory(kpiId, historyId, data)`
- Supports editing value, recorded_date, and notes
- Automatic recalculation of KPI status after edits
- Validates history entry belongs to specified KPI

**Usage:**
```typescript
await kpisApi.updateHistory(kpiId, historyId, {
  value: 95,
  recorded_date: '2026-01-05',
  notes: 'Corrected data entry error'
});
```

---

### ✅ FIXED - KPI entries can't be deleted
**Status:** Fixed and deployed
**Fixed:** 2026-01-08
**Solution:**
- Added `DELETE /api/kpis/:kpiId/history/:historyId` endpoint
- Frontend method: `kpisApi.deleteHistory(kpiId, historyId)`
- Automatic update of KPI's current_value to most recent remaining entry
- Recalculates status and trend after deletion
- If no history remains, sets current_value to NULL

**Usage:**
```typescript
await kpisApi.deleteHistory(kpiId, historyId);
```

---

### ✅ FIXED - KPI entries can't be back-dated to earlier dates
**Status:** Already supported - just needs documentation
**Solution:** The `POST /api/kpis/:id/history` endpoint already accepts custom `recorded_date`

**Usage:**
```typescript
await kpisApi.addHistory(kpiId, {
  value: 85,
  recorded_date: '2025-12-15',  // Any historical date
  notes: 'Historical data entry'
});
```

---

### ✅ FIXED - AI Chief Strategy Officer 500 error
**Status:** Fixed and deployed
**Fixed:** 2026-01-08
**Root Cause:** Backend routes were still using deprecated `geminiService` instead of `openaiService`

**Solution:**
- Migrated `backend/src/routes/ai.ts` from Gemini to OpenAI service
- Replaced all 6 method calls:
  - `chatWithActionSupport()` - AI chat with function calling
  - `generateChatTitle()` - Automatic chat title generation
  - `analyzeStrategicAlignment()` - OGSM alignment analysis
  - `generateProgressReport()` - Progress report generation
  - `generateRecommendations()` - Strategic recommendations
  - `chatWithPhilosophy()` - Philosophy-aware responses
- All AI features now use GPT-4o model consistently

**Impact:**
- Fixes 500 Internal Server Error on `/api/ai/chat`
- Resolves "Chat mutation error: ue" in frontend console
- AI Chief Strategy Officer chat now functional
- Completes OpenAI migration (resolves mixed service architecture issue)

---

### ⚠️ INVESTIGATE - AI Strategy Generator won't load for Clay
**Status:** Needs testing after AI chat fix
**Priority:** High
**Note:** May have been resolved by fixing AI chat 500 error above

**Backend Status:**
- ✅ Endpoint exists: `POST /api/ai-strategy/generate`
- ✅ Route registered in server.ts
- ✅ Backend health check passes
- ✅ Service implementation exists
- ✅ Uses OpenAI service (separate from ai.ts chat routes)

**Next Steps:**
- Test AI Strategy Generator after AI chat fix deployment
- If still failing, check authentication/authorization
- Review browser console for any remaining errors
- Check Azure logs for OpenAI API errors

---

### ⚠️ OPEN - Incognito mode blocks full access to the platform
**Status:** Needs investigation
**Priority:** Medium
**Notes:** This was reported previously as a browser cache issue

**Previous Context:**
- User could access in incognito mode when regular mode failed
- Indicated stale authentication tokens in browser cache
- Cache busting was implemented to prevent future occurrences

**Possible Causes:**
1. Cookies disabled in incognito mode
2. LocalStorage not persisting (JWT tokens stored in localStorage)
3. Third-party cookie blocking
4. Service Worker cache issues

**Solution Options:**
1. Add better error messaging when auth fails
2. Detect incognito mode and show warning
3. Consider cookie-based auth as fallback
4. Implement session recovery mechanism

---

### ❌ OPEN - Ownership tab shows only eight KPIs for Clay
**Status:** Needs investigation
**Priority:** Medium
**Reported:** Other responsibilities are missing from ownership view

**Technical Details:**
- Backend supports `owner_email` and `persons_responsible` fields
- Migration 007 added these columns to production database

**Investigation Needed:**
1. Check how many KPIs have Clay assigned as owner:
```sql
SELECT COUNT(*)
FROM kpis
WHERE owner_email = 'clay@seawolfai.net'
   OR 'clay@seawolfai.net' = ANY(persons_responsible);
```

2. Check frontend filtering logic in ownership tab
3. Verify pagination or limit settings
4. Check if there's a view/component limiting display to 8 items

**Files to Review:**
- Frontend components filtering by ownership
- Any components with hardcoded limits (e.g., `.slice(0, 8)`)
- KPI list components with ownership filters

---

## 🎯 Feature Requests

### 🔔 HIGH PRIORITY

#### 1. Add warning when KPI numbers look suspicious
**Status:** Planned
**Priority:** High
**Description:** Detect and alert when KPI values don't match expected patterns or reality

**Implementation Plan:**
- Use existing `validation_rules` column in kpis table
- Extend with anomaly detection:
  - Values outside expected range (e.g., >100% for percentages)
  - Sudden jumps (>50% change from previous entry)
  - Values inconsistent with trend
- Add alert system (reuse `kpi_enhancements` alerts table)
- Show warnings in UI before saving

**Technical Approach:**
```typescript
// In KPIService
validateKPIValue(value, previousValue, validationRules) {
  const warnings = [];

  // Range check
  if (validationRules.min && value < validationRules.min) {
    warnings.push('Value below expected minimum');
  }

  // Anomaly detection
  if (previousValue && Math.abs((value - previousValue) / previousValue) > 0.5) {
    warnings.push('Large change from previous value - please verify');
  }

  return { isValid: warnings.length === 0, warnings };
}
```

---

#### 2. Allow multiple owners to be assigned to a single KPI
**Status:** Partially implemented
**Priority:** High
**Current State:** `persons_responsible` column exists (text array) but may not be fully integrated in UI

**Implementation Needed:**
- Update KPI creation/edit forms to support multiple owner selection
- Show all responsible persons in KPI cards/lists
- Filter by any responsible person in ownership views
- Update notifications to notify all responsible persons

**Database:** Already supported via `persons_responsible TEXT[]` column

**Frontend Changes Needed:**
- Multi-select dropdown for persons_responsible
- Display multiple avatars/names in KPI cards
- Update ownership filter to check array membership

---

#### 3. Add visual dashboards for status tracking
**Status:** Planned
**Priority:** High
**Description:** Clear dashboards showing on-track, off-track, and at-risk KPIs

**Current State:**
- Status field exists with values: on_track, at_risk, off_track
- Auto-calculation implemented via thresholds
- Basic KPI views exist

**Enhancement Needed:**
- Visual dashboard with status cards
- Color-coded status indicators (green/yellow/red)
- Count of KPIs in each status
- Trend indicators (improving/declining/stable)
- Drill-down to see KPIs in each category

**Component Design:**
```typescript
// StatusDashboard.tsx
<div className="grid grid-cols-3 gap-4">
  <StatusCard
    status="on_track"
    count={kpis.filter(k => k.status === 'on_track').length}
    trend="improving"
  />
  <StatusCard
    status="at_risk"
    count={kpis.filter(k => k.status === 'at_risk').length}
    trend="stable"
  />
  <StatusCard
    status="off_track"
    count={kpis.filter(k => k.status === 'off_track').length}
    trend="declining"
  />
</div>
```

---

### 📊 MEDIUM PRIORITY

#### 4. Import social media metrics automatically
**Status:** Planned
**Priority:** Medium
**Description:** Button to import metrics from Twitter, Instagram, etc.

**Implementation Plan:**
1. Use official APIs:
   - Twitter/X API v2
   - Instagram Graph API (via Facebook/Meta)
   - LinkedIn API
   - YouTube Analytics API

2. OAuth flow for authentication
3. Scheduled imports (daily/weekly)
4. Map social metrics to KPIs:
   - Impressions → Reach KPI
   - Engagement → Interaction KPI
   - Followers → Audience Growth KPI

**Database Changes:**
```sql
CREATE TABLE social_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(50),  -- 'twitter', 'instagram', etc.
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE social_metrics_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id UUID REFERENCES kpis(id),
  platform VARCHAR(50),
  metric_name VARCHAR(100),  -- 'impressions', 'engagement', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

#### 5. Create comprehensive user manual
**Status:** Planned
**Priority:** Medium
**Description:** User manual covering all platform features for new team members

**Sections Needed:**
1. Getting Started
   - Account setup
   - Navigation overview
   - Dashboard tour

2. OGSM Framework
   - Creating objectives, goals, strategies, measures
   - Hierarchical relationships
   - Using templates

3. KPI Management
   - Creating and tracking KPIs
   - Recording historical data
   - Understanding status indicators
   - Editing and deleting entries
   - Back-dating data

4. AI Features
   - AI Strategy Generator
   - AI Chief Strategy Officer chat
   - Philosophy alignment validation
   - Report generation

5. 30/60/90-Day Plans
   - Creating staff plans
   - Linking to KPIs and OGSM
   - Progress tracking

6. Reports and Analytics
   - Generating progress reports
   - Understanding alignment matrix
   - Forecasting

**Format:** Markdown files in `/docs` directory + in-app help tooltips

---

#### 6. Support archiving past fiscal years
**Status:** Planned
**Priority:** Medium
**Description:** Archive completed fiscal year data while keeping useful historical information

**Implementation Plan:**
```sql
CREATE TABLE archived_kpi_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id UUID REFERENCES kpis(id),
  fiscal_year INTEGER,
  data JSONB,  -- Complete KPI state and history
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_by UUID REFERENCES users(id)
);

-- Add archive status to KPIs
ALTER TABLE kpis ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE kpis ADD COLUMN archive_date TIMESTAMP;
```

**Features:**
- "Archive Fiscal Year" button in settings
- Move all completed KPIs to archive
- Preserve historical trends and reports
- "View Archive" to access old data
- Restore from archive if needed

---

### 📅 LOW PRIORITY

#### 7. Templates for 30/60/90-day plans
**Status:** Planned
**Priority:** Low
**Current State:** Staff plans exist, but no templates

**Implementation:**
```sql
CREATE TABLE plan_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  description TEXT,
  template_items JSONB,  -- Array of template items
  category VARCHAR(100),  -- 'onboarding', 'sales', 'executive', etc.
  created_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Template Categories:**
- New Employee Onboarding (First 90 Days)
- Sales Rep Ramp-up
- Manager Transition
- Executive Onboarding
- Project Kickoff
- Client Engagement Phases

---

#### 8. Core-priority workshop templates
**Status:** Planned
**Priority:** Low
**Description:** Templates and guides for running strategic planning workshops

**Features:**
- Workshop agenda templates
- Facilitation guides
- Exercise templates
- Pre-work assignments
- Post-workshop action plans

---

#### 9. Workshop scheduling tools
**Status:** Planned
**Priority:** Low
**Description:** Tools to schedule Day 1, Day 60, Day 90 workshops for client engagements

**Features:**
- Calendar integration
- Automatic reminders
- Pre-workshop preparation checklists
- Post-workshop follow-up tasks
- Client notification system

---

## 📝 Notes

### Back-dating Data (Already Supported)
The platform already supports back-dating KPI entries. When adding history:

```javascript
// Frontend code example
await kpisApi.addHistory(kpiId, {
  value: 85,
  recorded_date: '2025-12-01',  // Any date
  notes: 'Historical data from December'
});
```

The `recorded_date` field can be set to any date, past or future.

### Deployment Pipeline
- GitHub Actions automatically deploys to Azure on push to main
- Backend: Azure App Service (ogsm-backend-webapp)
- Frontend: Azure App Service (stratifyai.pro)
- Database: Azure Database for PostgreSQL

### Testing Checklist
After each deployment:
1. ✅ Backend health check: https://ogsm-backend-webapp.azurewebsites.net/health
2. ✅ Frontend loads: https://stratifyai.pro
3. ✅ Login works
4. ✅ KPI CRUD operations
5. ✅ KPI history editing/deletion (NEW)
6. ⚠️ AI Strategy Generator (needs testing with Clay's account)
7. ⚠️ AI Chief Strategy Officer (needs testing with Clay's account)

---

## 🚀 Next Steps

### Immediate (This Week)
1. **Investigate AI access issues for Clay** - Check authentication, roles, permissions
2. **Fix ownership tab display** - Find why only 8 KPIs show
3. **Document back-dating feature** - Update user guide
4. **Test deployed KPI edit/delete** - Verify in production

### Short Term (Next 2 Weeks)
1. Implement suspicious value warnings
2. Complete multiple owners UI integration
3. Build status tracking dashboard
4. Create basic user manual

### Medium Term (Next Month)
1. Social media integration
2. Fiscal year archiving
3. Plan templates
4. Enhanced reporting

### Long Term (Next Quarter)
1. Workshop scheduling tools
2. Advanced analytics
3. Mobile app considerations
4. API documentation

---

**For Questions or Issues:**
Contact: Clay Campbell (clay@seawolfai.net)
