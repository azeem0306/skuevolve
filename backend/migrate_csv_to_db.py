#!/usr/bin/env python3
"""
Data migration script: Import CSV data into PostgreSQL

Usage:
    python migrate_csv_to_db.py
"""

import os
import sys
import pandas as pd
from pathlib import Path
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/pakistan_campaign')

# Paths to CSV files (adjust as needed)
BASE_DIR = Path(__file__).parent.parent.parent
SALES_DATA_PATH = BASE_DIR / 'daraz_pak_data.csv'
INVENTORY_DATA_PATH = BASE_DIR / 'inventory_data.csv'

def migrate_sales_data(engine):
    """Load sales data from CSV into database"""
    print("⏳ Loading sales data from CSV...")
    
    if not SALES_DATA_PATH.exists():
        print(f"⚠️  Sales data file not found: {SALES_DATA_PATH}")
        return
    
    df = pd.read_csv(SALES_DATA_PATH)
    
    # Normalize column names if needed
    df.columns = df.columns.str.lower()
    
    # Required columns: sku, date, category_name_1 (optional), sales_quantity, gmv
    print(f"   Found {len(df)} sales records")
    
    df.to_sql('sales_data', engine, if_exists='append', index=False)
    print("✅ Sales data imported successfully")

def migrate_inventory_data(engine):
    """Load inventory data from CSV into database"""
    print("⏳ Loading inventory data from CSV...")
    
    if not INVENTORY_DATA_PATH.exists():
        print(f"⚠️  Inventory data file not found: {INVENTORY_DATA_PATH}")
        return
    
    df = pd.read_csv(INVENTORY_DATA_PATH)
    
    # Normalize column names
    df.columns = df.columns.str.lower()
    
    print(f"   Found {len(df)} inventory records")
    
    df.to_sql('inventory', engine, if_exists='append', index=False)
    print("✅ Inventory data imported successfully")

def main():
    try:
        engine = create_engine(DATABASE_URL)
        
        print(f"🔌 Connecting to database: {DATABASE_URL}")
        with engine.connect() as conn:
            conn.execute("SELECT 1")
            print("✅ Database connection successful")
        
        migrate_sales_data(engine)
        migrate_inventory_data(engine)
        
        print("\n✅ All data migrated successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
