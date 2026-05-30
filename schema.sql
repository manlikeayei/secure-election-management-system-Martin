-- =============================================================================
-- VoteSecure - Database Schema
-- MySQL 8.0+
-- Run: mysql -u root -p < schema.sql
-- =============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS voting_system
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE voting_system;

-- Create application user
DROP USER IF EXISTS 'voting_admin'@'localhost';
CREATE USER 'voting_admin'@'localhost' IDENTIFIED BY 'V0t1ngS3cur3!';
GRANT ALL PRIVILEGES ON voting_system.* TO 'voting_admin'@'localhost';
FLUSH PRIVILEGES;

-- =============================================================================
-- TABLES
-- =============================================================================

-- 1. Users (voters and admins)
CREATE TABLE users (
    id              INT             NOT NULL AUTO_INCREMENT,
    email           VARCHAR(255)    NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    date_of_birth   DATE            NULL,
    encrypted_ssn   TEXT            NULL        COMMENT 'AES-256-GCM encrypted SSN',
    encrypted_address TEXT          NULL        COMMENT 'AES-256-GCM encrypted address',
    encrypted_phone TEXT            NULL        COMMENT 'AES-256-GCM encrypted phone number',
    encrypted_photo TEXT            NULL        COMMENT 'AES-256-GCM encrypted Base64 JPEG photo',
    has_photo       TINYINT(1)      NOT NULL DEFAULT 0  COMMENT 'Whether user has uploaded a photo',
    is_admin        TINYINT(1)      NOT NULL DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Elections
CREATE TABLE elections (
    id                      INT             NOT NULL AUTO_INCREMENT,
    name                    VARCHAR(255)    NOT NULL,
    election_type           VARCHAR(100)    NOT NULL    COMMENT 'general, primary, referendum, board, committee, department, regional',
    description             TEXT            NULL,
    start_date              DATETIME        NOT NULL,
    end_date                DATETIME        NOT NULL,
    is_active               TINYINT(1)      NOT NULL DEFAULT 1,
    require_all_attributes  TINYINT(1)      NOT NULL DEFAULT 0  COMMENT '1=AND mode, 0=OR mode for attribute matching',
    require_photo           TINYINT(1)      NOT NULL DEFAULT 0  COMMENT 'Whether voters need a photo on file',
    created_by              INT             NOT NULL,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_elections_name (name),
    INDEX idx_elections_created_by (created_by),
    CONSTRAINT fk_elections_created_by FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Participants (candidates/options in elections)
CREATE TABLE participants (
    id          INT             NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255)    NOT NULL,
    party       VARCHAR(255)    NULL,
    bio         TEXT            NULL,
    image_url   VARCHAR(500)    NULL,
    election_id INT             NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_participants_election (election_id),
    CONSTRAINT fk_participants_election FOREIGN KEY (election_id) REFERENCES elections(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Votes (one per user per election)
CREATE TABLE votes (
    id              INT             NOT NULL AUTO_INCREMENT,
    user_id         INT             NOT NULL,
    election_id     INT             NOT NULL,
    participant_id  INT             NOT NULL,
    vote_hash       VARCHAR(255)    NOT NULL    COMMENT 'SHA-256 integrity hash',
    cast_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_election_vote (user_id, election_id),
    INDEX idx_votes_election (election_id),
    INDEX idx_votes_participant (participant_id),
    CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_votes_election FOREIGN KEY (election_id) REFERENCES elections(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_votes_participant FOREIGN KEY (participant_id) REFERENCES participants(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Attribute Definitions
CREATE TABLE attribute_definitions (
    id          INT             NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)    NOT NULL        COMMENT 'System name e.g. department',
    display_name VARCHAR(255)   NOT NULL        COMMENT 'Human-readable e.g. Department',
    description TEXT            NULL,
    created_by  INT             NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attrdef_name (name),
    INDEX idx_attrdef_name (name),
    CONSTRAINT fk_attrdef_created_by FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. User Attributes (which attributes a user has)
CREATE TABLE user_attributes (
    id           INT          NOT NULL AUTO_INCREMENT,
    user_id      INT          NOT NULL,
    attribute_id INT          NOT NULL,
    value        VARCHAR(255) NOT NULL,
    assigned_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_attribute (user_id, attribute_id),
    INDEX idx_userattr_user (user_id),
    INDEX idx_userattr_attribute (attribute_id),
    CONSTRAINT fk_userattr_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_userattr_attribute FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Election Attributes (required attributes for an election)
CREATE TABLE election_attributes (
    id              INT             NOT NULL AUTO_INCREMENT,
    election_id     INT             NOT NULL,
    attribute_id    INT             NOT NULL,
    required_value  VARCHAR(255)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_election_attribute (election_id, attribute_id, required_value),
    INDEX idx_elecattr_election (election_id),
    INDEX idx_elecattr_attribute (attribute_id),
    CONSTRAINT fk_elecattr_election FOREIGN KEY (election_id) REFERENCES elections(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_elecattr_attribute FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT '✅ Schema created successfully!' AS status;
SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'voting_system' 
ORDER BY TABLE_NAME;
