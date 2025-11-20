# CourtMate Deployment Guide

This guide covers deployment of the CourtMate Tennis App backend and frontend.

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- Docker and Docker Compose (for containerized deployment)
- Domain name and SSL certificate (for production)

## Environment Setup

### Backend Environment Variables

Create `.env` file in `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/courtmate
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=courtmate

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-strong-secret-key-here
JWT_REFRESH_SECRET=your-strong-refresh-secret-key-here
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=noreply@courtmate.com

# Google Maps
GOOGLE_MAPS_API_KEY=your-api-key

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# App Configuration
NODE_ENV=production
FRONTEND_URL=https://courtmate.com
BACKEND_URL=https://api.courtmate.com
PORT=3001
```

### Frontend Environment Variables

Create `.env.local` file in `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=https://api.courtmate.com
NEXT_PUBLIC_WS_URL=wss://api.courtmate.com
```

## Docker Deployment

### Using Docker Compose

1. **Update docker-compose.yml** with your environment variables

2. **Build and start services:**
```bash
docker-compose up -d --build
```

3. **Run database migrations:**
```bash
docker-compose exec backend npm run migration:run
```

4. **Check logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Manual Docker Deployment

**Backend:**
```bash
cd backend
docker build -t courtmate-backend .
docker run -d \
  --name courtmate-backend \
  -p 3001:3001 \
  --env-file .env \
  courtmate-backend
```

**Frontend:**
```bash
cd frontend
docker build -t courtmate-frontend .
docker run -d \
  --name courtmate-frontend \
  -p 3000:3000 \
  --env-file .env.local \
  courtmate-frontend
```

## Production Deployment

### Backend (NestJS)

#### Option 1: PM2

```bash
# Install PM2
npm install -g pm2

# Build the application
cd backend
npm run build

# Start with PM2
pm2 start dist/main.js --name courtmate-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option 2: Systemd Service

Create `/etc/systemd/system/courtmate-backend.service`:

```ini
[Unit]
Description=CourtMate Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/courtmate/backend
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable courtmate-backend
sudo systemctl start courtmate-backend
```

### Frontend (Next.js)

#### Vercel Deployment (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Manual Deployment

```bash
cd frontend
npm run build
npm run start
```

Or use PM2:
```bash
pm2 start npm --name courtmate-frontend -- start
```

## Database Setup

### PostgreSQL with PostGIS

```bash
# Install PostGIS extension
sudo -u postgres psql -d courtmate -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations
cd backend
npm run migration:run
```

### Redis Setup

```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password (optional but recommended)
requirepass your-redis-password

# Restart Redis
sudo systemctl restart redis
```

## Nginx Reverse Proxy

Create `/etc/nginx/sites-available/courtmate`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.courtmate.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name courtmate.com www.courtmate.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/courtmate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d courtmate.com -d www.courtmate.com -d api.courtmate.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Monitoring

### Health Check Endpoint

The backend includes a health check at `/api/v1/health` (to be implemented).

### Logging

- Backend logs: `backend/logs/` or PM2 logs
- Nginx logs: `/var/log/nginx/`
- System logs: `journalctl -u courtmate-backend`

### Monitoring Tools

- **PM2 Monitoring**: `pm2 monit`
- **Sentry**: Error tracking (configured in code)
- **Winston**: Structured logging

## Backup Strategy

### Database Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U user -d courtmate > /backups/courtmate_$DATE.sql
```

### Redis Backup

```bash
# Redis persistence is configured in redis.conf
# RDB snapshots are created automatically
```

## Scaling

### Horizontal Scaling

1. **Backend**: Use load balancer (Nginx/HAProxy) with multiple instances
2. **Redis**: Use Redis Cluster or Sentinel for high availability
3. **Database**: Use read replicas for read-heavy workloads
4. **Socket.IO**: Use Redis adapter (already configured)

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Use connection pooling

## Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Set secure Redis password
- [ ] Use strong database passwords
- [ ] Enable firewall (UFW)
- [ ] Keep dependencies updated
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Regular security audits

## Troubleshooting

### Backend won't start
- Check environment variables
- Verify database connection
- Check Redis connection
- Review logs: `pm2 logs courtmate-backend`

### Database connection errors
- Verify PostgreSQL is running
- Check connection string
- Verify PostGIS extension is installed
- Check firewall rules

### Redis connection errors
- Verify Redis is running: `redis-cli ping`
- Check Redis password
- Verify firewall rules

### Frontend build errors
- Check Node.js version (18+)
- Clear `.next` directory
- Check environment variables

## Rollback Procedure

1. **Database**: Restore from backup
2. **Code**: Revert to previous Git commit
3. **Docker**: Use previous image tag
4. **PM2**: `pm2 restart courtmate-backend`

## Maintenance

### Regular Tasks

- Weekly: Review logs and errors
- Monthly: Update dependencies
- Quarterly: Security audit
- Annually: Infrastructure review

### Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run migrations
npm run migration:run

# Restart services
pm2 restart courtmate-backend
pm2 restart courtmate-frontend
```

## Support

For issues or questions:
- Check logs first
- Review API documentation: `/api/v1/docs`
- Check GitHub issues
- Contact development team

