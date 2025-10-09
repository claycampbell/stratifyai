# Azure Deployment Script for OGSM Management Platform (PowerShell)
# This script automates the deployment to Azure using Container Instances

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  OGSM Platform - Azure Deployment Script" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Function to print colored output
function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Check if Azure CLI is installed
try {
    $null = az --version
    Print-Success "Azure CLI is installed"
} catch {
    Print-Error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if Docker is installed
try {
    $null = docker --version
    Print-Success "Docker is installed"
} catch {
    Print-Error "Docker is not installed. Please install Docker first."
    exit 1
}

# Check if user is logged in to Azure
try {
    $null = az account show 2>$null
    Print-Success "Logged in to Azure"
} catch {
    Print-Error "You are not logged in to Azure. Running 'az login'..."
    az login
}

# Prompt for configuration
Write-Host ""
Print-Info "Please provide the following configuration:"
Write-Host ""

$RESOURCE_GROUP = Read-Host "Resource Group Name [ogsm-platform-rg]"
if ([string]::IsNullOrWhiteSpace($RESOURCE_GROUP)) { $RESOURCE_GROUP = "ogsm-platform-rg" }

$LOCATION = Read-Host "Azure Location [eastus]"
if ([string]::IsNullOrWhiteSpace($LOCATION)) { $LOCATION = "eastus" }

$randomSuffix = Get-Random -Minimum 1000 -Maximum 9999
$ACR_NAME = Read-Host "Container Registry Name (lowercase, alphanumeric) [ogsmplatform$randomSuffix]"
if ([string]::IsNullOrWhiteSpace($ACR_NAME)) { $ACR_NAME = "ogsmplatform$randomSuffix" }

$DB_SERVER_NAME = Read-Host "Database Server Name [ogsm-postgres-$randomSuffix]"
if ([string]::IsNullOrWhiteSpace($DB_SERVER_NAME)) { $DB_SERVER_NAME = "ogsm-postgres-$randomSuffix" }

$DB_ADMIN_USER = Read-Host "Database Admin Username [ogsmadmin]"
if ([string]::IsNullOrWhiteSpace($DB_ADMIN_USER)) { $DB_ADMIN_USER = "ogsmadmin" }

$DB_ADMIN_PASSWORD = Read-Host "Database Admin Password" -AsSecureString
$DB_ADMIN_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_ADMIN_PASSWORD))

if ([string]::IsNullOrWhiteSpace($DB_ADMIN_PASSWORD_PLAIN)) {
    Print-Error "Database password cannot be empty"
    exit 1
}

$GEMINI_API_KEY = Read-Host "Google Gemini API Key" -AsSecureString
$GEMINI_API_KEY_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_API_KEY))

if ([string]::IsNullOrWhiteSpace($GEMINI_API_KEY_PLAIN)) {
    Print-Error "Gemini API key cannot be empty"
    exit 1
}

$STORAGE_ACCOUNT = Read-Host "Storage Account Name (lowercase, alphanumeric) [ogsmstorage$randomSuffix]"
if ([string]::IsNullOrWhiteSpace($STORAGE_ACCOUNT)) { $STORAGE_ACCOUNT = "ogsmstorage$randomSuffix" }

$DB_NAME = "ogsm_manager"

Write-Host ""
Print-Info "Configuration Summary:"
Write-Host "  Resource Group: $RESOURCE_GROUP"
Write-Host "  Location: $LOCATION"
Write-Host "  ACR Name: $ACR_NAME"
Write-Host "  Database Server: $DB_SERVER_NAME"
Write-Host "  Database Name: $DB_NAME"
Write-Host "  Storage Account: $STORAGE_ACCOUNT"
Write-Host ""

$continue = Read-Host "Continue with deployment? (y/n)"
if ($continue -ne "y") {
    Write-Host "Deployment cancelled."
    exit 0
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Starting Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Resource Group
Print-Info "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
Print-Success "Resource group created"

# Step 2: Create Azure Container Registry
Print-Info "Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true --output none
Print-Success "Container Registry created"

# Step 3: Login to ACR
Print-Info "Logging in to Container Registry..."
az acr login --name $ACR_NAME
Print-Success "Logged in to ACR"

# Step 4: Get ACR login server
$ACR_LOGIN_SERVER = az acr show --name $ACR_NAME --query loginServer --output tsv
Print-Success "ACR Login Server: $ACR_LOGIN_SERVER"

# Step 5: Build and push backend image
Print-Info "Building backend Docker image..."
docker build -t "${ACR_LOGIN_SERVER}/ogsm-backend:latest" ./backend
Print-Success "Backend image built"

Print-Info "Pushing backend image to ACR..."
docker push "${ACR_LOGIN_SERVER}/ogsm-backend:latest"
Print-Success "Backend image pushed"

# Step 6: Build and push frontend image
Print-Info "Building frontend Docker image..."
docker build -t "${ACR_LOGIN_SERVER}/ogsm-frontend:latest" ./frontend
Print-Success "Frontend image built"

Print-Info "Pushing frontend image to ACR..."
docker push "${ACR_LOGIN_SERVER}/ogsm-frontend:latest"
Print-Success "Frontend image pushed"

# Step 7: Create PostgreSQL Database
Print-Info "Creating PostgreSQL database (this may take a few minutes)..."
az postgres flexible-server create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --location $LOCATION `
  --admin-user $DB_ADMIN_USER `
  --admin-password $DB_ADMIN_PASSWORD_PLAIN `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --version 15 `
  --storage-size 32 `
  --public-access 0.0.0.0-255.255.255.255 `
  --output none

Print-Success "PostgreSQL server created"

Print-Info "Creating database..."
az postgres flexible-server db create `
  --resource-group $RESOURCE_GROUP `
  --server-name $DB_SERVER_NAME `
  --database-name $DB_NAME `
  --output none

Print-Success "Database created"

# Get database host
$DB_HOST = az postgres flexible-server show `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --query fullyQualifiedDomainName `
  --output tsv

Print-Success "Database Host: $DB_HOST"

# Step 8: Create Storage Account
Print-Info "Creating storage account..."
az storage account create `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS `
  --output none

Print-Success "Storage account created"

Print-Info "Creating file share for uploads..."
az storage share create --name uploads --account-name $STORAGE_ACCOUNT --output none
Print-Success "File share created"

# Get storage key
$STORAGE_KEY = az storage account keys list `
  --resource-group $RESOURCE_GROUP `
  --account-name $STORAGE_ACCOUNT `
  --query "[0].value" `
  --output tsv

# Step 9: Get ACR credentials
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username --output tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" --output tsv

# Step 10: Deploy Backend Container
Print-Info "Deploying backend container..."
$BACKEND_DNS = "ogsm-backend-$(Get-Random -Minimum 1000 -Maximum 9999)"

az container create `
  --resource-group $RESOURCE_GROUP `
  --name ogsm-backend `
  --image "${ACR_LOGIN_SERVER}/ogsm-backend:latest" `
  --registry-login-server $ACR_LOGIN_SERVER `
  --registry-username $ACR_USERNAME `
  --registry-password $ACR_PASSWORD `
  --dns-name-label $BACKEND_DNS `
  --ports 5000 `
  --cpu 1 `
  --memory 1.5 `
  --environment-variables `
    NODE_ENV=production `
    PORT=5000 `
    DB_HOST=$DB_HOST `
    DB_PORT=5432 `
    DB_NAME=$DB_NAME `
    DB_USER=$DB_ADMIN_USER `
    DB_PASSWORD=$DB_ADMIN_PASSWORD_PLAIN `
    GEMINI_API_KEY=$GEMINI_API_KEY_PLAIN `
    MAX_FILE_SIZE=10485760 `
    UPLOAD_DIR=/app/uploads `
  --azure-file-volume-account-name $STORAGE_ACCOUNT `
  --azure-file-volume-account-key $STORAGE_KEY `
  --azure-file-volume-share-name uploads `
  --azure-file-volume-mount-path /app/uploads `
  --output none

Print-Success "Backend container deployed"

# Get backend URL
$BACKEND_FQDN = az container show `
  --resource-group $RESOURCE_GROUP `
  --name ogsm-backend `
  --query ipAddress.fqdn `
  --output tsv

$BACKEND_URL = "http://${BACKEND_FQDN}:5000"
Print-Success "Backend URL: $BACKEND_URL"

# Step 11: Deploy Frontend Container
Print-Info "Deploying frontend container..."
$FRONTEND_DNS = "ogsm-frontend-$(Get-Random -Minimum 1000 -Maximum 9999)"

az container create `
  --resource-group $RESOURCE_GROUP `
  --name ogsm-frontend `
  --image "${ACR_LOGIN_SERVER}/ogsm-frontend:latest" `
  --registry-login-server $ACR_LOGIN_SERVER `
  --registry-username $ACR_USERNAME `
  --registry-password $ACR_PASSWORD `
  --dns-name-label $FRONTEND_DNS `
  --ports 80 `
  --cpu 1 `
  --memory 1 `
  --environment-variables `
    VITE_API_URL="${BACKEND_URL}/api" `
  --output none

Print-Success "Frontend container deployed"

# Get frontend URL
$FRONTEND_FQDN = az container show `
  --resource-group $RESOURCE_GROUP `
  --name ogsm-frontend `
  --query ipAddress.fqdn `
  --output tsv

$FRONTEND_URL = "http://${FRONTEND_FQDN}"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Print-Success "Your application has been deployed successfully!"
Write-Host ""
Write-Host "  Frontend URL: $FRONTEND_URL"
Write-Host "  Backend URL:  $BACKEND_URL"
Write-Host ""
Print-Info "Note: It may take a few minutes for the containers to fully start."
Write-Host ""
Print-Info "To check container status:"
Write-Host "  az container show --resource-group $RESOURCE_GROUP --name ogsm-backend --query instanceView.state"
Write-Host "  az container show --resource-group $RESOURCE_GROUP --name ogsm-frontend --query instanceView.state"
Write-Host ""
Print-Info "To view logs:"
Write-Host "  az container logs --resource-group $RESOURCE_GROUP --name ogsm-backend"
Write-Host "  az container logs --resource-group $RESOURCE_GROUP --name ogsm-frontend"
Write-Host ""
Print-Info "To delete all resources:"
Write-Host "  az group delete --name $RESOURCE_GROUP --yes"
Write-Host ""

# Save deployment info to file
$deploymentInfo = @"
OGSM Platform - Azure Deployment Information
=============================================

Resource Group: $RESOURCE_GROUP
Location: $LOCATION
Deployment Date: $(Get-Date)

URLs:
  Frontend: $FRONTEND_URL
  Backend:  $BACKEND_URL

Azure Resources:
  Container Registry: $ACR_NAME
  Database Server: $DB_SERVER_NAME
  Database Name: $DB_NAME
  Storage Account: $STORAGE_ACCOUNT

Container Names:
  Backend: ogsm-backend
  Frontend: ogsm-frontend

Useful Commands:
  View backend logs:   az container logs --resource-group $RESOURCE_GROUP --name ogsm-backend
  View frontend logs:  az container logs --resource-group $RESOURCE_GROUP --name ogsm-frontend
  Restart backend:     az container restart --resource-group $RESOURCE_GROUP --name ogsm-backend
  Restart frontend:    az container restart --resource-group $RESOURCE_GROUP --name ogsm-frontend
  Delete all:          az group delete --name $RESOURCE_GROUP --yes
"@

$deploymentInfo | Out-File -FilePath "deployment-info.txt" -Encoding UTF8
Print-Success "Deployment information saved to deployment-info.txt"
