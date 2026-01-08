# Codebase Structure

**Analysis Date:** 2026-01-08

## Directory Layout

```
c:/Users/ClayCampbell/Documents/GitHub/stratifyai/
├── backend/               # Backend Node.js API
├── frontend/              # Frontend React SPA
├── .github/               # GitHub Actions CI/CD
├── .husky/                # Git hooks
├── .planning/             # Planning documents (GSD)
├── deployments/           # Deployment artifacts
├── scripts/               # Root-level utility scripts
├── specs/                 # Project specifications
├── LogFiles/              # Log archives
├── docker-compose.yml     # Container orchestration
├── .env                   # Environment variables
├── CLAUDE.md              # Project instructions for AI
└── README.md              # Project documentation
```

## Directory Purposes

**backend/**
- Purpose: Node.js/Express API server
- Contains: TypeScript source code, compiled JavaScript in dist/
- Key files: `src/server.ts` (entry point)
- Subdirectories:
  - `src/` - Source code
  - `dist/` - Compiled JavaScript output
  - `uploads/` - User uploaded files
  - `node_modules/` - Dependencies

**backend/src/**
- Purpose: Backend source code
- Contains: TypeScript files organized by layer
- Subdirectories:
  - `config/` - Configuration files (database.ts, openai.ts, gemini.ts)
  - `database/` - Schema (init.sql) and migrations/
  - `middleware/` - Express middleware (auth.ts)
  - `routes/` - API route handlers (24 files)
  - `services/` - Business logic services (5 files)
  - `scripts/` - Utility scripts (10+ migration/setup scripts)
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions (fileProcessor.ts)

**frontend/**
- Purpose: React SPA application
- Contains: TypeScript/React source, production build in dist/
- Key files: `src/main.tsx` (entry), `src/App.tsx` (root component)
- Subdirectories:
  - `src/` - Source code
  - `dist/` - Production build output
  - `public/` - Static assets
  - `node_modules/` - Dependencies

**frontend/src/**
- Purpose: Frontend source code
- Contains: React components, pages, contexts, utilities
- Subdirectories:
  - `components/` - Reusable UI components (26 files)
  - `pages/` - Route page components (18 files)
  - `contexts/` - React Context providers (AuthContext, UserPreferencesContext)
  - `lib/` - Shared utilities (api.ts, formatters.ts)
  - `services/` - Frontend business logic (aiActions.ts)
  - `types/` - TypeScript definitions

**.planning/**
- Purpose: Project planning documents (GSD system)
- Contains: Codebase documentation
- Subdirectories:
  - `codebase/` - Generated codebase maps

**.github/**
- Purpose: GitHub Actions workflows
- Contains: CI/CD workflow definitions
- Key files: `workflows/azure-deploy.yml`

## Key File Locations

**Entry Points:**
- Backend: `backend/src/server.ts` - Express server initialization
- Frontend: `frontend/src/main.tsx` - React bootstrap
- Frontend root: `frontend/src/App.tsx` - App component with routing
- HTML entry: `frontend/index.html` - Root HTML file

**Configuration:**
- Environment: `.env`, `.env.example`, `backend/.env.example`, `frontend/.env.production`
- TypeScript: `backend/tsconfig.json`, `frontend/tsconfig.json`
- Vite: `frontend/vite.config.ts`
- TailwindCSS: `frontend/tailwind.config.js`
- PostCSS: `frontend/postcss.config.js`
- Docker: `docker-compose.yml`, `docker-compose.dev.yml`
- Nginx: `frontend/nginx.conf`

**Core Logic:**
- Backend routes: `backend/src/routes/*.ts` (24 route files)
- Backend services: `backend/src/services/*.ts` (openaiService, kpiService, philosophyService, aiStrategyService, geminiService)
- Backend middleware: `backend/src/middleware/auth.ts`
- Backend utilities: `backend/src/utils/fileProcessor.ts`
- Frontend API client: `frontend/src/lib/api.ts`
- Frontend pages: `frontend/src/pages/*.tsx` (Dashboard, KPIs, Documents, etc.)
- Frontend components: `frontend/src/components/*.tsx` (Layout, AIChatBubble, etc.)

**Database:**
- Schema: `backend/src/database/init.sql`
- Migrations: `backend/src/database/migrations/*.sql` (001-007+)
- Seeds: `backend/src/database/seedKPITemplates.sql`, `backend/src/database/seedStrategies.ts`

**Testing:**
- Backend tests: `backend/src/routes/__tests__/users.impersonation.test.ts` (only test file found)
- Frontend tests: None detected

**Documentation:**
- Project: `README.md`, `CLAUDE.md`
- Features: Various .md files in root (AI_CHAT_BUBBLE.md, KPI_ENHANCEMENTS.md, etc.)
- Deployment: Multiple deployment-*.md files
- Specs: `specs/` directory

**Build Artifacts:**
- Backend compiled: `backend/dist/`
- Frontend build: `frontend/dist/`
- Docker images: Built via Dockerfiles

## Naming Conventions

**Files:**
- Backend routes: lowercase no separator - `kpis.ts`, `auth.ts`, `documents.ts`
- Backend services: camelCase with Service suffix - `openaiService.ts`, `kpiService.ts`
- Backend config: camelCase - `database.ts`, `openai.ts`
- Backend scripts: camelCase verb+noun - `runMigration.ts`, `createTestUser.ts`
- Frontend components: PascalCase.tsx - `Layout.tsx`, `AIChatBubble.tsx`
- Frontend pages: PascalCase.tsx - `Dashboard.tsx`, `KPIs.tsx`
- Frontend utilities: camelCase.ts - `api.ts`, `formatters.ts`
- Frontend contexts: PascalCase+Context.tsx - `AuthContext.tsx`
- Database migrations: ###_snake_case.sql - `001_add_user_id_to_chat_history.sql`

**Directories:**
- Backend/Frontend: camelCase - `routes/`, `services/`, `components/`
- Root: kebab-case - `.planning/`, `.github/`

**Special Patterns:**
- Entry point: `server.ts`, `main.tsx`, `App.tsx`
- Config: `*.config.ts`, `*.config.js`
- Types: `index.ts` in `types/` directory
- Tests: `*.test.ts` in `__tests__/` subdirectory

## Where to Add New Code

**New API Endpoint:**
- Primary code: `backend/src/routes/{entity}.ts` (create if needed)
- Types: Add interface to `backend/src/types/index.ts`
- Frontend client: Add method to `frontend/src/lib/api.ts`
- Tests: `backend/src/routes/__tests__/{entity}.test.ts`

**New Service/Business Logic:**
- Implementation: `backend/src/services/{name}Service.ts`
- Config if needed: `backend/src/config/{name}.ts`
- Types: `backend/src/types/index.ts`
- Tests: `backend/src/services/__tests__/{name}Service.test.ts` (create tests directory)

**New Frontend Page:**
- Implementation: `frontend/src/pages/{PageName}.tsx`
- Route: Add to `frontend/src/App.tsx`
- Navigation: Update `frontend/src/components/Layout.tsx` if needed
- Types: `frontend/src/types/index.ts`

**New Frontend Component:**
- Implementation: `frontend/src/components/{ComponentName}.tsx`
- Import in pages that use it
- Types: `frontend/src/types/index.ts`

**Database Schema Change:**
- Create migration: `backend/src/database/migrations/{###}_{description}.sql`
- Update types: `backend/src/types/index.ts` and `frontend/src/types/index.ts`
- Create script: `backend/src/scripts/run{Name}Migration.ts` if complex

**Utilities:**
- Backend shared helpers: `backend/src/utils/{name}.ts`
- Frontend shared helpers: `frontend/src/lib/{name}.ts`
- Type definitions: `*/src/types/index.ts`

## Special Directories

**backend/dist/**
- Purpose: Compiled TypeScript output
- Source: Built via `tsc` from `backend/src/`
- Committed: No (in .gitignore)

**frontend/dist/**
- Purpose: Production build output
- Source: Built via `tsc && vite build`
- Committed: No (in .gitignore)

**backend/uploads/**
- Purpose: User uploaded documents
- Source: Multer file uploads
- Committed: No (in .gitignore)
- Docker: Persisted via docker volume

**backend/src/database/migrations/**
- Purpose: Incremental schema changes
- Source: Manually created SQL files
- Committed: Yes
- Numbering: Sequential (001, 002, 003, etc.)

**.planning/codebase/**
- Purpose: Generated codebase documentation
- Source: Created by /gsd:map-codebase command
- Committed: Should be committed for team reference
- Files: STACK.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md

**node_modules/**
- Purpose: npm dependencies
- Source: Installed via npm install/ci
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-01-08*
*Update when directory structure changes*
