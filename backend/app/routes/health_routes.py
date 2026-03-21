from flask import Blueprint, jsonify

bp = Blueprint('health', __name__, url_prefix='/api/health')

@bp.route('/', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({'status': 'healthy', 'service': 'Pakistan Campaign API'}), 200
