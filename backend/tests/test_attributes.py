"""Tests for attribute management module."""
import json
import pytest
from app import create_app
from extensions import db
from models import User, AttributeDefinition


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
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


def get_admin_token(client):
    resp = client.post('/api/auth/login', json={'email': 'admin@t.com', 'password': 'Admin@123!'})
    return json.loads(resp.data)['token']


class TestAttributes:
    def test_create_attribute(self, client):
        token = get_admin_token(client)
        resp = client.post('/api/attributes', json={
            'name': 'test_attr',
            'display_name': 'Test Attribute',
            'description': 'A test attribute'
        }, headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 201
        data = json.loads(resp.data)
        assert data['attribute']['name'] == 'test_attr'
    
    def test_list_attributes(self, client):
        token = get_admin_token(client)
        client.post('/api/attributes', json={
            'name': 'attr1', 'display_name': 'Attribute 1'
        }, headers={'Authorization': f'Bearer {token}'})
        
        resp = client.get('/api/attributes', headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert len(data['attributes']) >= 1
    
    def test_delete_attribute(self, client):
        token = get_admin_token(client)
        resp = client.post('/api/attributes', json={
            'name': 'to_delete', 'display_name': 'To Delete'
        }, headers={'Authorization': f'Bearer {token}'})
        aid = json.loads(resp.data)['attribute']['id']
        
        resp = client.delete(f'/api/attributes/{aid}', headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 200
    
    def test_duplicate_attribute_name(self, client):
        token = get_admin_token(client)
        client.post('/api/attributes', json={
            'name': 'unique_attr', 'display_name': 'Unique'
        }, headers={'Authorization': f'Bearer {token}'})
        
        resp = client.post('/api/attributes', json={
            'name': 'unique_attr', 'display_name': 'Duplicate'
        }, headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 409


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
