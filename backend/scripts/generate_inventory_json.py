import pandas as pd

def run_generate_inventory_json():
    """Convert inventory CSV to JSON for React"""
    try:
        inv = pd.read_csv('../../inventory_data.csv')
        inv.to_json('../../frontend/src/inventory_data.json', orient='records', indent=2)
        msg = f'wrote {len(inv)} rows to ../../frontend/src/inventory_data.json'
        print(msg)
        return True, msg
    except Exception as e:
        return False, f"Error: {str(e)}"

if __name__ == '__main__':
    run_generate_inventory_json()
