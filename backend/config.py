"""Application configuration with AES-256 encryption settings."""
import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'aes256-voting-system-secret-key-change-in-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=6)
    
    # MySQL Database
    DB_USER = os.environ.get('DB_USER', 'voting_admin')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'V0t1ngS3cur3!')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '3306')
    DB_NAME = os.environ.get('DB_NAME', 'voting_system')
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # AES-256 Encryption Key (32 bytes)
    AES_KEY = os.environ.get(
        'AES_KEY',
        'b7f8c9a1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8'
    )
    
    # App settings
    MAX_VOTERS_PER_ELECTION = 100000
    RESULTS_CACHE_TTL = 30  # seconds
    
    # Default admin credentials (change these via env vars in production)
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@votingsystem.com')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@123!')
    ADMIN_FIRST_NAME = os.environ.get('ADMIN_FIRST_NAME', 'System')
    ADMIN_LAST_NAME = os.environ.get('ADMIN_LAST_NAME', 'Administrator')
