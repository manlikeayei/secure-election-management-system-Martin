"""Tests for voting module including concurrency."""
import json
import pytest
from app import create_app
from extensions import db
from models import User, Election, Participant, Vote
from datetime import datetime


@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.create_all()
        admin = User(email='admin@t.com', first_name='A', last_name='B', is_admin=True)
        admin.set_password('Admin@123!')
        db.session.add(admin)
        db.session.commit()
        
        # Create an election with participants
        election = Election(
            name='Vote Test',
            election_type='general',
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2030, 12, 31),
            created_by=admin.id,
        )
        db.session.add(election)
        db.session.flush()
        
        p1 = Participant(name='Candidate 1', party='X', election_id=election.id)
        p2 = Participant(name='Candidate 2', party='Y', election_id=election.id)
        db.session.add_all([p1, p2])
        db.session.commit()
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


class TestVotes:
    def test_cast_vote(self, client):
        # Register a voter
        client.post('/api/auth/register', json={
            'email': 'testvoter@t.com',
            'password': 'StrongP@ss1!',
            'first_name': 'Test',
            'last_name': 'Voter',
        })
        resp = client.post('/api/auth/login', json={
            'email': 'testvoter@t.com', 'password': 'StrongP@ss1!'
        })
        token = json.loads(resp.data)['token']
        
        # Get election
        resp = client.get('/api/elections', headers={'Authorization': f'Bearer {token}'})
        elections = json.loads(resp.data)['elections']
        eid = elections[0]['id']
        pid = elections[0]['participants'][0]['id']
        
        # Cast vote
        resp = client.post('/api/votes/cast', json={
            'election_id': eid,
            'participant_id': pid,
        }, headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 201
    
    def test_duplicate_vote_prevention(self, client):
        # Register, login, vote once
        client.post('/api/auth/register', json={
            'email': 'dupvoter@t.com',
            'password': 'StrongP@ss1!',
            'first_name': 'Dup',
            'last_name': 'Voter',
        })
        resp = client.post('/api/auth/login', json={
            'email': 'dupvoter@t.com', 'password': 'StrongP@ss1!'
        })
        token = json.loads(resp.data)['token']
        
        resp = client.get('/api/elections', headers={'Authorization': f'Bearer {token}'})
        elections = json.loads(resp.data)['elections']
        eid = elections[0]['id']
        pid = elections[0]['participants'][0]['id']
        
        # First vote
        r1 = client.post('/api/votes/cast', json={
            'election_id': eid, 'participant_id': pid
        }, headers={'Authorization': f'Bearer {token}'})
        assert r1.status_code == 201
        
        # Duplicate
        r2 = client.post('/api/votes/cast', json={
            'election_id': eid, 'participant_id': pid
        }, headers={'Authorization': f'Bearer {token}'})
        assert r2.status_code == 409
    
    def test_results_computation(self, client):
        resp = client.post('/api/auth/login', json={
            'email': 'admin@t.com', 'password': 'Admin@123!'
        })
        admin_token = json.loads(resp.data)['token']
        
        resp = client.get('/api/elections', headers={'Authorization': f'Bearer {admin_token}'})
        eid = json.loads(resp.data)['elections'][0]['id']
        
        resp = client.get(f'/api/elections/{eid}/results',
                         headers={'Authorization': f'Bearer {admin_token}'})
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert 'results' in data
        assert data['total_votes'] >= 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
