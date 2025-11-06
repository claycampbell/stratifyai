# P1-001: KPI Categorization System

**Priority**: High | **Effort**: Medium | **Impact**: High
**Estimated Hours**: 24-32 hours

## Overview

Implement a categorization system to organize KPIs into logical groups/tabs for better organization and navigation. This will help users manage large numbers of KPIs by grouping them into meaningful categories (e.g., Financial, Academic, Athletics, Marketing, Operations).

## Database Schema

### New Table: `kpi_categories`

```sql
CREATE TABLE IF NOT EXISTS kpi_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20), -- Hex color for UI theming (e.g., '#3B82F6')
    icon VARCHAR(50), -- Optional icon name (e.g., 'TrendingUp', 'DollarSign')
    order_index INTEGER DEFAULT 0, -- For custom sorting
    is_default BOOLEAN DEFAULT false, -- Mark default "Uncategorized" category
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kpi_categories_order ON kpi_categories(order_index);
```

### Modify `kpis` Table

```sql
ALTER TABLE kpis
ADD COLUMN category_id UUID REFERENCES kpi_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kpis_category_id ON kpis(category_id);
```

### Default Categories

Create initial categories on migration:
- **Uncategorized** (default, is_default=true)
- **Financial** (color: #10B981, icon: DollarSign)
- **Academic** (color: #6366F1, icon: GraduationCap)
- **Athletics** (color: #F59E0B, icon: Trophy)
- **Marketing** (color: #EC4899, icon: Megaphone)
- **Operations** (color: #8B5CF6, icon: Settings)

## API Endpoints

### Category Management

**GET /api/kpi-categories** - Get all categories
```typescript
Response: {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  order_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}[]
```

**POST /api/kpi-categories** - Create new category
```typescript
Request: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order_index?: number;
}
```

**PUT /api/kpi-categories/:id** - Update category
```typescript
Request: {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  order_index?: number;
}
```

**DELETE /api/kpi-categories/:id** - Delete category
- Cannot delete default "Uncategorized" category
- KPIs in deleted category move to "Uncategorized"

**GET /api/kpi-categories/:id/kpis** - Get all KPIs in a category
```typescript
Response: KPI[]
```

### KPI Updates

**PUT /api/kpis/:id** - Add category_id to existing update endpoint
```typescript
Request: {
  category_id?: string | null;
  // ... existing fields
}
```

## Frontend Components

### 1. Category Management UI

**Location**: New page `/settings/kpi-categories` or modal in KPIs page

**Features**:
- List all categories with name, color, icon, KPI count
- Create new category button
- Edit category (inline or modal)
- Delete category with confirmation
- Drag-and-drop to reorder categories
- Color picker for category theming
- Icon selector

### 2. Category Tab Navigation

**Location**: KPIs page (`/kpis`)

**Features**:
- Tab bar showing all categories
- Each tab displays category name, icon, and KPI count
- Active tab highlighted with category color
- Click tab to filter KPIs by category
- "All KPIs" tab to show everything
- Sticky tab bar on scroll

### 3. KPI Form Category Selector

**Location**: KPI create/edit modal

**Features**:
- Dropdown select for category
- Show category color/icon in dropdown
- Default to "Uncategorized" for new KPIs
- Allow changing category from KPI detail view

### 4. Category Badge/Chip

**Location**: KPI cards and list views

**Features**:
- Small badge showing category name
- Color-coded with category color
- Optional icon display
- Clickable to filter by that category

## User Experience Flow

1. **First Time User**:
   - Sees default categories pre-created
   - All existing KPIs start in "Uncategorized"
   - Can manually assign KPIs to categories

2. **Creating New KPI**:
   - Category dropdown in KPI form
   - Defaults to "Uncategorized"
   - Can select any existing category

3. **Managing Categories**:
   - Access category settings from KPIs page header
   - Create custom categories relevant to organization
   - Customize colors and icons
   - Reorder categories for priority

4. **Filtering by Category**:
   - Click category tab to see only those KPIs
   - Tab shows live count of KPIs in category
   - URL updates with category filter (e.g., `/kpis?category=financial`)
   - Share direct link to filtered view

## Implementation Phases

### Phase 1: Database & Backend (8-10 hours)
- [ ] Create migration for kpi_categories table
- [ ] Add category_id to kpis table
- [ ] Seed default categories
- [ ] Implement category CRUD routes
- [ ] Add category filtering to KPI endpoints
- [ ] Add TypeScript types

### Phase 2: Frontend Category Management (8-10 hours)
- [ ] Create CategoryManagement component
- [ ] Build category form with color picker
- [ ] Implement category list with edit/delete
- [ ] Add category reordering
- [ ] Integrate with backend APIs

### Phase 3: KPI Integration (8-10 hours)
- [ ] Add category selector to KPI forms
- [ ] Create category tab navigation
- [ ] Add category badges to KPI views
- [ ] Implement category filtering
- [ ] Update KPI views to show categories

### Phase 4: Testing & Polish (2-4 hours)
- [ ] Test category CRUD operations
- [ ] Test KPI assignment and filtering
- [ ] Test edge cases (delete category, etc.)
- [ ] Add loading states
- [ ] Polish UI/UX

## Acceptance Criteria

- [x] Can create, edit, and delete custom categories
- [x] Can assign KPIs to categories via KPI form
- [x] Can filter KPIs by category using tab navigation
- [x] Category tabs show live KPI counts
- [x] Default "Uncategorized" category exists and cannot be deleted
- [x] KPIs from deleted categories move to "Uncategorized"
- [x] Categories display with custom colors and icons
- [x] Can reorder categories
- [x] All existing KPIs work without breaking

## Future Enhancements (Not in Scope)

- AI-suggested categorization based on KPI content
- Nested/hierarchical categories
- Category-level analytics and reporting
- Bulk category assignment
- Category templates for different industries
