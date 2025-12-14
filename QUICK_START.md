# Quick Start Guide - Feature Development

## For New Developers

### 1. Initial Setup (First Time Only)

```bash
# Clone repository
git clone <repository-url>
cd stratifyai

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# Set up environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Start with Docker
docker-compose up --build
```

**Verify setup:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000/health
- Database: postgres://localhost:5432

### 2. Pick Your First Task

**Go to**: [FEATURE_BOARD.md](FEATURE_BOARD.md)

**Phase 0 tasks are beginner-friendly:**
- P0-001: KPI Terminology (Good first task)
- P0-002: KPI Description Formatting (Frontend only)
- P0-004: KPI Dashboard Views (UI/UX focused)

### 3. Read the Spec

**Example**: If working on P0-001
1. Open `specs/P0-001-kpi-terminology.md`
2. Read the entire specification
3. Note the files you'll need to modify
4. Check dependencies

### 4. Create Your Branch

```bash
git checkout -b feature/P0-001-kpi-terminology
```

### 5. Make Your Changes

**Follow this order:**
1. Database changes first (if any)
2. Backend implementation
3. Frontend implementation
4. Tests
5. Documentation

### 6. Test Everything

```bash
# Backend tests
cd backend
npm test
npm run dev  # Manual testing

# Frontend tests
cd frontend
npm test
npm run dev  # Manual testing

# Integration test with Docker
docker-compose up --build
```

### 7. Commit and Push

```bash
git add .
git commit -m "feat(kpis): replace Lead with Ownership terminology"
git push origin feature/P0-001-kpi-terminology
```

### 8. Create Pull Request

1. Go to GitHub repository
2. Create pull request from your branch to `develop`
3. Fill out PR template with:
   - Feature ID (P0-001)
   - Summary of changes
   - Testing done
   - Screenshots (if UI changes)
4. Link to technical spec
5. Request review

### 9. Update Feature Board

After merge:
```markdown
# In FEATURE_BOARD.md, change:
### P0-001: KPI Terminology Updates 🔴
# To:
### P0-001: KPI Terminology Updates 🟢
```

---

## Daily Development Flow

### Morning
1. Pull latest code: `git pull origin develop`
2. Check feature board for priorities
3. Review any PR feedback
4. Plan today's work

### During Development
1. Make small, focused commits
2. Test frequently
3. Update feature board if status changes
4. Ask questions early if blocked

### End of Day
1. Push your work: `git push`
2. Update GitHub issue status
3. Comment on blockers or progress
4. Plan tomorrow's tasks

---

## Common Commands

### Git
```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Save work
git add .
git commit -m "your message"
git push origin feature/your-feature-name

# Update from main branch
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git merge develop
```

### Docker
```bash
# Start everything
docker-compose up

# Rebuild after code changes
docker-compose up --build

# Stop everything
docker-compose down

# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up
```

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Database migration
npm run migrate
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

---

## File Structure Reference

```
stratifyai/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic (Gemini, etc.)
│   │   ├── database/        # DB init scripts
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # API client, utilities
│   │   ├── types/           # TypeScript interfaces
│   │   └── App.tsx          # Main app component
│   └── package.json
├── specs/                   # Technical specifications
├── .github/
│   └── ISSUE_TEMPLATE/      # GitHub issue templates
├── FEATURE_BOARD.md         # Feature planning
├── DEVELOPMENT_WORKFLOW.md  # This guide
├── CLAUDE.md                # Project overview
└── docker-compose.yml       # Docker configuration
```

---

## Where to Find What

### "I need to..."

**Add a new API endpoint:**
- Backend: `backend/src/routes/` (create or modify route file)
- Register: `backend/src/index.ts`

**Create a new page:**
- Frontend: `frontend/src/pages/` (create page component)
- Add route: `frontend/src/App.tsx`

**Modify database schema:**
- Schema: `backend/src/database/init.sql`
- Types: Update `backend/src/types/index.ts`
- Migration: Create migration script if needed

**Add new API call from frontend:**
- API client: `frontend/src/lib/api.ts`
- Add typed method to API object

**Update AI prompts:**
- Service: `backend/src/services/geminiService.ts`
- Modify or add methods with new prompts

**Add new component:**
- Component: `frontend/src/components/`
- Import in page that uses it

**Update types/interfaces:**
- Backend: `backend/src/types/index.ts`
- Frontend: `frontend/src/types/index.ts`
- Keep them in sync!

---

## Troubleshooting Quick Fixes

### "Port already in use"
```bash
# Find and kill process
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

### "Cannot connect to database"
```bash
docker-compose down
docker-compose up -d postgres
# Wait 10 seconds for postgres to start
docker-compose up backend
```

### "Module not found"
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### "TypeScript errors"
```bash
# Regenerate types
npm run build

# Check versions match
cat backend/package.json | grep typescript
cat frontend/package.json | grep typescript
```

### "Tests failing"
```bash
# Clear test cache
npm test -- --clearCache

# Run specific test
npm test -- FileName.test.ts
```

---

## Getting Help

### Before Asking:
1. Check the technical spec (`specs/` directory)
2. Read CLAUDE.md for project context
3. Search existing GitHub issues
4. Check error logs: `docker-compose logs [service]`

### When Asking:
Include:
- What you're trying to do
- What you expected
- What actually happened
- Error messages (full text)
- What you've already tried

### Where to Ask:
- **GitHub Issues**: Feature questions, bugs, technical blockers
- **Pull Request Comments**: Code review questions
- **Team Chat**: Quick questions, status updates

---

## Pro Tips

### Development Speed
- Use hot reload: `npm run dev` (no need to restart)
- Test APIs with Thunder Client/Postman (save time)
- Use TypeScript auto-complete (Ctrl+Space)
- Create code snippets for common patterns

### Code Quality
- Run linter before committing: `npm run lint`
- Write tests as you go (not after)
- Keep commits small and focused
- Reread your code before committing

### Collaboration
- Update issues regularly (helps team know status)
- Ask for help when stuck (don't waste hours)
- Review others' PRs (learn from code)
- Share useful findings with team

---

## Phase 0 Feature Quick Reference

| ID | Feature | Effort | Files to Change |
|----|---------|--------|-----------------|
| P0-001 | KPI Terminology | Low | backend/routes/kpis.ts, frontend/components/KPI* |
| P0-002 | KPI Description Format | Low | frontend/components/KPIDetail.tsx |
| P0-003 | PDF Export | Medium | backend/routes/reports.ts, add PDF library |
| P0-004 | KPI Views | Low | frontend/pages/KPIs.tsx, add view components |
| P0-005 | Chat History UI | Low | frontend/components/Chat.tsx, add history panel |

**Estimated Phase 0 Total**: 50-66 hours (1-1.5 weeks for full team)

---

## Success Checklist

Before marking a feature complete:
- [ ] Code implemented per technical spec
- [ ] All tests written and passing
- [ ] Manual testing completed
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Feature board updated
- [ ] GitHub issues closed
- [ ] Deployed to staging/production
- [ ] Stakeholders notified

---

## Next Steps

1. Set up your development environment
2. Read [FEATURE_BOARD.md](FEATURE_BOARD.md)
3. Pick a Phase 0 task
4. Read its technical spec in `specs/`
5. Create your feature branch
6. Start coding!

**Remember**: Small, frequent commits are better than large, infrequent ones. Test often. Ask questions early. You've got this! 🚀
