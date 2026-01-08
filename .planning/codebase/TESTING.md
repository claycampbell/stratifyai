# Testing Patterns

**Analysis Date:** 2026-01-08

## Test Framework

**Runner:**
- Jest 29.7.0 (backend only)
- ts-jest 29.4.5 - TypeScript preprocessor
- No jest.config.js found (likely using defaults or inline config)

**Assertion Library:**
- Jest built-in expect
- Matchers: toBe, toEqual, toHaveProperty

**HTTP Testing:**
- Supertest 7.1.4 - HTTP assertion library for API testing

**Run Commands:**
```bash
# Backend (no npm test script configured)
npm test                              # Not configured
npx jest                              # Direct Jest execution

# Frontend
# No testing framework configured
```

## Test File Organization

**Location:**
- Backend: Co-located with source in `__tests__/` subdirectories
- Example: `backend/src/routes/__tests__/users.impersonation.test.ts`
- No separate top-level tests/ directory

**Naming:**
- Pattern: `<feature>.<description>.test.ts`
- Example: `users.impersonation.test.ts`

**Coverage:**
- Minimal - Only 1 test file found in entire codebase
- No frontend tests
- No service layer tests
- No utility tests

**Structure:**
```
backend/src/
  routes/
    __tests__/
      users.impersonation.test.ts  # Only test file
    kpis.ts
    ai.ts
    [21 other route files with no tests]
  services/
    openaiService.ts               # No tests
    kpiService.ts                  # No tests
    [Other services with no tests]
```

## Test Structure

**Suite Organization:**
```typescript
import request from 'supertest';
import app from '../../server';
import pool from '../../config/database';

describe('Feature Name', () => {
  let testVariable: string;

  beforeAll(async () => {
    // Setup: Create test data in database
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await pool.end();
  });

  describe('Specific Functionality', () => {
    it('should handle success case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Test implementation
    });
  });
});
```

**Patterns (from existing test):**
- Nested describe blocks for organization
- Groups tests by API endpoint or functionality
- Uses beforeAll/afterAll for setup/teardown
- Tests both success and error cases
- Database integration tests (not mocked)

**Example Test Pattern:**
```typescript
it('should allow super admin to impersonate user', async () => {
  const response = await request(app)
    .post(`/api/users/impersonate/${targetUserId}`)
    .set('Authorization', `Bearer ${superAdminToken}`)
    .expect(200);

  expect(response.body).toHaveProperty('impersonatedUser');
  expect(response.body.impersonatedUser.id).toBe(targetUserId);
});
```

## Mocking

**Framework:**
- Jest built-in mocking (vi not used - not Vitest)
- No mocking observed in single test file

**Patterns:**
- Uses actual database pool (not mocked)
- No external service mocking observed
- Integration test approach

**What's Tested:**
- Real database connections
- Real Express app
- Full HTTP request/response cycle

**What's NOT Mocked:**
- Database queries
- Express middleware
- Route handlers

## Fixtures and Factories

**Test Data:**
```typescript
// Created in beforeAll hook
await pool.query(`
  INSERT INTO users (id, email, password_hash, role)
  VALUES ($1, $2, $3, $4)
`, [userId, 'test@test.com', hashedPassword, 'admin']);
```

**Location:**
- Test data created inline in test files
- No separate fixtures directory
- No factory functions observed

**Cleanup:**
```typescript
afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
  await pool.end();
});
```

## Coverage

**Requirements:**
- No enforced coverage target
- No coverage reports configured
- No npm test script in backend package.json

**Configuration:**
- No coverage configuration found
- Jest can generate coverage via --coverage flag

**View Coverage:**
```bash
npx jest --coverage              # Generate coverage report
open coverage/index.html         # View report
```

## Test Types

**Unit Tests:**
- None found

**Integration Tests:**
- 1 file: `backend/src/routes/__tests__/users.impersonation.test.ts`
- Tests full API endpoint with database
- Covers user impersonation feature

**E2E Tests:**
- None found
- Manual testing via browser noted in various .md files

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operation', async () => {
  const response = await request(app)
    .get('/api/endpoint')
    .expect(200);

  expect(response.body).toHaveProperty('data');
});
```

**Error Testing:**
```typescript
it('should return 403 for non-admin', async () => {
  await request(app)
    .post('/api/admin-only')
    .set('Authorization', `Bearer ${regularUserToken}`)
    .expect(403);
});
```

**Snapshot Testing:**
- Not used in this codebase

## Testing Gaps

**Critical Services Without Tests:**
- `backend/src/services/openaiService.ts` (651 lines) - AI integration
- `backend/src/services/kpiService.ts` - KPI calculations
- `backend/src/services/philosophyService.ts` - Philosophy validation
- `backend/src/services/aiStrategyService.ts` - Strategy generation
- `backend/src/services/geminiService.ts` - Legacy AI service

**Routes Without Tests:**
- 23 of 24 route files have no tests
- No tests for: ai.ts, kpis.ts, documents.ts, ogsm.ts, auth.ts, etc.

**Utilities Without Tests:**
- `backend/src/utils/fileProcessor.ts` - File parsing logic
- `frontend/src/lib/formatters.ts` - Data formatting
- `frontend/src/lib/api.ts` - API client

**Frontend:**
- Zero tests
- No testing framework configured
- No component tests
- No integration tests
- No E2E tests

**Middleware:**
- `backend/src/middleware/auth.ts` - Authentication/authorization (no tests)

## Recommendations

**Immediate Actions:**
1. Set up npm test script in backend/package.json
2. Configure jest.config.js for proper test discovery
3. Add testing framework to frontend (Vitest recommended for Vite)

**High Priority:**
1. Add unit tests for critical services (OpenAIService, KPIService)
2. Add integration tests for main API routes (auth, kpis, documents)
3. Mock external services (OpenAI API) for faster, more reliable tests
4. Set up CI/CD with automated test runs

**Medium Priority:**
1. Add frontend component tests (React Testing Library)
2. Increase coverage target to 60%
3. Add E2E tests for critical user flows (Playwright)
4. Create test fixtures and factory functions
5. Add pre-commit hooks to run tests

---

*Testing analysis: 2026-01-08*
*Update when test patterns change*
