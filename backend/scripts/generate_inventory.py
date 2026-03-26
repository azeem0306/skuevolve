"""Generate inventory data aligned to the Global Superstore dataset.

This script downloads `fatihilhan/global-superstore-dataset`, identifies top
selling SKUs (Product.ID), and writes an inventory CSV with stock and supplier
fields for dashboard simulations.

Usage:
    python generate_inventory.py

Output:
    ../../inventory_data.csv
"""

import random
from datetime import datetime, timedelta
import os

import pandas as pd
import kagglehub


def build_inventory(out_csv='../../inventory_data.csv', top_n=300):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_csv_abs = os.path.abspath(os.path.join(script_dir, out_csv))

    dataset_path = kagglehub.dataset_download("fatihilhan/global-superstore-dataset")
    csv_files = [f for f in os.listdir(dataset_path) if f.lower().endswith('.csv')]
    if not csv_files:
        raise FileNotFoundError("No CSV files found in Global Superstore dataset")

    csv_path = os.path.join(dataset_path, csv_files[0])
    df = pd.read_csv(csv_path, encoding='utf-8', low_memory=False)
    df.columns = [c.strip().lower().replace(' ', '_').replace('-', '_') for c in df.columns]

    if 'product.id' not in df.columns or 'sales' not in df.columns:
        raise ValueError("Dataset is missing required columns: Product.ID or Sales")

    df['sku'] = df['product.id'].astype(str).str.strip()
    df['name'] = df['product.name'].astype(str).str.strip() if 'product.name' in df.columns else df['sku']
    if 'category' in df.columns:
        df['category_norm'] = df['category'].astype(str).str.strip()
    elif 'sub.category' in df.columns:
        df['category_norm'] = df['sub.category'].astype(str).str.strip()
    else:
        df['category_norm'] = 'General'
    df['sales'] = pd.to_numeric(df['sales'], errors='coerce')
    df = df.dropna(subset=['sku', 'sales'])

    # Use top-selling SKUs so we have a stable mapping to the sales dataset
    sku_rollup = (
        df.groupby('sku', as_index=False)
        .agg(
            total_sales=('sales', 'sum'),
            name=('name', 'first'),
            category=('category_norm', 'first'),
        )
        .sort_values('total_sales', ascending=False)
        .head(top_n)
    )

    top_skus = sku_rollup['sku'].tolist()
    name_map = dict(zip(sku_rollup['sku'], sku_rollup['name']))
    category_map = dict(zip(sku_rollup['sku'], sku_rollup['category']))

    warehouses = ['New York', 'London', 'Sydney', 'Paris', 'Berlin']
    suppliers = ['Global Trade Co.', 'Aster Wholesale', 'Vertex Imports', 'Nimbus Supply']

    rows = []
    for idx, sku in enumerate(top_skus):
        # 50% of items have qty < 100, 50% have qty between 100-1000
        if idx % 2 == 0:
            base_stock = random.randint(1, 99)  # Low stock items
        else:
            base_stock = random.randint(100, 1000)  # Normal stock items (capped at 1000)
        
        rows.append(
            {
                'sku': sku,
                'name': name_map.get(sku, sku),
                'category': category_map.get(sku, 'General'),
                'warehouse': random.choice(warehouses),
                'supplier': random.choice(suppliers),
                'cost_price': round(random.uniform(20, 400), 2),
                'msrp': round(random.uniform(40, 700), 2),
                'qty_on_hand': base_stock,
                'qty_reserved': random.randint(0, min(50, base_stock // 5)),
                'reorder_point': random.randint(50, 500),
                'last_restock_date': (
                    datetime.now() - timedelta(days=random.randint(5, 45))
                ).strftime('%Y-%m-%d'),
                'lead_time_days': random.randint(3, 14),
            }
        )

    inv = pd.DataFrame(rows)
    inv.to_csv(out_csv_abs, index=False)
    print(f"[SUCCESS] Wrote {len(inv)} inventory records to {out_csv_abs}")


def run_generate_inventory():
    """Wrapper for external execution"""
    try:
        build_inventory()
        return True, "Inventory generated successfully"
    except Exception as e:
        return False, f"Error: {str(e)}"

if __name__ == '__main__':
    build_inventory()
