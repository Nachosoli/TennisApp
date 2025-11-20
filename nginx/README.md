# Nginx Configuration for CourtMate

This directory contains nginx reverse proxy configurations for exposing the CourtMate application externally.

## Files

- `nginx.conf` - Production configuration with SSL/HTTPS support
- `nginx-http.conf` - Development/testing configuration (HTTP only, no SSL)

## Quick Setup

### For HTTP-only (Development/Testing)

1. Update `docker-compose.external.yml` to use `nginx-http.conf`:
```yaml
volumes:
  - ./nginx/nginx-http.conf:/etc/nginx/nginx.conf:ro
```

2. Or rename `nginx-http.conf` to `nginx.conf` temporarily

### For HTTPS (Production)

1. **Get SSL certificates** using Let's Encrypt:
```bash
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

2. **Create SSL directory structure:**
```bash
mkdir -p nginx/ssl/live/your-domain.com
```

3. **Copy certificates:**
```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/live/your-domain.com/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/live/your-domain.com/
sudo chmod 644 nginx/ssl/live/your-domain.com/fullchain.pem
sudo chmod 600 nginx/ssl/live/your-domain.com/privkey.pem
```

4. **Update `nginx.conf`:**
   - Replace `YOUR_DOMAIN` with your actual domain name

5. **Create certbot challenge directory:**
```bash
mkdir -p nginx/www
```

## Configuration Details

### Rate Limiting

- API endpoints: 10 requests/second with burst of 20
- WebSocket endpoints: 5 requests/second with burst of 10

### Security Headers

The HTTPS configuration includes:
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

### WebSocket Support

All WebSocket endpoints (`/socket.io`, `/chat`, `/matches`, `/notifications`) are configured with:
- Upgrade headers
- Long timeouts (7 days)
- Proper connection handling

## Troubleshooting

### Check nginx logs:
```bash
docker-compose logs nginx
```

### Test nginx configuration:
```bash
docker-compose exec nginx nginx -t
```

### Reload nginx:
```bash
docker-compose exec nginx nginx -s reload
```
