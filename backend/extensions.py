"""Shared SQLAlchemy instance to avoid circular imports."""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
