from app import db
from datetime import datetime
import json

class SalesData(db.Model):
    """Raw sales transaction data from Daraz"""
    __tablename__ = 'sales_data'
    
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(100), nullable=False, index=True)
    category_name_1 = db.Column(db.String(255))
    category_name_2 = db.Column(db.String(255))
    category_name_3 = db.Column(db.String(255))
    date = db.Column(db.Date, nullable=False, index=True)
    sales_quantity = db.Column(db.Integer)
    gmv = db.Column(db.Float)  # Gross Merchandise Value
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('sku', 'date', name='unique_sku_date'),)

class Campaign(db.Model):
    """Campaign forecasts and planning data"""
    __tablename__ = 'campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    start_date = db.Column(db.Date, nullable=False)
    peak_date = db.Column(db.Date)
    end_date = db.Column(db.Date, nullable=False)
    projected_volume = db.Column(db.Float)  # Peak GMV in PKR
    strategy = db.Column(db.Text)
    action_items = db.Column(db.Text)
    status = db.Column(db.String(50), default='active')  # active, completed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    hero_products = db.relationship('CampaignProduct', backref='campaign', cascade='all, delete-orphan')
    forecasts = db.relationship('CampaignForecast', backref='campaign', cascade='all, delete-orphan')

class CampaignProduct(db.Model):
    """Top-performing SKUs for each campaign (hero products)"""
    __tablename__ = 'campaign_products'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    sku = db.Column(db.String(100), nullable=False, index=True)
    category = db.Column(db.String(255))
    rank = db.Column(db.Integer)  # 1-10 for top 10 products
    expected_sales = db.Column(db.Integer)  # Estimated units to sell
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class CampaignForecast(db.Model):
    """Time-series forecast data for visualizations"""
    __tablename__ = 'campaign_forecasts'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    historical_gmv = db.Column(db.Float)
    forecasted_gmv = db.Column(db.Float)
    upper_bound = db.Column(db.Float)
    lower_bound = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Inventory(db.Model):
    """Product inventory levels and warehouse info"""
    __tablename__ = 'inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(100), nullable=False, unique=True, index=True)
    warehouse = db.Column(db.String(255))
    supplier = db.Column(db.String(255))
    cost_price = db.Column(db.Float, nullable=False)
    msrp = db.Column(db.Float)  # Manufacturer Suggested Retail Price
    qty_on_hand = db.Column(db.Integer, nullable=False)
    qty_reserved = db.Column(db.Integer, default=0)
    reorder_point = db.Column(db.Integer)
    last_restock_date = db.Column(db.Date)
    lead_time_days = db.Column(db.Integer, default=14)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def available_qty(self):
        return self.qty_on_hand - self.qty_reserved

class SimulationResult(db.Model):
    """Cached results from campaign simulations"""
    __tablename__ = 'simulation_results'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'))
    scenario_params = db.Column(db.JSON)  # Discount %, demand multiplier, etc.
    stockout_days = db.Column(db.JSON)  # SKU -> days until stockout
    total_revenue = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
