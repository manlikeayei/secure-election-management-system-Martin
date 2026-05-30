"""Tests for elections module."""
import json
import pytest
from app import create_app
from extensions import db
from models import User, Election, Participant


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
        
        voter = User(email='voter@t.com', first_name='V', last_name='T')
        voter.set_password('Voter@123!')
        db.session.add(voter)
        
        db.session.commit()
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


def get_admin_token(client):
    resp = client.post('/api/auth/login', json={'email': 'admin@t.com', 'password': 'Admin@123!'})
    return json.loads(resp.data)['token']


def get_voter_token(client):
    resp = client.post('/api/auth/login', json={'email': 'voter@t.com', 'password': 'Voter@123!'})
    return json.loads(resp.data)['token']


class TestElections:
    def test_create_election(self, client):
        token = get_admin_token(client)
        resp = client.post('/api/elections', json={
            'name': 'Test Election',
            'election_type': 'general',
            'description': 'A test election',
            'start_date': '2026-01-01T00:00:00',
            'end_date': '2026-12-31T23:59:59',
            'participants': [
                {'name': 'Candidate A', 'party': 'Party X'},
                {'name': 'Candidate B', 'party': 'Party Y'},
            ]
        }, headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 201
        data = json.loads(resp.data)
        assert len(data['election']['participants']) == 2
    
    def test_list_elections(self, client):
        token = get_admin_token(client)
        # Create one first
        client.post('/api/elections', json={
            'name': 'List Test',
            'election_type': 'general',
            'start_date': '2026-01-01T00:00:00',
            'end_date': '2026-12-31T23:59:59',
        }, headers={'Authorization': f'Bearer {token}'})
        
        voter_token = get_voter_token(client)
        resp = client.get('/api/elections', headers={'Authorization': f'Bearer {voter_token}'})
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert len(data['elections']) >= 1
    
    def test_non_admin_cannot_create(self, client):
        token = get_voter_token(client)
        resp = client.post('/api/elections', json={
            'name': 'Hack Election',
            'election_type': 'general',
            'start_date': '2026-01-01T00:00:00',
            'end_date': '2026-12-31T23:59:59',
        }, headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 403
    
    def test_delete_election(self, client):
        token = get_admin_token(client)
        resp = client.post('/api/elections', json={
            'name': 'To Delete',
            'election_type': 'general',
            'start_date': '2026-01-01T00:00:00',
            'end_date': '2026-12-31T23:59:59',
        }, headers={'Authorization': f'Bearer {token}'})
        eid = json.loads(resp.data)['election']['id']
        
        resp = client.delete(f'/api/elections/{eid}', headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 200


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
