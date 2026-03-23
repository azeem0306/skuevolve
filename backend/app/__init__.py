from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

# Load .env file from backend directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

db = SQLAlchemy()
logger = logging.getLogger(__name__)

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///campaign.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": os.getenv('CORS_ORIGINS', 'http://localhost:3000')}})
    
    # Register blueprints
    from app.routes import campaign_routes, inventory_routes, health_routes, admin_routes, push_notification_routes
    app.register_blueprint(campaign_routes.bp)
    app.register_blueprint(inventory_routes.bp)
    app.register_blueprint(health_routes.bp)
    app.register_blueprint(admin_routes.bp)
    app.register_blueprint(push_notification_routes.bp)
    
    # Create tables
    with app.app_context():
        db.create_all()
        
        # Initialize data on startup
        # logger.info("🚀 Initializing application data...")
        # from app.initialization import initialize_data
        # results = initialize_data()
        # 
        # if results['status'] == 'success':
        #     logger.info("✅ Application initialized successfully")
        # else:
        #     logger.warning(f"⚠️  Application initialized with issues: {results['errors']}")
    
    return app
