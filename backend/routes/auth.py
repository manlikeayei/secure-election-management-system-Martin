"""Authentication routes: login, register, password reset."""
from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from auth_utils import generate_token, require_auth, require_admin
from crypto_utils import aes_encrypt
import re

auth_bp = Blueprint('auth', __name__)

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
PASSWORD_REGEX = re.compile(r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]).{8,}$')


def validate_password(password):
    """Validate password strength."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain an uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain a lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain a number"
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        return False, "Password must contain a special character"
    return True, "OK"


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new voter."""
    data = request.get_json() or {}
    
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    
    # Validation
    errors = []
    if not email or not EMAIL_REGEX.match(email):
        errors.append('Valid email is required')
    if not first_name:
        errors.append('First name is required')
    if not last_name:
        errors.append('Last name is required')
    
    valid_pw, pw_msg = validate_password(password)
    if not valid_pw:
        errors.append(pw_msg)
    
    if errors:
        return jsonify({'error': '; '.join(errors)}), 400
    
    # Check existing
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=data.get('date_of_birth'),
        is_admin=False,
    )
    user.set_password(password)
    
    if data.get('ssn'):
        user.set_encrypted_field('ssn', data['ssn'])
    if data.get('address'):
        user.set_encrypted_field('address', data['address'])
    if data.get('phone'):
        user.set_encrypted_field('phone', data['phone'])
    
    db.session.add(user)
    db.session.commit()
    
    token = generate_token(user.id, is_admin=False)
    return jsonify({
        'message': 'Registration successful',
        'token': token,
        'user': user.to_dict(),
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with email and password."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is deactivated. Contact administrator.'}), 403
    
    token = generate_token(user.id, is_admin=user.is_admin)
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict(),
    }), 200


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    """Get current authenticated user info."""
    user = db.session.get(User, request.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict(include_sensitive=True)}), 200


@auth_bp.route('/reset-password', methods=['POST'])
@require_admin
def reset_password():
    """Admin resets a user's password."""
    data = request.get_json() or {}
    user_id = data.get('user_id')
    new_password = data.get('new_password', 'Temp@123!')
    
    if not user_id:
        return jsonify({'error': 'User ID required'}), 400
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': f'Password reset for {user.email}. New: {new_password}'}), 200


@auth_bp.route('/update-profile', methods=['PUT'])
@require_auth
def update_own_profile():
    """Authenticated user updates their own email and/or password.
    
    Body: { "email": "new@email.com", "current_password": "...", "new_password": "..." }
    At least one of email or new_password is required.
    current_password is required to verify identity.
    """
    data = request.get_json() or {}
    current_password = data.get('current_password', '')
    new_email = (data.get('email') or '').strip().lower()
    new_password = data.get('new_password', '')

    if not current_password:
        return jsonify({'error': 'Current password is required to make changes'}), 400

    if not new_email and not new_password:
        return jsonify({'error': 'Provide a new email and/or new password'}), 400

    user = db.session.get(User, request.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401

    # Update email
    if new_email:
        if new_email != user.email:
            existing = User.query.filter_by(email=new_email).first()
            if existing and existing.id != user.id:
                return jsonify({'error': 'Email already in use by another account'}), 409
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', new_email):
                return jsonify({'error': 'Invalid email format'}), 400
            user.email = new_email

    # Update password
    if new_password:
        valid_pw, pw_msg = validate_password(new_password)
        if not valid_pw:
            return jsonify({'error': pw_msg}), 400
        user.set_password(new_password)

    db.session.commit()

    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict(),
    }), 200
