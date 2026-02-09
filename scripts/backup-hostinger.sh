#!/bin/bash
# ==========================================
# Enterprise Reporting System
# Automated Backup Script for Hostinger
# ==========================================
# This script creates automated backups of:
# - PostgreSQL database
# - Redis data
# - Application data
# - Uploads
#
# Setup:
#   1. Copy this script to /usr/local/bin/ers-backup.sh
#   2. Make it executable: chmod +x /usr/local/bin/ers-backup.sh
#   3. Add to crontab: crontab -e
#      Example: Daily backup at 2 AM
#      0 2 * * * /usr/local/bin/ers-backup.sh
# ==========================================

set -e

# Configuration
DATA_PATH="/srv/enterprise-reporting-system"
BACKUP_PATH="${DATA_PATH}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "${BACKUP_PATH}/${TIMESTAMP}"

echo "Starting backup at $(date)"

# 1. Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker exec ers-postgres pg_dump -U ersuser enterprise_reporting > "${BACKUP_PATH}/${TIMESTAMP}/postgres.sql"
gzip "${BACKUP_PATH}/${TIMESTAMP}/postgres.sql"

# 2. Backup Redis (create snapshot)
echo "Backing up Redis..."
docker exec ers-redis redis-cli --rdb /data/dump.rdb SAVE
cp "${DATA_PATH}/redis/data/dump.rdb" "${BACKUP_PATH}/${TIMESTAMP}/redis.rdb"
gzip "${BACKUP_PATH}/${TIMESTAMP}/redis.rmb"

# 3. Backup application data (SQLite, configs)
echo "Backing up application data..."
tar -czf "${BACKUP_PATH}/${TIMESTAMP}/app-data.tar.gz" -C "${DATA_PATH}/app" data

# 4. Backup uploads
echo "Backing up uploads..."
tar -czf "${BACKUP_PATH}/${TIMESTAMP}/uploads.tar.gz" -C "${DATA_PATH}/app" uploads

# 5. Backup job outputs
echo "Backing up job outputs..."
tar -czf "${BACKUP_PATH}/${TIMESTAMP}/job-outputs.tar.gz" -C "${DATA_PATH}/app" job-outputs

# Create backup manifest
cat > "${BACKUP_PATH}/${TIMESTAMP}/manifest.txt" <<EOF
Backup created: $(date)
System: Enterprise Reporting System
Components:
  - PostgreSQL database dump
  - Redis data snapshot
  - Application data (SQLite configs)
  - User uploads
  - Job outputs
EOF

echo "Backup completed: ${BACKUP_PATH}/${TIMESTAMP}"

# Clean old backups (keep last N days)
echo "Cleaning old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_PATH}" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;

echo "Backup process finished at $(date)"
echo "Disk usage:"
du -sh "${BACKUP_PATH}"/* 2>/dev/null | tail -5
