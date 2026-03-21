from flask import Blueprint, jsonify, request
from app import db
from app.models import Inventory
from sqlalchemy import desc

bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')

@bp.route('/', methods=['GET'])
def get_all_inventory():
    """Get all inventory items"""
    items = Inventory.query.all()
    
    return jsonify({
        'inventory': [
            {
                'sku': item.sku,
                'warehouse': item.warehouse,
                'supplier': item.supplier,
                'cost_price': item.cost_price,
                'msrp': item.msrp,
                'qty_on_hand': item.qty_on_hand,
                'qty_reserved': item.qty_reserved,
                'available_qty': item.available_qty(),
                'reorder_point': item.reorder_point,
                'last_restock_date': item.last_restock_date.isoformat() if item.last_restock_date else None,
                'lead_time_days': item.lead_time_days
            }
            for item in items
        ]
    }), 200

@bp.route('/<sku>', methods=['GET'])
def get_inventory_by_sku(sku):
    """Get inventory for a specific SKU"""
    item = Inventory.query.filter_by(sku=sku.upper()).first_or_404()
    
    return jsonify({
        'sku': item.sku,
        'warehouse': item.warehouse,
        'supplier': item.supplier,
        'cost_price': item.cost_price,
        'msrp': item.msrp,
        'qty_on_hand': item.qty_on_hand,
        'qty_reserved': item.qty_reserved,
        'available_qty': item.available_qty(),
        'reorder_point': item.reorder_point,
        'last_restock_date': item.last_restock_date.isoformat() if item.last_restock_date else None,
        'lead_time_days': item.lead_time_days
    }), 200

@bp.route('/', methods=['POST'])
def bulk_inventory_lookup():
    """Lookup inventory for multiple SKUs at once"""
    data = request.get_json()
    skus = data.get('skus', [])
    
    items = Inventory.query.filter(Inventory.sku.in_([s.upper() for s in skus])).all()
    
    return jsonify({
        'inventory': {
            item.sku: {
                'warehouse': item.warehouse,
                'cost_price': item.cost_price,
                'msrp': item.msrp,
                'qty_on_hand': item.qty_on_hand,
                'qty_reserved': item.qty_reserved,
                'available_qty': item.available_qty(),
                'lead_time_days': item.lead_time_days
            }
            for item in items
        }
    }), 200

@bp.route('/low-stock', methods=['GET'])
def get_low_stock_items():
    """Get items with stock below reorder point"""
    low_stock = Inventory.query.filter(
        Inventory.qty_on_hand <= Inventory.reorder_point
    ).all()
    
    return jsonify({
        'low_stock_count': len(low_stock),
        'items': [
            {
                'sku': item.sku,
                'qty_on_hand': item.qty_on_hand,
                'reorder_point': item.reorder_point,
                'warehouse': item.warehouse
            }
            for item in low_stock
        ]
    }), 200
