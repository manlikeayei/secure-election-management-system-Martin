"""Database models for the voting system."""
from extensions import db
from datetime import datetime
import hashlib
from crypto_utils import aes_encrypt, aes_decrypt, hash_sensitive_data
from faker import Faker
import random

fake = Faker()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)
    
    # AES-256 encrypted PII
    encrypted_ssn = db.Column(db.Text, nullable=True)
    encrypted_address = db.Column(db.Text, nullable=True)
    encrypted_phone = db.Column(db.Text, nullable=True)
    
    # Photo for human verification (Base64 JPEG, AES-256 encrypted)
    encrypted_photo = db.Column(db.Text, nullable=True)
    has_photo = db.Column(db.Boolean, default=False, nullable=False)
    
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, 
                          onupdate=datetime.utcnow)
    
    # Relationships
    votes = db.relationship('Vote', backref='voter', lazy='dynamic', cascade='all, delete-orphan')
    attributes = db.relationship('UserAttribute', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        import bcrypt
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')
    
    def check_password(self, password):
        import bcrypt
        return bcrypt.checkpw(
            password.encode('utf-8'), self.password_hash.encode('utf-8')
        )
    
    def set_encrypted_field(self, field_name, value):
        if value:
            setattr(self, f'encrypted_{field_name}', aes_encrypt(str(value)))
    
    def get_decrypted_field(self, field_name):
        val = getattr(self, f'encrypted_{field_name}')
        if val:
            return aes_decrypt(val)
        return None
    
    def set_photo(self, base64_data: str):
        """Store user photo (Base64 JPEG) encrypted with AES-256."""
        if base64_data:
            self.encrypted_photo = aes_encrypt(base64_data)
            self.has_photo = True
    
    def get_photo(self) -> str | None:
        """Retrieve decrypted photo (Base64 JPEG)."""
        if self.encrypted_photo:
            return aes_decrypt(self.encrypted_photo)
        return None
    
    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': str(self.date_of_birth) if self.date_of_birth else None,
            'is_admin': self.is_admin,
            'is_active': self.is_active,
            'has_photo': self.has_photo,
            'created_at': str(self.created_at),
        }
        if include_sensitive:
            data['phone'] = self.get_decrypted_field('phone')
            data['address'] = self.get_decrypted_field('address')
            data['photo'] = self.get_photo()
        return data


class Election(db.Model):
    __tablename__ = 'elections'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    election_type = db.Column(db.String(100), nullable=False)  # general, primary, referendum, board, custom
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    require_all_attributes = db.Column(db.Boolean, default=False)
    require_photo = db.Column(db.Boolean, default=False)  # Whether voters must have a photo on file
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow,
                          onupdate=datetime.utcnow)
    
    # Relationships
    participants = db.relationship('Participant', backref='election', lazy='dynamic', 
                                   cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='election_ref', lazy='dynamic', cascade='all, delete-orphan')
    required_attributes = db.relationship('ElectionAttribute', backref='election', lazy='dynamic',
                                         cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'election_type': self.election_type,
            'description': self.description,
            'start_date': str(self.start_date),
            'end_date': str(self.end_date),
            'is_active': self.is_active,
            'require_all_attributes': self.require_all_attributes,
            'require_photo': self.require_photo,
            'created_by': self.created_by,
            'created_at': str(self.created_at),
            'participants': [p.to_dict() for p in self.participants.all()],
            'required_attributes': [ea.to_dict() for ea in self.required_attributes.all()],
            'total_votes': self.votes.count(),
        }


class Participant(db.Model):
    __tablename__ = 'participants'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    party = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    votes = db.relationship('Vote', backref='participant', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'party': self.party,
            'bio': self.bio,
            'image_url': self.image_url,
            'election_id': self.election_id,
            'vote_count': self.votes.count(),
        }


class Vote(db.Model):
    __tablename__ = 'votes'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
    participant_id = db.Column(db.Integer, db.ForeignKey('participants.id'), nullable=False)
    
    # Vote integrity hash (encrypted)
    vote_hash = db.Column(db.String(255), nullable=False)
    
    cast_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'election_id', name='uq_user_election_vote'),
    )
    
    def generate_hash(self):
        try:
            ts = str(self.cast_at) if self.cast_at else str(datetime.utcnow())
            raw = f"{self.user_id}:{self.election_id}:{self.participant_id}:{ts}"
            return hashlib.sha256(raw.encode()).hexdigest()
        except Exception:
            return hashlib.sha256(f"{self.user_id}:{self.election_id}:{self.participant_id}".encode()).hexdigest()
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'election_id': self.election_id,
            'participant_id': self.participant_id,
            'cast_at': str(self.cast_at),
        }


class AttributeDefinition(db.Model):
    __tablename__ = 'attribute_definitions'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user_attributes = db.relationship('UserAttribute', backref='definition', lazy='dynamic',
                                      cascade='all, delete-orphan')
    election_attributes = db.relationship('ElectionAttribute', backref='definition', lazy='dynamic',
                                         cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'created_by': self.created_by,
            'created_at': str(self.created_at),
        }


class UserAttribute(db.Model):
    __tablename__ = 'user_attributes'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    attribute_id = db.Column(db.Integer, db.ForeignKey('attribute_definitions.id'), nullable=False)
    value = db.Column(db.String(255), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'attribute_id', name='uq_user_attribute'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'attribute_id': self.attribute_id,
            'attribute_name': self.definition.name,
            'value': self.value,
            'assigned_at': str(self.assigned_at),
        }


class ElectionAttribute(db.Model):
    __tablename__ = 'election_attributes'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.id'), nullable=False)
    attribute_id = db.Column(db.Integer, db.ForeignKey('attribute_definitions.id'), nullable=False)
    required_value = db.Column(db.String(255), nullable=False)
    
    __table_args__ = (
        db.UniqueConstraint('election_id', 'attribute_id', 'required_value', name='uq_election_attribute'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'election_id': self.election_id,
            'attribute_id': self.attribute_id,
            'attribute_name': self.definition.name,
            'required_value': self.required_value,
        }


def init_db():
    """Initialize database with seed data if empty."""
    import bcrypt
    
    # Check if we already have users
    if User.query.first() is not None:
        return
    
    print("🌱 Seeding database with test data...")
    
    # Create admin user (credentials from config / env vars)
    from config import Config
    admin = User(
        email=Config.ADMIN_EMAIL,
        first_name=Config.ADMIN_FIRST_NAME,
        last_name=Config.ADMIN_LAST_NAME,
        is_admin=True,
        is_active=True,
    )
    admin.set_password(Config.ADMIN_PASSWORD)
    admin.set_encrypted_field('ssn', '000-00-0000')
    admin.set_encrypted_field('address', '1 Admin Plaza, Capital City')
    admin.set_encrypted_field('phone', '555-0100')
    db.session.add(admin)
    
    # Create 100 test voters
    for i in range(1, 101):
        gender = random.choice(['M', 'F'])
        first = fake.first_name_male() if gender == 'M' else fake.first_name_female()
        last = fake.last_name()
        
        voter = User(
            email=f'voter{i}@test.com',
            first_name=first,
            last_name=last,
            date_of_birth=fake.date_of_birth(minimum_age=18, maximum_age=90),
            is_admin=False,
            is_active=random.choice([True, True, True, False]),  # 75% active
        )
        voter.set_password('Voter@123!')
        voter.set_encrypted_field('ssn', fake.ssn())
        voter.set_encrypted_field('address', fake.address())
        voter.set_encrypted_field('phone', fake.phone_number())
        db.session.add(voter)
    
    db.session.flush()
    
    # Create attribute definitions
    attributes_data = [
        {'name': 'department', 'display_name': 'Department', 'description': 'Organizational department'},
        {'name': 'region', 'display_name': 'Region', 'description': 'Geographic region'},
        {'name': 'membership_tier', 'display_name': 'Membership Tier', 'description': 'Membership level'},
        {'name': 'clearance_level', 'display_name': 'Clearance Level', 'description': 'Security clearance'},
        {'name': 'age_group', 'display_name': 'Age Group', 'description': 'Age classification'},
        {'name': 'employment_status', 'display_name': 'Employment Status', 'description': 'Current employment'},
    ]
    
    attr_defs = []
    for ad in attributes_data:
        attr_def = AttributeDefinition(
            name=ad['name'],
            display_name=ad['display_name'],
            description=ad['description'],
            created_by=admin.id,
        )
        db.session.add(attr_def)
        attr_defs.append(attr_def)
    
    db.session.flush()
    
    # Assign attributes to users
    departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Legal', 'IT']
    regions = ['North', 'South', 'East', 'West', 'Central', 'Northeast', 'Southeast', 'Northwest']
    tiers = ['Basic', 'Silver', 'Gold', 'Platinum', 'Diamond']
    clearances = ['Public', 'Confidential', 'Secret', 'Top Secret']
    age_groups = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+']
    employment = ['Full-time', 'Part-time', 'Contract', 'Retired', 'Student']
    
    # Get all users (skip admin at id=1)
    users = User.query.filter(User.id != admin.id).all()
    for user in users:
        attrs_to_assign = [
            (attr_defs[0], random.choice(departments)),
            (attr_defs[1], random.choice(regions)),
            (attr_defs[2], random.choice(tiers)),
            (attr_defs[3], random.choice(clearances)),
            (attr_defs[4], random.choice(age_groups)),
            (attr_defs[5], random.choice(employment)),
        ]
        for attr_def, value in attrs_to_assign:
            ua = UserAttribute(
                user_id=user.id,
                attribute_id=attr_def.id,
                value=value,
            )
            db.session.add(ua)
    
    db.session.flush()
    
    # Create sample elections
    elections_data = [
        {
            'name': 'Board of Directors Election 2026',
            'election_type': 'board',
            'description': 'Annual board of directors election for all Gold tier and above members.',
            'start_date': datetime(2026, 1, 1, 0, 0),
            'end_date': datetime(2026, 12, 31, 23, 59),
            'require_all_attributes': False,
        },
        {
            'name': 'Engineering Department Lead',
            'election_type': 'department',
            'description': 'Select the department lead for Engineering. Only Engineering department members.',
            'start_date': datetime(2026, 3, 1, 0, 0),
            'end_date': datetime(2026, 6, 30, 23, 59),
            'require_all_attributes': False,
        },
        {
            'name': 'Regional Council - Western States',
            'election_type': 'regional',
            'description': 'Western region council election. For West, Northwest, and Southwest region members.',
            'start_date': datetime(2026, 2, 1, 0, 0),
            'end_date': datetime(2026, 5, 31, 23, 59),
            'require_all_attributes': False,
        },
        {
            'name': 'Company-wide Policy Referendum',
            'election_type': 'referendum',
            'description': 'Vote on new remote work policy. All active employees eligible.',
            'start_date': datetime(2026, 4, 1, 0, 0),
            'end_date': datetime(2026, 4, 30, 23, 59),
            'require_all_attributes': False,
        },
        {
            'name': 'Top Secret Clearance Committee',
            'election_type': 'committee',
            'description': 'Restricted election for Top Secret clearance holders only.',
            'start_date': datetime(2026, 5, 1, 0, 0),
            'end_date': datetime(2026, 8, 31, 23, 59),
            'require_all_attributes': True,
        },
    ]
    
    for ed in elections_data:
        election = Election(
            name=ed['name'],
            election_type=ed['election_type'],
            description=ed['description'],
            start_date=ed['start_date'],
            end_date=ed['end_date'],
            created_by=admin.id,
            require_all_attributes=ed['require_all_attributes'],
        )
        db.session.add(election)
    
    db.session.flush()
    
    # Create participants for each election
    elections = Election.query.all()
    for election in elections:
        num_participants = random.randint(2, 6)
        for j in range(num_participants):
            participant = Participant(
                name=fake.name(),
                party=random.choice(['Innovation Party', 'Tradition Party', 'Unity Alliance', 'Progressive Front', 'Independent']),
                bio=fake.sentence(nb_words=15),
                election_id=election.id,
            )
            db.session.add(participant)
    
    # Assign required attributes to elections
    # Board election requires Gold+ tier
    board_election = Election.query.filter_by(name='Board of Directors Election 2026').first()
    if board_election:
        tier_attr = AttributeDefinition.query.filter_by(name='membership_tier').first()
        ea1 = ElectionAttribute(election_id=board_election.id, attribute_id=tier_attr.id, required_value='Gold')
        ea2 = ElectionAttribute(election_id=board_election.id, attribute_id=tier_attr.id, required_value='Platinum')
        ea3 = ElectionAttribute(election_id=board_election.id, attribute_id=tier_attr.id, required_value='Diamond')
        db.session.add_all([ea1, ea2, ea3])
    
    # Engineering election requires Engineering department
    eng_election = Election.query.filter_by(name='Engineering Department Lead').first()
    if eng_election:
        dept_attr = AttributeDefinition.query.filter_by(name='department').first()
        db.session.add(ElectionAttribute(
            election_id=eng_election.id, attribute_id=dept_attr.id, required_value='Engineering'
        ))
    
    # Regional election requires West region
    reg_election = Election.query.filter_by(name='Regional Council - Western States').first()
    if reg_election:
        region_attr = AttributeDefinition.query.filter_by(name='region').first()
        db.session.add(ElectionAttribute(
            election_id=reg_election.id, attribute_id=region_attr.id, required_value='West'
        ))
    
    # Top Secret clearance committee
    ts_election = Election.query.filter_by(name='Top Secret Clearance Committee').first()
    if ts_election:
        clearance_attr = AttributeDefinition.query.filter_by(name='clearance_level').first()
        db.session.add(ElectionAttribute(
            election_id=ts_election.id, attribute_id=clearance_attr.id, required_value='Top Secret'
        ))
    
    db.session.commit()
    print("✅ Database seeded successfully!")
    print(f"   - {User.query.count()} users (1 admin + 100 voters)")
    print(f"   - {AttributeDefinition.query.count()} attribute definitions")
    print(f"   - {Election.query.count()} elections")
    print(f"   - {Participant.query.count()} participants")
    print("   Login: admin@votingsystem.com / Admin@123!")
    print("   Voter: voter1@test.com / Voter@123!")
