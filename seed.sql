-- Example seed.sql placeholder: schema & test data
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255),
  role ENUM('user','moderator','admin') DEFAULT 'user'
);
INSERT INTO users (username, role) VALUES ('brave_silver_fox','user');
