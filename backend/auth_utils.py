"""Authentication utilities, decorators, and JWT handling."""
from functools import wraps
from flask import request, jsonify
import jwt
from datetime import datetime, timezone
from config import Config


def generate_token(user_id, is_admin=False):
    """Generate a JWT access token."""
    payload = {
        'user_id': user_id,
        'is_admin': is_admin,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + Config.JWT_ACCESS_TOKEN_EXPIRES,
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')


def decode_token(token):
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(f):
    """Decorator: require valid JWT authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        payload = decode_token(token)
        if payload is None:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        request.current_user_id = payload['user_id']
        request.is_admin = payload.get('is_admin', False)
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """Decorator: require admin authentication."""
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if not request.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated
