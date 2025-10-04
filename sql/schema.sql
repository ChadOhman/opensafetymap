-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    oauth_provider ENUM('google', 'apple', 'mastodon', 'bluesky') NOT NULL,
    oauth_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    role ENUM('user', 'moderator', 'admin') DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'banned') DEFAULT 'active',
    privacy ENUM('public','logged-in','private') DEFAULT 'public'
);

-- Lookup: Categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('pedestrian', 'cyclist', 'vehicle') UNIQUE NOT NULL
);

-- Lookup: Severity levels
CREATE TABLE severity_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('minor', 'major', 'critical') UNIQUE NOT NULL
);

-- Lookup: Incident types
CREATE TABLE incident_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('accident', 'near-miss') UNIQUE NOT NULL
);

-- Reports table (references lookup tables)
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    severity_id INT NOT NULL,
    incident_type_id INT NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    photo_url VARCHAR(255) DEFAULT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    status ENUM('pending','approved','rejected') DEFAULT 'approved',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (severity_id) REFERENCES severity_levels(id),
    FOREIGN KEY (incident_type_id) REFERENCES incident_types(id)
);

-- Comments table
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Flags table
CREATE TABLE flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_type ENUM('report', 'comment') NOT NULL,
    target_id INT NOT NULL,
    reason TEXT,
    status ENUM('pending', 'reviewed', 'dismissed', 'removed') DEFAULT 'pending',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    require_approval BOOLEAN DEFAULT 0
);

-- Moderation Log table
CREATE TABLE moderation_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    moderator_id INT NOT NULL,
    action_type ENUM('report_approve','report_reject',
  'user_ban','user_unban',
  'flag_dismiss','flag_remove') NOT NULL,
    target_id INT NOT NULL, -- report_id or user_id depending on action
    details TEXT,
    notes TEXT DEFAULT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moderator_id) REFERENCES users(id)
);

-- Seed data for lookups
INSERT INTO categories (name) VALUES ('pedestrian'), ('cyclist'), ('vehicle');
INSERT INTO severity_levels (name) VALUES ('minor'), ('major'), ('critical');
INSERT INTO incident_types (name) VALUES ('accident'), ('near-miss');
