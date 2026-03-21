-- PostgreSQL Schema for Pakistan Campaign Planner
-- Run this file to initialize the database structure

CREATE TABLE IF NOT EXISTS sales_data (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    category_name_1 VARCHAR(255),
    category_name_2 VARCHAR(255),
    category_name_3 VARCHAR(255),
    date DATE NOT NULL,
    sales_quantity INTEGER,
    gmv FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sku, date)
);

CREATE INDEX idx_sales_data_sku ON sales_data(sku);
CREATE INDEX idx_sales_data_date ON sales_data(date);

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    peak_date DATE,
    end_date DATE NOT NULL,
    projected_volume FLOAT,
    strategy TEXT,
    action_items TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_products (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    category VARCHAR(255),
    rank INTEGER,
    expected_sales INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaign_products_campaign_id ON campaign_products(campaign_id);
CREATE INDEX idx_campaign_products_sku ON campaign_products(sku);

CREATE TABLE IF NOT EXISTS campaign_forecasts (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    historical_gmv FLOAT,
    forecasted_gmv FLOAT,
    upper_bound FLOAT,
    lower_bound FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaign_forecasts_campaign_id ON campaign_forecasts(campaign_id);
CREATE INDEX idx_campaign_forecasts_date ON campaign_forecasts(date);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    warehouse VARCHAR(255),
    supplier VARCHAR(255),
    cost_price FLOAT NOT NULL,
    msrp FLOAT,
    qty_on_hand INTEGER NOT NULL,
    qty_reserved INTEGER DEFAULT 0,
    reorder_point INTEGER,
    last_restock_date DATE,
    lead_time_days INTEGER DEFAULT 14,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_sku ON inventory(sku);

CREATE TABLE IF NOT EXISTS simulation_results (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    scenario_params JSONB,
    stockout_days JSONB,
    total_revenue FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_simulation_results_campaign_id ON simulation_results(campaign_id);
