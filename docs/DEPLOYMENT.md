# Deployment Guide

Complete step-by-step guide to deploy the three-tier application.

## 📋 Pre-Deployment Checklist

- [ ] All code committed to Git
- [ ] No sensitive data in version control
- [ ] Environment variable examples created
- [ ] Database schema verified
- [ ] API endpoints tested locally
- [ ] Frontend builds without errors
- [ ] All dependencies documented

## 🚀 Phase 1: Database Setup

### Option A: Render PostgreSQL (Recommended)
Render provides managed PostgreSQL via `render.yaml`

### Option B: Self-Hosted PostgreSQL

**On AWS RDS:**
1. Create RDS PostgreSQL instance
2. Set security group to allow backend IP
3. Get connection string
4. Run schema migration:
```bash
psql -h your-db-host -U admin -d postgres -f database/schema/init.sql
```

**Local for Development:**
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Windows
# Download from postgresql.org
# Run installer

# Linux
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Initialize Schema

```bash
# Create database and user
psql -U postgres
CREATE DATABASE pakistan_campaign;
CREATE USER campaign_user WITH PASSWORD 'skuevolve_1234';
GRANT ALL ON DATABASE pakistan_campaign TO campaign_user;

# Create tables
psql -U postgres -d pakistan_campaign < database/schema/init.sql

# Migrate data
cd backend
python migrate_csv_to_db.py
python seed_campaigns.py
```

## 🔌 Phase 2: Backend Deployment (Render)

### Step 1: GitHub Setup

```bash
cd /path/to/pakistan-campaign-planner

# Initialize git if not already
git init
git add .
git commit -m "Initial commit: three-tier architecture"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/pakistan-campaign-planner.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub account
3. Authorize Render access to your repositories

### Step 3: Create Web Service

1. **Dashboard** → **New +** → **Web Service**
2. **Connect Repository**
   - Select `pakistan-campaign-planner`
3. **Settings**
   - Name: `pakistan-campaign-api`
   - Environment: `Python 3`
   - Region: Choose closest to users
   - Build command: (Leave - auto-detected from render.yaml)
   - Start command: (Leave - auto-detected from render.yaml)
4. **Advanced**
   - Enable Auto-Deploy: Yes
5. **Create Web Service**

Render will automatically use values from `render.yaml`.

### Step 4: Create PostgreSQL Database

In Render dashboard:
1. **New +** → **Database** → **PostgreSQL**
2. **Settings**
   - Name: `pakistan-campaign-db`
   - Database: `pakistan_campaign`
   - User: (auto-generated)
   - Region: Same as web service
   - Plan: `Standard` (free-tier available)
3. **Create Database**

### Step 5: Connect Web Service to Database

In Web Service settings:
1. **Environment** → Add variable
   - `DATABASE_URL` = (Copy from Postgres instance)

### Step 6: Run Migrations on Render

1. Click Web Service → **Shell**
2. Run migrations:
```bash
python backend/migrate_csv_to_db.py
python backend/seed_campaigns.py
```

3. Verify:
```bash
curl https://your-service.onrender.com/api/health
# Should return: {"status": "healthy", ...}
```

**Note Service URL** (e.g., `https://pakistan-campaign-api.onrender.com`)

## 🖼️ Phase 3: Frontend Deployment (Cloudflare Pages)

### Step 1: Create Cloudflare Account
1. Go to https://cloudflare.com
2. Sign up with email
3. Verify email

### Step 2: Add GitHub Connection

1. In Cloudflare dashboard → **Pages**
2. **Create project** → **Connect to Git**
3. Authorize GitHub
4. Select repository: `pakistan-campaign-planner`

### Step 3: Configure Build Settings

1. **Project name**: `pakistan-campaign-dashboard`
2. **Framework**: React
3. **Build command**: `npm run build --prefix frontend`
4. **Build output directory**: `frontend/build`
5. **Environment variables**:
   - Key: `REACT_APP_API_URL`
   - Value: `https://pakistan-campaign-api.onrender.com` (from Step 2.6)
6. **Create account and deploy**

Wait for initial build (3-5 minutes).

### Step 4: Verify Deployment

1. Cloudflare will assign subdomain: `pakistan-campaign-dashboard.pages.dev`
2. Visit URL and test:
   - Page loads without errors
   - Campaign data displays
   - API calls successful

**Note**: Cloudflare subdomain for testing before custom domain

## 🔗 Phase 4: Connect Custom Domain (Optional)

### Add Custom Domain to Frontend

1. **Cloudflare Pages** → Your project → **Custom domains**
2. **Setup custom domain**
   - e.g., `dashboard.pakistan-campaigns.com`
3. **Verify DNS** - Point your domain registrar to Cloudflare nameservers

### Connect Custom Domain to Backend

1. **Render** → Your service → **Settings**
2. **Custom domains** → Add domain
   - e.g., `api.pakistan-campaigns.com`
3. Update frontend `.env` to use custom domain

## 🔐 Phase 5: Security Configuration

### Backend Security

1. **Render** → Web Service → **Environment**
   - Set strong `SECRET_KEY`
   - Set `FLASK_ENV=production`
   - Set `CORS_ORIGINS` to your Cloudflare domain
   - Example: `https://dashboard.pakistan-campaigns.com`

2. **Database Security**
   - Use strong password for `campaign_user`
   - Enable SSL for connections
   - Restrict access to backend service only

### Frontend Security

1. **Cloudflare** → Pages → Settings
   - Enable email obfuscation
   - Enable security headers
   - Set CSP headers

2. **GitHub Secrets** (for CI/CD)
   - Store API tokens securely
   - Never commit `.env` files

## ✅ Phase 6: Post-Deployment Testing

### Verify Backend

```bash
# Health check
curl https://api.pakistan-campaigns.com/api/health

# Get campaigns
curl https://api.pakistan-campaigns.com/api/campaigns

# Get inventory
curl https://api.pakistan-campaigns.com/api/inventory
```

### Verify Frontend

1. Visit https://dashboard.pakistan-campaigns.com
2. Check browser console for errors
3. Navigate all features:
   - Load campaign dashboard
   - View forecasts
   - Use campaign planner
   - Generate SKU mix
   - Test with different filters

### Performance Testing

1. **Render** → Metrics → Check CPU/Memory
2. **Cloudflare** → Analytics → Check response times
3. **Frontend** → DevTools → Network → Check bundle sizes

## 📊 Phase 7: Monitoring & Maintenance

### Set Up Alerts

**Render:**
1. Web Service → **Notifications**
2. Enable alerts for:
   - Deploy failures
   - Memory/CPU limits
   - Database connection issues

**Cloudflare:**
1. Pages → **Notifications**
2. Enable alerts for build failures

### Regular Maintenance

- **Daily**: Check error logs in Render
- **Weekly**: Monitor database size
- **Monthly**: Review performance metrics
- **Quarterly**: Update dependencies
  ```bash
  cd backend
  pip list --outdated
  cd ../frontend
  npm outdated
  ```

### Backup Strategy

```bash
# Weekly PostgreSQL backups
pg_dump -h your-db-host -U admin -d pakistan_campaign > backup-$(date +%Y%m%d).sql

# Store backups in S3 (Render provides automatic backups)
```

## 🆘 Troubleshooting Deployment

### "Build failed" on Cloudflare Pages
- Check build logs in Cloudflare dashboard
- Verify `frontend/build` directory exists after local `npm run build`
- Check `REACT_APP_API_URL` is set in environment

### "Cannot connect to database" on Render
- Verify `DATABASE_URL` is set in environment variables
- Confirm PostgreSQL instance started and healthy
- Check firewall allows connection from web service IP

### "API returns 500 errors" 
- Check Render service logs: **Web Service** → **Logs**
- Verify Flask app initializes without errors
- Check database migrations ran successfully

### "CORS error" in browser
- Verify `CORS_ORIGINS` includes frontend domain
- Check backend `app/__init__.py` CORS configuration
- Ensure preflight requests (OPTIONS) are handled

### "API calls timeout"
- Check Render service metrics for overload
- Consider upgrading Render plan
- Optimize slow database queries
- Check network connectivity

## 📞 Support Resources

- [Render Documentation](https://render.com/docs)
- [Cloudflare Pages Guide](https://developers.cloudflare.com/pages/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Flask Deployment](https://flask.palletsprojects.com/deployment/)

---

**Congratulations!** Your three-tier application is now live in production.
