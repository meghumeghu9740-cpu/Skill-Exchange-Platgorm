-- Add skills to the sanjana user so she gets matches
USE skill_exchange;

-- Find sanjana's user_id
SET @sanjana_id = (SELECT user_id FROM Users WHERE email = 'sanjanasuchitdhable@gmail.com' LIMIT 1);
SET @meghana_id = (SELECT user_id FROM Users WHERE email = 'meghumeghu.9740@gmail.com' LIMIT 1);

-- Give sanjana some offered skills
INSERT IGNORE INTO User_Skills_Offered (user_id, skill_id, skill_level) VALUES
  (@sanjana_id, 1, 'intermediate'),   -- Python Programming
  (@sanjana_id, 9, 'beginner');       -- Digital Marketing

-- Give sanjana some wanted skills (on top of existing Cooking)
INSERT IGNORE INTO User_Skills_Wanted (user_id, skill_id, priority_level) VALUES
  (@sanjana_id, 2, 5),    -- Web Design (high priority)
  (@sanjana_id, 3, 3);    -- Guitar Lessons

-- Give meghana some offered & wanted skills
INSERT IGNORE INTO User_Skills_Offered (user_id, skill_id, skill_level) VALUES
  (@meghana_id, 7, 'expert');    -- Data Analysis

INSERT IGNORE INTO User_Skills_Wanted (user_id, skill_id, priority_level) VALUES
  (@meghana_id, 1, 4);    -- Python Programming

-- Verify
SELECT u.name, s.skill_name, 'offers' AS type FROM Users u
JOIN User_Skills_Offered uso ON u.user_id = uso.user_id
JOIN Skills s ON uso.skill_id = s.skill_id
WHERE u.email IN ('sanjanasuchitdhable@gmail.com','meghumeghu.9740@gmail.com')
UNION ALL
SELECT u.name, s.skill_name, 'wants' AS type FROM Users u
JOIN User_Skills_Wanted usw ON u.user_id = usw.user_id
JOIN Skills s ON usw.skill_id = s.skill_id
WHERE u.email IN ('sanjanasuchitdhable@gmail.com','meghumeghu.9740@gmail.com')
ORDER BY name, type;
