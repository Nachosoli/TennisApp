# CourtMate Access URLs

## ✅ Your Application is Now Accessible!

### 🌐 **Access URLs:**

#### **Local Network Access (Same WiFi/LAN):**
- **Frontend:** http://192.168.1.65:3002
- **Backend API:** http://192.168.1.65:3001/api/v1
- **API Documentation:** http://192.168.1.65:3001/api/v1/docs

#### **Public Internet Access:**
- **Frontend:** http://107.139.214.38:3002
- **Backend API:** http://107.139.214.38:3001/api/v1
- **API Documentation:** http://107.139.214.38:3001/api/v1/docs

#### **Localhost Access (On this machine only):**
- **Frontend:** http://localhost:3002
- **Backend API:** http://localhost:3001/api/v1

---

## 📋 **Quick Status Check:**

```bash
# Check container status
docker ps

# View backend logs
docker-compose logs backend -f

# View frontend logs
docker-compose logs frontend -f

# Restart services
docker-compose restart
```

---

## 🔧 **Configuration:**

- **Local IP:** 192.168.1.65
- **Public IP:** 107.139.214.38
- **Frontend Port:** 3002 (mapped from container port 3000)
- **Backend Port:** 3001
- **Database Port:** 5432 (not exposed externally for security)
- **Redis Port:** 6379 (not exposed externally for security)

---

## ⚠️ **Important Notes:**

1. **Port 3000 was already in use**, so frontend is running on **port 3002**
2. **Firewall:** Make sure your Windows Firewall allows incoming connections on ports 3001 and 3002
3. **Router:** If accessing from outside your network, configure port forwarding on your router:
   - Port 3001 → Your server IP (192.168.1.65)
   - Port 3002 → Your server IP (192.168.1.65)
4. **Database:** There may be a migration issue. Run migrations manually if needed:
   ```bash
   docker-compose exec backend npm run migration:run
   ```

---

## 🔒 **Security Recommendations:**

For production use:
1. Set up SSL/HTTPS (see `EXTERNAL_ACCESS_SETUP.md`)
2. Use nginx reverse proxy (see `docker-compose.external.yml`)
3. Change default passwords in `.env` file
4. Don't expose database/Redis ports externally (already configured)

---

## 📞 **Troubleshooting:**

If you can't access from another device:
1. Check Windows Firewall settings
2. Verify containers are running: `docker ps`
3. Check logs: `docker-compose logs`
4. Try accessing from the same machine first: http://localhost:3002

