#!/usr/bin/env python3
"""
Seed campaigns and forecasts into PostgreSQL from existing dashboard_data.json

Usage:
    python seed_campaigns.py
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app, db
from app.models import Campaign, CampaignProduct, CampaignForecast

BASE_DIR = Path(__file__).parent.parent
DASHBOARD_DATA_PATH = BASE_DIR / 'frontend' / 'src' / 'dashboard_data.json'

def seed_campaigns():
    """Load campaign data from dashboard_data.json"""
    app = create_app()
    
    with app.app_context():
        print("🔍 Reading dashboard_data.json...")
        
        if not DASHBOARD_DATA_PATH.exists():
            print(f"❌ File not found: {DASHBOARD_DATA_PATH}")
            return
        
        with open(DASHBOARD_DATA_PATH) as f:
            data = json.load(f)
        
        campaigns_data = data.get('Campaigns', {})
        graph_data = data.get('graph_data', [])
        
        print(f"📊 Found {len(campaigns_data)} campaigns to seed")
        
        for campaign_name, campaign_info in campaigns_data.items():
            # Check if already exists
            existing = Campaign.query.filter_by(name=campaign_name).first()
            if existing:
                print(f"⏭️  Campaign '{campaign_name}' already exists, skipping")
                continue
            
            # Create campaign
            campaign = Campaign(
                name=campaign_name,
                start_date=datetime.strptime(campaign_info.get('peak_date', '2018-01-01'), '%Y-%m-%d').date(),
                peak_date=datetime.strptime(campaign_info.get('peak_date', '2018-01-01'), '%Y-%m-%d').date(),
                end_date=datetime.strptime(campaign_info.get('peak_date', '2018-12-31'), '%Y-%m-%d').date(),
                projected_volume=campaign_info.get('projected_volume', 0),
                strategy=campaign_info.get('strategy', ''),
                action_items=campaign_info.get('action_item', ''),
                status='active'
            )
            
            db.session.add(campaign)
            db.session.flush()  # Get campaign ID
            
            # Add hero products
            for product in campaign_info.get('hero_products', []):
                hero_product = CampaignProduct(
                    campaign_id=campaign.id,
                    sku=product.get('sku', ''),
                    category=product.get('category', 'Unknown'),
                    rank=campaign_info.get('hero_products', []).index(product) + 1
                )
                db.session.add(hero_product)
            
            print(f"✅ Created campaign: {campaign_name}")
        
        # Seed forecast data
        print(f"📈 Seeding {len(graph_data)} forecast records...")
        for idx, point in enumerate(graph_data):
            # Distribute forecast data across campaigns equally
            campaign = Campaign.query.first()  # For now, use first campaign
            if not campaign:
                continue
            
            date_str = point.get('date')
            if not date_str:
                continue
            
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
                
                forecast = CampaignForecast(
                    campaign_id=campaign.id,
                    date=date,
                    historical_gmv=point.get('historical'),
                    forecasted_gmv=point.get('forecasted'),
                    upper_bound=point.get('upper'),
                    lower_bound=point.get('lower')
                )
                db.session.add(forecast)
                
                if idx % 100 == 0:
                    db.session.commit()
            except Exception as e:
                print(f"⚠️  Skipped forecast point: {e}")
                continue
        
        db.session.commit()
        print("✅ Campaign seeding completed successfully!")

if __name__ == '__main__':
    seed_campaigns()
