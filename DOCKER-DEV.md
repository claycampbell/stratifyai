# Docker Development Setup with Hot Reload

This guide explains how to run the application in Docker with hot reload enabled for development.

## Quick Start

### Start Development Environment
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Stop Development Environment
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

## What's Different in Dev Mode?

### Backend (Port 5000)
- ✅ **Hot reload enabled** via `nodemon`
- ✅ Source code mounted from `./backend/src`
- ✅ Changes to TypeScript files automatically restart the server
- ✅ `NODE_ENV=development`

### Frontend (Port 5173)
- ✅ **Hot reload enabled** via Vite dev server
- ✅ Source code mounted from `./frontend/src`
- ✅ Changes to React/TypeScript files update instantly in browser
- ✅ Fast refresh preserves component state
- ✅ File polling enabled for Windows compatibility

### Database (Port 5432)
- Same as production (persistent data volume)

## Access Points

- **Frontend (Vite Dev Server)**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health
- **PostgreSQL**: localhost:5432

## How Hot Reload Works

### Backend
When you edit files in `backend/src/`:
1. Docker detects the change via volume mount
2. Nodemon automatically restarts the server
3. New code is loaded (~1-2 seconds)

### Frontend
When you edit files in `frontend/src/`:
1. Docker detects the change via volume mount
2. Vite's HMR (Hot Module Replacement) updates the browser
3. Changes appear instantly (< 1 second)
4. React Fast Refresh preserves component state when possible

## Important Notes

### File Watching on Windows
The configuration includes `usePolling: true` in Vite config, which is necessary for file watching to work properly in Docker on Windows. This may use slightly more CPU but ensures reliable hot reload.

### Node Modules
- `node_modules` directories are NOT mounted from host
- They remain inside the container for better performance
- If you add new packages, rebuild: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build`

### Environment Variables
Make sure your `.env` file is present in the root directory with:
```
GEMINI_API_KEY=your_api_key_here
```

## Production vs Development

### Use Development Mode When:
- Actively developing and testing features
- Need instant feedback on code changes
- Debugging issues
- Making frequent edits

### Use Production Mode When:
- Deploying to server
- Testing production build
- Performance testing
- Final QA before release

**Production command:**
```bash
docker-compose up -d
```

## Troubleshooting

### Hot Reload Not Working?
1. Make sure you're using the dev compose file
2. Check that volumes are mounted correctly: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml config`
3. Try rebuilding: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build`

### Port Conflicts?
If ports 5173, 5000, or 5432 are already in use:
1. Stop other services using those ports
2. Or modify the port mappings in `docker-compose.yml`

### Changes Not Appearing?
1. Check Docker logs: `docker-compose logs -f backend` or `docker-compose logs -f frontend`
2. Verify file was saved
3. Clear browser cache (Ctrl+Shift+R)

## Performance Tips

- **Windows Users**: Consider using WSL2 for better Docker performance
- **Volume Mounts**: Only essential files are mounted to minimize overhead
- **Node Modules**: Kept in container for faster module resolution

## Switching Between Modes

You can run production and development modes on the same machine, but not simultaneously (port conflicts).

Always stop one before starting the other:
```bash
# Stop production
docker-compose down

# Start development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```
