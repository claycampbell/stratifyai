# Coding Conventions

**Analysis Date:** 2026-01-08

## Naming Patterns

**Files:**
- Backend routes: lowercase no separator (`kpis.ts`, `auth.ts`, `documents.ts`)
- Backend services: camelCase with Service suffix (`openaiService.ts`, `kpiService.ts`)
- Backend config: camelCase (`database.ts`, `openai.ts`)
- Backend scripts: camelCase verb+noun (`runMigration.ts`, `createTestUser.ts`)
- Frontend components: PascalCase.tsx (`Layout.tsx`, `AIChatBubble.tsx`, `KPIDetailModal.tsx`)
- Frontend pages: PascalCase.tsx (`Dashboard.tsx`, `KPIs.tsx`, `Login.tsx`)
- Frontend utilities: camelCase.ts (`api.ts`, `formatters.ts`)
- Frontend contexts: PascalCase+Context.tsx (`AuthContext.tsx`, `UserPreferencesContext.tsx`)
- Database migrations: ###_snake_case.sql (`001_add_user_id_to_chat_history.sql`)
- Tests: *.test.ts in `__tests__/` subdirectory (`users.impersonation.test.ts`)

**Functions:**
- camelCase for all functions and methods
- Examples: `extractOGSMFromText()`, `processDocx()`, `formatKPIValue()`
- React hooks: `useState`, `useEffect`, `useQuery`
- Custom hooks: `use` prefix (`useAuth()`)
- Route handlers: descriptive verbs (`getAll`, `getById`, `create`, `update`, `delete`)

**Variables:**
- camelCase for variables (`sessionId`, `chatMutation`, `targetValue`)
- UPPER_SNAKE_CASE for constants (`JWT_SECRET`, `API_BASE_URL`)
- No underscore prefix for private members

**Types:**
- PascalCase for classes, interfaces, types
- No I prefix for interfaces (use `User`, not `IUser`)
- Examples: `OpenAIService`, `OGSMComponent`, `KPI`, `Document`
- Location: `backend/src/types/index.ts`, `frontend/src/types/index.ts`

**Database:**
- snake_case for table names (plural): `ogsm_components`, `kpi_history`, `staff_plans`
- snake_case for columns: `created_at`, `updated_at`, `target_value`, `component_type`
- Primary keys: `id` (UUID)
- Foreign keys: `<table>_id` (`kpi_id`, `document_id`, `ogsm_component_id`)

## Code Style

**Formatting:**
- 2 space indentation (consistent across frontend and backend)
- Single quotes for strings
- Semicolons required
- No strict line length limit (broken logically for readability)
- Example: `import express from 'express';` in `backend/src/server.ts`

**Linting:**
- Frontend: ESLint 8.55.0 with TypeScript plugins
  - Plugins: @typescript-eslint/eslint-plugin 6.14.0, @typescript-eslint/parser 6.14.0
  - React plugins: eslint-plugin-react-hooks, eslint-plugin-react-refresh
  - Script: `npm run lint`
- Backend: Placeholder only (`"lint": "echo 'Backend lint passed' && exit 0"`)
- No .eslintrc or .prettierrc files at project root

**TypeScript:**
- Strict mode enabled in both projects (`"strict": true`)
- Explicit return types on functions preferred
- Request/Response types: `async (req: Request, res: Response) => {}`
- Extended types: `interface AuthRequest extends Request`

## Import Organization

**Order:**
1. External packages (express, react, axios)
2. Internal modules (services, config, utils)
3. Relative imports (./components, ../types)
4. Type imports (if separated)

**Grouping:**
- Logical grouping with section comments
- Example: `// Import routes` and `// API Routes` in `backend/src/server.ts`
- No blank lines between imports typically

**Path Aliases:**
- Frontend: `@/*` maps to `./src/*` (configured in vite.config.ts)
- Backend: No path aliases (uses relative imports)

## Error Handling

**Patterns:**
- try/catch blocks at route boundaries
- Services throw Error with descriptive messages
- Routes catch and return JSON error: `{ error: 'Failed to...' }`
- No custom Error classes observed
- Database errors logged but app continues (soft failure)

**Error Flow:**
```typescript
try {
  // Business logic
  const result = await service.method();
  res.json(result);
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ error: 'Failed to perform operation' });
}
```

**Async Error Handling:**
- Use try/catch, no .catch() chains
- Example: `await pool.query()` wrapped in try/catch

## Logging

**Framework:**
- Console-based logging (console.log, console.error)
- 340+ console.log statements across backend
- No structured logging framework (Winston, Pino, etc.)

**Patterns:**
- console.log for informational messages
- console.error for errors
- Sensitive data sometimes logged (be cautious)
- Example: `console.error('Error updating KPI:', error);`

**When:**
- Log at service boundaries
- Log database operations
- Log external API calls
- Log errors with context

## Comments

**When to Comment:**
- Explain why, not what
- Document business logic and algorithms
- Mark sections: `// Middleware`, `// API Routes`
- Avoid obvious comments

**JSDoc/TSDoc:**
- Used for utility functions with complex parameters
- Example in `frontend/src/lib/formatters.ts`:
```typescript
/**
 * Formats a number value with proper currency symbol placement
 * @param value - The numeric value to format
 * @param unit - The unit (e.g., '$', '%', 'users')
 * @returns Formatted string with proper symbol placement
 */
```
- Not consistently applied across codebase

**TODO Comments:**
- No specific pattern observed
- Use `// TODO:` when needed

## Function Design

**Size:**
- No strict limit, but many functions are 50-100 lines
- Some route handlers exceed 200 lines (opportunity for refactoring)
- Extract helpers for complex logic

**Parameters:**
- Standard function parameters (no strict max)
- Options object pattern used in some cases
- Destructuring in parameters: `function process({ id, name }: ProcessParams)`

**Return Values:**
- Explicit return statements
- Async functions return Promise
- Route handlers return via res.json() or res.status().json()

## Module Design

**Exports:**
- Named exports preferred
- Default exports for React components and main app
- Example: `export default App;` in `frontend/src/App.tsx`
- Example: `export { authenticate, authorize };` in `backend/src/middleware/auth.ts`

**Barrel Files:**
- Types exported from `index.ts` in types/ directory
- No barrel files for routes or components (import directly)

**Dependencies:**
- Avoid circular dependencies
- Services can depend on config and database
- Routes depend on services and middleware
- Components depend on lib/api and contexts

---

*Convention analysis: 2026-01-08*
*Update when patterns change*
