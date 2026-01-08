# Codebase Concerns

**Analysis Date:** 2026-01-08

## Tech Debt

**Mixed AI Service Architecture:**
- Issue: Both Gemini and OpenAI services exist and are actively used
- Files: `backend/src/services/geminiService.ts`, `backend/src/services/openaiService.ts`
- Why: Migration from Gemini to OpenAI claimed complete but implementation incomplete
- Impact: Confusion about authoritative service, potential API key conflicts, unnecessary dependencies
- Routes still using Gemini: `backend/src/routes/documents.ts` (line 7), `backend/src/routes/ai.ts` (line 4)
- Fix approach: Complete migration to OpenAI, remove Gemini service, update all route imports

**Duplicate Password Hashing Libraries:**
- Issue: Two password hashing libraries installed: bcrypt 6.0.0 AND bcryptjs 3.0.3
- Files: `backend/package.json` (lines 25-26)
- Why: Possibly for cross-platform compatibility but both are maintained
- Impact: Increased bundle size, confusion about which to use
- Fix approach: Standardize on bcryptjs (pure JavaScript, no native bindings), remove bcrypt

**Large Route Files Need Refactoring:**
- Issue: Overly large route files difficult to maintain
- Files:
  - `backend/src/routes/ai.ts` - 789 lines
  - `backend/src/services/openaiService.ts` - 651 lines
- Why: Incremental feature additions without refactoring
- Impact: Difficult to navigate, test, and maintain
- Fix approach: Split ai.ts into separate routers (chat, analysis, reports), extract helper functions

**Duplicate Type Definitions:**
- Issue: Types duplicated between frontend and backend instead of shared package
- Files: `backend/src/types/index.ts`, `frontend/src/types/index.ts`
- Why: Simpler deployment without monorepo complexity
- Impact: Type drift between frontend/backend, maintenance burden
- Fix approach: Create shared types package or use TypeScript project references

**Console.log Proliferation:**
- Issue: 340+ console.log statements across 33 backend files
- Files: Throughout `backend/src/`, particularly in services and routes
- Why: Quick debugging during development
- Impact: Difficult to filter/aggregate logs, no structured context, potential sensitive data exposure
- Fix approach: Implement structured logging framework (Winston or Pino), migrate incrementally

## Known Bugs

**No known bugs documented in code.**
- TODO/FIXME comments exist but no specific bug tracking found in sampled files

## Security Considerations

**Hardcoded JWT Secret Default:**
- Risk: Weak default JWT secret if environment variable not set
- File: `backend/src/middleware/auth.ts` (line 5)
- Default: `'your-secret-key-change-in-production'`
- Current mitigation: None - code uses default if JWT_SECRET missing
- Recommendations:
  - Make JWT_SECRET required (throw error if missing)
  - Add to `.env.example` with clear documentation
  - Add startup validation to check for production-safe secret

**Hardcoded Database Credentials in Dockerfile:**
- Risk: Production database credentials visible in version control
- File: `backend/Dockerfile` (lines 46-50)
- Exposed: `DB_PASSWORD=OgsmPassword2025`, server name, database name
- Current mitigation: None
- Recommendations:
  - Remove hardcoded credentials from Dockerfile
  - Use Azure Key Vault or environment variables for all credentials
  - Audit git history for exposed credentials, rotate if necessary

**Unprotected AI API Endpoints:**
- Risk: Anonymous access to AI analysis, reports, and strategy generation
- Files: `backend/src/routes/ai.ts`
  - Line 608: `/api/ai/analyze` - no authentication
  - Lines 637-746: `/api/ai/reports/generate`, `/api/ai/reports`, `/api/ai/recommendations` - no auth
  - Line 757: `/api/ai/chat-philosophy` - test endpoint with default user
- Current mitigation: None
- Recommendations:
  - Add authenticate middleware to all AI routes
  - Remove or secure test endpoints for production
  - Implement rate limiting on AI endpoints to prevent abuse

**Missing JWT_SECRET Documentation:**
- Risk: Teams may deploy without setting critical security variable
- File: `.env.example`
- Issue: JWT_SECRET not documented in example file
- Current mitigation: None
- Recommendations: Add JWT_SECRET with guidance to `.env.example`

**Database Exposed in Docker Compose:**
- Risk: PostgreSQL exposed on host port 5432 with default credentials
- File: `docker-compose.yml` (lines 10-12)
- Default password: `postgres`
- Current mitigation: None (suitable for local dev only)
- Recommendations:
  - Document that this is for local development only
  - Use strong passwords even in development
  - Don't expose port in production docker-compose

## Performance Bottlenecks

**N+1 Query Pattern in Chat History:**
- Problem: Chat history retrieval loads all messages then processes individually
- File: `backend/src/routes/ai.ts` (lines 478-493)
- Measurement: No metrics, but scales linearly with message count
- Cause: Separate query per message processing instead of database aggregation
- Improvement path: Use database aggregation, add pagination

**No Database Indexes Visible:**
- Problem: Frequent WHERE clauses without visible index definitions
- File: Queries throughout routes use status, frequency, user_id, session_id filters
- Measurement: Not measured
- Cause: `backend/src/database/init.sql` may have indexes but not visible in agent search
- Improvement path: Verify indexes in init.sql, add indexes for frequently queried columns

**SELECT * Queries:**
- Problem: Fetching all columns increases memory usage and network transfer
- File: Used throughout, e.g., `backend/src/routes/documents.ts` (line 251)
- Measurement: Not measured
- Cause: Convenience during development
- Improvement path: Select only required columns, especially for list endpoints

**KPI Forecast Loads All History:**
- Problem: Loads entire KPI history into memory for forecast calculation
- File: `backend/src/routes/kpis.ts` (lines 412-516)
- Measurement: Not measured, but O(n) memory with history size
- Cause: Simple linear regression implementation in application code
- Improvement path: Add pagination, limit history window (e.g., last 90 days), or use database window functions

## Fragile Areas

**Database Initialization on Startup:**
- File: `backend/src/server.ts` (lines 194-196)
- Why fragile: Database init failure logged but app starts anyway
- Common failures: Race condition if DB not ready, migration failures silently ignored
- Safe modification: Add retry logic with exponential backoff, fail fast if DB unreachable after retries
- Test coverage: None

**Philosophy Alignment Extraction:**
- File: `backend/src/routes/ai.ts` (lines 389-458 and inline usage)
- Why fragile: Complex regex parsing of OpenAI responses, duplicated logic
- Common failures: Unexpected response format breaks parsing
- Safe modification: Extract to shared utility function, add comprehensive error handling
- Test coverage: None

**Authentication Middleware Chain:**
- File: `backend/src/middleware/auth.ts`
- Why fragile: JWT verification depends on secret being set, no error handling for malformed tokens
- Common failures: Invalid tokens crash middleware without graceful error response
- Safe modification: Add try/catch around JWT verification, validate token structure
- Test coverage: None

## Scaling Limits

**OpenAI API Rate Limits:**
- Current capacity: Depends on OpenAI tier (not documented in code)
- Limit: Tier 3 estimated at 3500 requests/min (from agent findings)
- Symptoms at limit: 429 errors from OpenAI, user requests fail
- Scaling path: Implement request queueing, caching for repeated queries, rate limiting at application level

**File Upload Storage:**
- Current capacity: Local filesystem via Docker volume
- Limit: Host disk space
- Symptoms at limit: Upload failures, disk full errors
- Scaling path: Migrate to object storage (Azure Blob Storage, AWS S3)

**PostgreSQL Connection Pool:**
- Current capacity: Default pg pool size (likely 10-20 connections)
- Limit: Database max_connections setting
- Symptoms at limit: "too many clients" errors
- Scaling path: Implement connection pooling with pgBouncer, tune pool size based on load

## Dependencies at Risk

**Gemini SDK Still Installed:**
- Risk: Unused dependency after claimed migration to OpenAI
- Package: @google/generative-ai 0.21.0
- Impact: Increased bundle size, security updates for unused package
- Migration plan: Remove package after completing OpenAI migration

**Outdated Express:**
- Risk: Security updates available in newer versions
- Package: express 4.18.2 (current is 4.19.x)
- Impact: Missing security patches
- Migration plan: Update to 4.19.x, test for breaking changes

**Outdated Axios:**
- Risk: Security patches in 1.7.x versions
- Package: axios 1.6.2 (frontend)
- Impact: Potential security vulnerabilities
- Migration plan: Update to latest 1.7.x, verify frontend functionality

## Missing Critical Features

**No Structured Logging:**
- Problem: Console.log everywhere, difficult to aggregate/filter in production
- Current workaround: Azure App Service captures stdout/stderr
- Blocks: Production debugging, log analysis, error tracking
- Implementation complexity: Medium (add Winston/Pino, migrate console statements)

**No API Rate Limiting:**
- Problem: AI endpoints can be abused with unlimited requests
- Current workaround: None
- Blocks: Cost control, abuse prevention
- Implementation complexity: Low (add express-rate-limit middleware)

**No Error Response Standardization:**
- Problem: Error responses vary across routes (generic "Failed to..." messages)
- Current workaround: Frontend handles errors generically
- Blocks: Proper error handling, user-friendly messages, debugging
- Implementation complexity: Medium (create error classes, standardize response format)

**No API Documentation:**
- Problem: No OpenAPI/Swagger spec for API endpoints
- Current workaround: Frontend developers read backend code
- Blocks: API consumer onboarding, integration testing
- Implementation complexity: Medium (add swagger-jsdoc, document endpoints)

## Test Coverage Gaps

**Critical Services Untested:**
- What's not tested:
  - `backend/src/services/openaiService.ts` (651 lines) - AI integration
  - `backend/src/services/kpiService.ts` - KPI calculations
  - `backend/src/services/philosophyService.ts` - Philosophy validation
  - `backend/src/services/aiStrategyService.ts` - Strategy generation
- Risk: AI features, KPI logic, business rules could break unnoticed
- Priority: High
- Difficulty to test: Medium (need to mock OpenAI API, database)

**API Routes Untested:**
- What's not tested: 23 of 24 route files have no tests
- Files: `backend/src/routes/ai.ts`, `kpis.ts`, `documents.ts`, `ogsm.ts`, `auth.ts`, etc.
- Risk: Breaking changes in API contracts, authentication/authorization bugs
- Priority: High
- Difficulty to test: Low (use Supertest pattern from existing test)

**Frontend Completely Untested:**
- What's not tested: All frontend code (0 tests)
- Files: All of `frontend/src/`
- Risk: UI bugs, state management issues, API integration failures
- Priority: Medium
- Difficulty to test: Medium (need to set up Vitest + React Testing Library)

**File Processing Untested:**
- What's not tested: `backend/src/utils/fileProcessor.ts` - DOCX, XLSX parsing
- Risk: Document parsing failures, data extraction bugs
- Priority: Medium
- Difficulty to test: Medium (need sample files, mock file system)

## Positive Notes

**Strong SQL Injection Protection:**
- All database queries use parameterized queries ($1, $2, etc.)
- No string concatenation in SQL queries observed
- Example: `pool.query('SELECT * FROM kpis WHERE id = $1', [id])`

**Proper Environment Variable Usage:**
- .env files properly gitignored
- Sensitive data not committed to repository (except Dockerfile issue noted above)
- Environment-specific configuration properly separated

**Docker Support:**
- Well-structured multi-stage Dockerfiles
- Proper volume mounts for data persistence
- Health checks configured

**TypeScript Throughout:**
- Strong typing reduces runtime errors
- Strict mode enabled in both frontend and backend
- Type definitions maintained for domain models

---

*Concerns audit: 2026-01-08*
*Update as issues are fixed or new ones discovered*
