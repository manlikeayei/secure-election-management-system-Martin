"""Vote casting routes with concurrency handling."""
from flask import Blueprint, request, jsonify
from extensions import db
from models import User, Election, Participant, Vote
from auth_utils import require_auth
from datetime import datetime
from sqlalchemy.exc import IntegrityError
import time

votes_bp = Blueprint('votes', __name__)


@votes_bp.route('/cast', methods=['POST'])
@require_auth
def cast_vote():
    """Cast a vote. Protected against duplicate votes with retry logic."""
    data = request.get_json() or {}
    election_id = data.get('election_id')
    participant_id = data.get('participant_id')
    user_id = request.current_user_id
    
    if not election_id or not participant_id:
        return jsonify({'error': 'election_id and participant_id are required'}), 400
    
    # Validate election exists and is active
    election = db.session.get(Election, election_id)
    if not election:
        return jsonify({'error': 'Election not found'}), 404
    if not election.is_active:
        return jsonify({'error': 'Election is not active'}), 400
    
    now = datetime.utcnow()
    if now < election.start_date:
        return jsonify({'error': 'Election has not started yet'}), 400
    if now > election.end_date:
        return jsonify({'error': 'Election has ended'}), 400
    
    # Validate participant belongs to election
    participant = db.session.get(Participant, participant_id)
    if not participant or participant.election_id != election_id:
        return jsonify({'error': 'Invalid participant for this election'}), 400
    
    # Check eligibility
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    from routes.elections import _check_eligibility
    if not _check_eligibility(user, election):
        return jsonify({'error': 'You are not eligible to vote in this election'}), 403
    
    # Check existing vote with retry for concurrency
    max_retries = 3
    for attempt in range(max_retries):
        try:
            existing = Vote.query.filter_by(
                user_id=user_id, election_id=election_id
            ).first()
            
            if existing:
                return jsonify({'error': 'You have already voted in this election'}), 409
            
            vote = Vote(
                user_id=user_id,
                election_id=election_id,
                participant_id=participant_id,
                vote_hash='pending',  # placeholder, updated after commit
            )
            db.session.add(vote)
            db.session.commit()  # Commit first to get id + cast_at
            
            # Now update hash with real values
            vote.vote_hash = vote.generate_hash()
            db.session.commit()
            
            return jsonify({
                'message': 'Vote cast successfully',
                'vote_id': vote.id,
                'timestamp': str(vote.cast_at),
            }), 201
            
        except IntegrityError:
            db.session.rollback()
            if attempt < max_retries - 1:
                time.sleep(0.1 * (attempt + 1))
                continue
            return jsonify({'error': 'Vote could not be processed. You may have already voted.'}), 409
        except Exception as e:
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Error casting vote: {str(e)}'}), 500


@votes_bp.route('/my-votes', methods=['GET'])
@require_auth
def my_votes():
    """Get all votes cast by the current user."""
    votes = Vote.query.filter_by(user_id=request.current_user_id).all()
    result = []
    for v in votes:
        election = db.session.get(Election, v.election_id)
        participant = db.session.get(Participant, v.participant_id)
        result.append({
            'vote_id': v.id,
            'election': election.to_dict() if election else None,
            'participant': participant.to_dict() if participant else None,
            'cast_at': str(v.cast_at),
        })
    
    return jsonify({'votes': result}), 200


@votes_bp.route('/election/<int:election_id>/count', methods=['GET'])
@require_auth
def get_vote_count(election_id):
    """Get current vote count (real-time)."""
    election = db.session.get(Election, election_id)
    if not election:
        return jsonify({'error': 'Election not found'}), 404
    
    participants = election.participants.all()
    total = election.votes.count()
    
    counts = []
    for p in participants:
        vc = p.votes.count()
        counts.append({
            'participant_id': p.id,
            'name': p.name,
            'party': p.party,
            'vote_count': vc,
            'percentage': round((vc / total * 100), 2) if total > 0 else 0,
        })
    
    counts.sort(key=lambda x: x['vote_count'], reverse=True)
    
    return jsonify({
        'election_id': election_id,
        'total_votes': total,
        'counts': counts,
    }), 200
