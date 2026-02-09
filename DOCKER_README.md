# Docker Deployment Quick Reference

Complete Docker setup for deploying the Enterprise Reporting System on Hostinger VPS with persistent bind mounts.

## 📁 Files Created

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Main Docker Compose configuration |
| `Dockerfile` | Production container image |
| `.env.docker.production` | Environment variables template |
| `scripts/setup-hostinger.sh` | VPS setup script |
| `scripts/backup-hostinger.sh` | Automated backup script |
| `DOCKER_HOSTINGER_DEPLOYMENT.md` | Complete deployment guide |

## 🚀 Quick Start

### 1. Local Testing

```bash
# Build and test locally
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

### 2. Deploy to Hostinger VPS

```bash
# Upload setup script
scp scripts/setup-hostinger.sh root@your-vps-ip:/root/

# SSH and setup
ssh root@your-vps-ip
chmod +x setup-hostinger.sh
sudo ./setup-hostinger.sh

# Upload app files
exit
scp -r docker-compose.yml .next package.json root@your-vps-ip:/srv/enterprise-reporting-system/

# SSH back and configure
ssh root@your-vps-ip
cd /srv/enterprise-reporting-system
cp .env.docker.production .env
nano .env  # Edit required values

# Start application
docker compose up -d
```

## 🔑 Required Environment Variables

Generate these before deploying:

```bash
# Authentication secret
openssl rand -base64 32

# Encryption key
openssl rand -hex 32
```

Update in `.env`:
- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `ENCRYPTION_KEY`

## 📊 Data Storage

All data stored at `/srv/enterprise-reporting-system/` on VPS:

```
/srv/enterprise-reporting-system/
├── postgres/data/     # Database files
├── redis/data/        # Redis snapshots
├── app/
│   ├── data/          # SQLite configs
│   ├── job-outputs/   # Generated reports
│   ├── uploads/       # User files
│   └── logs/          # Application logs
└── backups/           # Automated backups
```

## 🔧 Common Commands

```bash
# View running containers
docker compose ps

# View logs
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis

# Restart services
docker compose restart

# Rebuild and restart
docker compose up -d --build

# Stop all services
docker compose down

# Execute commands in container
docker exec -it ers-postgres psql -U ersuser enterprise_reporting
```

## 💾 Backup

### Manual Backup

```bash
# On VPS
cd /srv/enterprise-reporting-system
tar -czf backup-$(date +%Y%m%d).tar.gz postgres/ redis/ app/

# Download to local
scp root@your-vps-ip:/srv/enterprise-reporting-system/backup-*.tar.gz ./
```

### Automated Backups

```bash
# Setup automated backups
scp scripts/backup-hostinger.sh root@your-vps-ip:/usr/local/bin/ers-backup.sh
ssh root@your-vps-ip
chmod +x /usr/local/bin/ers-backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/ers-backup.sh
```

## 🔍 Troubleshooting

### Container won't start

```bash
docker compose logs <service-name>
docker compose ps
```

### Permission issues

```bash
# Fix permissions
chown -R 999:999 /srv/enterprise-reporting-system/postgres
chown -R 999:999 /srv/enterprise-reporting-system/redis
chown -R 1000:1000 /srv/enterprise-reporting-system/app
```

### Database connection

```bash
docker exec ers-postgres psql -U ersuser -d enterprise_reporting -c "SELECT 1;"
```

### Out of disk space

```bash
df -h
du -sh /srv/enterprise-reporting-system/* | sort -hr
```

## 📚 Full Documentation

See `DOCKER_HOSTINGER_DEPLOYMENT.md` for:
- Complete architecture details
- Step-by-step deployment guide
- Backup and restore procedures
- Monitoring and maintenance
- Security best practices
- Performance tuning
- Troubleshooting guide

## 🔒 Security Checklist

- [ ] Changed all default passwords
- [ ] Generated secure AUTH_SECRET
- [ ] Generated secure ENCRYPTION_KEY
- [ ] Set up firewall (UFW)
- [ ] Installed SSL certificates (Let's Encrypt)
- [ ] Configured automated backups
- [ ] Set up log monitoring
- [ ] Enabled automatic security updates

## 🆘 Support

For issues or questions:
1. Check `DOCKER_HOSTINGER_DEPLOYMENT.md`
2. Review container logs: `docker compose logs -f`
3. Check service status: `docker compose ps`

## 📝 Notes

- **Bind mounts** ensure data persists outside containers
- **Hostinger snapshots** work alongside bind mounts
- **Backups** stored separately in `/srv/.../backups/`
- **Updates** don't affect data (just rebuild containers)
