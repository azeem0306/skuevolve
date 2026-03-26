# SKUEvolve Project Guide

This document explains the full system architecture, backend calculations, frontend behavior, and how all modules connect.

## What This Project Is

SKUEvolve is a campaign planning and operations dashboard system with role-based access control.

Core goals:
- Forecast and compare campaign opportunity windows.
- Rank campaign hero products using demand and inventory risk signals.
- Support campaign planning workflows (SKU mix, simulator, launch).
- Run a live operations War Room for intervention and monitoring.
- Enforce permissions by user role (Operation Executive, Planner, Manager, Admin).

## Architecture

Three-layer architecture:
- Frontend: React application in [../frontend/src](../frontend/src)
- Backend/data pipeline: Python scripts and Flask API in [../backend](../backend)
- Data storage: CSV/JSON artifacts plus local SQLite for API persistence

Primary generated data files:
- Campaign output: [../frontend/src/dashboard_data.json](../frontend/src/dashboard_data.json)
- Inventory output: [../frontend/src/inventory_data.json](../frontend/src/inventory_data.json)
- War room mock DB: [../frontend/public/mockdb/war_room_db.json](../frontend/public/mockdb/war_room_db.json)

## Backend Logic and Calculations

Main calculation pipeline is in [../backend/scripts/build_dashboard.py](../backend/scripts/build_dashboard.py).

### 0) Campaign-level GMV forecast (Prophet)

The backend builds a daily GMV time series and trains Prophet:
- Input series: `ds=order_date`, `y=sum(sales per day)`
- Model config: yearly seasonality on, daily seasonality off, interval width 95%
- Horizon: 365 future days

For each campaign window, the script picks the highest `yhat` value inside the campaign date window:
- New Year / Valentine / Halloween / Christmas each use month, day, and +/- window rules.
- If no future-window row exists, it falls back to historical rows in the same window.

Output fields:
- `projected_volume`: selected peak `yhat` converted to integer
- `peak_date`: date of the selected `yhat`

Also stored for planning context:
- `observed_lift_multiplier = holiday_window_daily_mean / baseline_daily_mean`
- `campaign_lift_multiplier` (planned) = clipped `max(2.0, observed_lift_multiplier * 1.35)` in range `[2.0, 5.0]`

### 1) Campaign lift logic

The pipeline computes event lift and stores two values:
- Observed lift: based on historical event-window behavior vs comparable baseline.
- Planned lift: target multiplier used for campaign planning (business target representation).

Conceptually:
- Build daily GMV series by date.
- Compare event window GMV to non-event baseline period.
- Derive observed ratio and then derive or clip a planned multiplier for planning output.

### 2) Product ranking and inventory-aware scoring

For each candidate SKU, metrics are combined to prioritize hero products.

Typical metric set includes:
- Demand velocity
- Stock pressure
- Stockout days
- Lead time days
- Margin indicators
- Inventory health and risk signals

The resulting priority score determines which products are selected in top hero products for each campaign.

### 3) Forecast quantities for planner tables

Frontend planning rows use campaign-level and item-level values from generated data:
- baseline units
- campaign lift multiplier
- demand velocity
- discount effect assumptions

This yields per-SKU forecasted unit estimates used in Campaign Planner and simulator.

The planner formula is:

- `forecast_units = round(baseline_units * campaign_lift_multiplier * discount_boost * demand_factor)`

Where:
- `baseline_units` comes from `avg_units_per_product_baseline`
- `campaign_lift_multiplier` comes from planned lift in campaign output
- `discount_boost` is a planner constant (currently 1.2)
- `demand_factor = 0.8 + (demand_velocity * 0.4)`

Simulator stockout estimate uses:

- `adjusted_demand_units = forecast_units * (1 + (discount_pct/100) * 0.5)`
- `daily_demand_units = adjusted_demand_units / 30`
- `stockout_days = inventory_qty / daily_demand_units`

### 4) Inventory pipeline

Inventory data is generated and transformed with:
- [../backend/scripts/generate_inventory.py](../backend/scripts/generate_inventory.py)
- [../backend/scripts/generate_inventory_json.py](../backend/scripts/generate_inventory_json.py)

Outputs are consumed directly by frontend for risk and availability displays.

### 5) Optional Flask API layer

Flask routes live under [../backend/app/routes](../backend/app/routes) and expose campaign, inventory, and health endpoints.

If API is unavailable, selected frontend experiences have graceful fallbacks.

## Frontend Behavior

Main app routes are configured in [../frontend/src/App.js](../frontend/src/App.js).

### 1) Authentication and role-based access

Auth context is implemented in [../frontend/src/context/AuthContext.js](../frontend/src/context/AuthContext.js).

Seeded roles:
- Operation Executive
- Campaign Planner
- Campaign Manager
- Admin

### Local Demo Credentials

For local demos, use the seeded users from [../frontend/src/context/AuthContext.js](../frontend/src/context/AuthContext.js).

| Role | Name | Email | Password |
|------|------|-------|----------|
| Operations Executive | Amal Perera | amal.perera@skuevolve.com | amal123 |
| Campaign Planner | Kavindu Vihanga | kavindu.vihanga@skuevolve.com | kavindu123 |
| Campaign Manager | Azeem Rashard | azeem.rashard@skuevolve.com | azeem123 |
| Admin | Mohomed Amir | mohomed.amir@skuevolve.com | admin123 |

Notes:
- These are local demo credentials only.
- If users were edited in Manage Users, localStorage may override defaults.
- To reset to defaults, clear `skuevolve_users` and `skuevolve_session` in browser localStorage and reload.

Permission model controls:
- Scenario Simulator access
- Campaign launch and delete actions
- War Room intervention actions
- Manage Users access

### 2) Main layout and navigation

Shared shell is [../frontend/src/components/AppLayout.js](../frontend/src/components/AppLayout.js):
- Theme switch
- User chip
- Role-aware navigation (includes Manage Users for admin)

### 3) Dashboard page

Dashboard in [../frontend/src/campaignDashboard.js](../frontend/src/campaignDashboard.js):
- Peak traffic and GMV cards
- Stockout risk card
- Top movers list
- Planned campaigns list (local storage key: planned_campaigns)
- Campaign delete action based on permissions

### 4) Campaign Planner page

Planner in [../frontend/src/pages/CampaignPlanner.js](../frontend/src/pages/CampaignPlanner.js):
- Campaign and category selection
- SKU mix generation
- Launch campaign (permission-gated)
- Scenario simulator (permission-gated)
- Push notification tooling
- CSV export

### 5) War Room page

War Room in [../frontend/src/pages/WarRoom.js](../frontend/src/pages/WarRoom.js):
- Live pacing metrics
- Velocity and intervention counts
- Watchlist and proposed intervention actions
- Live sales history ticker with bounded list size
- Intervention email template action
- Role-based lock on intervention clicks

### 6) Manage Users (admin)

Admin user management in [../frontend/src/pages/ManageUsers.js](../frontend/src/pages/ManageUsers.js):
- Create user
- Edit user (name, email, password, role)
- Delete user (except self)
- Modal workflow with darkened overlay

## Data and State Flow

Typical path:
1. Backend scripts generate campaign and inventory artifacts.
2. Frontend loads JSON artifacts on startup and page load.
3. User actions update local state and local storage keys.
4. Role gates enable or disable actions before mutation or side effects.

Important local storage keys:
- planned_campaigns
- skuevolve_users
- skuevolve_session
- skuevolve-theme

## Themes

Theme context is in [../frontend/src/context/ThemeContext.js](../frontend/src/context/ThemeContext.js).

Light mode overrides are mainly in [../frontend/src/components/themeLight.css](../frontend/src/components/themeLight.css).

## Recommended Operational Workflow

1. Generate or refresh backend data artifacts.
2. Start frontend and verify role-specific behavior.
3. Validate campaign launch and deletion rules by role.
4. Validate War Room intervention permissions by role.
5. Confirm admin user management lifecycle.

## Deployment References

For deployment-only instructions, use:
- [../backend/README.md](../backend/README.md)
- [../frontend/README.md](../frontend/README.md)
