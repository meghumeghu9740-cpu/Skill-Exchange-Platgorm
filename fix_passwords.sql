-- Fix sample user passwords to 'password123'
USE skill_exchange;
UPDATE Users SET password='$2b$10$Hq3PJKJmo0AYntt1gS5mweuWdb8dX7siXhYik8Mztw9D2.6CiL992' WHERE email='alice@example.com';
UPDATE Users SET password='$2b$10$Hq3PJKJmo0AYntt1gS5mweuWdb8dX7siXhYik8Mztw9D2.6CiL992' WHERE email='bob@example.com';
UPDATE Users SET password='$2b$10$Hq3PJKJmo0AYntt1gS5mweuWdb8dX7siXhYik8Mztw9D2.6CiL992' WHERE email='carol@example.com';
UPDATE Users SET password='$2b$10$Hq3PJKJmo0AYntt1gS5mweuWdb8dX7siXhYik8Mztw9D2.6CiL992' WHERE email='david@example.com';
UPDATE Users SET password='$2b$10$Hq3PJKJmo0AYntt1gS5mweuWdb8dX7siXhYik8Mztw9D2.6CiL992' WHERE email='eva@example.com';
SELECT user_id, name, email FROM Users;
