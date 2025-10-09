# Azure Deployment Guide

This guide will help you deploy the AI-Powered OGSM Management Platform to Azure using Azure CLI.

## Deployment Architecture

The application will be deployed using:
- **Azure Container Registry (ACR)** - Store Docker images
- **Azure Database for PostgreSQL** - Managed database service
- **Azure Container Instances (ACI)** - Run backend and frontend containers
- **Azure Storage** - Persistent storage for uploads

## Prerequisites

1. **Azure CLI installed**
   ```bash
   # Check if installed
   az --version

   # Install if needed: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
   ```

2. **Docker installed and running**
   ```bash
   docker --version
   ```

3. **Azure subscription**
   ```bash
   # Login to Azure
   az login

   # Set your subscription (if you have multiple)
   az account set --subscription "Your Subscription Name"
   ```

4. **Gemini API Key**
   - Get your key from https://makersuite.google.com/app/apikey

## Quick Deployment

We've provided an automated deployment script. Run:

```bash
# Make the script executable (Linux/Mac)
chmod +x deploy-azure.sh

# Run the deployment script
./deploy-azure.sh
```

For Windows, use PowerShell:
```powershell
.\deploy-azure.ps1
```

The script will prompt you for:
- Resource Group name
- Location (e.g., eastus, westus2)
- Gemini API Key
- Database admin password

## Manual Deployment Steps

If you prefer to deploy manually, follow these steps:

### 1. Set Configuration Variables

```bash
# Configuration
RESOURCE_GROUP="ogsm-platform-rg"
LOCATION="eastus"
ACR_NAME="ogsmplatformacr"  # Must be globally unique, lowercase alphanumeric
DB_SERVER_NAME="ogsm-postgres-server"  # Must be globally unique
DB_NAME="ogsm_manager"
DB_ADMIN_USER="ogsmadmin"
DB_ADMIN_PASSWORD="YourSecurePassword123!"  # Change this!
GEMINI_API_KEY="your_gemini_api_key_here"  # Add your key
STORAGE_ACCOUNT="ogsmstorage"  # Must be globally unique, lowercase alphanumeric
```

### 2. Create Resource Group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 3. Create Azure Container Registry

```bash
# Create ACR
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Login to ACR
az acr login --name $ACR_NAME
```

### 4. Build and Push Docker Images

```bash
# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer --output tsv)

# Build and push backend
docker build -t $ACR_LOGIN_SERVER/ogsm-backend:latest ./backend
docker push $ACR_LOGIN_SERVER/ogsm-backend:latest

# Build and push frontend
docker build -t $ACR_LOGIN_SERVER/ogsm-frontend:latest ./frontend
docker push $ACR_LOGIN_SERVER/ogsm-frontend:latest
```

### 5. Create PostgreSQL Database

```bash
# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32 \
  --public-access 0.0.0.0-255.255.255.255

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME

# Get database connection details
DB_HOST=$(az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --query fullyQualifiedDomainName \
  --output tsv)
```

### 6. Create Azure Storage for File Uploads

```bash
# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# Create file share for uploads
az storage share create \
  --name uploads \
  --account-name $STORAGE_ACCOUNT

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query "[0].value" \
  --output tsv)
```

### 7. Get ACR Credentials

```bash
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" --output tsv)
```

### 8. Deploy Backend Container

```bash
az container create \
  --resource-group $RESOURCE_GROUP \
  --name ogsm-backend \
  --image $ACR_LOGIN_SERVER/ogsm-backend:latest \
  --registry-login-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label ogsm-backend-${RANDOM} \
  --ports 5000 \
  --cpu 1 \
  --memory 1.5 \
  --environment-variables \
    NODE_ENV=production \
    PORT=5000 \
    DB_HOST=$DB_HOST \
    DB_PORT=5432 \
    DB_NAME=$DB_NAME \
    DB_USER=$DB_ADMIN_USER \
    DB_PASSWORD=$DB_ADMIN_PASSWORD \
    GEMINI_API_KEY=$GEMINI_API_KEY \
    MAX_FILE_SIZE=10485760 \
    UPLOAD_DIR=/app/uploads \
  --azure-file-volume-account-name $STORAGE_ACCOUNT \
  --azure-file-volume-account-key $STORAGE_KEY \
  --azure-file-volume-share-name uploads \
  --azure-file-volume-mount-path /app/uploads

# Get backend URL
BACKEND_FQDN=$(az container show \
  --resource-group $RESOURCE_GROUP \
  --name ogsm-backend \
  --query ipAddress.fqdn \
  --output tsv)

BACKEND_URL="http://$BACKEND_FQDN:5000"
echo "Backend URL: $BACKEND_URL"
```

### 9. Deploy Frontend Container

```bash
az container create \
  --resource-group $RESOURCE_GROUP \
  --name ogsm-frontend \
  --image $ACR_LOGIN_SERVER/ogsm-frontend:latest \
  --registry-login-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label ogsm-frontend-${RANDOM} \
  --ports 80 \
  --cpu 1 \
  --memory 1 \
  --environment-variables \
    VITE_API_URL=$BACKEND_URL/api

# Get frontend URL
FRONTEND_FQDN=$(az container show \
  --resource-group $RESOURCE_GROUP \
  --name ogsm-frontend \
  --query ipAddress.fqdn \
  --output tsv)

FRONTEND_URL="http://$FRONTEND_FQDN"
echo "Frontend URL: $FRONTEND_URL"
```

### 10. Verify Deployment

```bash
# Check backend health
curl $BACKEND_URL/health

# Check container status
az container show --resource-group $RESOURCE_GROUP --name ogsm-backend --query instanceView.state
az container show --resource-group $RESOURCE_GROUP --name ogsm-frontend --query instanceView.state

# View logs
az container logs --resource-group $RESOURCE_GROUP --name ogsm-backend
az container logs --resource-group $RESOURCE_GROUP --name ogsm-frontend
```

## Post-Deployment Configuration

### Update Frontend to Use Backend URL

The frontend needs to be rebuilt with the correct backend URL:

```bash
# Update the frontend build with the actual backend URL
# Edit frontend Dockerfile or rebuild with correct VITE_API_URL

# Rebuild and push frontend
docker build -t $ACR_LOGIN_SERVER/ogsm-frontend:latest \
  --build-arg VITE_API_URL=$BACKEND_URL/api \
  ./frontend
docker push $ACR_LOGIN_SERVER/ogsm-frontend:latest

# Restart frontend container
az container restart --resource-group $RESOURCE_GROUP --name ogsm-frontend
```

### Configure CORS (if needed)

If you encounter CORS issues, update the backend to allow the frontend domain in `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: ['http://your-frontend-domain.azurecontainer.io']
}));
```

## Managing Your Deployment

### View Logs

```bash
# Backend logs
az container logs --resource-group $RESOURCE_GROUP --name ogsm-backend --follow

# Frontend logs
az container logs --resource-group $RESOURCE_GROUP --name ogsm-frontend --follow
```

### Restart Containers

```bash
az container restart --resource-group $RESOURCE_GROUP --name ogsm-backend
az container restart --resource-group $RESOURCE_GROUP --name ogsm-frontend
```

### Update Application

```bash
# Rebuild and push new images
docker build -t $ACR_LOGIN_SERVER/ogsm-backend:latest ./backend
docker push $ACR_LOGIN_SERVER/ogsm-backend:latest

# Delete and recreate container (or use restart if image is updated)
az container delete --resource-group $RESOURCE_GROUP --name ogsm-backend --yes
# Then recreate using step 8
```

### Scale Resources

```bash
# Update container resources
az container create \
  --resource-group $RESOURCE_GROUP \
  --name ogsm-backend \
  --cpu 2 \
  --memory 2 \
  # ... other parameters
```

## Cost Optimization

- **Container Instances**: ~$30-50/month for basic setup
- **PostgreSQL Flexible Server**: ~$15-30/month (Burstable tier)
- **Container Registry**: ~$5/month (Basic tier)
- **Storage**: ~$1-5/month

**Total estimated cost**: ~$50-90/month

### To reduce costs:
- Use Azure Container Apps instead of ACI for auto-scaling
- Consider Azure App Service for simpler deployment
- Use reserved instances for long-term deployments
- Stop containers when not in use (dev/test environments)

## Troubleshooting

### Backend won't start

```bash
# Check logs
az container logs --resource-group $RESOURCE_GROUP --name ogsm-backend

# Common issues:
# - Database connection: Verify DB_HOST, DB_USER, DB_PASSWORD
# - Gemini API key: Ensure GEMINI_API_KEY is set correctly
# - Firewall: Check PostgreSQL firewall rules
```

### Frontend can't connect to backend

```bash
# Verify backend URL
echo $BACKEND_URL

# Check CORS configuration in backend
# Ensure frontend is built with correct VITE_API_URL
```

### Database connection issues

```bash
# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME

# Add firewall rule if needed
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name AllowAllAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Cleanup

To delete all Azure resources:

```bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

## Production Recommendations

For production deployments, consider:

1. **Use Azure Container Apps** instead of Container Instances for better scaling
2. **Add Application Gateway** or **Azure Front Door** for SSL/TLS and load balancing
3. **Use Azure Key Vault** for secrets (database passwords, API keys)
4. **Enable Azure Monitor** and Application Insights for logging and monitoring
5. **Configure backup** for PostgreSQL database
6. **Use Virtual Network** to isolate backend and database
7. **Implement CI/CD** with GitHub Actions or Azure DevOps
8. **Use custom domain** with SSL certificate

## Next Steps

After deployment:
1. Access your application at the frontend URL
2. Upload strategic documents
3. Monitor logs and performance
4. Configure custom domain (optional)
5. Set up automated backups
6. Configure alerts and monitoring
