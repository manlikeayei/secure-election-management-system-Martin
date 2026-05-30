"""Flask application factory and entry point."""
from flask import Flask
from flask_cors import CORS
from extensions import db
from config import Config
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for React frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    db.init_app(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.elections import elections_bp
    from routes.votes import votes_bp
    from routes.admin import admin_bp
    from routes.attributes import attributes_bp
    from routes.photo import photo_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(elections_bp, url_prefix='/api/elections')
    app.register_blueprint(votes_bp, url_prefix='/api/votes')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(attributes_bp, url_prefix='/api/attributes')
    app.register_blueprint(photo_bp, url_prefix='/api/photo')
    
    # Global error handler — log all 500 errors
    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"500 error: {e}", exc_info=True)
        return {'error': 'Internal server error. Check backend logs.'}, 500
    
    # Health check
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'service': 'voting-system'}
    
    # Create tables and seed data
    with app.app_context():
        from models import init_db
        db.create_all()
        init_db()
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True, threaded=True)
