"""Photo routes: upload/retrieve user photos for human verification."""
from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from auth_utils import require_auth

photo_bp = Blueprint('photo', __name__)

MAX_PHOTO_BYTES = 500 * 1024  # 500 KB max


@photo_bp.route('/upload', methods=['POST'])
@require_auth
def upload_photo():
    """Upload a Base64-encoded JPEG photo for the authenticated user."""
    data = request.get_json() or {}
    photo_base64 = data.get('photo')

    if not photo_base64 or not isinstance(photo_base64, str):
        return jsonify({'error': 'Photo as Base64 string is required'}), 400

    # Strip data URI prefix if present
    if photo_base64.startswith('data:image'):
        photo_base64 = photo_base64.split(',', 1)[1]

    # Rough size check (Base64 is ~33% larger than raw)
    if len(photo_base64) > MAX_PHOTO_BYTES * 2:
        return jsonify({'error': 'Photo too large (max ~500 KB)'}), 400

    user = db.session.get(User, request.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.is_admin:
        return jsonify({'message': 'Admins do not need photos.', 'has_photo': False}), 200

    user.set_photo(photo_base64)
    db.session.commit()

    return jsonify({'message': 'Photo uploaded successfully.', 'has_photo': True}), 200


@photo_bp.route('/me', methods=['GET'])
@require_auth
def get_my_photo():
    """Get the authenticated user's photo (Base64 JPEG)."""
    user = db.session.get(User, request.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'has_photo': user.has_photo,
        'photo': user.get_photo() if user.has_photo else None,
    }), 200


@photo_bp.route('/check', methods=['POST'])
def check_has_photo():
    """Check whether a given email has a photo on file."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'found': False, 'has_photo': False, 'is_admin': False}), 200

    return jsonify({
        'found': True,
        'has_photo': user.has_photo,
        'is_admin': user.is_admin,
    }), 200
