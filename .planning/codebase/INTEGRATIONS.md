# External Integrations

**Analysis Date:** 2026-01-08

## APIs & External Services

**AI/ML Services:**
- OpenAI GPT-4o - AI-powered strategic analysis, OGSM extraction, chat
  - SDK/Client: openai npm package 6.10.0
  - Auth: API key in OPENAI_API_KEY env var
  - Service: `backend/src/services/openaiService.ts`
  - Config: `backend/src/config/openai.ts`
  - Model: 'gpt-4o'
  - Features: OGSM extraction, KPI analysis, chat with function calling, strategic alignment, progress reports, philosophy-aware recommendations
  - API Routes: `backend/src/routes/ai.ts`

- Google Gemini 2.0 Flash (Legacy - Deprecated)
  - SDK/Client: @google/generative-ai 0.21.0
  - Auth: GEMINI_API_KEY env var
  - Service: `backend/src/services/geminiService.ts`
  - Config: `backend/src/config/gemini.ts`
  - Status: Being migrated from, but still present in codebase
  - Note: Some routes still reference geminiService despite migration notes

**External APIs:**
- None (OpenAI is primary external API)

## Data Storage

**Databases:**
- PostgreSQL 15-alpine - Primary data store
  - Connection: via DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD env vars
  - Client: pg 8.11.3
  - Config: `backend/src/config/database.ts`
  - Schema: `backend/src/database/init.sql`
  - Migrations: `backend/src/database/migrations/`
  - Azure Support: SSL enabled for Azure Database for PostgreSQL
  - Detection: Checks for "postgres.database.azure.com" in DB_HOST

**File Storage:**
- Local File System - Document uploads (DOCX, XLSX, TXT, MD)
  - Library: multer 1.4.5-lts.1
  - Upload directory: UPLOAD_DIR env var (default: 'uploads')
  - Max file size: MAX_FILE_SIZE env var (default: 10MB)
  - Processing: `backend/src/utils/fileProcessor.ts`
  - Docker volume: backend_uploads mounted at /app/uploads

**Caching:**
- None currently implemented

## Authentication & Identity

**Auth Provider:**
- JSON Web Tokens (JWT) - Custom implementation
  - Library: jsonwebtoken 9.0.2
  - Middleware: `backend/src/middleware/auth.ts`
  - Auth routes: `backend/src/routes/auth.ts`
  - Token types: Access tokens (24h), Refresh tokens (7d)
  - Storage: localStorage on frontend (`frontend/src/lib/api.ts`)

**Password Security:**
- bcryptjs 3.0.3 - Password hashing with salt rounds: 10
- JWT_SECRET environment variable required

**Authorization:**
- Role-Based Access Control (RBAC)
  - Database-driven with roles and permissions tables
  - Roles: super_admin, admin, manager, staff
  - Middleware: authenticate and authorize checks

**OAuth Integrations:**
- None detected

## Monitoring & Observability

**Error Tracking:**
- None (console.log only)

**Analytics:**
- None detected

**Logs:**
- Console-based logging (stdout/stderr)
  - 340+ console.log statements across 33 backend files
  - No structured logging framework
  - Production: Azure App Service logs

## CI/CD & Deployment

**Hosting:**
- Microsoft Azure - Cloud hosting platform
  - Azure App Service (Web Apps) for application hosting
    - Backend: https://ogsm-backend-webapp.azurewebsites.net
    - Frontend: https://stratifyai.pro
  - Azure Database for PostgreSQL
    - Server: ogsm-postgres-server.postgres.database.azure.com
  - Deployment: GitHub Actions workflow (`.github/workflows/azure-deploy.yml`)

**CI Pipeline:**
- GitHub Actions - Deployment automation
  - Workflows: Azure deployment
  - Container Registry: Azure Container Registry (ACR)

**Containerization:**
- Docker - Application containerization
  - Backend Dockerfile: `backend/Dockerfile` (multi-stage build)
  - Frontend Dockerfile: `frontend/Dockerfile` (multi-stage with nginx)
  - Orchestration: `docker-compose.yml`, `docker-compose.dev.yml`
  - Production web server: nginx-alpine for frontend static assets

## Environment Configuration

**Development:**
- Required env vars: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, OPENAI_API_KEY
- Secrets location: .env files (gitignored)
- Docker Compose: Default Postgres credentials for local development
- Vite dev server: HMR with polling-based file watching for Docker on Windows

**Staging:**
- Not detected (no staging-specific configuration found)

**Production:**
- Secrets management: Azure App Service environment variables
- Database: Azure Database for PostgreSQL with SSL
- Frontend: Static build served by nginx
- Environment file: `frontend/.env.production`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Frontend API Communication

**HTTP Client:**
- axios 1.6.2 - HTTP client
  - Base URL: VITE_API_URL env var (default: http://localhost:5000/api)
  - Centralized client: `frontend/src/lib/api.ts`
  - Features: JWT token injection via request interceptor, typed API methods, FormData support

**State Management:**
- TanStack Query (React Query) 5.14.2 - Server state management
  - Setup: `frontend/src/main.tsx`
  - Disabled refetch on window focus
  - 1 retry attempt

## Development Tools

**Hot Reload:**
- Backend: nodemon 3.0.2 with ts-node
- Frontend: Vite dev server with HMR
- Docker: Polling-based file watching (`frontend/vite.config.ts`)

**Linting:**
- Frontend: ESLint 8.55.0 with TypeScript plugins
- Backend: Placeholder lint script (no real linting)

---

*Integration audit: 2026-01-08*
*Update when adding/removing external services*
