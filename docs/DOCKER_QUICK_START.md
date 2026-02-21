# 🚀 Quick Start: Deploy to Hostinger with Docker

## Prerequisites

1. **Hostinger VPS** with:
   - Ubuntu 20.04+ or Debian 11+
   - At least 2GB RAM (4GB recommended)
   - 20GB+ storage
   - Root SSH access

2. **Your VPS Details:**
   - IP: `148.135.137.110`
   - SSH Key: `AAAAC3NzaC1lZDI1NTE5AAAAIBZrAW5R7GNu0PfEB5+olDJ/8n4StdVHBJ3uzyD2qSPQ`

## ⚡ Quick Deploy (5 Minutes)

### Step 1: Add VPS to Known Hosts

```bash
# Add your VPS fingerprint to known_hosts
echo "148.135.137.110 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBZrAW5R7GNu0PfEB5+olDJ/8n4StdVHBJ3uzyD2qSPQ" >> ~/.ssh/known_hosts
```

### Step 2: Setup VPS (One-time)

```bash
# Upload setup script
scp scripts/setup-hostinger.sh root@148.135.137.110:/root/

# SSH into VPS and run setup
ssh root@148.135.137.110
chmod +x setup-hostinger.sh
sudo ./setup-hostinger.sh
```

This installs Docker, creates directories, and sets permissions.

### Step 3: Deploy Application

```bash
# From your project directory
./scripts/deploy-to-hostinger.sh root@148.135.137.110
```

This uploads files, builds Docker images, and starts containers.

### Step 4: Configure Environment

```bash
# SSH into VPS
ssh root@148.135.137.110

# Edit environment variables
cd /srv/enterprise-reporting-system
nano .env
```

**Generate secrets:**
```bash
# On VPS
openssl rand -base64 32  # For AUTH_SECRET
openssl rand -hex 32     # For ENCRYPTION_KEY
```

**Update in .env:**
```bash
NEXT_PUBLIC_APP_URL=http://148.135.137.110:3000
AUTH_SECRET=<generated-secret>
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
ENCRYPTION_KEY=<generated-key>
```

### Step 5: Restart with New Config

```bash
docker compose down
docker compose up -d
```

### Step 6: Verify Deployment

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f

# Test application
curl http://148.135.137.110:3000
```

Visit: **http://148.135.137.110:3000**

---

## 📊 What Gets Deployed

### Services

| Service | Container | Port | Data Location |
|---------|-----------|------|---------------|
| PostgreSQL | ers-postgres | 5432 | `/srv/.../postgres/data` |
| Redis | ers-redis | 6379 | `/srv/.../redis/data` |
| Application | ers-app | 3000 | `/srv/.../app/` |

### Data Persistence

All data stored on VPS at `/srv/enterprise-reporting-system/`:

```
/srv/enterprise-reporting-system/
├── postgres/data/      # Database files
├── redis/data/         # Redis snapshots
├── app/
│   ├── data/           # SQLite configs
│   ├── job-outputs/    # Generated reports
│   ├── uploads/        # User files
│   └── logs/           # Application logs
└── backups/            # Backup archives
```

---

## 🔄 Common Commands

### On Your VPS

```bash
# SSH in
ssh root@148.135.137.110

# Navigate to app directory
cd /srv/enterprise-reporting-system

# View running containers
docker compose ps

# View logs
docker compose logs -f              # All services
docker compose logs -f app          # App only
docker compose logs -f postgres     # DB only

# Restart services
docker compose restart

# Stop all services
docker compose down

# Start all services
docker compose up -d

# Rebuild and restart
docker compose down
docker compose up -d --build

# Update application
git pull
docker compose down
docker compose up -d --build
```

### From Your Local Machine

```bash
# Deploy updated code
./scripts/deploy-to-hostinger.sh root@148.135.137.110

# View logs remotely
ssh root@148.135.137.110 "cd /srv/enterprise-reporting-system && docker compose logs -f"

# Restart services
ssh root@148.135.137.110 "cd /srv/enterprise-reporting-system && docker compose restart"
```

---

## 💾 Backups

### Manual Backup

```bash
# On VPS
cd /srv/enterprise-reporting-system
tar -czf backup-$(date +%Y%m%d).tar.gz postgres/ redis/ app/

# Download to local machine
scp root@148.135.137.110:/srv/enterprise-reporting-system/backup-*.tar.gz ./
```

### Automated Backups

```bash
# Setup backup script
scp scripts/backup-hostinger.sh root@148.135.137.110:/usr/local/bin/ers-backup.sh
ssh root@148.135.137.110 "chmod +x /usr/local/bin/ers-backup.sh"

# Add to crontab (daily at 2 AM)
ssh root@148.135.137.110 "crontab -e"
# Add this line:
# 0 2 * * * /usr/local/bin/ers-backup.sh >> /var/log/ers-backup.log 2>&1
```

---

## 🔒 Security Checklist

- [ ] Changed all default passwords in `.env`
- [ ] Generated secure `AUTH_SECRET` (32+ chars)
- [ ] Generated secure `ENCRYPTION_KEY` (64 hex chars)
- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Set strong `REDIS_PASSWORD`
- [ ] Enabled firewall: `ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable`
- [ ] Configured SSL (optional): `apt-get install certbot python3-certbot-nginx && certbot --nginx -d your-domain.com`
- [ ] Set up automated backups
- [ ] Verified only port 3000 exposed (or use reverse proxy with nginx)

---

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs <service-name>

# Check disk space
df -h

# Check memory
free -h
```

### Permission issues

```bash
# Fix PostgreSQL permissions
chown -R 999:999 /srv/enterprise-reporting-system/postgres

# Fix Redis permissions
chown -R 999:999 /srv/enterprise-reporting-system/redis

# Fix app permissions
chown -R 1000:1000 /srv/enterprise-reporting-system/app
```

### Can't connect to application

```bash
# Check if container is running
docker compose ps

# Check if port 3000 is exposed
docker compose ps

# Check firewall
ufw status

# Test from inside VPS
curl http://localhost:3000
```

### Out of disk space

```bash
# Clean Docker images
docker image prune -a

# Clean old logs
find /srv/enterprise-reporting-system/app/logs -name "*.log" -mtime +7 -delete

# Clean Docker build cache
docker builder prune -a
```

---

## 📚 Next Steps

1. **Set up SSL/HTTPS** (recommended for production)
2. **Configure domain name** to point to your VPS
3. **Set up nginx reverse proxy** (optional, for port 80/443)
4. **Configure automated backups**
5. **Monitor logs regularly**: `docker compose logs -f`
6. **Keep Docker updated**: `apt-get update && apt-get upgrade -y`

---

## 🆘 Support

For issues:
1. Check logs: `docker compose logs -f`
2. Check container status: `docker compose ps`
3. Review this guide
4. Check full documentation: `DOCKER_HOSTINGER_DEPLOYMENT.md`

---

## 📝 Notes

- **Data Persistence**: All data stored in `/srv/enterprise-reporting-system/` (not inside containers)
- **Container Updates**: Containers can be rebuilt without data loss
- **Backups**: Store `/srv/enterprise-reporting-system/backups/` separately
- **Hostinger Snapshots**: Compatible with bind mount setup
