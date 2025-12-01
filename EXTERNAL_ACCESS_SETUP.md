# External Network Access Setup Guide

This guide explains how to configure Docker to make your CourtMate application accessible from outside your local network.

## Overview

By default, Docker containers are only accessible on `localhost`. To make them accessible externally, you need to:

1. Configure the backend to listen on `0.0.0.0` (all network interfaces)
2. Set up CORS to allow external origins
3. Use nginx as a reverse proxy (recommended for production)
4. Configure SSL/HTTPS (recommended for production)

## Quick Start (Development/Testing)

For quick testing without SSL, you can use the existing `docker-compose.yml` with some modifications:

### Option 1: Direct Port Access (Simple but less secure)

1. **Update your `.env` file** to include:
```env
CORS_ORIGINS=http://YOUR_IP:3000,http://localhost:3000
FRONTEND_URL=http://YOUR_IP:3000
BACKEND_URL=http://YOUR_IP:3001
```

2. **Start Docker Compose:**
```bash
docker-compose up -d
```

3. **Access from external network:**
   - Frontend: `http://YOUR_SERVER_IP:3000`
   - Backend API: `http://YOUR_SERVER_IP:3001/api/v1`

**Note:** Replace `YOUR_SERVER_IP` with your server's public IP address or domain name.

### Option 2: Using Nginx Reverse Proxy (Recommended)

Use the `docker-compose.external.yml` file which includes nginx:

1. **Create/update `.env` file** in the project root:
```env
# Database
DB_USER=courtmate
DB_PASSWORD=your_secure_password
DB_NAME=courtmate_db

# Redis
REDIS_PASSWORD=your_redis_password

# Application URLs (use your domain or IP)
FRONTEND_URL=https://domaincourt.io
BACKEND_URL=https://domaincourt.io
CORS_ORIGINS=https://domaincourt.io,https://www.domaincourt.io

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# Third-party API keys
GOOGLE_MAPS_API_KEY=your-google-maps-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@domaincourt.io
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret

# Optional
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

2. **For HTTP-only access (no SSL):**
   - Update `nginx/nginx.conf` to use `nginx-http.conf` or modify the nginx service in docker-compose to use the HTTP config
   - Or temporarily use `nginx-http.conf` as the main config

3. **Start with external compose file:**
```bash
docker-compose -f docker-compose.external.yml up -d --build
```

4. **Access your application:**
   - Frontend: `http://YOUR_SERVER_IP`
   - Backend API: `http://YOUR_SERVER_IP/api/v1`
   - API Docs: `http://YOUR_SERVER_IP/api/v1/docs`

## Production Setup with SSL/HTTPS

For production, you should use HTTPS with SSL certificates. Here's how:

### Step 1: Get SSL Certificate (Let's Encrypt)

1. **Install Certbot** on your host machine:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot

# Or use Docker
docker run -it --rm certbot/certbot certonly --standalone
```

2. **Get certificate:**
```bash
sudo certbot certonly --standalone -d domaincourt.io -d www.domaincourt.io
```

3. **Certificates will be stored in:**
   - `/etc/letsencrypt/live/domaincourt.io/fullchain.pem`
   - `/etc/letsencrypt/live/domaincourt.io/privkey.pem`

### Step 2: Update Nginx Configuration

1. **Update `nginx/nginx.conf`:**
   - Replace `YOUR_DOMAIN` with your actual domain name
   - Ensure SSL certificate paths are correct

2. **Mount SSL certificates in docker-compose:**
   The `docker-compose.external.yml` already includes volume mounts for SSL certificates:
   ```yaml
   volumes:
     - ./nginx/ssl:/etc/letsencrypt:ro
   ```

   Make sure your certificates are accessible at `./nginx/ssl/live/domaincourt.io/`

### Step 3: Update Environment Variables

Update your `.env` file to use HTTPS:
```env
FRONTEND_URL=https://domaincourt.io
BACKEND_URL=https://domaincourt.io
CORS_ORIGINS=https://domaincourt.io,https://www.domaincourt.io
NEXT_PUBLIC_API_URL=https://domaincourt.io/api/v1
NEXT_PUBLIC_WS_URL=wss://domaincourt.io
```

### Step 4: Start Services

```bash
docker-compose -f docker-compose.external.yml up -d --build
```

### Step 5: Set Up Auto-Renewal

SSL certificates expire every 90 days. Set up auto-renewal:

```bash
# Add to crontab
sudo crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * certbot renew --quiet && docker-compose -f /path/to/docker-compose.external.yml restart nginx
```

## Firewall Configuration

Make sure your firewall allows incoming connections:

### Ubuntu/Debian (UFW)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### CentOS/RHEL (firewalld)
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Windows Firewall
1. Open Windows Defender Firewall
2. Click "Inbound Rules" → "New Rule"
3. Allow ports 80 (HTTP) and 443 (HTTPS)

## Network Configuration

### Router/Port Forwarding

If your server is behind a router/NAT:

1. **Find your server's local IP:**
```bash
# Linux/Mac
ip addr show
# or
ifconfig

# Windows
ipconfig
```

2. **Configure port forwarding on your router:**
   - Port 80 → Your server's local IP
   - Port 443 → Your server's local IP

3. **Access via public IP:**
   - Find your public IP: `curl ifconfig.me`
   - Access: `http://YOUR_PUBLIC_IP`

### Cloud Providers

If using AWS, Azure, GCP, or DigitalOcean:

1. **Security Groups/Firewall Rules:**
   - Allow inbound traffic on ports 80 and 443
   - Allow outbound traffic (usually enabled by default)

2. **Load Balancer (Optional):**
   - Set up a load balancer for high availability
   - Point it to your Docker host on ports 80/443

## Testing External Access

1. **From your local machine:**
```bash
# Test HTTP endpoint
curl http://YOUR_SERVER_IP/api/v1/health/live

# Test HTTPS endpoint (if configured)
curl https://domaincourt.io/api/v1/health/live
```

2. **From a different network:**
   - Use your phone's mobile data
   - Use a friend's network
   - Use an online tool like `https://www.yougetsignal.com/tools/open-ports/`

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find what's using the port
sudo lsof -i :80
sudo lsof -i :443

# Kill the process or change ports in docker-compose
```

### CORS Errors

If you see CORS errors in the browser:

1. **Check CORS_ORIGINS environment variable:**
   - Make sure it includes your frontend URL
   - Use comma-separated list for multiple origins

2. **Check browser console** for the exact origin being blocked

3. **Temporarily allow all origins** (NOT for production):
```env
CORS_ORIGINS=*
```

### WebSocket Connection Issues

If WebSocket connections fail:

1. **Check nginx configuration** - ensure WebSocket upgrade headers are set
2. **Check firewall** - WebSockets use HTTP upgrade, should work on port 80/443
3. **Check CORS** - WebSocket origins must match CORS_ORIGINS

### SSL Certificate Issues

1. **Certificate not found:**
   - Check file paths in nginx.conf
   - Ensure certificates are mounted in docker-compose

2. **Certificate expired:**
   - Renew: `sudo certbot renew`
   - Restart nginx: `docker-compose restart nginx`

## Security Considerations

1. **Never expose database/redis ports** directly to the internet
2. **Use strong passwords** for database and Redis
3. **Enable firewall** on your server
4. **Use HTTPS** in production
5. **Keep Docker images updated** regularly
6. **Monitor logs** for suspicious activity:
```bash
docker-compose logs -f nginx
docker-compose logs -f backend
```

## Next Steps

- Set up monitoring and alerting
- Configure backup strategies
- Set up CI/CD for automated deployments
- Configure load balancing for high availability

## Support

For issues or questions, check:
- Docker logs: `docker-compose logs`
- Nginx logs: `docker-compose logs nginx`
- Backend logs: `docker-compose logs backend`

