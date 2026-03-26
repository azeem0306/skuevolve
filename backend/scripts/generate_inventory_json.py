import pandas as pd
import os

def run_generate_inventory_json():
    """Convert inventory CSV to JSON for React"""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        in_csv = os.path.join(project_root, 'inventory_data.csv')
        out_json = os.path.join(project_root, 'frontend', 'src', 'inventory_data.json')

        inv = pd.read_csv(in_csv)
        inv.to_json(out_json, orient='records', indent=2)
        msg = f'wrote {len(inv)} rows to {out_json}'
        print(msg)
        return True, msg
    except Exception as e:
        return False, f"Error: {str(e)}"

if __name__ == '__main__':
    run_generate_inventory_json()
