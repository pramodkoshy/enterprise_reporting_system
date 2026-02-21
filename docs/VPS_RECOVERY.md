# VPS Recovery Instructions

## Current Situation
- VPS shows as "Running" in Hostinger panel
- VPS is **completely inaccessible** from external networks (no ping, SSH, or HTTP)
- Docker image has been built locally and is ready to deploy
- Deployment script has been updated

## Immediate Actions Required

### Option 1: Access Hostinger Console (Recommended)

1. **Open Hostinger Panel**
   - Go to VPS section
   - Click "Console" or "Launch VNC" button
   - This gives direct terminal access regardless of SSH/network issues

2. **Run Diagnostic Script**
   ```bash
   # Download and run diagnostic
   curl -o /tmp/diagnose.sh https://raw.githubusercontent.com/your-repo/scripts/diagnose-vps.sh
   chmod +x /tmp/diagnose.sh
   /tmp/diagnose.sh
   ```

3. **Common Fixes**

   **If SSH is not running:**
   ```bash
   systemctl restart ssh
   systemctl enable ssh
   ```

   **If network is down:**
   ```bash
   systemctl restart networking
   # OR restart network service
   systemctl restart NetworkManager
   ```

   **If firewall is blocking:**
   ```bash
   ufw allow 22/tcp
   ufw allow 3000/tcp
   ufw allow 5432/tcp
   ufw allow 6379/tcp
   ufw reload
   ```

   **If Docker isn't running:**
   ```bash
   systemctl restart docker
   systemctl enable docker
   ```

### Option 2: Force Restart VPS

1. In Hostinger panel:
   - Go to VPS → Power
   - Click "Force Restart" (not graceful restart)
   - Wait 3-5 minutes for full boot

2. Try connecting again:
   ```bash
   ping 148.135.137.110
   ssh root@148.135.137.110
   ```

### Option 3: Check Hostinger Firewall

1. In Hostinger panel:
   - Go to VPS → Firewall
   - Ensure these rules exist:
     - Port 22 (SSH) - Allow
     - Port 3000 (HTTP) - Allow
     - Port 5432 (PostgreSQL) - Allow
     - Port 6379 (Redis) - Allow
   - Protocol: TCP
   - Source: Any (0.0.0.0/0)

## Once VPS is Accessible

Run the deployment script:
```bash
./scripts/deploy-to-hostinger.sh root@148.135.137.110
```

This will:
1. Build Docker image locally for AMD64
2. Upload image to VPS
3. Start all containers (PostgreSQL, Redis, Application)

## After Deployment

1. **Initialize database:**
   ```bash
   curl -X POST http://148.135.137.110:3000/api/setup
   ```

2. **Access application:**
   - URL: http://148.135.137.110:3000
   - Default login will be created after first access

3. **View logs:**
   ```bash
   ssh root@148.135.137.110
   cd /srv/enterprise-reporting-system
   docker compose logs -f
   ```

## Files Updated

✅ `scripts/deploy-to-hostinger.sh` - Updated to build locally and upload image
✅ `scripts/diagnose-vps.sh` - Created for VPS diagnostics from console
✅ `src/app/api/setup/route.ts` - Created for database initialization

## Troubleshooting

**If you can access console but not SSH:**
- Check SSH is running: `systemctl status ssh`
- Restart SSH: `systemctl restart ssh`
- Check firewall: `ufw status`

**If containers won't start:**
- Check Docker is running: `systemctl status docker`
- Check logs: `docker compose logs`
- Restart Docker: `systemctl restart docker`

**If database initialization fails:**
- Check app logs: `docker compose logs app`
- Verify database file exists: `ls -la /srv/enterprise-reporting-system/app/data/`
- Re-run setup: `curl -X POST http://148.135.137.110:3000/api/setup`
