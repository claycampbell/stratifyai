# Architecture

**Analysis Date:** 2026-01-08

## Pattern Overview

**Overall:** Monorepo Three-Tier Web Application with Microservices Deployment

**Key Characteristics:**
- Single-Page Application (SPA) frontend architecture
- RESTful API backend with layered architecture
- Docker Compose microservices orchestration
- Schema-first database approach with migrations

## Layers

**API/Route Layer (Controllers):**
- Purpose: RESTful endpoint definitions and request handling
- Contains: Route handlers with request validation and response formatting
- Location: `backend/src/routes/*.ts` (24 route files)
- Depends on: Service layer for business logic, Middleware for auth
- Used by: Frontend API client
- Examples: `backend/src/routes/auth.ts`, `backend/src/routes/kpis.ts`, `backend/src/routes/ai.ts`

**Service Layer (Business Logic):**
- Purpose: Core business logic and AI integration
- Contains: Business rules, calculations, external service integrations
- Location: `backend/src/services/*.ts`
- Depends on: Database layer, external APIs (OpenAI)
- Used by: Route handlers
- Examples:
  - `backend/src/services/openaiService.ts` - OpenAI GPT-4o integration
  - `backend/src/services/kpiService.ts` - KPI calculation logic
  - `backend/src/services/philosophyService.ts` - Philosophy alignment validation
  - `backend/src/services/aiStrategyService.ts` - Strategy generation

**Middleware Layer:**
- Purpose: Cross-cutting concerns (authentication, authorization, logging)
- Contains: Express middleware functions
- Location: `backend/src/middleware/auth.ts`
- Depends on: Configuration (JWT secret)
- Used by: Route handlers
- Pattern: Middleware chain (authenticate → authorize → route handler)

**Data Access Layer:**
- Purpose: Database connection and query execution
- Contains: PostgreSQL connection pool, parameterized queries
- Location: `backend/src/config/database.ts`
- Depends on: Environment variables for connection
- Used by: Routes and services
- Pattern: Direct SQL queries via pg pool (no ORM)

**Utility Layer:**
- Purpose: Shared helper functions
- Contains: File processing, data formatting
- Location: `backend/src/utils/fileProcessor.ts`
- Depends on: External libraries (mammoth, xlsx)
- Used by: Route handlers

**Frontend Component Layer:**
- Purpose: Reusable UI components and pages
- Contains: React components with hooks and context
- Location: `frontend/src/components/*.tsx` (26 components), `frontend/src/pages/*.tsx` (18 pages)
- Depends on: API client, contexts for state
- Used by: React Router
- Examples:
  - `frontend/src/pages/Dashboard.tsx` - Main dashboard page
  - `frontend/src/components/AIChatBubble.tsx` - Floating AI chat widget
  - `frontend/src/components/KPIDetailModal.tsx` - KPI detail view

**Frontend State Management:**
- Purpose: Global application state
- Contains: Authentication, user preferences
- Location: `frontend/src/contexts/AuthContext.tsx`, `frontend/src/contexts/UserPreferencesContext.tsx`
- Pattern: React Context API for global state, React Query for server state

**Frontend API Client:**
- Purpose: Centralized HTTP communication with backend
- Contains: Typed API methods, interceptors for auth tokens
- Location: `frontend/src/lib/api.ts`
- Depends on: axios, AuthContext for tokens
- Used by: Components and pages

## Data Flow

**Standard API Request Lifecycle:**

1. User interaction → Frontend component (e.g., `frontend/src/pages/KPIs.tsx`)
2. API call → `frontend/src/lib/api.ts` (typed axios client)
3. HTTP request → Backend Express server (`backend/src/server.ts`)
4. Middleware → `backend/src/middleware/auth.ts` (JWT verification, role check)
5. Route handler → `backend/src/routes/*.ts` (validate input, extract parameters)
6. Service layer → `backend/src/services/*.ts` (business logic, calculations)
7. Database query → PostgreSQL via pg pool (`backend/src/config/database.ts`)
8. Response → JSON back through layers
9. State update → React Query cache + component re-render

**AI-Enhanced Request Flow:**

1. User sends chat message → `frontend/src/components/AIChatBubble.tsx`
2. API call → `frontend/src/lib/api.ts` (`aiApi.chat()`)
3. Route handler → `backend/src/routes/ai.ts`
4. Philosophy service → `backend/src/services/philosophyService.ts` (validate alignment)
5. AI service → `backend/src/services/openaiService.ts`
   - Fetches context (KPIs, OGSM components) from database
   - Builds structured prompt with system context
   - Calls OpenAI GPT-4o API with function calling
   - Processes function calls if needed
6. Response → Streamed or batched back to frontend
7. UI update → Chat history with philosophy validation badges

**Document Processing Flow:**

1. File upload → `frontend/src/pages/Documents.tsx`
2. Multipart form data → `frontend/src/lib/api.ts` (`documentsApi.upload()`)
3. Route → `backend/src/routes/documents.ts` (multer middleware)
4. File processing → `backend/src/utils/fileProcessor.ts`
   - DOCX: mammoth library
   - XLSX: xlsx-js-style library
   - TXT/MD: raw text extraction
5. AI extraction → `backend/src/services/openaiService.ts` (`extractOGSMFromText()`)
6. Database storage → INSERT into documents and ogsm_components tables
7. Response → Confirmation with extracted components

**State Management:**
- Server state: React Query cache (automatic invalidation, background updates)
- Global client state: React Context (AuthContext, UserPreferencesContext)
- Local component state: React useState hooks
- No persistent client-side database

## Key Abstractions

**Service Layer Pattern:**
- Purpose: Encapsulate business logic in stateful classes
- Examples:
  - `backend/src/services/openaiService.ts` - OpenAIService class
  - `backend/src/services/kpiService.ts` - KPI calculations
- Pattern: Singleton-like (single instance per service)

**Middleware Chain Pattern:**
- Purpose: Composable request processing pipeline
- Example: authenticate → authorize → route handler
- Location: `backend/src/middleware/auth.ts`

**Repository Pattern (Implicit):**
- Purpose: Database access abstraction
- Pattern: Direct SQL queries in routes/services (lightweight, no explicit repositories)
- Example: `pool.query('SELECT * FROM kpis WHERE id = $1', [id])`

**Factory Pattern:**
- Purpose: Client creation and configuration
- Examples:
  - `backend/src/config/openai.ts` - getOpenAIClient()
  - `backend/src/config/gemini.ts` - getGeminiModel()

**Strategy Pattern:**
- Purpose: Algorithm selection based on file type
- Example: `backend/src/utils/fileProcessor.ts` switches on file extension

**Protected Route Pattern:**
- Purpose: Route-level authorization
- Example: `frontend/src/components/ProtectedRoute.tsx`
- Wraps routes requiring authentication/specific roles

**API Client Abstraction:**
- Purpose: Centralized, typed HTTP communication
- Location: `frontend/src/lib/api.ts`
- Features: Axios interceptors for token injection, typed methods for all endpoints

## Entry Points

**Backend Entry:**
- Location: `backend/src/server.ts`
- Triggers: npm start, docker container startup
- Responsibilities:
  - Initialize Express app
  - Configure middleware (CORS, JSON parsing, cookies)
  - Initialize database schema on startup
  - Register all API routes
  - Start HTTP server on port 5000

**Frontend Entry:**
- Location: `frontend/src/main.tsx` → `frontend/src/App.tsx`
- Triggers: Vite dev server, nginx serves static build
- Responsibilities:
  - Bootstrap React application
  - Wrap with React Query provider
  - Set up AuthProvider and UserPreferencesProvider
  - Configure React Router with all routes

**Database Entry:**
- Location: `backend/src/database/init.sql` + migrations
- Triggers: First backend startup, manual migration scripts
- Responsibilities:
  - Create tables with UUID primary keys
  - Set up foreign key relationships
  - Initialize indexes

**Scripts:**
- Migration runner: `backend/src/scripts/runMigration.ts`
- Admin setup: `backend/src/scripts/updateSuperAdmin.ts`
- Test data: `backend/src/scripts/createSampleStaffPlans.ts`

## Error Handling

**Strategy:** Exception bubbling to top-level handler with try/catch at route boundaries

**Patterns:**
- Services throw Error with descriptive messages
- Route handlers wrap in try/catch blocks
- Errors returned as JSON: `{ error: 'Failed to...' }`
- Generic error messages (no specific error codes)
- Database errors logged but app continues (soft failure)

**Error Flow:**
1. Service throws error
2. Route handler catches in try/catch
3. Logs error with console.error
4. Returns 500/400 status with generic message
5. Frontend displays error toast/notification

## Cross-Cutting Concerns

**Logging:**
- Console-based (console.log, console.error)
- 340+ console statements across backend
- No structured logging framework
- Production: stdout/stderr captured by Azure App Service

**Validation:**
- Input validation in route handlers (manual checks)
- Zod schemas: `backend/src/types/index.ts`
- TypeScript types for compile-time safety
- Database constraints for data integrity

**Authentication:**
- JWT middleware on protected routes
- Pattern: `authenticate` middleware extracts/verifies token
- Authorization: `authorize(['admin'])` checks user roles
- Token storage: localStorage on frontend with interceptor injection

**File Processing:**
- Abstracted in `backend/src/utils/fileProcessor.ts`
- Supports: DOCX (mammoth), XLSX (xlsx), TXT, MD
- Multer middleware handles multipart uploads
- File size limit: 10MB (configurable)

---

*Architecture analysis: 2026-01-08*
*Update when major patterns change*
