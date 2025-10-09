# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Powered OGSM Management Platform for Robert Morris University Athletics. An AI Chief Strategy Officer that helps organizations manage strategic plans using the OGSM (Objectives, Goals, Strategies, Measures) framework with Google Gemini AI integration.

**Tech Stack:**
- Backend: Node.js + Express + TypeScript + PostgreSQL
- Frontend: React 18 + TypeScript + Vite + TailwindCSS
- AI: Google Gemini (gemini-2.0-flash-exp model)
- Infrastructure: Docker + Docker Compose

## Development Commands

### Backend (from `backend/` directory)
```bash
npm run dev       # Start development server with hot reload (nodemon)
npm run build     # Compile TypeScript to JavaScript
npm start         # Run production build
npm run migrate   # Run database migrations (if needed)
```

### Frontend (from `frontend/` directory)
```bash
npm run dev       # Start Vite dev server (typically http://localhost:5173)
npm run build     # Build for production (TypeScript compilation + Vite build)
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Docker Deployment (from project root)
```bash
docker-compose up -d          # Start all services in background
docker-compose up --build     # Rebuild and start
docker-compose down           # Stop all services
docker-compose logs backend   # View backend logs
docker-compose logs frontend  # View frontend logs
docker-compose logs postgres  # View database logs
docker-compose restart        # Restart all services
```

**Note:** When running with Docker, the frontend is accessible at http://localhost:3000 and backend at http://localhost:5000. For local development without Docker, frontend typically runs on http://localhost:5173.

## Architecture

### Monorepo Structure
- `backend/` - Express API server with TypeScript
- `frontend/` - React SPA with Vite build system
- Project is containerized with separate Dockerfiles per service

### Database Schema (PostgreSQL)
All tables use UUID primary keys. Key tables:
- `documents` - Uploaded strategic documents
- `ogsm_components` - OGSM framework components (objectives, goals, strategies, measures)
- `kpis` - Key Performance Indicators with tracking
- `kpi_history` - Historical KPI data for trend analysis
- `chat_history` - AI conversation logs
- `strategic_reports` - Generated reports (30/60/90-day progress)

The `ogsm_components` table has a self-referential `parent_id` for hierarchical relationships. Database schema is auto-initialized on first backend startup from `backend/src/database/init.sql`.

### AI Integration Architecture
The `GeminiService` class (`backend/src/services/geminiService.ts`) is the core AI integration point:
- Uses Google Gemini `gemini-2.0-flash-exp` model
- Handles OGSM extraction from documents
- Provides conversational AI chat with system context
- Generates strategic analysis and reports
- All AI features require structured prompts that return JSON or markdown

**Key methods:**
- `extractOGSMFromText()` - Parses documents to extract strategic components
- `extractKPIsFromText()` - Identifies KPIs from documents
- `chatWithActionSupport()` - Context-aware chat with current KPIs/OGSM state
- `analyzeStrategicAlignment()` - Analyzes alignment between objectives/goals/strategies
- `generateProgressReport()` - Creates formatted progress reports

### API Routes
Backend routes are in `backend/src/routes/`:
- `/api/documents` - Document upload and management
- `/api/ogsm` - OGSM components CRUD + hierarchy view
- `/api/kpis` - KPI management, history, stats, forecasting
- `/api/ai` - AI chat, analysis, report generation, recommendations

Frontend API client is centralized in `frontend/src/lib/api.ts` using axios with typed methods.

### Frontend Routing
Single-page app with React Router:
- `/` - Dashboard (main view)
- `/documents` - Document management
- `/ogsm` - OGSM framework view
- `/kpis` - KPI tracking and analytics
- `/reports` - Report generation and history

Layout component (`components/Layout.tsx`) provides consistent navigation across all pages.

### Document Processing
Supports DOCX, XLSX, TXT, MD formats via:
- `mammoth` for DOCX parsing
- `xlsx` for spreadsheet processing
- Raw text extraction for TXT/MD
- Files processed in `backend/src/utils/fileProcessor.ts`
- Extracted text is sent to Gemini for OGSM/KPI extraction

## Environment Configuration

Required environment variables (see `.env.example`):
- `GEMINI_API_KEY` - **Required** - Google Gemini API key from https://makersuite.google.com/app/apikey
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection (defaults work for Docker)
- `PORT` - Backend port (default: 5000)
- `VITE_API_URL` - Frontend API URL (default: http://localhost:5000/api)

**Setup:** Copy `.env.example` to `.env` and add your Gemini API key before running.

## Key Development Patterns

### Adding New AI Features
1. Add method to `GeminiService` class with appropriate prompt engineering
2. Parse JSON responses from Gemini (match with regex: `/\[[\s\S]*\]/` or `/\{[\s\S]*\}/`)
3. Create route handler in `backend/src/routes/ai.ts`
4. Add API method in `frontend/src/lib/api.ts`
5. Integrate in relevant frontend page component

### Database Changes
- Update `backend/src/database/init.sql` with new tables/columns
- Add corresponding TypeScript types in `backend/src/types/index.ts` and `frontend/src/types/index.ts`
- Database initializes automatically on backend startup

### Type Safety
Both frontend and backend use TypeScript. Shared types should be duplicated between:
- `backend/src/types/index.ts`
- `frontend/src/types/index.ts`

Common types: `OGSMComponent`, `KPI`, `Document`, `AIAnalysisResponse`

## Testing the Application

After starting services:
1. Check health: http://localhost:5000/health
2. Upload a strategic planning document via Documents page
3. View auto-extracted OGSM components in OGSM page
4. Create/track KPIs in KPIs page
5. Chat with AI Strategy Officer in Dashboard
6. Generate reports in Reports page

## Known Considerations

- The Gemini API has rate limits on the free tier
- File uploads are limited to 10MB (configurable via `MAX_FILE_SIZE`)
- Database schema auto-initializes but doesn't include migrations for schema changes
- Chat history is persisted but not automatically cleaned up
- Frontend assumes backend is running and accessible (no robust offline handling)
