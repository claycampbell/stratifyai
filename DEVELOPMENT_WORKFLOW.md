# Development Workflow

This document outlines the development workflow for implementing features from the feature board.

---

## Project Management Structure

### Feature Board
- **Location**: [FEATURE_BOARD.md](FEATURE_BOARD.md)
- **Purpose**: High-level overview of all planned features organized by phase
- **Updates**: Weekly review and prioritization

### Technical Specifications
- **Location**: `specs/` directory
- **Purpose**: Detailed implementation requirements for each feature
- **Format**: One spec per feature (e.g., `P0-001-kpi-terminology.md`)

### GitHub Issues
- **Purpose**: Track individual tasks and bugs
- **Labels**: Use phase labels (phase-0, phase-1, etc.) and component labels (frontend, backend, etc.)
- **Templates**: Use appropriate issue template (Feature, Bug, Task)

---

## Development Phases

### Phase 0: Quick Wins (2-4 weeks)
**Focus**: High-impact, low-effort improvements
**Goal**: Build momentum and deliver immediate value
**Features**: 5 features (50-66 hours)

### Phase 1: Core Features (2-3 months)
**Focus**: Essential functionality for multi-user deployment
**Goal**: Enable full organizational rollout
**Features**: 6 features (320-466 hours)

### Phase 2: Integrations (3-4 months)
**Focus**: Connect external systems and data sources
**Goal**: Streamline workflows and data flow
**Features**: 6 features (340-450 hours)

### Phase 3: Advanced Features (4-6 months)
**Focus**: Collaboration, analytics, and advanced tooling
**Goal**: Comprehensive platform capabilities
**Features**: 8 features (356-534 hours)

---

## Workflow Process

### 1. Feature Planning

**Before starting any feature:**
1. Review feature in [FEATURE_BOARD.md](FEATURE_BOARD.md)
2. Read technical specification in `specs/` directory
3. Check dependencies and blockers
4. Create GitHub issues for implementation tasks

**Issue Creation:**
```bash
# For each feature, create issues for:
- Backend implementation
- Frontend implementation
- Database migrations
- Testing
- Documentation
```

### 2. Implementation

**Development Steps:**
1. Create feature branch: `git checkout -b feature/P0-001-kpi-terminology`
2. Update feature status in FEATURE_BOARD.md to 🟡 In Progress
3. Implement following technical spec
4. Write tests (unit, integration, manual)
5. Update documentation (code comments, README, CLAUDE.md)

**Code Standards:**
- Follow TypeScript strict mode
- Use existing patterns from codebase
- Add JSDoc comments to public APIs
- Ensure proper error handling
- Log important operations

**Git Commits:**
```bash
# Use conventional commit format
feat(kpis): replace Lead with Ownership terminology
fix(auth): handle expired JWT tokens correctly
docs(specs): add P1-004 day plans specification
test(kpis): add unit tests for ownership field
```

### 3. Testing

**Required Tests:**
- [ ] **Unit Tests**: All new functions/methods
- [ ] **Integration Tests**: API endpoints, database operations
- [ ] **Manual Tests**: User flows, UI/UX validation
- [ ] **Security Tests**: Authentication, authorization, input validation
- [ ] **Migration Tests**: Database schema changes

**Testing Checklist:**
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Docker integration test
docker-compose up --build
# Manually test feature
```

### 4. Code Review

**Self-Review Checklist:**
- [ ] Code follows project conventions
- [ ] All tests passing
- [ ] No console.log or debug code
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Accessibility guidelines followed (frontend)

**Review Process:**
1. Create pull request with detailed description
2. Link to feature spec and related issues
3. Request review from team lead
4. Address feedback
5. Merge when approved

### 5. Deployment

**Deployment Checklist:**
- [ ] All tests passing
- [ ] Database migrations ready
- [ ] Environment variables documented
- [ ] Rollback plan prepared
- [ ] Monitoring/logging in place

**Deployment Steps:**
```bash
# 1. Run database migrations
npm run migrate

# 2. Build and deploy backend
cd backend
npm run build
docker-compose up -d backend

# 3. Build and deploy frontend
cd frontend
npm run build
docker-compose up -d frontend

# 4. Verify deployment
curl http://localhost:5000/health
curl http://localhost:3000
```

### 6. Feature Completion

**After deployment:**
1. Update feature status in FEATURE_BOARD.md to 🟢 Completed
2. Close all related GitHub issues
3. Update user documentation
4. Notify stakeholders
5. Monitor for issues

---

## Branch Strategy

### Main Branches
- **`main`**: Production-ready code
- **`develop`**: Integration branch for features

### Feature Branches
- **Format**: `feature/P0-001-description`
- **Lifetime**: Duration of feature development
- **Merge**: Into `develop` via pull request

### Hotfix Branches
- **Format**: `hotfix/critical-bug-description`
- **Merge**: Directly into `main` and `develop`

### Example:
```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/P0-001-kpi-terminology

# Work on feature
git add .
git commit -m "feat(kpis): update database schema for ownership"
git push origin feature/P0-001-kpi-terminology

# Create pull request on GitHub
# After review and approval
git checkout develop
git merge feature/P0-001-kpi-terminology
git push origin develop

# Clean up
git branch -d feature/P0-001-kpi-terminology
```

---

## Issue Labels

### Priority Labels
- `priority-critical`: Must be fixed immediately
- `priority-high`: Important, schedule soon
- `priority-medium`: Normal priority
- `priority-low`: Nice to have

### Phase Labels
- `phase-0`: Quick wins
- `phase-1`: Core features
- `phase-2`: Integrations
- `phase-3`: Advanced features

### Component Labels
- `frontend`: React/TypeScript UI
- `backend`: Node.js/Express API
- `database`: PostgreSQL schema/queries
- `ai`: Gemini integration
- `docs`: Documentation
- `devops`: Docker, deployment

### Type Labels
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `task`: Implementation task
- `tech-debt`: Code cleanup/refactoring
- `security`: Security-related issue

### Status Labels
- `needs-triage`: Needs initial review
- `needs-spec`: Needs technical specification
- `in-progress`: Currently being worked on
- `blocked`: Cannot proceed due to dependency
- `ready-for-review`: Pull request ready
- `ready-for-test`: Ready for QA testing

---

## Sprint Planning

### Weekly Sprint Cycle

**Monday: Sprint Planning**
- Review feature board priorities
- Select features/tasks for week
- Create/assign GitHub issues
- Set sprint goals

**Tuesday-Thursday: Development**
- Implement features
- Daily standup (async or sync)
- Update issue status
- Code reviews

**Friday: Review & Retrospective**
- Demo completed features
- Merge approved pull requests
- Update feature board
- Retrospective discussion
- Plan next sprint

---

## Communication

### Daily Updates
Share in team channel:
- What you completed yesterday
- What you're working on today
- Any blockers or questions

### Feature Updates
When feature status changes:
- Update FEATURE_BOARD.md
- Comment on related GitHub issues
- Notify stakeholders if customer-facing

### Blockers
If blocked:
1. Document the blocker in GitHub issue
2. Update issue with `blocked` label
3. Notify team immediately
4. Propose solutions or alternatives

---

## Quality Standards

### Code Quality
- **Coverage**: Aim for 80%+ test coverage
- **Linting**: No ESLint errors
- **TypeScript**: Strict mode, no `any` types
- **Performance**: Page load < 2s, API response < 500ms

### Security Standards
- No hardcoded secrets
- Input validation on all endpoints
- Parameterized SQL queries
- JWT token authentication
- HTTPS in production
- Security headers configured

### Documentation Standards
- All public APIs documented
- README updated with new features
- CLAUDE.md updated for AI assistance
- Technical specs for major features
- Inline comments for complex logic

---

## Tools & Resources

### Development Tools
- **IDE**: VS Code with TypeScript, ESLint plugins
- **API Testing**: Postman, Thunder Client
- **Database**: pgAdmin, psql CLI
- **Git**: GitHub Desktop or CLI
- **Docker**: Docker Desktop

### Documentation
- [CLAUDE.md](CLAUDE.md) - Project overview and AI guidance
- [FEATURE_BOARD.md](FEATURE_BOARD.md) - Feature planning and tracking
- [specs/](specs/) - Technical specifications
- [README.md](README.md) - Setup and usage instructions

### External Resources
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Google Gemini API](https://ai.google.dev/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Troubleshooting

### Common Issues

**Docker build fails:**
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

**Database connection errors:**
```bash
# Check PostgreSQL is running
docker-compose ps
# View logs
docker-compose logs postgres
# Reset database
docker-compose down -v
docker-compose up -d
```

**Frontend not updating:**
```bash
# Clear build cache
cd frontend
rm -rf node_modules .vite
npm install
npm run dev
```

**TypeScript errors:**
```bash
# Regenerate types
npm run build
# Check for version mismatches
npm list typescript
```

---

## Questions?

If you have questions about:
- **Feature requirements**: Check technical spec in `specs/`
- **Implementation approach**: Review CLAUDE.md and existing code patterns
- **Priority/scheduling**: Check FEATURE_BOARD.md or ask team lead
- **Technical issues**: Create GitHub issue with details

---

## Next Steps

1. Review [FEATURE_BOARD.md](FEATURE_BOARD.md) for current priorities
2. Read technical specs for features you'll work on
3. Set up development environment (see README.md)
4. Join team communication channels
5. Pick your first task and start coding!
