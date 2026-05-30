"""Attribute definition management routes."""
from flask import Blueprint, request, jsonify
from extensions import db
from models import AttributeDefinition, ElectionAttribute, UserAttribute, User
from auth_utils import require_auth, require_admin
from sqlalchemy import func

attributes_bp = Blueprint('attributes', __name__)


@attributes_bp.route('', methods=['GET'])
@require_auth
def list_attributes():
    """List all attribute definitions."""
    attrs = AttributeDefinition.query.all()
    return jsonify({'attributes': [a.to_dict() for a in attrs]}), 200


@attributes_bp.route('', methods=['POST'])
@require_admin
def create_attribute():
    """Admin creates a new attribute definition."""
    data = request.get_json() or {}
    
    name = (data.get('name') or '').strip().lower().replace(' ', '_')
    display_name = (data.get('display_name') or '').strip()
    
    if not name or not display_name:
        return jsonify({'error': 'name and display_name are required'}), 400
    
    existing = AttributeDefinition.query.filter_by(name=name).first()
    if existing:
        return jsonify({'error': 'Attribute with this name already exists'}), 409
    
    attr = AttributeDefinition(
        name=name,
        display_name=display_name,
        description=data.get('description', ''),
        created_by=request.current_user_id,
    )
    db.session.add(attr)
    db.session.commit()
    
    return jsonify({'message': 'Attribute created', 'attribute': attr.to_dict()}), 201


@attributes_bp.route('/<int:attribute_id>', methods=['PUT'])
@require_admin
def update_attribute(attribute_id):
    """Admin updates an attribute definition."""
    attr = db.session.get(AttributeDefinition, attribute_id)
    if not attr:
        return jsonify({'error': 'Attribute not found'}), 404
    
    data = request.get_json() or {}
    if 'display_name' in data:
        attr.display_name = data['display_name']
    if 'description' in data:
        attr.description = data['description']
    
    db.session.commit()
    return jsonify({'message': 'Attribute updated', 'attribute': attr.to_dict()}), 200


@attributes_bp.route('/<int:attribute_id>', methods=['DELETE'])
@require_admin
def delete_attribute(attribute_id):
    """Admin deletes an attribute definition and all associated records."""
    attr = db.session.get(AttributeDefinition, attribute_id)
    if not attr:
        return jsonify({'error': 'Attribute not found'}), 404
    
    # Cascade delete handled by model
    db.session.delete(attr)
    db.session.commit()
    return jsonify({'message': 'Attribute and all associations deleted'}), 200


@attributes_bp.route('/user/<int:user_id>', methods=['GET'])
@require_auth
def get_user_attributes(user_id):
    """Get attributes for a specific user."""
    if not request.is_admin and request.current_user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    attrs = [ua.to_dict() for ua in user.attributes.all()]
    return jsonify({'user_id': user_id, 'attributes': attrs}), 200


@attributes_bp.route('/values', methods=['GET'])
@require_admin
def get_attribute_values():
    """Get all attribute definitions with their distinct existing values across users.
    
    Returns each attribute definition along with a list of known values
    that have been assigned to any user, so the admin can pick from a dropdown.
    """
    attrs = AttributeDefinition.query.all()
    result = []
    for a in attrs:
        values = (
            db.session.query(UserAttribute.value)
            .filter(UserAttribute.attribute_id == a.id)
            .distinct()
            .order_by(UserAttribute.value)
            .all()
        )
        result.append({
            **a.to_dict(),
            'known_values': [v[0] for v in values],
        })
    return jsonify({'attributes': result}), 200
