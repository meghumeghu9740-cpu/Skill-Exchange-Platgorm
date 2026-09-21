-- ============================================================
--  Admin Schema Additions
--  Run this file in MySQL to upgrade the existing database.
--  Usage: mysql -u root -p skill_exchange < admin_schema.sql
-- ============================================================

USE skill_exchange;

-- 1. Create Admin Table
CREATE TABLE IF NOT EXISTS Admin (
    admin_id   INT          PRIMARY KEY AUTO_INCREMENT,
    username   VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 2. Alter Users Table to include status and reported flag
-- Note: MySQL might throw an error if columns already exist, 
-- but assuming they don't based on our earlier review.
ALTER TABLE Users ADD COLUMN status ENUM('active', 'suspended', 'banned') DEFAULT 'active';
ALTER TABLE Users ADD COLUMN is_reported BOOLEAN DEFAULT FALSE;

-- 3. Alter Skills Table to include approval status
ALTER TABLE Skills ADD COLUMN status ENUM('approved', 'pending', 'rejected') DEFAULT 'approved';

-- 4. Insert Default Admin User
-- Password is 'password123' hashed with bcrypt
INSERT INTO Admin (username, email, password) 
VALUES ('Super Admin', 'admin@skillexchange.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lihO')
ON DUPLICATE KEY UPDATE username='Super Admin';
