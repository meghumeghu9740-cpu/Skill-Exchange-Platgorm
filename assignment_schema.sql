-- ============================================================
-- Skill Exchange Platform (Barter-Based Learning System)
-- Relational Database Schema
-- ============================================================

DROP DATABASE IF EXISTS skill_exchange_db;
CREATE DATABASE skill_exchange_db;
USE skill_exchange_db;

-- ============================================================
-- 1. Users Table
-- Stores core user identity and profile information.
-- ============================================================
CREATE TABLE Users (
    user_id     INT          PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL, -- Hashed passwords should be stored here
    bio         TEXT,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Skills Table
-- Global directory of all learnable/teachable skills.
-- ============================================================
CREATE TABLE Skills (
    skill_id    INT          PRIMARY KEY AUTO_INCREMENT,
    skill_name  VARCHAR(100) NOT NULL UNIQUE,
    category    VARCHAR(100) NOT NULL
);

-- ============================================================
-- 3. User_Skills Table (Skills Offered)
-- Maps which skills a user can teach and their expertise level.
-- ============================================================
CREATE TABLE User_Skills (
    user_skill_id     INT PRIMARY KEY AUTO_INCREMENT,
    user_id           INT NOT NULL,
    skill_id          INT NOT NULL,
    proficiency_level ENUM('beginner', 'intermediate', 'expert') NOT NULL DEFAULT 'beginner',
    FOREIGN KEY (user_id)  REFERENCES Users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES Skills(skill_id) ON DELETE CASCADE,
    UNIQUE (user_id, skill_id) -- A user can only offer a specific skill once
);

-- ============================================================
-- 4. User_Wants Table (Skills Requested)
-- Maps which skills a user wants to learn.
-- ============================================================
CREATE TABLE User_Wants (
    user_want_id    INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL,
    skill_id        INT NOT NULL,
    priority_level  INT NOT NULL DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    FOREIGN KEY (user_id)  REFERENCES Users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES Skills(skill_id) ON DELETE CASCADE,
    UNIQUE (user_id, skill_id) -- A user can only request a specific skill once
);

-- ============================================================
-- 5. Requests Table
-- Tracks barter exchange invitations between two users.
-- ============================================================
CREATE TABLE Requests (
    request_id         INT PRIMARY KEY AUTO_INCREMENT,
    sender_id          INT NOT NULL,
    receiver_id        INT NOT NULL,
    skill_offered_id   INT NOT NULL, -- The skill the sender teaches
    skill_requested_id INT NOT NULL, -- The skill the sender learns
    status             ENUM('pending', 'accepted', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)          REFERENCES Users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (receiver_id)        REFERENCES Users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (skill_offered_id)   REFERENCES Skills(skill_id),
    FOREIGN KEY (skill_requested_id) REFERENCES Skills(skill_id)
);

-- ============================================================
-- 6. Feedback Table
-- Stores user reviews after an exchange request is completed.
-- ============================================================
CREATE TABLE Feedback (
    feedback_id INT     PRIMARY KEY AUTO_INCREMENT,
    from_user   INT     NOT NULL,
    to_user     INT     NOT NULL,
    request_id  INT     NOT NULL,
    rating      INT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments    TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user)  REFERENCES Users(user_id)     ON DELETE CASCADE,
    FOREIGN KEY (to_user)    REFERENCES Users(user_id)     ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES Requests(request_id) ON DELETE CASCADE,
    UNIQUE (from_user, request_id) -- A user can only review a specific exchange once
);

-- ============================================================
-- SAMPLE INSERT QUERIES
-- ============================================================

-- Insert Users
INSERT INTO Users (name, email, password, bio) VALUES
('Alice Smith',   'alice@example.com',   'hashed_pwd_1', 'Python dev looking to learn guitar.'),
('Bob Johnson',   'bob@example.com',     'hashed_pwd_2', 'Musician wanting to build a website.'),
('Charlie Brown', 'charlie@example.com', 'hashed_pwd_3', 'Digital marketer learning Spanish.');

-- Insert Skills
INSERT INTO Skills (skill_name, category) VALUES
('Python Programming', 'Technology'),
('Web Development',    'Technology'),
('Guitar Lessons',     'Music'),
('Spanish Language',   'Languages'),
('SEO Optimization',   'Business');

-- Insert User Offered Skills
INSERT INTO User_Skills (user_id, skill_id, proficiency_level) VALUES
(1, 1, 'expert'),       -- Alice offers Python
(1, 2, 'intermediate'), -- Alice offers Web Dev
(2, 3, 'expert'),       -- Bob offers Guitar
(3, 5, 'expert');       -- Charlie offers SEO

-- Insert User Wanted Skills
INSERT INTO User_Wants (user_id, skill_id, priority_level) VALUES
(1, 3, 5), -- Alice wants Guitar (High priority)
(2, 2, 4), -- Bob wants Web Dev
(3, 4, 3); -- Charlie wants Spanish

-- Insert Requests
INSERT INTO Requests (sender_id, receiver_id, skill_offered_id, skill_requested_id, status) VALUES
(1, 2, 2, 3, 'completed'), -- Alice offered Web Dev for Bob's Guitar (Completed)
(2, 1, 3, 1, 'pending'),   -- Bob offers Guitar for Alice's Python (Pending)
(3, 1, 5, 2, 'rejected');  -- Charlie offered SEO for Alice's Web Dev (Rejected)

-- Insert Feedback
INSERT INTO Feedback (from_user, to_user, request_id, rating, comments) VALUES
(1, 2, 1, 5, 'Bob is a very patient guitar teacher!'),
(2, 1, 1, 4, 'Alice helped me set up my site flawlessly.');

-- ============================================================
-- ANALYTICAL SELECT QUERIES
-- ============================================================

-- Execute Query 1
SELECT 
    MatchUser.name AS Potential_Partner, 
    MatchUser.email AS Partner_Email,
    S_Teach.skill_name AS They_Can_Teach,
    S_Learn.skill_name AS They_Want_To_Learn
FROM Users MatchUser
JOIN User_Skills US_Theirs ON MatchUser.user_id = US_Theirs.user_id
JOIN User_Wants  UW_Alice  ON US_Theirs.skill_id = UW_Alice.skill_id AND UW_Alice.user_id = 1
JOIN User_Wants  UW_Theirs ON MatchUser.user_id = UW_Theirs.user_id
JOIN User_Skills US_Alice  ON UW_Theirs.skill_id = US_Alice.skill_id AND US_Alice.user_id = 1
JOIN Skills S_Teach ON US_Theirs.skill_id = S_Teach.skill_id
JOIN Skills S_Learn ON UW_Theirs.skill_id = S_Learn.skill_id
WHERE MatchUser.user_id != 1;

-- Execute Query 2
SELECT 
    R.request_id,
    Sender.name AS Sender_Name,
    Receiver.name AS Receiver_Name,
    SkillOffered.skill_name AS Offered_Skill,
    SkillRequested.skill_name AS Requested_Skill,
    R.status AS Exchange_Status,
    R.created_at
FROM Requests R
JOIN Users Sender ON R.sender_id = Sender.user_id
JOIN Users Receiver ON R.receiver_id = Receiver.user_id
JOIN Skills SkillOffered ON R.skill_offered_id = SkillOffered.skill_id
JOIN Skills SkillRequested ON R.skill_requested_id = SkillRequested.skill_id
ORDER BY R.created_at DESC;

-- Execute Query 3
SELECT 
    Reviewer.name AS Reviewed_By,
    F.rating AS Stars_Given,
    F.comments AS Feedback_Text,
    Offered.skill_name AS Exchanged_Skill,
    DATE_FORMAT(F.created_at, '%M %d, %Y') AS Date_Reviewed
FROM Feedback F
JOIN Users Reviewer ON F.from_user = Reviewer.user_id
JOIN Requests R ON F.request_id = R.request_id
JOIN Skills Offered ON R.skill_offered_id = Offered.skill_id
WHERE F.to_user = 2
ORDER BY F.created_at DESC;

-- ============================================================
-- DISPLAY ALL TABLES IN COMMAND PROMPT
-- ============================================================
SELECT '--- USERS TABLE ---' AS 'TABLE';
SELECT * FROM Users;

SELECT '--- SKILLS TABLE ---' AS 'TABLE';
SELECT * FROM Skills;

SELECT '--- USER SKILLS OFFERED TABLE ---' AS 'TABLE';
SELECT * FROM User_Skills;

SELECT '--- USER SKILLS WANTED TABLE ---' AS 'TABLE';
SELECT * FROM User_Wants;

SELECT '--- REQUESTS TABLE ---' AS 'TABLE';
SELECT * FROM Requests;

SELECT '--- FEEDBACK TABLE ---' AS 'TABLE';
SELECT * FROM Feedback;

-- ============================================================
-- 7. My_Profile Table
-- Stores extended profile data for each user.
-- ============================================================
CREATE TABLE My_Profile (
    profile_id       INT PRIMARY KEY AUTO_INCREMENT,
    user_id          INT NOT NULL UNIQUE,
    profile_picture  VARCHAR(255) DEFAULT 'default_avatar.png',
    location         VARCHAR(100),
    linkedin_url     VARCHAR(200),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Insert Alice's Profile Data
INSERT INTO My_Profile (user_id, location, linkedin_url) 
VALUES (1, 'New York, USA', 'https://linkedin.com/in/alicesmith');

SELECT '--- MY_PROFILE TABLE ---' AS 'TABLE';
SELECT * FROM My_Profile;
