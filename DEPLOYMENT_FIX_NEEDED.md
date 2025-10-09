# Azure Deployment Status Update

## Current Status:

### ✅ Frontend Web App
- **Status**: WORKING
- **URL**: https://ogsm-frontend-webapp.azurewebsites.net
- The frontend is successfully running and serving the React application

### ❌ Backend Web App
- **Status**: FAILING - Container exits immediately
- **URL**: https://ogsm-backend-webapp.azurewebsites.net
- **Issue**: Container is not receiving environment variables properly

## Root Cause:

The App Service environment variables set via `az webapp config appsettings set` are not being passed into the container properly. The backend container is exiting because it cannot connect to the database (missing DB credentials).

## Fixes Needed:

### Option 1: Use Startup Command (Recommended)

Update the web app to pass environment variables through the startup command:

```bash
# Get current settings and save them
DB_HOST="ogsm-postgres-server.postgres.database.azure.com"
DB_USER="ogsmadmin"
DB_PASSWORD="OGSMPass2025!"
DB_NAME="ogsm_manager"
GEMINI_KEY="your_gemini_api_key_here"

# Configure startup command with environment variables
az webapp config set \
  --resource-group ogsm-platform-rg \
  --name ogsm-backend-webapp \
  --startup-file "sh -c 'export NODE_ENV=production && export PORT=8000 && export DB_HOST=$DB_HOST && export DB_PORT=5432 && export DB_NAME=$DB_NAME && export DB_USER=$DB_USER && export DB_PASSWORD=\"$DB_PASSWORD\" && export GEMINI_API_KEY=$GEMINI_KEY && export MAX_FILE_SIZE=10485760 && export UPLOAD_DIR=/app/uploads && node dist/server.js'"
```

### Option 2: Create .env File in Docker Image

Modify the backend Dockerfile to accept build arguments:

1. Update `backend/Dockerfile`:
```dockerfile
# Add after the production FROM statement
ARG DB_HOST
ARG DB_USER
ARG DB_PASSWORD
ARG DB_NAME
ARG GEMINI_API_KEY

ENV DB_HOST=$DB_HOST
ENV DB_USER=$DB_USER
ENV DB_PASSWORD=$DB_PASSWORD
ENV DB_NAME=$DB_NAME
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV DB_PORT=5432
ENV NODE_ENV=production
ENV MAX_FILE_SIZE=10485760
ENV UPLOAD_DIR=/app/uploads
```

2. Rebuild with build args:
```bash
az acr build \
  --registry ogsmplatformacr \
  --image ogsm-backend:latest \
  --build-arg DB_HOST=ogsm-postgres-server.postgres.database.azure.com \
  --build-arg DB_USER=ogsmadmin \
  --build-arg DB_PASSWORD="OGSMPass2025!" \
  --build-arg DB_NAME=ogsm_manager \
  --build-arg GEMINI_API_KEY="your_key_here" \
  ./backend
```

### Option 3: Use App Service Configuration (Simpler)

The app settings should work, but we need to ensure they're applied correctly:

```bash
# Delete and recreate the web app
az webapp delete --name ogsm-backend-webapp --resource-group ogsm-platform-rg --yes

# Recreate with proper configuration
az webapp create \
  --resource-group ogsm-platform-rg \
  --plan ogsm-appservice-plan \
  --name ogsm-backend-webapp \
  --deployment-container-image-name ogsmplatformacr.azurecr.io/ogsm-backend:latest

# Configure container registry
az webapp config container set \
  --name ogsm-backend-webapp \
  --resource-group ogsm-platform-rg \
  --docker-custom-image-name ogsmplatformacr.azurecr.io/ogsm-backend:latest \
  --docker-registry-server-url https://ogsmplatformacr.azurecr.io \
  --docker-registry-server-user ogsmplatformacr \
  --docker-registry-server-password '[REDACTED - Get from Azure Portal]'

# Set all environment variables as secure settings
az webapp config appsettings set \
  --resource-group ogsm-platform-rg \
  --name ogsm-backend-webapp \
  --settings \
    NODE_ENV="production" \
    PORT="8000" \
    WEBSITES_PORT="8000" \
    DB_HOST="ogsm-postgres-server.postgres.database.azure.com" \
    DB_PORT="5432" \
    DB_NAME="ogsm_manager" \
    DB_USER="ogsmadmin" \
    DB_PASSWORD="OGSMPass2025!" \
    GEMINI_API_KEY="PLACEHOLDER_ADD_YOUR_KEY" \
    MAX_FILE_SIZE="10485760" \
    UPLOAD_DIR="/app/uploads"

# Restart
az webapp restart --name ogsm-backend-webapp --resource-group ogsm-platform-rg
```

## Quick Test Commands:

```bash
# Check if backend starts
az webapp show \
  --name ogsm-backend-webapp \
  --resource-group ogsm-platform-rg \
  --query "state"

# View logs
az webapp log tail \
  --name ogsm-backend-webapp \
  --resource-group ogsm-platform-rg

# Test health endpoint
curl https://ogsm-backend-webapp.azurewebsites.net/health
```

## Current Working Components:

1. ✅ Container Registry with both images
2. ✅ PostgreSQL Database (running in Central US)
3. ✅ Storage Account with uploads file share
4. ✅ Frontend Web App (fully functional)
5. ❌ Backend Web App (needs environment variable fix)

Once the backend is fixed, your full application stack will be operational!
