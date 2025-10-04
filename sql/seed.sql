-- Seed data for Accident Reports Platform

-- Categories
INSERT INTO categories (id, name) VALUES
(1, 'Pedestrian'),
(2, 'Cyclist'),
(3, 'Motor Vehicle');

-- Severity Levels
INSERT INTO severity_levels (id, name) VALUES
(1, 'Minor'),
(2, 'Moderate'),
(3, 'Severe');

-- Incident Types
INSERT INTO incident_types (id, name) VALUES
(1, 'Accident'),
(2, 'Near Miss');

-- Settings
INSERT INTO settings (id, require_approval) VALUES
(1, 1);


-- Sample Admin User (replace oauth_provider and oauth_id after real OAuth login)
INSERT INTO users (id, username, oauth_provider, oauth_id, role, status, privacy, created_at) VALUES
(1, 'brave_wise_owl', 'google', 'sample-admin-oauth-id', 'admin', 'active', 'public', NOW());


-- Handy Admin Snippets

-- Promote user to moderator
-- UPDATE users SET role='moderator' WHERE id=USER_ID;

-- Promote user to admin
-- UPDATE users SET role='admin' WHERE id=USER_ID;

-- Demote user back to regular user
-- UPDATE users SET role='user' WHERE id=USER_ID;

-- Ban a user
-- UPDATE users SET status='banned' WHERE id=USER_ID;

-- Unban a user
-- UPDATE users SET status='active' WHERE id=USER_ID;


-- Sample Moderator User (replace oauth_provider and oauth_id after real OAuth login)
INSERT INTO users (id, username, oauth_provider, oauth_id, role, status, privacy, created_at) VALUES
(2, 'quick_clever_fox', 'google', 'sample-moderator-oauth-id', 'moderator', 'active', 'public', NOW());


-- Sample Regular User (replace oauth_provider and oauth_id after real OAuth login)
INSERT INTO users (id, username, oauth_provider, oauth_id, role, status, privacy, created_at) VALUES
(3, 'gentle_happy_otter', 'google', 'sample-user-oauth-id', 'user', 'active', 'public', NOW());


-- Sample Reports
INSERT INTO reports (id, user_id, category_id, severity_id, incident_type_id, description, latitude, longitude, photo_url, status, timestamp)
VALUES
(1, 3, 1, 2, 1, 'Pedestrian hit by car at crosswalk', 53.5461, -113.4938, NULL, 'approved', NOW() - INTERVAL 7 DAY),
(2, 3, 2, 1, 2, 'Cyclist almost hit by turning vehicle', 53.5500, -113.5000, NULL, 'pending', NOW() - INTERVAL 2 DAY),
(3, 3, 3, 3, 1, 'Severe vehicle collision on Jasper Ave', 53.5440, -113.4900, NULL, 'rejected', NOW() - INTERVAL 1 DAY);

-- Sample Comments
INSERT INTO comments (id, user_id, report_id, content, timestamp) VALUES
(1, 2, 1, 'This location is dangerous, I have seen multiple incidents here.', NOW() - INTERVAL 6 DAY),
(2, 1, 1, 'Marked for city follow-up.', NOW() - INTERVAL 5 DAY);

-- Sample Flags
INSERT INTO flags (id, user_id, report_id, reason, status, timestamp) VALUES
(1, 2, 3, 'Inappropriate language in description', 'pending', NOW());


-- Sample Moderation Logs
INSERT INTO moderation_log (id, moderator_id, action_type, target_id, details, notes, timestamp) VALUES
(1, 2, 'report_approve', 1, 'Approved pedestrian accident report', 'Verified with city records', NOW() - INTERVAL 6 DAY),
(2, 2, 'report_reject', 3, 'Rejected severe vehicle collision report', 'Duplicate entry of another report', NOW() - INTERVAL 12 HOUR),
(3, 1, 'user_ban', 3, 'User banned for repeated spam reports', 'Ban lifted after appeal', NOW() - INTERVAL 3 DAY);


-- Additional Reports for Analytics Trends
INSERT INTO reports (user_id, category_id, severity_id, incident_type_id, description, latitude, longitude, photo_url, status, timestamp, resolved_at) VALUES
(3, 1, 1, 2, 'Near miss at 109 St crosswalk', 53.5400, -113.4900, NULL, 'approved', NOW() - INTERVAL 3 WEEK, NOW() - INTERVAL 3 WEEK + INTERVAL 1 HOUR),
(3, 2, 2, 1, 'Cyclist clipped by mirror on Whyte Ave', 53.5200, -113.4900, NULL, 'approved', NOW() - INTERVAL 2 WEEK, NOW() - INTERVAL 2 WEEK + INTERVAL 3 HOUR),
(3, 3, 3, 1, 'Multi-vehicle crash on Anthony Henday', 53.6000, -113.6000, NULL, 'rejected', NOW() - INTERVAL 2 WEEK, NOW() - INTERVAL 2 WEEK + INTERVAL 2 HOUR),
(3, 1, 2, 2, 'Pedestrian almost hit turning at Jasper Ave', 53.5450, -113.4950, NULL, 'approved', NOW() - INTERVAL 1 WEEK, NOW() - INTERVAL 1 WEEK + INTERVAL 1 HOUR),
(3, 2, 1, 1, 'Bike crash at river valley trail', 53.5300, -113.4800, NULL, 'rejected', NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 5 DAY + INTERVAL 30 MINUTE),
(3, 3, 2, 2, 'Car swerved to avoid collision downtown', 53.5500, -113.4800, NULL, 'approved', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY + INTERVAL 2 HOUR);


-- Additional Diverse Reports for Category/Severity/Incident Testing
INSERT INTO reports (user_id, category_id, severity_id, incident_type_id, description, latitude, longitude, photo_url, status, timestamp, resolved_at) VALUES
(3, 1, 3, 1, 'Serious pedestrian accident at Whyte Ave crosswalk', 53.5190, -113.4970, NULL, 'approved', NOW() - INTERVAL 4 WEEK, NOW() - INTERVAL 4 WEEK + INTERVAL 2 HOUR),
(3, 2, 1, 2, 'Cyclist near miss on High Level Bridge', 53.5340, -113.5070, NULL, 'approved', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY + INTERVAL 1 HOUR),
(3, 3, 2, 1, 'Two-car collision on Yellowhead Trail', 53.5700, -113.4500, NULL, 'rejected', NOW() - INTERVAL 8 DAY, NOW() - INTERVAL 8 DAY + INTERVAL 4 HOUR),
(3, 1, 2, 2, 'Pedestrian almost hit by bus downtown', 53.5455, -113.4905, NULL, 'approved', NOW() - INTERVAL 15 DAY, NOW() - INTERVAL 15 DAY + INTERVAL 45 MINUTE),
(3, 2, 3, 1, 'Severe bike crash at Saskatchewan Drive hill', 53.5205, -113.5055, NULL, 'pending', NOW() - INTERVAL 1 DAY, NULL),
(3, 3, 1, 2, 'Vehicle near miss on Groat Road curve', 53.5405, -113.5355, NULL, 'pending', NOW() - INTERVAL 12 HOUR, NULL);


-- Extra Comments
INSERT INTO comments (user_id, report_id, content, timestamp) VALUES
(2, 4, 'I saw this incident too, very concerning.', NOW() - INTERVAL 4 WEEK),
(1, 5, 'Marked for review by city safety team.', NOW() - INTERVAL 9 DAY),
(3, 6, 'Driver was speeding, dangerous spot.', NOW() - INTERVAL 7 DAY),
(2, 7, 'This crosswalk really needs better signage.', NOW() - INTERVAL 12 HOUR);

-- Extra Flags
INSERT INTO flags (user_id, report_id, reason, status, timestamp) VALUES
(1, 2, 'Potential duplicate of another report', 'pending', NOW() - INTERVAL 1 DAY),
(2, 5, 'Description unclear / not helpful', 'pending', NOW() - INTERVAL 6 HOUR),
(3, 6, 'Possible spam content', 'pending', NOW() - INTERVAL 2 HOUR);


-- Resolved Flags
INSERT INTO flags (id, user_id, report_id, reason, status, timestamp) VALUES
(4, 1, 1, 'Offensive wording in description', 'dismissed', NOW() - INTERVAL 14 DAY),
(5, 2, 2, 'Spam content suspected', 'removed', NOW() - INTERVAL 9 DAY);

-- Moderation Log Entries for Resolved Flags
INSERT INTO moderation_log (moderator_id, action_type, target_id, details, notes, timestamp) VALUES
(2, 'flag_dismiss', 1, 'Flag dismissed as invalid', 'No offensive wording found', NOW() - INTERVAL 14 DAY),
(1, 'flag_remove', 2, 'Flagged report removed', 'Confirmed spam report', NOW() - INTERVAL 9 DAY);
