# GitHub Actions CI/CD Setup

This guide will help you set up continuous deployment for your OGSM Platform using GitHub Actions.

## Overview

The GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) automatically:
1. Builds Docker images for backend and frontend using Azure Container Registry
2. Pushes the images to ACR
3. Restarts the Azure Web Apps to pull the latest images
4. Verifies the deployment health

The workflow triggers on:
- Every push to the `main` branch
- Manual trigger via GitHub UI (workflow_dispatch)

## Setup Instructions

### Step 1: Create Azure Service Principal

You need to create a service principal that GitHub Actions can use to authenticate with Azure.

**Option A: Using Azure Portal**
1. Go to Azure Portal → Azure Active Directory → App registrations
2. Click "New registration"
3. Name it "github-actions-ogsm"
4. Click "Register"
5. Note the "Application (client) ID" and "Directory (tenant) ID"
6. Go to "Certificates & secrets" → "New client secret"
7. Create a secret and save the value immediately

**Option B: Using Azure CLI (Run in PowerShell)**
```powershell
# Get your subscription ID
$subscriptionId = az account show --query id -o tsv

# Create service principal
az ad sp create-for-rbac `
  --name "github-actions-ogsm" `
  --role contributor `
  --scopes "/subscriptions/$subscriptionId/resourceGroups/ogsm-platform-rg" `
  --json-auth
```

Save the entire JSON output - you'll need it for GitHub secrets.

### Step 2: Add GitHub Repository Secret

1. Go to your GitHub repository: https://github.com/claycampbell/stratifyai
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:

**Secret Name:** `AZURE_CREDENTIALS`

**Secret Value:** (Use the JSON from Step 1, should look like this)
```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "subscriptionId": "ac609e7a-80ab-4b24-8439-4f984187759f",
  "tenantId": "your-tenant-id",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### Step 3: Assign Permissions to Service Principal

Ensure the service principal has the necessary permissions:

```bash
# Assign Contributor role to resource group
az role assignment create \
  --assignee <client-id-from-step-1> \
  --role Contributor \
  --scope /subscriptions/ac609e7a-80ab-4b24-8439-4f984187759f/resourceGroups/ogsm-platform-rg

# Assign AcrPush role for Container Registry
az role assignment create \
  --assignee <client-id-from-step-1> \
  --role AcrPush \
  --scope /subscriptions/ac609e7a-80ab-4b24-8439-4f984187759f/resourceGroups/ogsm-platform-rg/providers/Microsoft.ContainerRegistry/registries/ogsmplatformacr
```

## Testing the CI/CD Pipeline

### Automatic Trigger
Simply push code to the `main` branch:
```bash
git add .
git commit -m "Test CI/CD deployment"
git push origin main
```

The workflow will automatically trigger and you can watch it at:
https://github.com/claycampbell/stratifyai/actions

### Manual Trigger
1. Go to https://github.com/claycampbell/stratifyai/actions
2. Click on "Deploy to Azure" workflow
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow"

## Monitoring Deployments

### View Workflow Logs
1. Go to https://github.com/claycampbell/stratifyai/actions
2. Click on the latest workflow run
3. Expand each step to view detailed logs

### Check Azure Resources
```bash
# Check backend status
az webapp show --resource-group ogsm-platform-rg --name ogsm-backend-webapp --query state

# Check frontend status
az webapp show --resource-group ogsm-platform-rg --name ogsm-frontend-webapp --query state

# View backend logs
az webapp log tail --name ogsm-backend-webapp --resource-group ogsm-platform-rg

# Check health
curl https://ogsm-backend-webapp.azurewebsites.net/health
```

## Workflow Details

### Environment Variables
The workflow uses these environment variables (defined in `.github/workflows/azure-deploy.yml`):
- `RESOURCE_GROUP`: ogsm-platform-rg
- `ACR_NAME`: ogsmplatformacr
- `LOCATION`: eastus

### Deployment Steps
1. **Checkout code** - Gets latest code from repository
2. **Login to Azure** - Authenticates using service principal
3. **Login to ACR** - Authenticates with Container Registry
4. **Build backend** - Builds and pushes backend Docker image
5. **Build frontend** - Builds and pushes frontend Docker image
6. **Restart backend** - Restarts backend web app to pull new image
7. **Restart frontend** - Restarts frontend web app to pull new image
8. **Check status** - Verifies deployment status
9. **Health check** - Confirms backend API is responding

### Deployment Time
- **Build time**: ~2-3 minutes per image
- **Restart time**: ~30-60 seconds per app
- **Total time**: ~5-7 minutes

## Troubleshooting

### Issue: "AZURE_CREDENTIALS secret not found"
**Solution**: Make sure you've added the `AZURE_CREDENTIALS` secret in GitHub repository settings.

### Issue: "Authorization failed"
**Solution**:
1. Verify the service principal has Contributor role on the resource group
2. Check the clientId and clientSecret are correct
3. Ensure the subscription ID matches

### Issue: "az acr build failed"
**Solution**:
1. Check ACR exists and is accessible
2. Verify service principal has AcrPush role
3. Check Dockerfile syntax

### Issue: Web app not updating
**Solution**:
1. Verify the Docker image was pushed to ACR successfully
2. Check App Service is configured to pull from ACR
3. Try manual restart: `az webapp restart --name ogsm-backend-webapp --resource-group ogsm-platform-rg`
4. Check App Service logs for errors

### Issue: Health check fails
**Solution**:
1. Wait 1-2 minutes after restart for app to fully start
2. Check backend logs: `az webapp log tail --name ogsm-backend-webapp --resource-group ogsm-platform-rg`
3. Verify database connection is working
4. Check environment variables in App Service settings

## Advanced Configuration

### Customize Deployment
Edit `.github/workflows/azure-deploy.yml` to:
- Add additional deployment environments (staging, production)
- Run tests before deployment
- Add Slack/email notifications
- Implement blue-green deployment
- Add rollback capabilities

### Example: Add Testing Step
```yaml
- name: Run backend tests
  run: |
    cd backend
    npm ci
    npm test

- name: Run frontend tests
  run: |
    cd frontend
    npm ci
    npm test
```

### Example: Add Notifications
```yaml
- name: Notify on success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment to Azure succeeded!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Best Practices

1. **Always test locally first** before pushing to main
2. **Use pull requests** for code review before merging to main
3. **Monitor the first few deployments** closely to catch any issues
4. **Set up branch protection** to prevent direct pushes to main
5. **Add status badges** to README.md to show deployment status
6. **Use semantic versioning** for Docker image tags (not just `latest`)

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Container Registry Tasks](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview)
- [Azure App Service Deployment](https://docs.microsoft.com/en-us/azure/app-service/deploy-container-github-action)
- [Azure CLI Reference](https://docs.microsoft.com/en-us/cli/azure/)
