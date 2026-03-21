from flask import Blueprint, jsonify, request
import logging

bp = Blueprint('admin', __name__, url_prefix='/api/admin')
logger = logging.getLogger(__name__)

@bp.route('/regenerate-data', methods=['POST'])
def regenerate_data():
    """
    Manually trigger data regeneration.
    
    Useful for updating forecasts or inventory without restarting the server.
    
    Returns:
        JSON with status of each generation step
    """
    logger.info("🔄 Manual data regeneration triggered")
    
    try:
        from app.initialization import initialize_data
        results = initialize_data()
        
        status_code = 200 if results['status'] == 'success' else 206
        
        return jsonify({
            'status': results['status'],
            'message': 'Data regeneration completed',
            'steps': results['steps'],
            'errors': results['errors']
        }), status_code
        
    except Exception as e:
        logger.error(f"Error during manual regeneration: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'failed',
            'message': f'Data regeneration failed: {str(e)}',
            'errors': [str(e)]
        }), 500

@bp.route('/regenerate-status', methods=['GET'])
def regenerate_status():
    """
    Check status of last regeneration.
    
    Returns:
        Current status and last known results
    """
    return jsonify({
        'status': 'available',
        'message': 'Data regeneration endpoint is active',
        'endpoint': 'POST /api/admin/regenerate-data'
    }), 200
