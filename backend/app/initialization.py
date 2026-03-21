"""
Backend initialization module - runs data generation scripts on app startup
"""

import os
import sys
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def initialize_data():
    """
    Run data generation pipeline on application startup.
    
    This ensures that frontend JSON files are always up-to-date:
    1. Generates inventory_data.csv from sales history
    2. Generates frontend/src/dashboard_data.json from forecasts
    3. Generates frontend/src/inventory_data.json from CSV
    4. Validates that all SKUs are non-empty
    
    Returns:
        dict: Results of each step with status and messages
    """
    
    results = {
        'status': 'success',
        'steps': {},
        'errors': []
    }
    
    # Add scripts directory to Python path
    scripts_dir = Path(__file__).parent.parent / 'scripts'
    sys.path.insert(0, str(scripts_dir))
    
    try:
        # Step 1: Generate inventory CSV
        logger.info("📦 Generating inventory data...")
        try:
            from generate_inventory import run_generate_inventory
            success, message = run_generate_inventory()
            results['steps']['generate_inventory'] = {
                'status': 'success' if success else 'failed',
                'message': message
            }
            logger.info(f"✅ Inventory: {message}")
        except Exception as e:
            error_msg = f"Failed to generate inventory: {str(e)}"
            results['steps']['generate_inventory'] = {'status': 'failed', 'message': error_msg}
            results['errors'].append(error_msg)
            logger.error(error_msg)
        
        # Step 2: Build dashboard (forecasts)
        logger.info("🧠 Building dashboard forecasts...")
        try:
            from build_dashboard import run_build_dashboard
            success, message = run_build_dashboard()
            results['steps']['build_dashboard'] = {
                'status': 'success' if success else 'failed',
                'message': message
            }
            logger.info(f"✅ Dashboard: {message}")
        except Exception as e:
            error_msg = f"Failed to build dashboard: {str(e)}"
            results['steps']['build_dashboard'] = {'status': 'failed', 'message': error_msg}
            results['errors'].append(error_msg)
            logger.error(error_msg)
        
        # Step 3: Generate inventory JSON for React
        logger.info("📄 Generating inventory JSON...")
        try:
            from generate_inventory_json import run_generate_inventory_json
            success, message = run_generate_inventory_json()
            results['steps']['generate_inventory_json'] = {
                'status': 'success' if success else 'failed',
                'message': message
            }
            logger.info(f"✅ Inventory JSON: {message}")
        except Exception as e:
            error_msg = f"Failed to generate inventory JSON: {str(e)}"
            results['steps']['generate_inventory_json'] = {'status': 'failed', 'message': error_msg}
            results['errors'].append(error_msg)
            logger.error(error_msg)
        
        # Step 4: Validate data quality
        logger.info("✔️  Validating data...")
        try:
            from check_empty_skus import run_check_empty_skus
            success, message = run_check_empty_skus()
            results['steps']['check_empty_skus'] = {
                'status': 'success' if success else 'warning',
                'message': message
            }
            logger.info(f"✅ Validation: {message}")
        except Exception as e:
            error_msg = f"Failed to validate data: {str(e)}"
            results['steps']['check_empty_skus'] = {'status': 'failed', 'message': error_msg}
            results['errors'].append(error_msg)
            logger.error(error_msg)
        
        # Summary
        if results['errors']:
            results['status'] = 'partial_success' if any(
                r['status'] == 'success' for r in results['steps'].values()
            ) else 'failed'
            logger.warning(f"⚠️  Initialization completed with {len(results['errors'])} errors")
        else:
            logger.info("✅ All data generation steps completed successfully!")
        
    except Exception as e:
        error_msg = f"Fatal error during initialization: {str(e)}"
        results['status'] = 'failed'
        results['errors'].append(error_msg)
        logger.error(error_msg, exc_info=True)
    
    finally:
        # Remove scripts dir from path
        if str(scripts_dir) in sys.path:
            sys.path.remove(str(scripts_dir))
    
    return results


def setup_logging():
    """Configure logging for initialization"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
