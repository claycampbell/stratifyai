# Azure Quick Start Guide

Deploy the OGSM Platform to Azure in just a few steps!

## Prerequisites

1. **Azure subscription** - [Create a free account](https://azure.microsoft.com/free/)
2. **Azure CLI** - [Install guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Docker** - [Install guide](https://docs.docker.com/get-docker/)
4. **Gemini API Key** - [Get one here](https://makersuite.google.com/app/apikey)

## Quick Deploy

### Option 1: Automated Script (Recommended)

#### On Windows (PowerShell):
```powershell
.\deploy-azure.ps1
```

#### On Linux/Mac:
```bash
chmod +x deploy-azure.sh
./deploy-azure.sh
```

The script will prompt you for:
- Resource Group name (default: `ogsm-platform-rg`)
- Azure region (default: `eastus`)
- Database admin password
- Gemini API key

**Deployment takes approximately 10-15 minutes.**

### Option 2: Manual Deployment

See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for detailed step-by-step instructions.

## What Gets Deployed

The script automatically creates:
- ✅ Azure Container Registry (for Docker images)
- ✅ PostgreSQL Flexible Server (managed database)
- ✅ Storage Account (for file uploads)
- ✅ Backend Container Instance (API server)
- ✅ Frontend Container Instance (React app)

## After Deployment

1. **Access your application**
   - URLs are displayed at the end of deployment
   - Also saved in `deployment-info.txt`

2. **Wait for initialization**
   - Containers may take 2-3 minutes to fully start
   - Database schema initializes automatically on first run

3. **Verify deployment**
   ```bash
   # Check backend health
   curl http://your-backend-url:5000/health

   # View container logs
   az container logs --resource-group ogsm-platform-rg --name ogsm-backend
   ```

## Troubleshooting

### Frontend shows "Cannot connect to backend"
The frontend container might have started before the backend URL was ready. Restart it:
```bash
az container restart --resource-group ogsm-platform-rg --name ogsm-frontend
```

### Database connection errors
Check PostgreSQL firewall rules allow Azure services:
```bash
az postgres flexible-server firewall-rule create \
  --resource-group ogsm-platform-rg \
  --name ogsm-postgres-server \
  --rule-name AllowAllAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Container won't start
View detailed logs:
```bash
az container logs --resource-group ogsm-platform-rg --name ogsm-backend --follow
```

## Managing Your Deployment

### View Logs
```bash
# Backend logs
az container logs --resource-group ogsm-platform-rg --name ogsm-backend --follow

# Frontend logs
az container logs --resource-group ogsm-platform-rg --name ogsm-frontend --follow
```

### Restart Services
```bash
# Restart backend
az container restart --resource-group ogsm-platform-rg --name ogsm-backend

# Restart frontend
az container restart --resource-group ogsm-platform-rg --name ogsm-frontend
```

### Update Application
After making code changes:
```bash
# Rebuild and redeploy (script handles this automatically)
./deploy-azure.sh

# Or manually:
# 1. Build and push new images
# 2. Restart containers
```

### Delete Everything
```bash
az group delete --name ogsm-platform-rg --yes
```
⚠️ This deletes all resources including database data!

## Estimated Costs

- **Container Instances**: ~$30-50/month
- **PostgreSQL**: ~$15-30/month
- **Container Registry**: ~$5/month
- **Storage**: ~$1-5/month

**Total**: ~$50-90/month

Stop containers when not in use to save costs:
```bash
az container stop --resource-group ogsm-platform-rg --name ogsm-backend
az container stop --resource-group ogsm-platform-rg --name ogsm-frontend
```

## Next Steps

- ✅ Upload your strategic planning documents
- ✅ Explore the OGSM framework
- ✅ Track KPIs and metrics
- ✅ Chat with the AI Strategy Officer
- ✅ Generate progress reports

## Production Setup

For production deployments, consider:
1. **Custom domain** with SSL certificate
2. **Azure Key Vault** for secrets
3. **Application Insights** for monitoring
4. **Automated backups** for database
5. **Virtual Network** for security
6. **CI/CD pipeline** (GitHub Actions template included)

See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for production recommendations.

## Support

- Full deployment guide: [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)
- Project documentation: [README.md](./README.md)
- Architecture details: [CLAUDE.md](./CLAUDE.md)
