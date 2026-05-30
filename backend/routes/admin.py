"""Admin-specific routes for system management."""
from flask import Blueprint, request, jsonify
from extensions import db
from models import User, Election, Vote, AttributeDefinition, UserAttribute
from auth_utils import require_admin
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/users', methods=['GET'])
@require_admin
def list_users():
    """List all users with optional filtering."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '').strip()
    
    query = User.query
    if search:
        query = query.filter(
            (User.email.ilike(f'%{search}%')) |
            (User.first_name.ilike(f'%{search}%')) |
            (User.last_name.ilike(f'%{search}%'))
        )
    
    total = query.count()
    users = query.order_by(User.id).offset((page - 1) * per_page).limit(per_page).all()
    
    return jsonify({
        'users': [u.to_dict(include_sensitive=True) for u in users],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@require_admin
def update_user(user_id):
    """Admin updates a user."""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json() or {}
    
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'is_admin' in data:
        user.is_admin = data['is_admin']
    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    
    db.session.commit()
    return jsonify({'message': 'User updated', 'user': user.to_dict(include_sensitive=True)}), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@require_admin
def delete_user(user_id):
    """Admin deletes a user."""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.is_admin:
        return jsonify({'error': 'Cannot delete admin users'}), 400
    
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': f'User {user.email} deleted'}), 200


@admin_bp.route('/dashboard', methods=['GET'])
@require_admin
def dashboard():
    """Get admin dashboard statistics."""
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    total_elections = Election.query.count()
    active_elections = Election.query.filter_by(is_active=True).count()
    total_votes = Vote.query.count()
    total_attributes = AttributeDefinition.query.count()
    
    # Recent elections with vote counts
    recent_elections = Election.query.order_by(Election.created_at.desc()).limit(5).all()
    election_stats = []
    for e in recent_elections:
        election_stats.append({
            'id': e.id,
            'name': e.name,
            'type': e.election_type,
            'total_votes': e.votes.count(),
            'participant_count': e.participants.count(),
        })
    
    return jsonify({
        'stats': {
            'total_users': total_users,
            'active_users': active_users,
            'total_elections': total_elections,
            'active_elections': active_elections,
            'total_votes': total_votes,
            'total_attributes': total_attributes,
        },
        'recent_elections': election_stats,
    }), 200


@admin_bp.route('/users/<int:user_id>/attributes', methods=['POST'])
@require_admin
def assign_user_attribute(user_id):
    """Assign an attribute to a user."""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json() or {}
    attribute_id = data.get('attribute_id')
    value = data.get('value')
    
    if not attribute_id or not value:
        return jsonify({'error': 'attribute_id and value are required'}), 400
    
    from sqlalchemy.exc import IntegrityError
    try:
        ua = UserAttribute(
            user_id=user.id,
            attribute_id=attribute_id,
            value=value,
        )
        db.session.add(ua)
        db.session.commit()
        return jsonify({'message': 'Attribute assigned', 'attribute': ua.to_dict()}), 201
    except IntegrityError:
        db.session.rollback()
        # Update existing
        existing = UserAttribute.query.filter_by(
            user_id=user.id, attribute_id=attribute_id
        ).first()
        if existing:
            existing.value = value
            db.session.commit()
            return jsonify({'message': 'Attribute updated', 'attribute': existing.to_dict()}), 200
        return jsonify({'error': 'Could not assign attribute'}), 500
