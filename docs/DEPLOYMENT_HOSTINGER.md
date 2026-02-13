# Enterprise Reporting System - Hostinger Deployment Guide

This guide explains how to deploy the Enterprise Reporting System with Sakila Analytics to a Hostinger VPS.

## Prerequisites

- Hostinger VPS with at least 2GB RAM and 20GB storage
- Domain name pointing to your VPS (for SSL)
- SSH access to your VPS
- Docker and Docker Compose installed on your VPS

## Quick Start

### 1. Prepare Your VPS

SSH into your Hostinger VPS:

```bash
ssh root@your-vps-ip
```

Install Docker and Docker Compose:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Create Environment Variables File

Create a `.env` file on your VPS:

```bash
nano ~/enterprise-reporting/.env
```

Paste the following (update values with your own):

```bash
# Data storage path
DATA_PATH=/srv/enterprise-reporting-system

# Application URL (your domain)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Authentication (generate random strings)
AUTH_SECRET=your-random-auth-secret-min-32-chars
AUTH_URL=https://yourdomain.com/api/auth

# Encryption key (generate: openssl rand -hex 32)
ENCRYPTION_KEY=your-32-char-hex-key

# Redis password
REDIS_PASSWORD=your-redis-password

# Job processing
MAX_CONCURRENT_JOBS=5

# Error reporting
NEXT_PUBLIC_ERROR_REPORTING_EMAIL=admin@yourdomain.com

# Pagination (optional defaults shown)
DEFAULT_PAGE_SIZE=50
MAX_PAGE_SIZE=1000
DATA_TABLE_PAGE_SIZE=100
EXPORT_PAGE_SIZE=1000
VIRTUAL_SCROLL_THRESHOLD=500
ENABLE_VIRTUAL_SCROLLING=true
```

Save and exit (Ctrl+X, Y, Enter).

### 3. Deploy the Application

Choose one of the following deployment methods:

#### Option A: Deploy from Docker Hub (After Pushing Image)

```bash
# Create deployment directory
mkdir -p ~/enterprise-reporting-system
cd ~/enterprise-reporting-system

# Download docker-compose.yml
wget https://raw.githubusercontent.com/yourusername/enterprise-reporting-system/main/docker-compose.yml

# Or copy from your local machine
scp docker-compose.yml root@your-vps-ip:~/enterprise-reporting-system/

# Start the application
docker-compose up -d
```

#### Option B: Deploy from Local Image

On your local machine:

```bash
# Save the Docker image
docker save enterprise-reporting-system:sakila-v1 | gzip > sakila-v1.tar.gz

# Upload to VPS
scp sakila-v1.tar.gz root@your-vps-ip:~/enterprise-reporting-system/
```

On your VPS:

```bash
cd ~/enterprise-reporting-system
gunzip -c sakila-v1.tar.gz | docker load
docker-compose up -d
```

### 4. Configure Nginx and SSL

The docker-compose.yml includes Nginx and Certbot for automatic SSL. Generate your SSL certificate:

```bash
cd ~/enterprise-reporting-system

# Temporarily start nginx to generate SSL certificate
docker-compose up -d nginx

# Get SSL certificate (interactive)
docker-compose run --rm certbot certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com

# Restart nginx
docker-compose restart nginx
```

### 5. Verify Deployment

Check that all services are running:

```bash
docker-compose ps
```

Check the application logs:

```bash
docker-compose logs -f app
```

Visit your domain:
- Application: https://yourdomain.com
- API health check: https://yourdomain.com/api/health

### 6. Login Credentials

Default admin credentials:
- Email: `admin@admin.com`
- Password: `admin`

**IMPORTANT:** Change the default password immediately after first login!

## Sakila Analytics Content

The deployed application includes:

- **15 Professional SQL Queries**
  - Monthly Revenue Trend
  - Revenue by Store
  - Revenue by Film Category
  - Top 10 Performing Films
  - Daily Revenue Trend (Last 30 Days)
  - Top Customers by Spending
  - Customer Rental Frequency
  - New Customer Acquisition
  - Film Category Distribution
  - Most Rented Films
  - Inventory Utilization
  - Rental Duration Stats
  - Returns by Day of Week
  - Staff Performance
  - Store Comparison

- **4 Reports**
  - Monthly Revenue Report
  - Store Performance Report
  - Top Customers Report
  - Inventory Utilization Report

- **8 Charts**
  - Revenue Over Time (Line chart)
  - Revenue by Category (Bar chart)
  - Top Films (Horizontal bar chart)
  - Customer Spending (Bar chart)
  - Store Comparison (Grouped bar chart)
  - Inventory Utilization (Pie chart)
  - Returns by Day (Bar chart)
  - Staff Performance (Grouped bar chart)

- **1 Dashboard**
  - Sakila Analytics Dashboard with 5 widgets
  - Publicly accessible

## Data Persistence

All data is stored at `/srv/enterprise-reporting-system/` on your VPS:

```
/srv/enterprise-reporting-system/
├── app/data/          # Configuration database (with Sakila analytics)
├── app/uploads/       # Sakila demo database
├── app/job-outputs/   # Generated report outputs
├── app/logs/          # Application logs
├── nginx/conf.d/      # Nginx configuration
├── certbot/conf/      # SSL certificates
└── redis/data/        # Redis persistence
```

## Backup Strategy

To backup your data:

```bash
# Backup configuration database with Sakila analytics
docker exec ers-app sqlite3 /app/data/config.sqlite > backup-$(date +%Y%m%d).sqlite3

# Backup Sakila database
docker exec ers-app cat /app/data/uploads/sakila.db > sakila-backup-$(date +%Y%m%d).db
```

To restore:

```bash
# Copy backup to container
cat backup-20250213.sqlite3 | docker exec -i ers-app sqlite3 /app/data/config.sqlite
```

## Troubleshooting

### View Logs

```bash
# Application logs
docker-compose logs -f app

# Nginx logs
docker-compose logs -f nginx

# Redis logs
docker-compose logs -f redis
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart only the application
docker-compose restart app
```

### Check Database

```bash
# Access the configuration database
docker exec -it ers-app sqlite3 /app/data/config.sqlite

# List tables
.tables

# Check saved queries
SELECT name FROM saved_queries WHERE data_source_id = '30441bec-c1f0-4807-a9ae-f201502913d2';
```

### Update Application

```bash
cd ~/enterprise-reporting-system
docker-compose down
docker-compose pull
docker-compose up -d
```

## Security Recommendations

1. Change default admin password immediately
2. Use strong, unique passwords for:
   - AUTH_SECRET
   - ENCRYPTION_KEY
   - REDIS_PASSWORD
3. Enable HTTPS with valid SSL certificate
4. Keep Docker and system packages updated
5. Regular backups of the configuration database
6. Monitor logs for suspicious activity

## Support

For issues or questions:
- Check logs: `docker-compose logs app`
- Verify services: `docker-compose ps`
- Health check: `curl https://yourdomain.com/api/health`
