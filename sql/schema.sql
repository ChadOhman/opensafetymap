-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    oauth_provider VARCHAR(20) NOT NULL,
    oauth_id VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255),
    username VARCHAR(50) UNIQUE NOT NULL,
    role ENUM('user', 'moderator', 'admin') DEFAULT 'user',
    status ENUM('active', 'banned') DEFAULT 'active',
    privacy ENUM('public', 'logged-in', 'private') DEFAULT 'public',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_oauth (oauth_provider, oauth_id)
);

-- Auth Tokens
CREATE TABLE auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    device_name VARCHAR(100) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Lookup: Reporter Modes
CREATE TABLE reporter_modes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Lookup: Other Parties
CREATE TABLE other_parties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Lookup: Incident Types
CREATE TABLE incident_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Lookup: Severity Levels
CREATE TABLE severity_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Reports table
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    reporter_mode_id INT NOT NULL,
    incident_type_id INT NOT NULL,
    severity_id INT NOT NULL,
    description TEXT NOT NULL,
    incident_date DATETIME DEFAULT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    video_url VARCHAR(500) DEFAULT NULL,
    reporter_email VARCHAR(255) DEFAULT NULL,
    reporter_phone VARCHAR(20) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_mode_id) REFERENCES reporter_modes(id),
    FOREIGN KEY (incident_type_id) REFERENCES incident_types(id),
    FOREIGN KEY (severity_id) REFERENCES severity_levels(id)
);

-- Report Other Parties (junction table)
CREATE TABLE report_other_parties (
    report_id INT NOT NULL,
    other_party_id INT NOT NULL,
    PRIMARY KEY (report_id, other_party_id),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (other_party_id) REFERENCES other_parties(id)
);

-- Report Photos
CREATE TABLE report_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    sort_order TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Comments
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    author_name VARCHAR(100) DEFAULT NULL,
    content TEXT NOT NULL,
    status ENUM('pending', 'approved') DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Flags
CREATE TABLE flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    target_type ENUM('report', 'comment') NOT NULL,
    target_id INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'dismissed', 'removed') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Settings
CREATE TABLE settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL
);

-- Moderation Log
CREATE TABLE moderation_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    moderator_id INT NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id INT NOT NULL,
    details TEXT,
    notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moderator_id) REFERENCES users(id)
);

-- Rate Limits
CREATE TABLE rate_limits (
    ip_address VARCHAR(45) NOT NULL,
    endpoint_group VARCHAR(30) NOT NULL,
    request_count INT DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ip_address, endpoint_group)
);

-- Upload Tokens
CREATE TABLE upload_tokens (
    token VARCHAR(64) PRIMARY KEY,
    user_id INT DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_created ON reports(created_at);
CREATE INDEX idx_reports_location ON reports(latitude, longitude);
CREATE INDEX idx_report_photos_report ON report_photos(report_id);
CREATE INDEX idx_comments_report ON comments(report_id);
CREATE INDEX idx_flags_status ON flags(status);
CREATE INDEX idx_flags_target ON flags(target_type, target_id);
CREATE INDEX idx_modlog_moderator ON moderation_log(moderator_id);
CREATE INDEX idx_modlog_target ON moderation_log(target_type, target_id);
CREATE INDEX idx_report_other_parties_party ON report_other_parties(other_party_id);

-- Seed data for lookup tables
INSERT INTO reporter_modes (name) VALUES
    ('pedestrian'), ('cyclist'), ('e-scooter'), ('motorcyclist'),
    ('driver'), ('transit-rider'), ('other');

INSERT INTO other_parties (name) VALUES
    ('pedestrian'), ('cyclist'), ('e-scooter'), ('motorcyclist'),
    ('motor-vehicle'), ('commercial-vehicle'), ('transit-vehicle'),
    ('infrastructure'), ('none-unknown');

INSERT INTO incident_types (name) VALUES
    ('collision'), ('near-miss'), ('road-rage'),
    ('blocked-lane'), ('running-signal'), ('infrastructure-hazard'), ('other');

INSERT INTO severity_levels (name) VALUES
    ('minor'), ('major'), ('critical');

INSERT INTO settings (setting_key, setting_value) VALUES
    ('require_approval', '1');
