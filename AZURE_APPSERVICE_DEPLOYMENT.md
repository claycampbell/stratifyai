# Azure App Service Deployment - COMPLETED

## Deployment Date: October 8, 2025

## ✅ Successfully Deployed Resources

### App Service Plan
- **Name**: ogsm-appservice-plan
- **SKU**: B1 (Basic)
- **Location**: East US
- **Status**: Ready

### Backend Web App
- **Name**: ogsm-backend-webapp
- **URL**: https://ogsm-backend-webapp.azurewebsites.net
- **Container Image**: ogsmplatformacr.azurecr.io/ogsm-backend:latest
- **Status**: Running
- **Health Endpoint**: https://ogsm-backend-webapp.azurewebsites.net/health

### Frontend Web App
- **Name**: ogsm-frontend-webapp
- **URL**: https://ogsm-frontend-webapp.azurewebsites.net
- **Container Image**: ogsmplatformacr.azurecr.io/ogsm-frontend:latest
- **Status**: Running

### PostgreSQL Database (from previous deployment)
- **Host**: ogsm-postgres-server.postgres.database.azure.com
- **Database**: ogsm_manager
- **User**: ogsmadmin
- **Location**: Central US

### Container Registry (from previous deployment)
- **Name**: ogsmplatformacr
- **Login Server**: ogsmplatformacr.azurecr.io

### Storage Account (from previous deployment)
- **Name**: ogsmstorageacct
- **File Share**: uploads

## 🔑 Next Steps - IMPORTANT

### 1. Add Your Gemini API Key

The backend is currently using a placeholder API key. Update it with your actual key:

```bash
az webapp config appsettings set \
  --resource-group ogsm-platform-rg \
  --name ogsm-backend-webapp \
  --settings GEMINI_API_KEY='your_actual_gemini_api_key_here'

# Restart the backend
az webapp restart --name ogsm-backend-webapp --resource-group ogsm-platform-rg
```

Or update via Azure Portal:
1. Go to https://portal.azure.com
2. Navigate to ogsm-backend-webapp
3. Settings → Configuration → Application settings
4. Find `GEMINI_API_KEY` and update the value
5. Click Save and restart the app

### 2. Test the Deployment

After adding the Gemini API key, test the application:

**Backend Health Check:**
```bash
curl https://ogsm-backend-webapp.azurewebsites.net/health
```

**Frontend:**
Open https://ogsm-frontend-webapp.azurewebsites.net in your browser

### 3. Configure CORS (if needed)

If you encounter CORS errors, update the backend CORS settings in `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: ['https://ogsm-frontend-webapp.azurewebsites.net']
}));
```

Then rebuild and redeploy:
```bash
az acr build --registry ogsmplatformacr --image ogsm-backend:latest ./backend
az webapp restart --name ogsm-backend-webapp --resource-group ogsm-platform-rg
```

## 📊 Resource Summary

| Resource | Name | URL | Status |
|----------|------|-----|--------|
| Frontend | ogsm-frontend-webapp | https://ogsm-frontend-webapp.azurewebsites.net | ✅ Running |
| Backend | ogsm-backend-webapp | https://ogsm-backend-webapp.azurewebsites.net | ✅ Running |
| Database | ogsm-postgres-server | ogsm-postgres-server.postgres.database.azure.com | ✅ Ready |
| Registry | ogsmplatformacr | ogsmplatformacr.azurecr.io | ✅ Ready |

## 💰 Estimated Monthly Costs

- **App Service Plan (B1)**: ~$13/month
- **PostgreSQL Flexible Server**: ~$15-30/month
- **Container Registry**: ~$5/month
- **Storage**: ~$1-5/month

**Total**: ~$35-55/month

## 🔧 Useful Management Commands

### View Application Logs
```bash
# Backend logs (live stream)
az webapp log tail --name ogsm-backend-webapp --resource-group ogsm-platform-rg

# Frontend logs
az webapp log tail --name ogsm-frontend-webapp --resource-group ogsm-platform-rg

# Download logs
az webapp log download --name ogsm-backend-webapp --resource-group ogsm-platform-rg
```

### Restart Applications
```bash
# Restart backend
az webapp restart --name ogsm-backend-webapp --resource-group ogsm-platform-rg

# Restart frontend
az webapp restart --name ogsm-frontend-webapp --resource-group ogsm-platform-rg
```

### Update Docker Images
```bash
# Rebuild backend
az acr build --registry ogsmplatformacr --image ogsm-backend:latest ./backend

# Rebuild frontend
az acr build --registry ogsmplatformacr --image ogsm-frontend:latest ./frontend

# App Service will automatically pull the latest image, or restart manually
az webapp restart --name ogsm-backend-webapp --resource-group ogsm-platform-rg
az webapp restart --name ogsm-frontend-webapp --resource-group ogsm-platform-rg
```

### View Configuration
```bash
# View backend settings
az webapp config appsettings list \
  --name ogsm-backend-webapp \
  --resource-group ogsm-platform-rg

# View frontend settings
az webapp config appsettings list \
  --name ogsm-frontend-webapp \
  --resource-group ogsm-platform-rg
```

### Scale Up/Down
```bash
# Scale to Standard tier (S1)
az appservice plan update \
  --name ogsm-appservice-plan \
  --resource-group ogsm-platform-rg \
  --sku S1

# Scale back to Basic (B1)
az appservice plan update \
  --name ogsm-appservice-plan \
  --resource-group ogsm-platform-rg \
  --sku B1
```

## 🗑️ Cleanup

To delete all resources:

```bash
# Delete everything
az group delete --name ogsm-platform-rg --yes --no-wait

# Or delete individual resources
az webapp delete --name ogsm-backend-webapp --resource-group ogsm-platform-rg
az webapp delete --name ogsm-frontend-webapp --resource-group ogsm-platform-rg
az appservice plan delete --name ogsm-appservice-plan --resource-group ogsm-platform-rg
```

## 🔐 Security Recommendations

1. **Enable HTTPS Only**
   ```bash
   az webapp update --name ogsm-backend-webapp --resource-group ogsm-platform-rg --https-only true
   az webapp update --name ogsm-frontend-webapp --resource-group ogsm-platform-rg --https-only true
   ```

2. **Use Managed Identity for ACR** (instead of passwords)
   ```bash
   az webapp identity assign --name ogsm-backend-webapp --resource-group ogsm-platform-rg
   ```

3. **Use Azure Key Vault for secrets**
   - Store database password and Gemini API key in Key Vault
   - Reference them in app settings using Key Vault references

4. **Enable Application Insights**
   ```bash
   az monitor app-insights component create \
     --app ogsm-insights \
     --location eastus \
     --resource-group ogsm-platform-rg
   ```

## 📝 Environment Variables

### Backend (ogsm-backend-webapp)
- `NODE_ENV`: production
- `PORT`: 8000
- `WEBSITES_PORT`: 8000
- `DB_HOST`: ogsm-postgres-server.postgres.database.azure.com
- `DB_PORT`: 5432
- `DB_NAME`: ogsm_manager
- `DB_USER`: ogsmadmin
- `DB_PASSWORD`: OGSMPass2025!
- `GEMINI_API_KEY`: **NEEDS TO BE UPDATED**
- `MAX_FILE_SIZE`: 10485760
- `UPLOAD_DIR`: /app/uploads

### Frontend (ogsm-frontend-webapp)
- `VITE_API_URL`: https://ogsm-backend-webapp.azurewebsites.net/api
- `WEBSITES_PORT`: 80

## ✅ Deployment Complete!

Your OGSM Platform is now deployed on Azure App Service. The applications may take 2-3 minutes to fully start up after deployment.

### Access Your Application:
- **Frontend**: https://ogsm-frontend-webapp.azurewebsites.net
- **Backend API**: https://ogsm-backend-webapp.azurewebsites.net
- **Health Check**: https://ogsm-backend-webapp.azurewebsites.net/health

**Remember to add your Gemini API key to enable all AI features!**
