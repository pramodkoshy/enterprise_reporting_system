#!/bin/bash
# ==========================================
# Enterprise Reporting System
# Deploy to Hostinger VPS (Local Build)
# ==========================================
# This script builds the Docker image locally,
# uploads it to the VPS, and starts the containers
#
# Usage:
#   chmod +x deploy-to-hostinger.sh
#   ./deploy-to-hostinger.sh root@148.135.137.110
# ==========================================

set -e

# Configuration
VPS_USER="${1:-root}"
VPS_HOST="${2:-148.135.137.110}"
VPS_PATH="/srv/enterprise-reporting-system"
APP_NAME="enterprise-reporting-system"
IMAGE_NAME="${APP_NAME}:latest"
TEMP_IMAGE="/tmp/${APP_NAME}-deploy.tar.gz"

echo "🚀 Deploying ${APP_NAME} to Hostinger VPS..."
echo "   Host: ${VPS_HOST}"
echo "   Path: ${VPS_PATH}"
echo ""

# Check if we can connect
echo "📡 Testing connection to VPS..."
ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_HOST} "echo '✅ Connection successful'" || {
    echo "❌ Failed to connect to VPS"
    echo "   Make sure you've added the SSH key:"
    echo "   echo '148.135.137.110 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBZrAW5R7GNu0PfEB5+olDJ/8n4StdVHBJ3uzyD2qSPQ' >> ~/.ssh/known_hosts"
    exit 1
}

# Step 1: Build Docker image locally
echo ""
echo "🏗️  Building Docker image locally for AMD64..."
docker buildx build --platform linux/amd64 -t ${IMAGE_NAME} --load . || {
    echo "❌ Docker build failed"
    exit 1
}
echo "✅ Build complete!"

# Step 2: Save Docker image
echo ""
echo "💾 Saving Docker image..."
docker save ${IMAGE_NAME} | gzip > ${TEMP_IMAGE}
echo "✅ Image saved to ${TEMP_IMAGE}"
ls -lh ${TEMP_IMAGE}

# Step 3: Upload to VPS
echo ""
echo "📤 Uploading Docker image to VPS..."
scp ${TEMP_IMAGE} ${VPS_USER}@${VPS_HOST}:/tmp/
echo "✅ Upload complete!"

# Step 4: Upload docker-compose.yml
echo ""
echo "📤 Uploading docker-compose.yml..."
scp docker-compose.yml ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/
echo "✅ docker-compose.yml uploaded!"

# Step 5: Deploy on VPS
echo ""
echo "🔧 Deploying on VPS..."
ssh ${VPS_USER}@${VPS_HOST} << EOF
set -e

echo "   Creating data directories if needed..."
mkdir -p ${VPS_PATH}/{postgres/data,redis/data,app/{data,job-outputs,uploads,logs}}

echo "   Fixing permissions..."
chown -R 999:999 ${VPS_PATH}/postgres 2>/dev/null || true
chown -R 999:999 ${VPS_PATH}/redis 2>/dev/null || true
chown -R 1001:1000 ${VPS_PATH}/app 2>/dev/null || true

echo "   Loading Docker image..."
docker load < /tmp/${APP_NAME}-deploy.tar.gz

echo "   Cleaning up image file..."
rm /tmp/${APP_NAME}-deploy.tar.gz

echo "   Checking if .env exists..."
if [ ! -f ${VPS_PATH}/.env ]; then
    echo "   ⚠️  .env not found - copying from template..."
    cp ${VPS_PATH}/.env.docker.production ${VPS_PATH}/.env
    echo "   ⚠️  Please edit .env with your configuration!"
    echo "   nano ${VPS_PATH}/.env"
fi

echo "   Stopping existing containers..."
cd ${VPS_PATH}
docker compose down 2>/dev/null || true

echo "   Starting containers..."
docker compose up -d

echo ""
echo "   ⏳ Waiting for containers to be healthy..."
sleep 15

echo ""
echo "   ✅ Deployment complete!"
echo ""
echo "   Container status:"
docker compose ps

echo ""
echo "   Logs (last 30 lines):"
docker compose logs --tail=30
EOF

# Cleanup
echo ""
echo "🧹 Cleaning up temporary files..."
rm -f ${TEMP_IMAGE}

echo ""
echo "✅ Deployment successful!"
echo ""
echo "🔗 Next steps:"
echo "   1. Initialize database: curl -X POST http://${VPS_HOST}:3000/api/setup"
echo "   2. Access application: http://${VPS_HOST}:3000"
echo "   3. View logs: ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH} && docker compose logs -f'"
echo ""
