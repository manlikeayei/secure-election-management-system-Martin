"""Election management routes."""
from flask import Blueprint, request, jsonify
from extensions import db
from models import User, Election, Participant, Vote, ElectionAttribute, UserAttribute, AttributeDefinition
from auth_utils import require_auth, require_admin
from datetime import datetime

elections_bp = Blueprint('elections', __name__)


@elections_bp.route('', methods=['GET'])
@require_auth
def list_elections():
    """List all elections. Voters only see those they're eligible for."""
    user = db.session.get(User, request.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    all_elections = Election.query.all()
    result = []
    
    for election in all_elections:
        election_data = election.to_dict()
        if not request.is_admin:
            election_data['eligible'] = _check_eligibility(user, election)
            # Hide participants from ineligible voters
            if not election_data['eligible']:
                election_data['participants'] = []
        else:
            election_data['eligible'] = True
        result.append(election_data)
    
    return jsonify({'elections': result}), 200


@elections_bp.route('/<int:election_id>', methods=['GET'])
@require_auth
def get_election(election_id):
    """Get single election details."""
    election = db.session.get(Election, election_id)
    if not election:
        return jsonify({'error': 'Election not found'}), 404
    
    user = db.session.get(User, request.current_user_id)
    data = election.to_dict()
    data['eligible'] = _check_eligibility(user, election) if not request.is_admin else True
    
    # Check if user already voted
    existing_vote = Vote.query.filter_by(
        user_id=user.id, election_id=election.id
    ).first()
    data['has_voted'] = existing_vote is not None
    
    return jsonify({'election': data}), 200


@elections_bp.route('', methods=['POST'])
@require_admin
def create_election():
    """Admin creates a new election."""
    data = request.get_json() or {}
    
    errors = []
    if not data.get('name'):
        errors.append('Election name is required')
    if not data.get('election_type'):
        errors.append('Election type is required')
    if not data.get('start_date'):
        errors.append('Start date is required')
    if not data.get('end_date'):
        errors.append('End date is required')
    
    if errors:
        return jsonify({'error': '; '.join(errors)}), 400
    
    try:
        start_date = datetime.fromisoformat(data['start_date'])
        end_date = datetime.fromisoformat(data['end_date'])
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use ISO format.'}), 400
    
    if end_date <= start_date:
        return jsonify({'error': 'End date must be after start date'}), 400
    
    election = Election(
        name=data['name'],
        election_type=data['election_type'],
        description=data.get('description', ''),
        start_date=start_date,
        end_date=end_date,
        created_by=request.current_user_id,
        require_all_attributes=data.get('require_all_attributes', False),
        require_photo=data.get('require_photo', False),
    )
    db.session.add(election)
    db.session.flush()
    
    # Add participants
    participants_data = data.get('participants', [])
    for p_data in participants_data:
        participant = Participant(
            name=p_data['name'],
            party=p_data.get('party', 'Independent'),
            bio=p_data.get('bio', ''),
            election_id=election.id,
        )
        db.session.add(participant)
    
    # Add required attributes
    attrs_data = data.get('required_attributes', [])
    for a_data in attrs_data:
        ea = ElectionAttribute(
            election_id=election.id,
            attribute_id=a_data['attribute_id'],
            required_value=a_data['required_value'],
        )
        db.session.add(ea)
    
    db.session.commit()
    return jsonify({'message': 'Election created', 'election': election.to_dict()}), 201


@elections_bp.route('/<int:election_id>', methods=['PUT'])
@require_admin
def update_election(election_id):
    """Admin updates an election."""
    election = db.session.get(Election, election_id)
    if not election:
        return jsonify({'error': 'Election not found'}), 404
    
    data = request.get_json() or {}
    
    if 'name' in data:
        election.name = data['name']
    if 'election_type' in data:
        election.election_type = data['election_type']
    if 'description' in data:
        election.description = data['description']
    if 'start_date' in data:
        election.start_date = datetime.fromisoformat(data['start_date'])
    if 'end_date' in data:
        election.end_date = datetime.fromisoformat(data['end_date'])
    if 'is_active' in data:
        election.is_active = data['is_active']
    if 'require_all_attributes' in data:
        election.require_all_attributes = data['require_all_attributes']
    if 'require_photo' in data:
        election.require_photo = data['require_photo']
    
    db.session.commit()
    return jsonify({'message': 'Election updated', 'election': election.to_dict()}), 200


@elections_bp.route('/<int:election_id>', methods=['DELETE'])
@require_admin
def delete_election(election_id):
    """Admin deletes an election."""
    election = db.session.get(Election, election_id)
    if not election:
        return jsonify({'error': 'Election not found'}), 404
    
    db.session.delete(election)
    db.session.commit()
    return jsonify({'message': 'Election deleted'}), 200


@elections_bp.route('/<int:election_id>/participants', methods=['POST'])
@require_admin
def add_participant(election_id):
    """Add a participant to an election."""
    election = db.session.get(Election, election_id)
    if not election:
        return jsonify({'error': 'Election not found'}), 404
    
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'error': 'Participant name required'}), 400
    
    participant = Participant(
        name=data['name'],
        party=data.get('party', 'Independent'),
        bio=data.get('bio', ''),
        election_id=election.id,
    )
    db.session.add(participant)
    db.session.commit()
    
    return jsonify({'message': 'Participant added', 'participant': participant.to_dict()}), 201


@elections_bp.route('/<int:election_id>/participants/<int:participant_id>', methods=['DELETE'])
@require_admin
def delete_participant(election_id, participant_id):
    """Remove a participant."""
    participant = db.session.get(Participant, participant_id)
    if not participant or participant.election_id != election_id:
        return jsonify({'error': 'Participant not found'}), 404
    
    db.session.delete(participant)
    db.session.commit()
    return jsonify({'message': 'Participant removed'}), 200


@elections_bp.route('/<int:election_id>/results', methods=['GET'])
@require_auth
def get_results(election_id):
    """Get computed election results."""
    from datetime import datetime
    
    election = db.session.get(Election, election_id)
    if not election:
        return jsonify({'error': 'Election not found'}), 404
    
    now = datetime.utcnow()
    election_ended = now >= election.end_date
    
    # Block results for non-admins before election ends
    # But allow voters who already voted to see the live tally
    if not election_ended and not request.is_admin:
        existing_vote = Vote.query.filter_by(
            user_id=request.current_user_id, election_id=election.id
        ).first()
        if not existing_vote:
            return jsonify({
                'error': 'Results are not available until the election ends or you have cast your vote.',
                'election_ended': False,
            }), 403
    
    participants = election.participants.all()
    total_votes = election.votes.count()
    
    # Count eligible voters for this election
    eligible_count = 0
    all_active = User.query.filter_by(is_active=True).all()
    for u in all_active:
        if _check_eligibility(u, election):
            eligible_count += 1
    
    results = []
    for p in participants:
        vote_count = p.votes.count()
        percentage = (vote_count / total_votes * 100) if total_votes > 0 else 0
        results.append({
            'participant': p.to_dict(),
            'vote_count': vote_count,
            'percentage': round(percentage, 2),
        })
    
    results.sort(key=lambda x: x['vote_count'], reverse=True)
    
    return jsonify({
        'election_id': election.id,
        'election_name': election.name,
        'election_type': election.election_type,
        'election_ended': election_ended,
        'start_date': str(election.start_date),
        'end_date': str(election.end_date),
        'total_votes': total_votes,
        'total_eligible': eligible_count,
        'turnout_percentage': round((total_votes / eligible_count * 100), 2) if eligible_count > 0 else 0,
        'results': results,
    }), 200


def _check_eligibility(user, election):
    """Check if a user is eligible to vote in an election based on attributes."""
    required_attrs = election.required_attributes.all()
    if not required_attrs:
        return True  # No restrictions
    
    user_attrs = {
        ua.attribute_id: ua.value 
        for ua in user.attributes.all()
    }
    
    if election.require_all_attributes:
        # Must match ALL required
        for ea in required_attrs:
            if ea.attribute_id not in user_attrs:
                return False
            if user_attrs[ea.attribute_id] != ea.required_value:
                return False
        return True
    else:
        # Must match ANY required
        for ea in required_attrs:
            if ea.attribute_id in user_attrs:
                if user_attrs[ea.attribute_id] == ea.required_value:
                    return True
        return False
