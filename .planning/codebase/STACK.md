# Technology Stack

**Analysis Date:** 2026-01-08

## Languages

**Primary:**
- TypeScript 5.3.3 - All application code (frontend and backend)
  - Backend: `backend/package.json`
  - Frontend: `frontend/package.json`
  - Backend config: `backend/tsconfig.json`
  - Frontend config: `frontend/tsconfig.json`

**Secondary:**
- SQL - PostgreSQL database schema and migrations
  - Schema: `backend/src/database/init.sql`
  - Migrations: `backend/src/database/migrations/`

## Runtime

**Environment:**
- Node.js 20-alpine - Specified in Docker containers
  - Backend: `backend/Dockerfile`
  - Frontend build: `frontend/Dockerfile`

**Package Manager:**
- npm - Using npm ci in Docker builds
  - Backend lockfile: `backend/package-lock.json`
  - Frontend lockfile: `frontend/package-lock.json`
  - Root lockfile: `package-lock.json`

## Frameworks

**Core:**
- Express.js 4.18.2 - Backend web application framework
  - Main server: `backend/src/server.ts`
- React 18.2.0 - Frontend UI framework
  - Entry: `frontend/src/main.tsx`
- React Router DOM 6.20.1 - Client-side routing

**Testing:**
- Jest 29.7.0 - Backend testing framework
- ts-jest 29.4.5 - TypeScript preprocessor for Jest
- Supertest 7.1.4 - HTTP assertion library
- No frontend testing framework configured

**Build/Dev:**
- Vite 5.0.8 - Frontend build tool and dev server
  - Config: `frontend/vite.config.ts`
- TypeScript Compiler (tsc) - Backend compilation
- Nodemon 3.0.2 - Backend development hot reload
- ts-node 10.9.2 - TypeScript execution for scripts

**Styling:**
- TailwindCSS 3.3.6 - CSS framework
  - Config: `frontend/tailwind.config.js`
- PostCSS 8.4.32 - CSS processing with Autoprefixer
  - Config: `frontend/postcss.config.js`

## Key Dependencies

**Critical:**
- openai 6.10.0 - OpenAI GPT-4o integration for AI features
  - Service: `backend/src/services/openaiService.ts`
  - Config: `backend/src/config/openai.ts`
- pg 8.11.3 - PostgreSQL client
  - Connection: `backend/src/config/database.ts`
- axios 1.6.2 - HTTP client for API communication
  - Frontend client: `frontend/src/lib/api.ts`
- @tanstack/react-query 5.14.2 - Data fetching and caching
  - Setup: `frontend/src/main.tsx`

**Authentication:**
- jsonwebtoken 9.0.2 - JWT token generation/verification
  - Middleware: `backend/src/middleware/auth.ts`
- bcryptjs 3.0.3 & bcrypt 6.0.0 - Password hashing
  - Usage: `backend/src/routes/auth.ts`

**Document Processing:**
- mammoth 1.6.0 - DOCX file parsing
  - Usage: `backend/src/utils/fileProcessor.ts`
- xlsx 0.18.5 & xlsx-js-style 1.2.0 - Excel file processing
  - Usage: `backend/src/utils/fileProcessor.ts`

**Infrastructure:**
- Express middleware: cors 2.8.5, cookie-parser 1.4.7, multer 1.4.5-lts.1
- Utilities: uuid 9.0.1, zod 4.1.13, dotenv 16.3.1

**UI & Visualization:**
- recharts 2.10.3 - Charting library
- lucide-react 0.298.0 - Icon library
- date-fns 3.0.0 - Date formatting utilities
- clsx 2.0.0 - Utility for className strings

## Configuration

**Environment:**
- .env files for environment variables
  - Root: `.env` (active)
  - Examples: `.env.example`, `backend/.env.example`
  - Frontend production: `frontend/.env.production`
- dotenv for backend environment variables
- Vite's import.meta.env for frontend (VITE_ prefix)
- Separate config modules per service: `backend/src/config/`

**Build:**
- Backend: `backend/tsconfig.json` (strict TypeScript)
- Frontend: `frontend/tsconfig.json`, `frontend/vite.config.ts`
- TailwindCSS: `frontend/tailwind.config.js`
- PostCSS: `frontend/postcss.config.js`

## Platform Requirements

**Development:**
- Any platform with Node.js 20+
- Docker Desktop recommended for consistent environment
- PostgreSQL 15+ (via Docker or local)

**Production:**
- Docker containers
  - Backend: Node.js 20-alpine
  - Frontend: nginx-alpine serving static build
  - Database: PostgreSQL 15-alpine
- Azure App Service - Application hosting
  - Backend URL: https://ogsm-backend-webapp.azurewebsites.net
  - Frontend URL: https://stratifyai.pro
- Azure Database for PostgreSQL - Database hosting
  - Server: ogsm-postgres-server.postgres.database.azure.com

---

*Stack analysis: 2026-01-08*
*Update after major dependency changes*
