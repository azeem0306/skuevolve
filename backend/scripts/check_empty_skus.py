import json, re

def run_check_empty_skus():
    """Validate that hero products have non-empty SKUs"""
    try:
        with open('../../frontend/src/dashboard_data.json') as f:
            d = json.load(f)

        bad = []
        for camp, info in d.get('Campaigns', {}).items():
            for i, p in enumerate(info.get('hero_products', [])):
                sku = p.get('sku')
                if not sku or str(sku).strip() == '':
                    bad.append((camp, i, p))

        msg = f'Validation complete: {len(bad)} empty SKUs found'
        if bad:
            print(f'Warning: {msg}')
            print('sample bad rows:', bad[:10])
        else:
            print('✅ All SKUs valid')
        
        return len(bad) == 0, msg
    except Exception as e:
        return False, f"Error: {str(e)}"

if __name__ == '__main__':
    run_check_empty_skus()
