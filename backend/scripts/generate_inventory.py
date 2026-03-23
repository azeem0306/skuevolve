"""Generate a dummy inventory dataset that can be joined to the sales data.

This script reads `daraz_pak_data.csv`, finds the top-selling SKUs, and writes
an inventory CSV with fields like stock level, reorder point, cost price, and
supplier.

Usage:
    python generate_inventory.py

Output:
    ../../inventory_data.csv
"""

import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd


def build_inventory(sales_csv='../../daraz_pak_data.csv', out_csv='../../inventory_data.csv', top_n=200):
    df = pd.read_csv(sales_csv, parse_dates=['created_at'], low_memory=False, on_bad_lines='skip')

    # Use top-selling SKUs so we have a stable mapping to the sales dataset
    top_skus = (
        df.groupby('sku')['grand_total']
        .sum()
        .sort_values(ascending=False)
        .head(top_n)
        .index
        .tolist()
    )

    warehouses = ['Lahore', 'Karachi', 'Islamabad']
    suppliers = ['Alif Traders', 'Bazaar Supply Co.', 'Nexa Imports', 'Pioneer Wholesale']

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
                'warehouse': random.choice(warehouses),
                'supplier': random.choice(suppliers),
                'cost_price': round(random.uniform(500, 7500), 2),
                'msrp': round(random.uniform(1000, 12500), 2),
                'qty_on_hand': base_stock,
                'qty_reserved': random.randint(0, min(50, base_stock // 5)),
                'reorder_point': random.randint(50, 500),  # Adjusted for smaller stock levels
                'last_restock_date': (
                    datetime.now() - timedelta(days=random.randint(5, 45))
                ).strftime('%Y-%m-%d'),
                'lead_time_days': random.randint(3, 14),
            }
        )

    inv = pd.DataFrame(rows)
    inv.to_csv(out_csv, index=False)
    print(f"✅ SUCCESS! Wrote {len(inv)} inventory records to {out_csv}")


def run_generate_inventory():
    """Wrapper for external execution"""
    try:
        build_inventory()
        return True, "Inventory generated successfully"
    except Exception as e:
        return False, f"Error: {str(e)}"

if __name__ == '__main__':
    build_inventory()
