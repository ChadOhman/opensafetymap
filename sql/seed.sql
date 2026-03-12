-- Seed data for Open Safety Map (test/development)

-- Test Users
INSERT INTO users (id, oauth_provider, oauth_id, name, email, username, role, status, privacy, created_at) VALUES
(1, 'google', 'test-user-1', 'Alice Johnson', 'alice@example.com', 'gentle_happy_otter', 'user', 'active', 'public', NOW() - INTERVAL 30 DAY),
(2, 'google', 'test-user-2', 'Bob Martinez', 'bob@example.com', 'quick_clever_fox', 'moderator', 'active', 'public', NOW() - INTERVAL 60 DAY),
(3, 'google', 'test-user-3', 'Carol Chen', 'carol@example.com', 'brave_wise_owl', 'admin', 'active', 'logged-in', NOW() - INTERVAL 90 DAY);

-- Test Reports (diverse reporter_modes, incident_types, severities)
-- Report 1: Authenticated user, cyclist collision, major severity
INSERT INTO reports (id, user_id, reporter_mode_id, incident_type_id, severity_id, description, incident_date, latitude, longitude, status, created_at) VALUES
(1, 1, 2, 1, 2, 'Cyclist struck by turning vehicle at intersection. Driver failed to check bike lane before right turn.', NOW() - INTERVAL 14 DAY, 43.6532000, -79.3832000, 'approved', NOW() - INTERVAL 14 DAY);

-- Report 2: Authenticated user, pedestrian near-miss, minor severity
INSERT INTO reports (id, user_id, reporter_mode_id, incident_type_id, severity_id, description, incident_date, latitude, longitude, status, created_at) VALUES
(2, 1, 1, 2, 1, 'Car ran red light while I was in crosswalk. Had to jump back to the curb.', NOW() - INTERVAL 10 DAY, 40.7128000, -74.0060000, 'approved', NOW() - INTERVAL 10 DAY);

-- Report 3: Anonymous reporter, driver road-rage, major severity
INSERT INTO reports (id, user_id, reporter_mode_id, incident_type_id, severity_id, description, incident_date, latitude, longitude, reporter_email, status, created_at) VALUES
(3, NULL, 5, 3, 2, 'Driver aggressively tailgated me for 3 blocks then brake-checked me at the light. Felt unsafe.', NOW() - INTERVAL 7 DAY, 51.5074000, -0.1278000, 'anon-reporter@example.com', 'approved', NOW() - INTERVAL 7 DAY);

-- Report 4: Authenticated user, e-scooter infrastructure-hazard, critical severity
INSERT INTO reports (id, user_id, reporter_mode_id, incident_type_id, severity_id, description, incident_date, latitude, longitude, status, created_at) VALUES
(4, 2, 3, 6, 3, 'Large pothole hidden by standing water on bike path. E-scooter rider thrown off, broken wrist.', NOW() - INTERVAL 5 DAY, 48.8566000, 2.3522000, 'approved', NOW() - INTERVAL 5 DAY);

-- Report 5: Anonymous reporter with phone, transit-rider blocked-lane, minor severity
INSERT INTO reports (id, user_id, reporter_mode_id, incident_type_id, severity_id, description, incident_date, latitude, longitude, reporter_phone, status, created_at) VALUES
(5, NULL, 6, 4, 1, 'Delivery truck parked in bus lane during rush hour, forcing bus into traffic.', NOW() - INTERVAL 3 DAY, 34.0522000, -118.2437000, '555-0199', 'pending', NOW() - INTERVAL 3 DAY);

-- Report 6: Authenticated user, motorcyclist running-signal, major severity
INSERT INTO reports (id, user_id, reporter_mode_id, incident_type_id, severity_id, description, incident_date, latitude, longitude, status, created_at) VALUES
(6, 1, 4, 5, 2, 'SUV ran a stop sign at residential intersection. I had to swerve into oncoming lane to avoid collision.', NOW() - INTERVAL 2 DAY, 49.2827000, -123.1207000, 'pending', NOW() - INTERVAL 2 DAY);

-- Report 7: Anonymous reporter, pedestrian collision, critical severity
INSERT INTO reports (id, user_id, reporter_mode_id, incident_type_id, severity_id, description, incident_date, latitude, longitude, reporter_email, status, created_at) VALUES
(7, NULL, 1, 1, 3, 'Elderly pedestrian hit by vehicle backing out of driveway. Paramedics called.', NOW() - INTERVAL 1 DAY, 45.4215000, -75.6972000, 'witness@example.com', 'pending', NOW() - INTERVAL 1 DAY);

-- Report 8: Authenticated user, driver other incident, minor severity (rejected)
INSERT INTO reports (id, user_id, reporter_mode_id, incident_type_id, severity_id, description, incident_date, latitude, longitude, status, created_at) VALUES
(8, 1, 5, 7, 1, 'Test report please ignore', NOW() - INTERVAL 20 DAY, 53.5461000, -113.4938000, 'rejected', NOW() - INTERVAL 20 DAY);

-- Report Other Parties junction entries
INSERT INTO report_other_parties (report_id, other_party_id) VALUES
(1, 5),  -- Report 1: motor-vehicle
(2, 5),  -- Report 2: motor-vehicle
(3, 5),  -- Report 3: motor-vehicle
(4, 8),  -- Report 4: infrastructure
(5, 6),  -- Report 5: commercial-vehicle
(5, 7),  -- Report 5: also transit-vehicle
(6, 5),  -- Report 6: motor-vehicle
(7, 5),  -- Report 7: motor-vehicle
(8, 9);  -- Report 8: none-unknown

-- Comments (authenticated and anonymous)
INSERT INTO comments (id, report_id, user_id, author_name, content, status, created_at) VALUES
(1, 1, 2, NULL, 'This intersection badly needs a protected bike lane. I have reported it to the city as well.', 'approved', NOW() - INTERVAL 13 DAY),
(2, 1, NULL, 'Local Cyclist', 'I nearly got hit at this same spot last month. Very dangerous intersection.', 'approved', NOW() - INTERVAL 12 DAY),
(3, 2, 3, NULL, 'We are aware of this intersection. Adding it to the review queue.', 'approved', NOW() - INTERVAL 9 DAY),
(4, 3, NULL, 'Concerned Driver', 'I witnessed this too. The aggressive driver had a dented bumper already.', 'pending', NOW() - INTERVAL 6 DAY),
(5, 4, 1, NULL, 'That pothole has been there for weeks. Someone was going to get hurt eventually.', 'approved', NOW() - INTERVAL 4 DAY),
(6, 4, NULL, 'Paris Resident', 'The city filled this pothole yesterday after multiple complaints.', 'approved', NOW() - INTERVAL 2 DAY);

-- Flags
INSERT INTO flags (id, user_id, target_type, target_id, reason, status, created_at) VALUES
(1, 1, 'report', 8, 'This appears to be a test/spam report', 'removed', NOW() - INTERVAL 19 DAY),
(2, NULL, 'comment', 4, 'This comment contains unverified claims about the driver', 'pending', NOW() - INTERVAL 5 DAY),
(3, 2, 'report', 7, 'May contain personally identifiable information about the victim', 'pending', NOW() - INTERVAL 1 DAY);

-- Moderation Log entries
INSERT INTO moderation_log (id, moderator_id, action_type, target_type, target_id, details, notes, created_at) VALUES
(1, 2, 'report_approve', 'report', 1, 'Approved cyclist collision report', 'Verified location matches description', NOW() - INTERVAL 13 DAY),
(2, 2, 'report_approve', 'report', 2, 'Approved pedestrian near-miss report', NULL, NOW() - INTERVAL 9 DAY),
(3, 3, 'report_approve', 'report', 3, 'Approved anonymous road-rage report', 'Contact info verified', NOW() - INTERVAL 6 DAY),
(4, 2, 'report_approve', 'report', 4, 'Approved infrastructure hazard report', 'Forwarded to city works department', NOW() - INTERVAL 4 DAY),
(5, 3, 'report_reject', 'report', 8, 'Rejected test/spam report', 'User acknowledged it was a test', NOW() - INTERVAL 19 DAY),
(6, 2, 'flag_remove', 'report', 8, 'Removed flagged spam report', NULL, NOW() - INTERVAL 19 DAY);

