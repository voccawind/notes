# Self-Hosting Guide

This guide will help you deploy ORBIT Notes on your own infrastructure.

## Quick Start

The fastest way to self-host ORBIT Notes:

```bash
# Clone the repository
git clone https://github.com/orbit-notes/orbit.git
cd orbit/docker

# Configure environment
cp ../.env.example .env
nano .env  # Edit configuration (set JWT_SECRET!)

# Generate a secure JWT secret
openssl rand -base64 32

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Access the app
open http://localhost:80
```

## Configuration

### Essential Settings

Edit `.env` and configure these essential settings:

```env
# REQUIRED: Change this in production!
JWT_SECRET=your-secure-random-string-here

# Optional: Customize ports
PORT=4000

# Optional: Data storage location
DATA_PATH=./data
```

### Advanced Configuration

#### Enable HTTPS

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Place certificates in `docker/certs/`
3. Uncomment the HTTPS block in `docker/nginx.conf`
4. Restart: `docker-compose restart nginx`

#### Custom Domain

Update `docker-compose.yml`:

```yaml
services:
  nginx:
    environment:
      - VIRTUAL_HOST=notes.yourdomain.com
      - LETSENCRYPT_HOST=notes.yourdomain.com
      - LETSENCRYPT_EMAIL=you@yourdomain.com
```

## System Requirements

### Minimum

- CPU: 1 core
- RAM: 512 MB
- Storage: 1 GB + your data
- OS: Linux (Ubuntu 20.04+ recommended)

### Recommended

- CPU: 2 cores
- RAM: 2 GB
- Storage: 10 GB SSD
- OS: Linux with Docker

## Backup & Restore

### Backup

```bash
# Stop the server
docker-compose stop server

# Backup data directory
tar -czf orbit-backup-$(date +%Y%m%d).tar.gz data/

# Restart
docker-compose start server
```

### Restore

```bash
# Stop services
docker-compose down

# Restore data
tar -xzf orbit-backup-YYYYMMDD.tar.gz

# Restart
docker-compose up -d
```

## Updating

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose build

# Restart services
docker-compose up -d

# Clean old images
docker image prune
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check port conflicts
netstat -tulpn | grep -E ':(80|443|3000|4000)'
```

### Data not syncing

1. Check server logs: `docker-compose logs server`
2. Verify DATA_PATH is writable
3. Check network connectivity
4. Review sync configuration in web app

### Performance issues

1. Increase Docker resource limits
2. Use SSD for data storage
3. Enable nginx caching
4. Review application logs for bottlenecks

## Security Hardening

### Essential Steps

1. **Change default JWT secret** (use `openssl rand -base64 32`)
2. **Enable HTTPS** (required for production)
3. **Set up firewall** (allow only 80/443)
4. **Regular updates** (weekly security patches)
5. **Enable automatic backups**

### Optional Enhancements

- Set up fail2ban for brute-force protection
- Use a reverse proxy (Cloudflare, nginx)
- Enable rate limiting
- Implement IP whitelisting
- Use Docker secrets instead of .env files

## Single-User Mode

For personal use, you can simplify the setup:

```yaml
# docker-compose.yml
services:
  server:
    environment:
      - SINGLE_USER=true  # Skip authentication
      - NO_SIGNUP=true    # Disable registration
```

**Warning**: Only use single-user mode on trusted networks!

## Support

- GitHub Issues: https://github.com/orbit-notes/orbit/issues
- Community Discord: https://discord.gg/orbit-notes
- Email: support@orbitnotes.app
