# Enterprise Reporting System
## Docker Deployment Guide for Hostinger VPS

This guide explains how to deploy the Enterprise Reporting System on a Hostinger VPS using Docker Compose with **bind mounts** for data persistence.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Data Storage & Bind Mounts](#data-storage--bind-mounts)
5. [Environment Configuration](#environment-configuration)
6. [Deployment Steps](#deployment-steps)
7. [Backup & Restore](#backup--restore)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Services

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| **PostgreSQL** | ers-postgres | 5432 | Primary database |
| **Redis** | ers-redis | 6379 | Job queue (BullMQ) |
| **App** | ers-app | 3000 | Next.js application |

### Data Storage (Bind Mounts)

All data is stored on the **Hostinger VPS filesystem** at:

```
/srv/enterprise-reporting-system/
├── postgres/
│   └── data/              # PostgreSQL database files
├── redis/
│   └── data/              # Redis snapshot files
├── app/
│   ├── data/              # SQLite, configs
│   ├── job-outputs/       # Generated reports/exports
│   ├── uploads/           # User uploaded files
│   └── logs/              # Application logs
└── backups/               # Automated backups
```

**Why Bind Mounts?**

✅ Data persists even if containers are removed
✅ Easy to backup with standard tools (rsync, tar)
✅ Compatible with Hostinger VPS snapshots
✅ No data loss during Docker updates

---

## Prerequisites

### Hostinger VPS Requirements

- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 20GB+ SSD
- **Access**: SSH root access

### Local Machine Requirements

- Docker & Docker Compose installed (for local testing)
- SSH client
- SFTP/SCP tool (for file upload)

---

## Quick Start

### 1. Prepare Hostinger VPS

Upload and run the setup script:

```bash
# On your local machine
scp scripts/setup-hostinger.sh root@your-vps-ip:/root/

# SSH into your VPS
ssh root@your-vps-ip

# Make script executable and run
chmod +x setup-hostinger.sh
sudo ./setup-hostinger.sh
```

This will:
- Install Docker & Docker Compose
- Create directory structure at `/srv/enterprise-reporting-system`
- Set proper permissions

### 2. Upload Application Files

```bash
# From your local machine
scp -r docker-compose.yml root@your-vps-ip:/srv/enterprise-reporting-system/
scp -r .next/ package.json package-lock.json root@your-vps-ip:/srv/enterprise-reporting-system/
```

Or use Git directly on the VPS:

```bash
# On VPS
cd /srv/enterprise-reporting-system
git clone https://your-repo-url.git .
```

### 3. Configure Environment

```bash
# On VPS
cd /srv/enterprise-reporting-system
cp .env.docker.production .env
nano .env  # Edit values
```

**Required changes:**

```bash
# Generate secure values
openssl rand -base64 32  # For AUTH_SECRET
openssl rand -hex 32     # For ENCRYPTION_KEY

# Update .env with:
NEXT_PUBLIC_APP_URL=https://your-domain.com
AUTH_SECRET=<generated-value>
AUTH_URL=https://your-domain.com
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
ENCRYPTION_KEY=<generated-value>
```

### 4. Start Application

```bash
# On VPS
cd /srv/enterprise-reporting-system
docker compose up -d
```

### 5. Verify Deployment

```bash
# Check containers are running
docker compose ps

# View logs
docker compose logs -f

# Check application health
curl http://localhost:3000/api/health
```

---

## Data Storage & Bind Mounts

### What's Stored Where

| VPS Path | Container Path | Contents | Backup Frequency |
|----------|---------------|----------|------------------|
| `/srv/.../postgres/data` | `/var/lib/postgresql/data` | Database files | Daily |
| `/srv/.../redis/data` | `/data` | Redis snapshots | Daily |
| `/srv/.../app/data` | `/app/data` | SQLite configs | Daily |
| `/srv/.../app/uploads` | `/app/uploads` | User files | Daily |
| `/srv/.../app/job-outputs` | `/app/job-outputs` | Reports/exports | Weekly |

### Volume Permissions

**PostgreSQL**: Needs UID 999 (postgres user)
```bash
chown -R 999:999 /srv/enterprise-reporting-system/postgres
```

**Redis**: Needs UID 999 (redis user)
```bash
chown -R 999:999 /srv/enterprise-reporting-system/redis
```

**App**: Needs UID 1000 (nextjs user)
```bash
chown -R 1000:1000 /srv/enterprise-reporting-system/app
```

### Accessing Data

```bash
# PostgreSQL database files
ls -lh /srv/enterprise-reporting-system/postgres/data

# Redis snapshot
ls -lh /srv/enterprise-reporting-system/redis/data/dump.rdb

# Application data
ls -lh /srv/enterprise-reporting-system/app/data
```

---

## Environment Configuration

### Required Variables

```bash
# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
APP_PORT=3000

# Authentication
AUTH_SECRET=<32-char random string>
AUTH_URL=https://your-domain.com

# PostgreSQL
POSTGRES_USER=ersuser
POSTGRES_PASSWORD=<strong password>
POSTGRES_DB=enterprise_reporting
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=<strong password>
REDIS_PORT=6379

# Encryption
ENCRYPTION_KEY=<32-byte hex>
```

### Optional Variables

```bash
# Job Processing
MAX_CONCURRENT_JOBS=5

# Pagination
DEFAULT_PAGE_SIZE=50
MAX_PAGE_SIZE=1000
DATA_TABLE_PAGE_SIZE=100
EXPORT_PAGE_SIZE=1000

# Error Reporting
NEXT_PUBLIC_ERROR_REPORTING_EMAIL=admin@yourcompany.com
```

---

## Deployment Steps

### Initial Deployment

```bash
# 1. Setup VPS
sudo ./setup-hostinger.sh

# 2. Configure environment
cp .env.docker.production .env
nano .env

# 3. Build and start
docker compose up -d --build

# 4. Check status
docker compose ps
docker compose logs -f
```

### Updating the Application

```bash
# 1. Pull latest code
git pull

# 2. Rebuild and restart (without data loss)
docker compose down
docker compose up -d --build

# 3. Verify
docker compose ps
docker compose logs -f app
```

### Rolling Update (Zero Downtime)

```bash
# 1. Pull latest code
git pull

# 2. Build new image
docker compose build

# 3. Start new container alongside old
docker compose up -d --no-deps --scale app=2

# 4. Stop old container
docker compose up -d --no-deps --scale app=1

# 5. Clean up
docker image prune -f
```

---

## Backup & Restore

### Automated Backups

1. Copy backup script to VPS:

```bash
scp scripts/backup-hostinger.sh root@your-vps-ip:/usr/local/bin/ers-backup.sh
chmod +x /usr/local/bin/ers-backup.sh
```

2. Add to crontab:

```bash
crontab -e

# Add this line (daily backup at 2 AM)
0 2 * * * /usr/local/bin/ers-backup.sh >> /var/log/ers-backup.log 2>&1
```

### Manual Backup

```bash
# Backup all data
cd /srv/enterprise-reporting-system
tar -czf backup-$(date +%Y%m%d).tar.gz \
    postgres/ \
    redis/ \
    app/

# Download to local machine
scp root@your-vps-ip:/srv/enterprise-reporting-system/backup-*.tar.gz ./
```

### Database Backup

```bash
# PostgreSQL dump
docker exec ers-postgres pg_dump -U ersuser enterprise_reporting > backup.sql

# Restore
docker exec -i ers-postgres psql -U ersuser enterprise_reporting < backup.sql
```

### Restore from Backup

```bash
# 1. Stop containers
docker compose down

# 2. Extract backup
tar -xzf backup-20240101.tar.gz -C /srv/enterprise-reporting-system/

# 3. Start containers
docker compose up -d
```

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis

# Last 100 lines
docker compose logs --tail=100 app
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h
du -sh /srv/enterprise-reporting-system/*

# Memory usage
free -h
```

### Health Checks

```bash
# Application health
curl http://localhost:3000/api/health

# PostgreSQL health
docker exec ers-postgres pg_isready -U ersuser

# Redis health
docker exec ers-redis redis-cli ping
```

### Database Maintenance

```bash
# Connect to PostgreSQL
docker exec -it ers-postgres psql -U ersuser enterprise_reporting

# Run vacuum/analyze
VACUUM ANALYZE;

# Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Exit
\q
```

### Log Rotation

```bash
# Create logrotate config
cat > /etc/logrotate.d/ers-app << EOF
/srv/enterprise-reporting-system/app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 nextjs nodejs
}
EOF

# Test configuration
logrotate -d /etc/logrotate.d/ers-app
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs <service-name>

# Check container status
docker compose ps

# Inspect container
docker inspect ers-app
```

### Permission Issues

```bash
# Fix PostgreSQL permissions
chown -R 999:999 /srv/enterprise-reporting-system/postgres

# Fix Redis permissions
chown -R 999:999 /srv/enterprise-reporting-system/redis

# Fix app permissions
chown -R 1000:1000 /srv/enterprise-reporting-system/app
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker exec ers-postgres psql -U ersuser -d enterprise_reporting -c "SELECT 1;"
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Find large files
du -sh /srv/enterprise-reporting-system/* | sort -hr

# Clean old logs
find /srv/enterprise-reporting-system/app/logs -name "*.log" -mtime +7 -delete

# Clean Docker images
docker image prune -a

# Clean Docker volumes (be careful!)
docker volume prune
```

### Application Errors

```bash
# View real-time logs
docker compose logs -f app

# Restart application
docker compose restart app

# Rebuild application
docker compose up -d --build app
```

### Reset Everything

**⚠️ WARNING: This will delete all data!**

```bash
# Stop and remove containers
docker compose down

# Remove volumes (bind mounts are NOT removed)
docker volume rm $(docker volume ls -q)

# Remove bind mounts (data is deleted!)
rm -rf /srv/enterprise-reporting-system/postgres/*
rm -rf /srv/enterprise-reporting-system/redis/*
rm -rf /srv/enterprise-reporting-system/app/*

# Start fresh
docker compose up -d
```

---

## Security Best Practices

### 1. Use Strong Passwords

```bash
# Generate secure passwords
openssl rand -base64 32
```

### 2. Enable Firewall

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### 3. Use SSL/TLS

Install Certbot for free Let's Encrypt certificates:

```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### 4. Regular Updates

```bash
# Update system packages
apt-get update && apt-get upgrade -y

# Update Docker images
docker compose pull
docker compose up -d --build
```

### 5. Monitor Logs

```bash
# Failed login attempts
grep "Failed" /var/log/auth.log

# Application errors
docker compose logs app | grep -i error
```

---

## Performance Tuning

### PostgreSQL Performance

Edit `docker-compose.yml` to add PostgreSQL tuning:

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "work_mem=4MB"
```

### Redis Performance

```yaml
redis:
  command:
    - "redis-server"
    - "--appendonly yes"
    - "--maxmemory 256mb"
    - "--maxmemory-policy allkeys-lru"
```

### Application Performance

```yaml
app:
  environment:
    - NODE_OPTIONS=--max-old-space-size=2048
```

---

## Support & Resources

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Hostinger VPS**: https://support.hostinger.com/

---

## License

This deployment configuration is part of the Enterprise Reporting System.
