import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import datetime, timedelta
import json
import os
import kagglehub

# Global Superstore Dataset - 4 Global Holiday Campaigns
Campaigns = {
    'New Year': {
        'month': 1,
        'day': 1,
        'window': 7,
        'campaign_lift_multiplier': 2.2,
        'avg_units_per_product_baseline': 100,
        'keywords': [
            'All', 'Technology', 'Furniture', 'Office Supplies', 'Phones', 'Accessories',
            'Appliances', 'Copiers', 'Chairs', 'Tables', 'Storage', 'Binders'
        ]
    },
    'Valentine\'s Day': {
        'month': 2,
        'day': 14,
        'window': 7,
        'campaign_lift_multiplier': 2.5,
        'avg_units_per_product_baseline': 110,
        'keywords': [
            'All', 'Accessories', 'Furniture', 'Home Office', 'Art', 'Paper',
            'Phones', 'Tables', 'Chairs', 'Labels', 'Storage'
        ]
    },
    'Halloween': {
        'month': 10,
        'day': 31,
        'window': 7,
        'campaign_lift_multiplier': 2.3,
        'avg_units_per_product_baseline': 105,
        'keywords': [
            'All', 'Furniture', 'Office Supplies', 'Storage', 'Art', 'Paper',
            'Binders', 'Appliances', 'Chairs', 'Tables'
        ]
    },
    'Christmas': {
        'month': 12,
        'day': 25,
        'window': 14,
        'campaign_lift_multiplier': 3.0,
        'avg_units_per_product_baseline': 130,
        'keywords': [
            'All', 'Technology', 'Furniture', 'Office Supplies', 'Phones', 'Accessories',
            'Copiers', 'Appliances', 'Bookcases', 'Chairs', 'Tables', 'Storage'
        ]
    }
}


def calculate_campaign_lift(full_df, campaign_name, config):
    """Calculate observed lift from daily sales using same-month non-holiday baseline."""
    try:
        if 'sales' not in full_df.columns or 'order_date' not in full_df.columns:
            return config.get('campaign_lift_multiplier', 1.0)

        # Use daily total sales (not transaction mean) to avoid bias by order count mix.
        daily = (
            full_df.groupby(full_df['order_date'].dt.normalize())['sales']
            .sum()
            .reset_index(name='daily_sales')
            .rename(columns={'order_date': 'date'})
        )

        holiday_dates = []
        years = sorted(daily['date'].dt.year.unique())
        for year in years:
            holiday_date = datetime(year, config['month'], config['day']).date()
            holiday_dates.append(holiday_date)

        start_offset = config.get('window', 7)
        end_offset = 1

        daily = daily.copy()
        daily['date_only'] = daily['date'].dt.date

        mask_holiday = pd.Series(False, index=daily.index)
        for hd in holiday_dates:
            start = hd - timedelta(days=start_offset)
            end = hd + timedelta(days=end_offset)
            mask_holiday |= daily['date_only'].between(start, end)

        # Baseline should be comparable: same campaign month but outside holiday window.
        month_mask = daily['date'].dt.month == config['month']
        baseline_mask = month_mask & ~mask_holiday
        if baseline_mask.sum() < 5:
            baseline_mask = ~mask_holiday

        holiday_mean = daily.loc[mask_holiday, 'daily_sales'].mean()
        baseline_mean = daily.loc[baseline_mask, 'daily_sales'].mean()

        if pd.isna(holiday_mean) or pd.isna(baseline_mean) or baseline_mean <= 0:
            return config.get('campaign_lift_multiplier', 1.0)

        lift = float(holiday_mean / baseline_mean)
        return float(np.clip(lift, 0.5, 5.0))

    except Exception as ex:
        print(f"[WARN] {campaign_name}: lift calc failed: {ex}")
        return config.get('campaign_lift_multiplier', 1.0)


def calculate_planned_lift(observed_lift):
    """Return a planning lift target for execution scenarios while preserving observed lift separately."""
    # Conservative scenario factors: media, discount, on-shelf availability, creative uplift.
    scenario_factor = 1.35
    planned = observed_lift * scenario_factor
    return float(np.clip(max(2.0, planned), 2.0, 5.0))


# Loading & Cleaning raw dataset
def load_and_clean_data():
    try:
        # Download Global Superstore Dataset from Kaggle
        dataset_path = kagglehub.dataset_download("fatihilhan/global-superstore-dataset")
        
        # Build the exact file path to the CSV
        csv_files = [f for f in os.listdir(dataset_path) if f.lower().endswith('.csv')]
        if not csv_files:
            raise FileNotFoundError("No CSV files found in dataset")
        
        csv_file_path = os.path.join(dataset_path, csv_files[0])
        
        # Read the CSV
        df = pd.read_csv(csv_file_path, encoding='utf-8')
        
        print(f"✓ Successfully loaded Global Superstore dataset!")
        print(f"  File: {csv_files[0]}")
        print(f"  Shape: {df.shape}")
        print(f"  Columns: {list(df.columns)}")
        
    except Exception as e:
        print(f"Error: Could not load dataset from KaggleHub. Details: {e}")
        return None, None

    # Normalize column names
    df.columns = [c.strip().lower().replace(' ', '_').replace('-', '_') for c in df.columns]
    
    # Map column names to standard format
    # Global Superstore typically has: Order.Date, Sales, Product ID, Segment, Category, etc.
    date_col = None
    for col in ['order.date', 'order_date', 'order date', 'date', 'transaction_date']:
        if col in df.columns:
            date_col = col
            break
    
    if date_col is None:
        print("[ERROR] No date column found in dataset")
        print(f"[DEBUG] Available columns: {list(df.columns)}")
        return None, None
    
    sales_col = None
    for col in ['sales', 'sale_amount', 'revenue', 'amount']:
        if col in df.columns:
            sales_col = col
            break
    
    if sales_col is None:
        print("[ERROR] No sales column found in dataset")
        return None, None
    
    # Create SKU column (use Product.ID from Global Superstore dataset)
    df['sku'] = df['product.id'].astype(str).str.strip()
    df['name'] = df['product.name'].astype(str).str.strip()

    # 2. Optional: Remove the old columns to keep the dataframe clean
    df = df.drop(columns=['product.id', 'product.name'])
    
    # Parse date
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    
    # Clean sales data
    df = df.dropna(subset=[date_col, sales_col])
    df[sales_col] = pd.to_numeric(df[sales_col], errors='coerce')
    df = df[df[sales_col] > 0]  # Keep only positive sales
    
    # Rename columns to standard names
    df.rename(columns={date_col: 'order_date', sales_col: 'sales'}, inplace=True)
    
    # Ensure category column exists
    if 'category' not in df.columns:
        if 'category_1' in df.columns or 'category_name_1' in df.columns:
            cat_col = 'category_1' if 'category_1' in df.columns else 'category_name_1'
            df['category'] = df[cat_col].astype(str).str.strip()
        else:
            df['category'] = 'General'
    
    df = df[df['sku'].astype(bool)]
    
    # Daily totals time series for Prophet
    daily_sales = df.groupby('order_date')['sales'].sum().reset_index()
    daily_sales.columns = ['ds', 'y']
    
    print(f"  Date range: {df['order_date'].min()} to {df['order_date'].max()}")
    print(f"  Total records: {len(df)}")
    print(f"  Countries: {df['country'].nunique() if 'country' in df.columns else 'N/A'}")
    
    return daily_sales, df


def load_inventory_data():
    """Load inventory CSV to get stock levels and reorder points"""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        inv_path = os.path.join(project_root, 'inventory_data.csv')
        inv_df = pd.read_csv(inv_path)
        inv_df['sku'] = inv_df['sku'].astype(str).str.strip()
        for col in ['cost_price', 'msrp', 'qty_on_hand', 'qty_reserved', 'reorder_point', 'lead_time_days']:
            if col in inv_df.columns:
                inv_df[col] = pd.to_numeric(inv_df[col], errors='coerce')
        if 'last_restock_date' in inv_df.columns:
            inv_df['last_restock_date'] = pd.to_datetime(inv_df['last_restock_date'], errors='coerce')
        return inv_df
    except Exception as e:
        print(f"Error: Could not load inventory data. Details: {e}")
        return None


def calculate_product_metrics(sku, full_df, inventory_df, campaign_month):
    """Calculate inventory-aware metrics for a product."""
    
    # Filter sales for this SKU
    sku_sales = full_df[full_df['sku'].astype(str).str.strip() == str(sku).strip()].copy()
    
    if sku_sales.empty:
        return None
    
    # 1. SEARCH_VOLUME_TREND (0-1): Recent sales vs baseline
    now = sku_sales['order_date'].max()
    recent_period = sku_sales[sku_sales['order_date'] >= (now - timedelta(days=90))]
    baseline_period = sku_sales[
        (sku_sales['order_date'] >= (now - timedelta(days=180))) &
        (sku_sales['order_date'] < (now - timedelta(days=90)))
    ]
    
    recent_sales = recent_period['sales'].sum()
    baseline_sales = baseline_period['sales'].sum() if baseline_period['sales'].sum() > 0 else 1
    search_volume_trend = min(1.0, recent_sales / baseline_sales)
    
    # Pull inventory values for this SKU if available.
    inv_item = None
    if inventory_df is not None and not inventory_df.empty:
        inv_match = inventory_df[inventory_df['sku'] == str(sku).strip()]
        if not inv_match.empty:
            inv_item = inv_match.iloc[0]

    # 2. INVENTORY_AGE_DAYS
    if inv_item is not None and pd.notna(inv_item.get('last_restock_date')):
        inventory_age_days = int((pd.Timestamp.now() - inv_item['last_restock_date']).days)
    else:
        inventory_age_days = int((now - sku_sales['order_date'].min()).days)
    
    # 3. DEMAND_VELOCITY (0-1): Transactions per day (normalized)
    total_days = max((sku_sales['order_date'].max() - sku_sales['order_date'].min()).days, 1)
    txns_per_day = len(sku_sales) / total_days
    demand_velocity = min(1.0, txns_per_day / 10.0)

    # 4. Inventory-backed stock pressure and stockout days
    qty_on_hand = float(inv_item.get('qty_on_hand', np.nan)) if inv_item is not None else np.nan
    qty_reserved = float(inv_item.get('qty_reserved', 0)) if inv_item is not None else 0.0
    reorder_point = float(inv_item.get('reorder_point', np.nan)) if inv_item is not None else np.nan
    lead_time_days = float(inv_item.get('lead_time_days', np.nan)) if inv_item is not None else np.nan

    available_qty = max(0.0, qty_on_hand - qty_reserved) if pd.notna(qty_on_hand) else np.nan
    if pd.notna(available_qty) and pd.notna(reorder_point) and reorder_point > 0:
        stock_pressure_raw = available_qty / reorder_point
        stock_pressure = min(1.0, stock_pressure_raw)
    else:
        stock_pressure_raw = np.nan
        stock_pressure = 0.5

    recent_txn_days = max((recent_period['order_date'].max() - recent_period['order_date'].min()).days, 1) if not recent_period.empty else 1
    expected_daily_units = max(0.1, len(recent_period) / recent_txn_days)
    stockout_days = (available_qty / expected_daily_units) if pd.notna(available_qty) else np.nan

    # 5. Margin guardrail from inventory prices.
    cost_price = float(inv_item.get('cost_price', np.nan)) if inv_item is not None else np.nan
    msrp = float(inv_item.get('msrp', np.nan)) if inv_item is not None else np.nan
    if pd.notna(cost_price) and pd.notna(msrp) and msrp > 0:
        gross_margin_pct = max(-1.0, min(1.0, (msrp - cost_price) / msrp))
    else:
        gross_margin_pct = 0.25

    low_margin = gross_margin_pct < 0.10
    stockout_risk = pd.notna(stockout_days) and pd.notna(lead_time_days) and stockout_days < lead_time_days

    # Inventory-aware AI signal
    if stockout_risk and search_volume_trend > 0.6:
        ai_signal = "Stockout Risk"
    elif low_margin:
        ai_signal = "Margin Watch"
    elif search_volume_trend > 0.75:
        ai_signal = "Trending"
    elif inventory_age_days > 180 and (pd.notna(stock_pressure_raw) and stock_pressure_raw > 1.0):
        ai_signal = "Aging Stock"
    else:
        ai_signal = "Organic Demand"

    # Composite score used in candidate ranking.
    margin_score = min(1.0, max(0.0, gross_margin_pct / 0.40))
    stock_score = min(1.0, max(0.0, stock_pressure))
    inventory_health_score = (0.55 * stock_score) + (0.45 * margin_score)
    if stockout_risk:
        inventory_health_score *= 0.65
    if low_margin:
        inventory_health_score *= 0.70
    
    return {
        "search_volume_trend": round(search_volume_trend, 2),
        "inventory_age_days": min(inventory_age_days, 365),
        "demand_velocity": round(demand_velocity, 2),
        "stock_pressure": round(stock_pressure, 2),
        "stockout_days": round(float(stockout_days), 1) if pd.notna(stockout_days) else None,
        "lead_time_days": int(lead_time_days) if pd.notna(lead_time_days) else None,
        "gross_margin_pct": round(gross_margin_pct, 2),
        "inventory_health_score": round(float(inventory_health_score), 3),
        "ai_signal": ai_signal
    }


def get_top_products(full_df, inventory_df, month, keywords=None, min_count=10):
    """Finds top sellers for a specific month with realistic metrics.
    
    - Filters by category or keywords
    - Calculates realistic metrics for each product
    - Returns a list of {sku, category, metrics, ai_signal}
    - Falls back to top SKUs overall if keyword filter yields too few
    """
    mask = full_df['order_date'].dt.month == month
    seasonal_data = full_df[mask].copy()
    
    # Clean SKU column
    seasonal_data['sku'] = seasonal_data['sku'].astype(str).str.strip()
    seasonal_data = seasonal_data[seasonal_data['sku'].astype(bool)]
    
    filtered = seasonal_data
    if keywords and 'All' not in keywords:
        try:
            # Escape regex special chars
            escaped_keywords = [k.replace('+', r'\+').replace('.', r'\.') for k in keywords]
            pattern = '|'.join(escaped_keywords)
            
            # Check 'category' OR 'sku' for keywords
            filtered = seasonal_data[
                seasonal_data['category'].astype(str).str.contains(pattern, case=False, na=False, regex=True) |
                seasonal_data['sku'].astype(str).str.contains(pattern, case=False, na=False, regex=True)
            ]
        except:
            filtered = seasonal_data
    
    # Helper: return top SKUs by total sales
    def top_k(from_df, k):
        if from_df.empty:
            return []
        top_items = from_df.groupby('sku')['sales'].sum().reset_index()
        return top_items.sort_values('sales', ascending=False).head(k)['sku'].tolist()

    # Build a larger candidate set, then rank with inventory-aware scoring.
    candidate_skus = top_k(filtered, max(min_count * 5, 30))
    
    # Fallback: if keyword filter yields too few SKUs, get top from full month
    if len(candidate_skus) < min_count:
        fallback_skus = top_k(seasonal_data, min_count * 2)
        for sku in fallback_skus:
            if sku not in candidate_skus:
                candidate_skus.append(sku)
            if len(candidate_skus) >= min_count * 3:
                break

    sales_totals = seasonal_data.groupby('sku')['sales'].sum().to_dict()
    max_sales_total = max(sales_totals.values()) if sales_totals else 1.0
    
    # Map categories and product names for each SKU
    category_map = (
        seasonal_data.groupby('sku')['category']
        .agg(lambda s: s.dropna().mode().iloc[0] if not s.dropna().mode().empty else 'General')
        .to_dict()
    )
    
    name_map = (
        full_df.groupby('sku')['name']
        .agg(lambda s: s.dropna().iloc[0] if len(s.dropna()) > 0 else s.name)
        .to_dict()
    )
    
    ranked = []
    for sku in candidate_skus:
        metrics = calculate_product_metrics(sku, full_df, inventory_df, month)
        if metrics:
            sales_score = float(sales_totals.get(sku, 0.0)) / max_sales_total
            priority_score = (
                (0.35 * sales_score)
                + (0.20 * metrics['search_volume_trend'])
                + (0.15 * metrics['demand_velocity'])
                + (0.30 * metrics['inventory_health_score'])
            )
            ranked.append({
                'sku': sku,
                'name': name_map.get(sku, sku),
                'category': category_map.get(sku, 'General'),
                'metrics': {
                    'search_volume_trend': metrics['search_volume_trend'],
                    'inventory_age_days': metrics['inventory_age_days'],
                    'demand_velocity': metrics['demand_velocity'],
                    'stock_pressure': metrics['stock_pressure'],
                    'stockout_days': metrics['stockout_days'],
                    'lead_time_days': metrics['lead_time_days'],
                    'gross_margin_pct': metrics['gross_margin_pct']
                },
                'ai_signal': metrics['ai_signal'],
                'priority_score': round(priority_score, 3)
            })

    ranked = sorted(ranked, key=lambda x: x.get('priority_score', 0), reverse=True)
    result = ranked[:min_count]

    return result

def generate_dashboard():
    # 1. Get Data
    print("[*] Loading Global Superstore dataset...")
    daily_sales, full_df = load_and_clean_data()
    if daily_sales is None:
        print("[ERROR] Failed to load data. Exiting.")
        return
    
    print("[*] Loading inventory data...")
    inventory_df = load_inventory_data()

    # 2. Train AI (Prophet for forecasting)
    print("[*] Training Prophet forecast model...")
    m = Prophet(yearly_seasonality=True, daily_seasonality=False, interval_width=0.95)
    m.fit(daily_sales)
    
    # Forecast 365 days into the future
    future = m.make_future_dataframe(periods=365)
    forecast = m.predict(future)

    # 3. Build Dashboard Structure
    dashboard_data = {
        "Campaigns": {}
    }

    # 4. Generate Strategy per Campaign
    print("\n[*] Calculating campaign strategies...\n")
    
    last_historical_date = daily_sales['ds'].max()
    
    for campaign_name, config in Campaigns.items():
        print(f"Processing: {campaign_name}")

        # Calculated campaign lift from data
        observed_lift = calculate_campaign_lift(full_df, campaign_name, config)
        planned_lift = calculate_planned_lift(observed_lift)
        print(f"   [LIFT] Observed={observed_lift:.2f}x | Planned target={planned_lift:.2f}x")
        
        # Find predicted peak date near the target month
        mask_month = forecast['ds'].dt.month == config['month']
        mask_day_window = (forecast['ds'].dt.day >= (config['day'] - config['window'])) & \
                          (forecast['ds'].dt.day <= (config['day'] + config['window']))
        
        # Look at future periods only
        future_only = forecast[mask_month & mask_day_window & (forecast['ds'] > last_historical_date)]
        
        if not future_only.empty:
            peak_row = future_only.sort_values('yhat', ascending=False).iloc[0]
            peak_date = peak_row['ds'].strftime('%Y-%m-%d')
            peak_vol = int(peak_row['yhat'])
        else:
            # Fallback: look at similar months in history
            historical = forecast[mask_month & mask_day_window & (forecast['ds'] <= last_historical_date)]
            if not historical.empty:
                peak_row = historical.sort_values('yhat', ascending=False).iloc[0]
                peak_date = peak_row['ds'].strftime('%Y-%m-%d')
                peak_vol = int(peak_row['yhat'])
            else:
                peak_date = "N/A"
                peak_vol = 0
        
        # Get Hero Products with metrics
        products = get_top_products(full_df, inventory_df, config['month'], config['keywords'], min_count=10)
        
        # AI Decision Logic
        avg_daily_sales = daily_sales['y'].mean()
        action = "Increase Stock Levels" if peak_vol > avg_daily_sales * 1.3 else "Run Discount Ads"
        
        dashboard_data['Campaigns'][campaign_name] = {
            "peak_date": peak_date,
            "projected_volume": peak_vol,
            "campaign_lift_multiplier": round(planned_lift, 2),
            "observed_lift_multiplier": round(observed_lift, 2),
            "avg_units_per_product_baseline": config['avg_units_per_product_baseline'],
            "hero_products": products,
            "strategy": "Maximize GMV",
            "action_item": action,
            "status_color": "green" if peak_vol > avg_daily_sales * 1.3 else "yellow"
        }
        print(f"   ✓ Complete\n")

    # 5. Save for React
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    output_path = os.path.join(project_root, 'frontend', 'src', 'dashboard_data.json')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print(f"[SUCCESS] Dashboard data saved to: {output_path}")


def run_build_dashboard():
    """Wrapper for external execution"""
    try:
        generate_dashboard()
        return True, "Dashboard data generated successfully"
    except Exception as e:
        return False, f"Error: {str(e)}"

if __name__ == "__main__":
    generate_dashboard()
