import pandas as pd
import numpy as np
from prophet import Prophet
import json
import os


# Major campaign time frame definition
Campaigns = {
    '11-11': {
        'month': 11, 
        'day': 11, 
        'window': 3,
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
        'keywords': [
            'Kurta', 'Shalwar kameez', 'Suit', 'Festive collection', 'Eid wear', 'Modest fashion',
            'Unstitched', 'Embroided', 'Ready-to-wear', 'Pret', 'Designer lawn', 'Chiffon suits', 
            'Mens kurta', 'Boys panjabi', 'Womens unstitched suits', 'Kids Eid clothes',
            'Ramadan clothing sale', 'Eid dress deals', 'buy kurta online', 'new Eid collection'
        ]
    }
}

# Cleaning raw dataset
def load_and_clean_data():
    try:
        df = pd.read_csv('../../daraz_pak_data.csv', parse_dates=['created_at'], low_memory=False, on_bad_lines='skip')
    except:
        print("Error: Could not find the CSV file.")
        return None, None

    # Clean column titles
    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
    
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

def get_top_products(full_df, month, keywords=None, min_count=10):
    """ Finds top sellers for a specific month.

    - Filters by category_name_1 or SKU.
    - Returns a list of objects: { sku, category }.
    - If fewer than min_count SKUs are found, it falls back to the overall top SKUs for the month.
    """
    mask = full_df['created_at'].dt.month == month
    seasonal_data = full_df[mask].copy()

    # Ensure we don't select blank/empty SKUs (happens with bad rows)
    seasonal_data['sku'] = seasonal_data['sku'].astype(str).str.strip()
    seasonal_data = seasonal_data[seasonal_data['sku'].astype(bool)]

    filtered = seasonal_data
    if keywords:
        pattern = '|'.join(keywords)
        # Check 'category_name_1' OR 'sku' for the keywords
        filtered = seasonal_data[
            seasonal_data['category_name_1'].astype(str).str.contains(pattern, case=False, na=False) |
            seasonal_data['sku'].astype(str).str.contains(pattern, case=False, na=False)
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
        result.append({'sku': sku, 'category': category_map.get(sku, 'Unknown')})

    return result

def generate_dashboard():
    # 1. Get Data
    daily_sales, full_df = load_and_clean_data()
    if daily_sales is None: return

    # 2. Train AI
    print("Training Forecast Model.")
    m = Prophet(yearly_seasonality=True, daily_seasonality=False)
    m.fit(daily_sales)
    
    # Forecast 365 Days
    future = m.make_future_dataframe(periods=730)
    forecast = m.predict(future)

    # 3. Build Dashboard Structure
    dashboard_data = {
        "graph_data": [],
        "Campaigns": {}
    }

    # Format Graph (History + Future)
    combined = forecast.tail(730)[['ds', 'yhat']].copy() # Last year + Next year
    combined['ds'] = combined['ds'].dt.strftime('%Y-%m-%d')
    dashboard_data['graph_data'] = combined.to_dict(orient='records')

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

        # Get Hero Products
        products = get_top_products(full_df, config['month'], config['keywords'])

        # AI Decision Logic (unchanged)
        action = "Increase Stock Levels" if peak_vol > 500000 else "Run Discount Ads"
        
        dashboard_data['Campaigns'][name] = {
            "peak_date": peak_date,
            "projected_volume": peak_vol,
            "hero_products": products,
            "strategy": "Maximize GMV",
            "action_item": action,
            "status_color": "green" if peak_vol > 1000000 else "yellow"
        }

    # 5. Save for React
    output_path = os.path.join('../../frontend', 'src', 'dashboard_data.json')
    
    with open(output_path, 'w') as f:
        json.dump(dashboard_data, f)
    
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
