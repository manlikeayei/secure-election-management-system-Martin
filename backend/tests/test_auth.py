"""Tests for authentication module."""
import json
import pytest
from app import create_app
from extensions import db
from models import User


@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.create_all()
        # Create test admin
        admin = User(email='testadmin@test.com', first_name='Admin', last_name='Test', is_admin=True)
        admin.set_password('Admin@123!')
        db.session.add(admin)
        db.session.commit()
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


class TestAuth:
    def test_login_success(self, client):
        resp = client.post('/api/auth/login', json={
            'email': 'testadmin@test.com',
            'password': 'Admin@123!'
        })
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert 'token' in data
        assert data['user']['is_admin'] is True
    
    def test_login_invalid(self, client):
        resp = client.post('/api/auth/login', json={
            'email': 'testadmin@test.com',
            'password': 'wrong'
        })
        assert resp.status_code == 401
    
    def test_register_voter(self, client):
        resp = client.post('/api/auth/register', json={
            'email': 'newuser@test.com',
            'password': 'StrongP@ss1!',
            'first_name': 'New',
            'last_name': 'User',
            'phone': '555-1234',
        })
        assert resp.status_code == 201
        data = json.loads(resp.data)
        assert 'token' in data
    
    def test_register_duplicate(self, client):
        client.post('/api/auth/register', json={
            'email': 'dup@test.com',
            'password': 'StrongP@ss1!',
            'first_name': 'Dup',
            'last_name': 'User',
        })
        resp = client.post('/api/auth/register', json={
            'email': 'dup@test.com',
            'password': 'StrongP@ss1!',
            'first_name': 'Dup',
            'last_name': 'User',
        })
        assert resp.status_code == 409
    
    def test_weak_password(self, client):
        resp = client.post('/api/auth/register', json={
            'email': 'weakpw@test.com',
            'password': 'weak',
            'first_name': 'Weak',
            'last_name': 'Password',
        })
        assert resp.status_code == 400


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
