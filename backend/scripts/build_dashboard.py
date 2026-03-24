import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import datetime, timedelta
import json
import os
import kagglehub 
from kagglehub import KaggleDatasetAdapter

# Major campaign time frame definition with realistic multipliers
Campaigns = {
    '11-11': {
        'month': 11, 
        'day': 11, 
        'window': 3,
        'campaign_lift_multiplier': 2.8,      # 11-11 increases demand 2.8x
        'avg_units_per_product_baseline': 120, # Historical average units/product
        'keywords': [
            'Mobile', 'Smartphones', 'Cell phones', 'Electronics', 'Gadgets',
            'Samsung', 'Infinix', 'Xiaomi', 'Apple', 'iPhone', 'Oppo', 'Vivo', 'OnePlus',
            'Earbuds', 'Smartwatches', 'Power banks', 'Laptops', 'Tablets', 'Phone cases',
            '11-11 mega sale', '11.11 mobile deals', 'best phone deals', 'discount smartphones'
        ]
    },
    'Black Friday': {
        'month': 11, 
        'day': 24,
        'window': 5,
        'campaign_lift_multiplier': 3.2,      # Black Friday increases demand 3.2x
        'avg_units_per_product_baseline': 95,
        'keywords': [
            'Fashion', 'Clothing', 'Apparel', 'Menswear', 'Womenswear',
            'Kurta', 'Dresses', 'Jackets', 'Winter wear', 'Jeans', 'T-shirts',
            'Shoes', 'Sneakers', 'Boots', 'Leather shoes', 'shoes', 
            'Watch', 'Smartwatch', 'Designer watches', 'Handbags', 'Sunglasses',
            'Black Friday fashion deals', 'Black Friday shoe sale', 'clothing discounts'
        ]
    },
    'Eid/Ramadan': {
        'month': 6,
        'day': 15,
        'window': 10,
        'campaign_lift_multiplier': 2.5,      # Eid increases demand 2.5x
        'avg_units_per_product_baseline': 110,
        'keywords': [
            'Kurta', 'Shalwar kameez', 'Suit', 'Festive collection', 'Eid wear', 'Modest fashion',
            'Unstitched', 'Embroided', 'Ready-to-wear', 'Pret', 'Designer lawn', 'Chiffon suits', 
            'Mens kurta', 'Boys panjabi', 'Womens unstitched suits', 'Kids Eid clothes',
            'Ramadan clothing sale', 'Eid dress deals', 'buy kurta online', 'new Eid collection'
        ]
    }
}

# Loading & Cleaning raw dataset
def load_and_clean_data():
    try:
        # 1. Download the dataset folder (this caches it on your system)
        dataset_path = kagglehub.dataset_download("zusmani/pakistans-largest-ecommerce-dataset")
        
        # 2. Build the exact file path to the CSV inside that downloaded folder
        csv_file_path = os.path.join(dataset_path, "Pakistan Largest Ecommerce Dataset.csv")
        
        # 3. Read it using standard pandas (low_memory=False prevents mixed-type warnings)
        df = pd.read_csv(csv_file_path, low_memory=False)
        
        print("Successfully loaded dataset from Kaggle!")
    except Exception as e:
        print(f"Error: Could not load dataset from KaggleHub. Details: {e}")
        return None, None

    # Clean column titles
    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
    
    # Parse dates with mixed formats (some have timestamps, some don't)
    df['created_at'] = pd.to_datetime(df['created_at'], format='mixed')
    
    # Filter completed forward orders
    valid_statuses = ['complete', 'received', 'paid', 'cod']
    df = df[df['status'].isin(valid_statuses)]
    df = df.dropna(subset=['created_at'])

    # Daily totals time series data for Prophet
    daily_sales = df.groupby('created_at')['grand_total'].sum().reset_index()
    daily_sales.columns = ['ds', 'y']

    # 2. Create SKU Data (Product Details for Recommender)
    # We keep it in memory as 'df' to filter later
    return daily_sales, df


def load_inventory_data():
    """Load inventory CSV to get stock levels and reorder points"""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        inv_path = os.path.join(project_root, 'inventory_data.csv')
        inv_df = pd.read_csv(inv_path)
        inv_df['sku'] = inv_df['sku'].astype(str).str.strip()
        return inv_df
    except Exception as e:
        print(f"Error: Could not load inventory data. Details: {e}")
        return None


def calculate_product_metrics(sku, full_df, inventory_df, campaign_month):
    """Calculate realistic metrics for a product"""
    
    # Filter sales for this SKU
    sku_sales = full_df[full_df['sku'].astype(str).str.strip() == str(sku).strip()].copy()
    
    if sku_sales.empty:
        return None
    
    # 1. SEARCH_VOLUME_TREND (0-1): Recent sales vs baseline
    recent_30d = sku_sales[sku_sales['created_at'] >= (pd.Timestamp.now() - timedelta(days=30))]
    baseline_30d = sku_sales[
        (sku_sales['created_at'] >= (pd.Timestamp.now() - timedelta(days=90))) &
        (sku_sales['created_at'] < (pd.Timestamp.now() - timedelta(days=60)))
    ]
    
    recent_count = len(recent_30d)
    baseline_count = len(baseline_30d) if len(baseline_30d) > 0 else 1
    search_volume_trend = min(1.0, recent_count / max(baseline_count, 1))
    
    # 2. INVENTORY_AGE_DAYS: Days since last restock
    if inventory_df is not None:
        inv_item = inventory_df[inventory_df['sku'] == str(sku).strip()]
        if not inv_item.empty:
            last_restock = pd.to_datetime(inv_item.iloc[0]['last_restock_date'])
            inventory_age_days = (pd.Timestamp.now() - last_restock).days
        else:
            inventory_age_days = 30  # Default if not in inventory
    else:
        inventory_age_days = 30
    
    # 3. DEMAND_VELOCITY (0-1): Units sold per day (normalized)
    units_per_day = len(sku_sales) / max((sku_sales['created_at'].max() - sku_sales['created_at'].min()).days, 1)
    max_velocity = 50  # Normalize to 50 units/day = 1.0
    demand_velocity = min(1.0, units_per_day / max_velocity)
    
    # 4. STOCK_PRESSURE (0-1): qty_on_hand / reorder_point
    if inventory_df is not None:
        inv_item = inventory_df[inventory_df['sku'] == str(sku).strip()]
        if not inv_item.empty:
            qty_on_hand = inv_item.iloc[0]['qty_on_hand']
            reorder_point = inv_item.iloc[0]['reorder_point']
            stock_pressure = min(1.0, qty_on_hand / max(reorder_point, 1))
        else:
            stock_pressure = 0.5  # Default
    else:
        stock_pressure = 0.5
    
    # Assign AI Signal based on metrics (HIGH SEARCH VOL takes priority)
    if search_volume_trend > 0.75:
        ai_signal = "High Search Vol"
    elif inventory_age_days > 60:
        ai_signal = "Aging Stock"
    else:
        ai_signal = "Organic Demand"
    
    return {
        "search_volume_trend": round(search_volume_trend, 2),
        "inventory_age_days": inventory_age_days,
        "demand_velocity": round(demand_velocity, 2),
        "stock_pressure": round(stock_pressure, 2),
        "ai_signal": ai_signal
    }


def get_top_products(full_df, inventory_df, month, keywords=None, min_count=10):
    """ Finds top sellers for a specific month with realistic metrics.

    - Filters by category_name_1 or SKU.
    - Calculates realistic metrics for each product.
    - Returns a list of objects: { sku, category, metrics, ai_signal }.
    - If fewer than min_count SKUs are found, it falls back to the overall top SKUs for the month.
    """
    mask = full_df['created_at'].dt.month == month
    seasonal_data = full_df[mask].copy()

    # Ensure we don't select blank/empty SKUs (happens with bad rows)
    seasonal_data['sku'] = seasonal_data['sku'].astype(str).str.strip()
    seasonal_data = seasonal_data[seasonal_data['sku'].astype(bool)]

    filtered = seasonal_data
    if keywords:
        # Escape special regex characters
        escaped_keywords = [k.replace('+', r'\+').replace('.', r'\.') for k in keywords]
        pattern = '|'.join(escaped_keywords)
        # Check 'category_name_1' OR 'sku' for the keywords
        filtered = seasonal_data[
            seasonal_data['category_name_1'].astype(str).str.contains(pattern, case=False, na=False, regex=True) |
            seasonal_data['sku'].astype(str).str.contains(pattern, case=False, na=False, regex=True)
        ]

    # Helper: return top SKUs by total spend
    def top_k(from_df, k):
        top_items = from_df.groupby('sku')['grand_total'].sum().reset_index()
        return top_items.sort_values('grand_total', ascending=False).head(k)['sku'].tolist()

    top_skus = top_k(filtered, min_count)

    # If the keyword filter yields too few SKUs, fill in with top SKUs from the full month
    if len(top_skus) < min_count:
        fallback_skus = top_k(seasonal_data, min_count * 2)  # get a larger pool to avoid duplicates
        for sku in fallback_skus:
            if sku not in top_skus:
                top_skus.append(sku)
            if len(top_skus) >= min_count:
                break

    # Determine category for each SKU (most common category_name_1 for that SKU)
    category_map = (
        seasonal_data.groupby('sku')['category_name_1']
        .agg(lambda s: s.dropna().mode().iloc[0] if not s.dropna().mode().empty else 'Unknown')
        .to_dict()
    )

    result = []
    for sku in top_skus[:min_count]:
        metrics = calculate_product_metrics(sku, full_df, inventory_df, month)
        if metrics:
            result.append({
                'sku': sku,
                'category': category_map.get(sku, 'Unknown'),
                'metrics': {
                    'search_volume_trend': metrics['search_volume_trend'],
                    'inventory_age_days': metrics['inventory_age_days'],
                    'demand_velocity': metrics['demand_velocity'],
                    'stock_pressure': metrics['stock_pressure']
                },
                'ai_signal': metrics['ai_signal']
            })

    return result

def generate_dashboard():
    # 1. Get Data
    daily_sales, full_df = load_and_clean_data()
    if daily_sales is None: return
    
    inventory_df = load_inventory_data()

    # 2. Train AI
    print("Training Forecast Model.")
    m = Prophet(yearly_seasonality=True, daily_seasonality=False)
    m.fit(daily_sales)
    
    # Forecast 365 Days
    future = m.make_future_dataframe(periods=730)
    forecast = m.predict(future)

    # 3. Build Dashboard Structure
    dashboard_data = {
        "Campaigns": {}
    }

    # 4. Generate Strategy per Campaign
    print("Generating Insights.")

    last_historical_date = daily_sales['ds'].max()
    for name, config in Campaigns.items():
        
        # Find predicted peak date near the target month
        mask_month = forecast['ds'].dt.month == config['month']
        mask_window = (forecast['ds'].dt.day >= (config['day'] - config['window'])) & \
                      (forecast['ds'].dt.day <= (config['day'] + config['window']))
        
        future_only = forecast[mask_month & mask_window & (forecast['ds'] > last_historical_date)]
        
        if not future_only.empty:
            # Find the peak ONLY within that specific window
            peak_row = future_only.sort_values('yhat', ascending=False).iloc[0]
            peak_date = peak_row['ds'].strftime('%Y-%m-%d')
            peak_vol = int(peak_row['yhat'])
        else:
            peak_date = "N/A"
            peak_vol = 0

        # Get Hero Products with metrics
        products = get_top_products(full_df, inventory_df, config['month'], config['keywords'])

        # AI Decision Logic (unchanged)
        action = "Increase Stock Levels" if peak_vol > 500000 else "Run Discount Ads"
        
        dashboard_data['Campaigns'][name] = {
            "peak_date": peak_date,
            "projected_volume": peak_vol,
            "campaign_lift_multiplier": config['campaign_lift_multiplier'],
            "avg_units_per_product_baseline": config['avg_units_per_product_baseline'],
            "hero_products": products,
            "strategy": "Maximize GMV",
            "action_item": action,
            "status_color": "green" if peak_vol > 1000000 else "yellow"
        }

    # 5. Save for React
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    output_path = os.path.join(project_root, 'frontend', 'src', 'dashboard_data.json')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    
    with open(output_path, 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print(f"✅ SUCCESS! Data saved to: {output_path}")


def run_build_dashboard():
    """Wrapper for external execution"""
    try:
        generate_dashboard()
        return True, "Dashboard data generated successfully"
    except Exception as e:
        return False, f"Error: {str(e)}"

if __name__ == "__main__":
    generate_dashboard()
