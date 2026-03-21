# Database - PostgreSQL Schema

Production database schema and migration scripts.

## 📦 Technology
- **Database**: PostgreSQL 12+
- **ORM**: SQLAlchemy (Python)
- **Migrations**: Alembic (future)

## 🗃️ Schema Overview

### Tables

**sales_data** - Raw transaction history
- Imported from `daraz_pak_data.csv`
- Indexed by SKU and date for performance
- Unique constraint on (sku, date)

**campaigns** - Campaign master data
- Campaign name, dates, projected volume
- Strategy and action items
- Status tracking

**campaign_products** - Hero products per campaign
- Links campaigns to top-selling SKUs
- Includes category and rank (1-10)
- Expected sales estimates

**campaign_forecasts** - Time-series forecast data
- Historical and forecasted GMV
- Confidence bounds (upper/lower)
- One record per campaign per day

**inventory** - Stock levels by warehouse
- SKU, warehouse location, supplier
- Cost price and MSRP
- Current quantities (on-hand, reserved)
- Reorder points and lead times

**simulation_results** - Cached scenario simulations
- Scenario parameters (discount %, demand multiplier)
- Stockout days per SKU
- Total revenue impact
- Used for performance optimization

## 🚀 Setting Up PostgreSQL

### Local Development

```bash
# Windows: Download PostgreSQL from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql@14
# Linux: sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
# Windows: psql -U postgres
# macOS/Linux: psql postgres

# Create database
CREATE DATABASE pakistan_campaign;
CREATE USER campaign_user WITH PASSWORD 'secure_password';
ALTER ROLE campaign_user SET client_encoding TO 'utf8';
ALTER ROLE campaign_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE campaign_user SET default_transaction_deferrable TO ON;
GRANT ALL PRIVILEGES ON DATABASE pakistan_campaign TO campaign_user;
```

### Initialize Schema

```bash
# From project root
psql -U postgres -d pakistan_campaign -f database/schema/init.sql

# Verify tables created
psql -U postgres -d pakistan_campaign -c "\dt"
```

## 📊 Data Import

### Import Sales Data from CSV

```bash
cd backend
python migrate_csv_to_db.py
```

This script:
1. Reads `daraz_pak_data.csv`
2. Normalizes column names
3. Inserts into `sales_data` table
4. Indexes for query performance

### Seed Campaigns from JSON

```bash
cd backend
python seed_campaigns.py
```

This script:
1. Reads `frontend/src/dashboard_data.json`
2. Creates campaign records
3. Inserts hero products and categories
4. Populates forecast time-series

## 🔍 Useful Queries

### See top-selling SKUs
```sql
SELECT sku, SUM(sales_quantity) as total_units
FROM sales_data
GROUP BY sku
ORDER BY total_units DESC
LIMIT 20;
```

### Check inventory value by SKU
```sql
SELECT sku, qty_on_hand * cost_price as inventory_value
FROM inventory
ORDER BY inventory_value DESC;
```

### Find low-stock items
```sql
SELECT sku, qty_on_hand, reorder_point
FROM inventory
WHERE qty_on_hand <= reorder_point;
```

### Campaign sales forecast
```sql
SELECT campaign_id, date, historical_gmv, forecasted_gmv
FROM campaign_forecasts
WHERE campaign_id = 1
ORDER BY date;
```

## 🔐 Backup & Restore

### Backup Database

```bash
# Backup entire database
pg_dump -U postgres -d pakistan_campaign > backup.sql

# Backup with data only
pg_dump -U postgres -d pakistan_campaign --data-only > data-backup.sql
```

### Restore Database

```bash
# Drop and recreate
dropdb -U postgres pakistan_campaign
createdb -U postgres pakistan_campaign

# Restore from backup
psql -U postgres -d pakistan_campaign < backup.sql
```

## 📈 Performance Optimization

### Indexes Created
- `sales_data(sku)` - Fast SKU lookups
- `sales_data(date)` - Time-range queries
- `campaign_products(campaign_id)` - Hero products by campaign
- `campaign_forecasts(campaign_id, date)` - Forecast lookups
- `inventory(sku)` - SKU inventory lookups
- `simulation_results(campaign_id)` - Cache hits

### Query Tips
- Always use campaign_id index when available
- Filter by date range for large result sets
- Use EXPLAIN ANALYZE for slow queries
- Archive old sales_data after 2+ years

## 🚢 Production Deployment

### On Render
- PostgreSQL addon automatically provisioned
- Connection string available as `DATABASE_URL`
- Automated backups to S3
- Read replicas available for scaling

### On AWS RDS
- Create RDS PostgreSQL instance
- Set inbound rules for backend IP
- Update `DATABASE_URL` in environment
- Enable automated backups and multi-AZ

## 🔄 Migrations (Future)

When ready to implement Alembic:

```bash
# Initialize Alembic
alembic init migrations

# Create migration after model changes
alembic revision --autogenerate -m "Add new column"

# Apply migrations
alembic upgrade head

# Downgrade if needed
alembic downgrade -1
```

## 📝 Maintenance Checklist

- [ ] Daily: Monitor backup completion
- [ ] Weekly: Review slow query logs
- [ ] Monthly: Analyze table statistics (`ANALYZE;`)
- [ ] Quarterly: Archive old data
- [ ] Yearly: Upgrade PostgreSQL version
