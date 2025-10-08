#!/bin/bash

echo "=== Testing OGSM Manager API ==="
echo ""

# Test 1: Health Check
echo "1. Testing Health Endpoint..."
curl -s http://localhost:5000/health | jq '.'
echo ""

# Test 2: API Root
echo "2. Testing API Root..."
curl -s http://localhost:5000/ | jq '.'
echo ""

# Test 3: Get Documents
echo "3. Testing Documents API..."
curl -s http://localhost:5000/api/documents | jq 'length'
echo " documents found"
echo ""

# Test 4: Get OGSM Components
echo "4. Testing OGSM API..."
curl -s http://localhost:5000/api/ogsm | jq 'length'
echo " OGSM components found"
echo ""

# Test 5: Get KPIs
echo "5. Testing KPIs API..."
curl -s http://localhost:5000/api/kpis | jq 'length'
echo " KPIs found"
echo ""

echo "=== All API tests passed! ==="
