#!/bin/bash

# Azure Deployment Script for OGSM Management Platform
# This script automates the deployment to Azure using Container Instances

set -e  # Exit on any error

echo "=================================================="
echo "  OGSM Platform - Azure Deployment Script"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

print_success "Azure CLI is installed"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

print_success "Docker is installed"

# Check if user is logged in to Azure
if ! az account show &> /dev/null; then
    print_error "You are not logged in to Azure. Running 'az login'..."
    az login
fi

print_success "Logged in to Azure"

# Prompt for configuration
echo ""
print_info "Please provide the following configuration:"
echo ""

read -p "Resource Group Name [ogsm-platform-rg]: " RESOURCE_GROUP
RESOURCE_GROUP=${RESOURCE_GROUP:-ogsm-platform-rg}

read -p "Azure Location [eastus]: " LOCATION
LOCATION=${LOCATION:-eastus}

read -p "Container Registry Name (lowercase, alphanumeric) [ogsmplatform$RANDOM]: " ACR_NAME
ACR_NAME=${ACR_NAME:-ogsmplatform$RANDOM}

read -p "Database Server Name [ogsm-postgres-$RANDOM]: " DB_SERVER_NAME
DB_SERVER_NAME=${DB_SERVER_NAME:-ogsm-postgres-$RANDOM}

read -p "Database Admin Username [ogsmadmin]: " DB_ADMIN_USER
DB_ADMIN_USER=${DB_ADMIN_USER:-ogsmadmin}

read -sp "Database Admin Password: " DB_ADMIN_PASSWORD
echo ""

if [ -z "$DB_ADMIN_PASSWORD" ]; then
    print_error "Database password cannot be empty"
    exit 1
fi

read -sp "Google Gemini API Key: " GEMINI_API_KEY
echo ""

if [ -z "$GEMINI_API_KEY" ]; then
    print_error "Gemini API key cannot be empty"
    exit 1
fi

read -p "Storage Account Name (lowercase, alphanumeric) [ogsmstorage$RANDOM]: " STORAGE_ACCOUNT
STORAGE_ACCOUNT=${STORAGE_ACCOUNT:-ogsmstorage$RANDOM}

DB_NAME="ogsm_manager"

echo ""
print_info "Configuration Summary:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  ACR Name: $ACR_NAME"
echo "  Database Server: $DB_SERVER_NAME"
echo "  Database Name: $DB_NAME"
echo "  Storage Account: $STORAGE_ACCOUNT"
echo ""

read -p "Continue with deployment? (y/n): " CONTINUE
if [ "$CONTINUE" != "y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "=================================================="
echo "  Starting Deployment"
echo "=================================================="
echo ""

# Step 1: Create Resource Group
print_info "Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

print_success "Resource group created"

# Step 2: Create Azure Container Registry
print_info "Creating Azure Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none

print_success "Container Registry created"

# Step 3: Login to ACR
print_info "Logging in to Container Registry..."
az acr login --name "$ACR_NAME"
print_success "Logged in to ACR"

# Step 4: Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer --output tsv)
print_success "ACR Login Server: $ACR_LOGIN_SERVER"

# Step 5: Build and push backend image
print_info "Building backend Docker image..."
docker build -t "$ACR_LOGIN_SERVER/ogsm-backend:latest" ./backend
print_success "Backend image built"

print_info "Pushing backend image to ACR..."
docker push "$ACR_LOGIN_SERVER/ogsm-backend:latest"
print_success "Backend image pushed"

# Step 6: Build and push frontend image
print_info "Building frontend Docker image..."
docker build -t "$ACR_LOGIN_SERVER/ogsm-frontend:latest" ./frontend
print_success "Frontend image built"

print_info "Pushing frontend image to ACR..."
docker push "$ACR_LOGIN_SERVER/ogsm-frontend:latest"
print_success "Frontend image pushed"

# Step 7: Create PostgreSQL Database
print_info "Creating PostgreSQL database (this may take a few minutes)..."
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER_NAME" \
  --location "$LOCATION" \
  --admin-user "$DB_ADMIN_USER" \
  --admin-password "$DB_ADMIN_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32 \
  --public-access 0.0.0.0-255.255.255.255 \
  --output none

print_success "PostgreSQL server created"

print_info "Creating database..."
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$DB_SERVER_NAME" \
  --database-name "$DB_NAME" \
  --output none

print_success "Database created"

# Get database host
DB_HOST=$(az postgres flexible-server show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER_NAME" \
  --query fullyQualifiedDomainName \
  --output tsv)

print_success "Database Host: $DB_HOST"

# Step 8: Create Storage Account
print_info "Creating storage account..."
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --output none

print_success "Storage account created"

print_info "Creating file share for uploads..."
az storage share create \
  --name uploads \
  --account-name "$STORAGE_ACCOUNT" \
  --output none

print_success "File share created"

# Get storage key
STORAGE_KEY=$(az storage account keys list \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" \
  --query "[0].value" \
  --output tsv)

# Step 9: Get ACR credentials
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)

# Step 10: Deploy Backend Container
print_info "Deploying backend container..."
BACKEND_DNS="ogsm-backend-$RANDOM"

az container create \
  --resource-group "$RESOURCE_GROUP" \
  --name ogsm-backend \
  --image "$ACR_LOGIN_SERVER/ogsm-backend:latest" \
  --registry-login-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --dns-name-label "$BACKEND_DNS" \
  --ports 5000 \
  --cpu 1 \
  --memory 1.5 \
  --environment-variables \
    NODE_ENV=production \
    PORT=5000 \
    DB_HOST="$DB_HOST" \
    DB_PORT=5432 \
    DB_NAME="$DB_NAME" \
    DB_USER="$DB_ADMIN_USER" \
    DB_PASSWORD="$DB_ADMIN_PASSWORD" \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    MAX_FILE_SIZE=10485760 \
    UPLOAD_DIR=/app/uploads \
  --azure-file-volume-account-name "$STORAGE_ACCOUNT" \
  --azure-file-volume-account-key "$STORAGE_KEY" \
  --azure-file-volume-share-name uploads \
  --azure-file-volume-mount-path /app/uploads \
  --output none

print_success "Backend container deployed"

# Get backend URL
BACKEND_FQDN=$(az container show \
  --resource-group "$RESOURCE_GROUP" \
  --name ogsm-backend \
  --query ipAddress.fqdn \
  --output tsv)

BACKEND_URL="http://$BACKEND_FQDN:5000"
print_success "Backend URL: $BACKEND_URL"

# Step 11: Deploy Frontend Container
print_info "Deploying frontend container..."
FRONTEND_DNS="ogsm-frontend-$RANDOM"

az container create \
  --resource-group "$RESOURCE_GROUP" \
  --name ogsm-frontend \
  --image "$ACR_LOGIN_SERVER/ogsm-frontend:latest" \
  --registry-login-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --dns-name-label "$FRONTEND_DNS" \
  --ports 80 \
  --cpu 1 \
  --memory 1 \
  --environment-variables \
    VITE_API_URL="$BACKEND_URL/api" \
  --output none

print_success "Frontend container deployed"

# Get frontend URL
FRONTEND_FQDN=$(az container show \
  --resource-group "$RESOURCE_GROUP" \
  --name ogsm-frontend \
  --query ipAddress.fqdn \
  --output tsv)

FRONTEND_URL="http://$FRONTEND_FQDN"

echo ""
echo "=================================================="
echo "  Deployment Complete!"
echo "=================================================="
echo ""
print_success "Your application has been deployed successfully!"
echo ""
echo "  Frontend URL: $FRONTEND_URL"
echo "  Backend URL:  $BACKEND_URL"
echo ""
print_info "Note: It may take a few minutes for the containers to fully start."
echo ""
print_info "To check container status:"
echo "  az container show --resource-group $RESOURCE_GROUP --name ogsm-backend --query instanceView.state"
echo "  az container show --resource-group $RESOURCE_GROUP --name ogsm-frontend --query instanceView.state"
echo ""
print_info "To view logs:"
echo "  az container logs --resource-group $RESOURCE_GROUP --name ogsm-backend"
echo "  az container logs --resource-group $RESOURCE_GROUP --name ogsm-frontend"
echo ""
print_info "To delete all resources:"
echo "  az group delete --name $RESOURCE_GROUP --yes"
echo ""

# Save deployment info to file
cat > deployment-info.txt <<EOF
OGSM Platform - Azure Deployment Information
=============================================

Resource Group: $RESOURCE_GROUP
Location: $LOCATION
Deployment Date: $(date)

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
EOF

print_success "Deployment information saved to deployment-info.txt"
