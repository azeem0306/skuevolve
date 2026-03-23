from flask import Blueprint, jsonify, request
from app import db
from app.models import Campaign, CampaignProduct, CampaignForecast
from sqlalchemy import desc
from datetime import datetime

bp = Blueprint('campaigns', __name__, url_prefix='/api/campaigns')

@bp.route('/', methods=['GET'])
def get_campaigns():
    """Get all campaigns with hero products and forecast summaries"""
    campaigns = Campaign.query.all()
    
    result = {}
    for campaign in campaigns:
        # Get hero products
        hero_products = [
            {
                'sku': cp.sku,
                'category': cp.category or 'Unknown'
            }
            for cp in campaign.hero_products
        ]
        
        result[campaign.name] = {
            'id': campaign.id,
            'peak_date': campaign.peak_date.isoformat() if campaign.peak_date else None,
            'projected_volume': campaign.projected_volume,
            'strategy': campaign.strategy,
            'action_item': campaign.action_items,
            'status_color': 'green' if campaign.status == 'active' else 'gray',
            'hero_products': hero_products
        }
    
    return jsonify({
        'Campaigns': result
    }), 200

@bp.route('/<int:campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    """Get detailed campaign data"""
    campaign = Campaign.query.get_or_404(campaign_id)
    
    hero_products = [
        {
            'sku': cp.sku,
            'category': cp.category or 'Unknown'
        }
        for cp in campaign.hero_products
    ]
    
    return jsonify({
        'id': campaign.id,
        'name': campaign.name,
        'start_date': campaign.start_date.isoformat(),
        'peak_date': campaign.peak_date.isoformat() if campaign.peak_date else None,
        'end_date': campaign.end_date.isoformat(),
        'projected_volume': campaign.projected_volume,
        'strategy': campaign.strategy,
        'action_items': campaign.action_items,
        'hero_products': hero_products
    }), 200

@bp.route('/<int:campaign_id>/hero-products', methods=['GET'])
def get_hero_products(campaign_id):
    """Get hero products for a campaign"""
    products = CampaignProduct.query.filter_by(campaign_id=campaign_id).all()
    
    return jsonify({
        'campaign_id': campaign_id,
        'hero_products': [
            {
                'sku': p.sku,
                'category': p.category or 'Unknown',
                'rank': p.rank,
                'expected_sales': p.expected_sales
            }
            for p in products
        ]
    }), 200


