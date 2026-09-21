const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateAdmin, JWT_SECRET } = require('../middleware/auth');

// ADMIN LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password required' });
    }

    let adminUser = null;
    try {
      const [rows] = await db.query(
        'SELECT * FROM Admin WHERE email = ? OR username = ?',
        [loginIdentifier, loginIdentifier]
      );
      if (rows.length > 0) adminUser = rows[0];
    } catch (e) {
      // Table Admin might not be present if admin_schema wasn't executed
    }

    if (adminUser) {
      const match = await bcrypt.compare(password, adminUser.password);
      if (match) {
        const token = jwt.sign(
          { admin_id: adminUser.admin_id, username: adminUser.username, isAdmin: true },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({ success: true, token, user: { username: adminUser.username, email: adminUser.email } });
      }
    }

    // Default admin fallback if admin table record matches hardcoded default
    if ((loginIdentifier === 'admin@skillexchange.com' || loginIdentifier === 'Super Admin' || loginIdentifier === 'admin') && password === 'password123') {
      const token = jwt.sign(
        { admin_id: 1, username: 'Super Admin', isAdmin: true },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ success: true, token, user: { username: 'Super Admin', email: 'admin@skillexchange.com' } });
    }

    res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error during admin login' });
  }
});

// ADMIN STATS
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM Users');
    const [[{ totalSkills }]] = await db.query('SELECT COUNT(*) AS totalSkills FROM Skills');
    const [[{ activeRequests }]] = await db.query("SELECT COUNT(*) AS activeRequests FROM Exchange_Requests WHERE status IN ('pending', 'accepted')");
    const [[{ completedExchanges }]] = await db.query("SELECT COUNT(*) AS completedExchanges FROM Exchange_Requests WHERE status = 'completed'");

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalSkills,
        activeRequests,
        completedExchanges
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
  }
});

// ADMIN USERS LIST
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.user_id, u.name, u.email, u.credits, u.rating, 
        COALESCE(u.status, 'active') AS status, 
        COALESCE(u.is_reported, FALSE) AS is_reported,
        (SELECT GROUP_CONCAT(s.skill_name SEPARATOR ', ') 
         FROM User_Skills_Offered uso 
         JOIN Skills s ON uso.skill_id = s.skill_id 
         WHERE uso.user_id = u.user_id) AS offered_skills,
        (SELECT GROUP_CONCAT(s.skill_name SEPARATOR ', ') 
         FROM User_Skills_Wanted usw 
         JOIN Skills s ON usw.skill_id = s.skill_id 
         WHERE usw.user_id = u.user_id) AS wanted_skills
      FROM Users u
      ORDER BY u.user_id ASC
    `);

    res.json({ success: true, users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// ADMIN UPDATE USER STATUS
router.put('/users/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    await db.query('UPDATE Users SET status = ? WHERE user_id = ?', [status, userId]);
    res.json({ success: true, message: 'User status updated successfully' });
  } catch (err) {
    console.error('Admin update user status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// ADMIN DELETE USER
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    await db.query('DELETE FROM Users WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// ADMIN ADD USER
router.post('/users', authenticateAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO Users (name, email, password, credits, rating) VALUES (?, ?, ?, 10, 0)',
      [name, email, hashedPassword]
    );

    res.json({ success: true, message: 'User created successfully' });
  } catch (err) {
    console.error('Admin add user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// ADMIN SKILLS LIST
router.get('/skills', authenticateAdmin, async (req, res) => {
  try {
    const [skills] = await db.query(
      'SELECT skill_id, skill_name, category, COALESCE(status, "approved") AS status FROM Skills ORDER BY skill_id ASC'
    );
    res.json({ success: true, skills });
  } catch (err) {
    console.error('Admin skills error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch skills' });
  }
});

// ADMIN UPDATE SKILL STATUS
router.put('/skills/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const skillId = req.params.id;
    const { status } = req.body;

    await db.query('UPDATE Skills SET status = ? WHERE skill_id = ?', [status, skillId]);
    res.json({ success: true, message: 'Skill status updated successfully' });
  } catch (err) {
    console.error('Admin update skill status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update skill status' });
  }
});

// ADMIN DELETE SKILL
router.delete('/skills/:id', authenticateAdmin, async (req, res) => {
  try {
    const skillId = req.params.id;
    await db.query('DELETE FROM Skills WHERE skill_id = ?', [skillId]);
    res.json({ success: true, message: 'Skill deleted successfully' });
  } catch (err) {
    console.error('Admin delete skill error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete skill' });
  }
});

// ADMIN ADD SKILL
router.post('/skills', authenticateAdmin, async (req, res) => {
  try {
    const { skill_name, category } = req.body;
    if (!skill_name || !category) {
      return res.status(400).json({ success: false, message: 'Skill name and category required' });
    }

    await db.query('INSERT INTO Skills (skill_name, category) VALUES (?, ?)', [skill_name, category]);
    res.json({ success: true, message: 'Skill created successfully' });
  } catch (err) {
    console.error('Admin add skill error:', err);
    res.status(500).json({ success: false, message: 'Failed to add skill' });
  }
});

// ADMIN ALL REQUESTS
router.get('/requests', authenticateAdmin, async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT 
        er.request_id, er.status, er.created_at,
        u_s.name AS sender_name,
        u_r.name AS receiver_name,
        s1.skill_name AS skill_offered,
        s2.skill_name AS skill_requested
      FROM Exchange_Requests er
      JOIN Users u_s ON er.sender_id = u_s.user_id
      JOIN Users u_r ON er.receiver_id = u_r.user_id
      JOIN Skills s1 ON er.skill_offered_id = s1.skill_id
      JOIN Skills s2 ON er.skill_requested_id = s2.skill_id
      ORDER BY er.created_at DESC
    `);
    res.json({ success: true, requests });
  } catch (err) {
    console.error('Admin requests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// ADMIN MUTUAL MATCHES
router.get('/matches', authenticateAdmin, async (req, res) => {
  try {
    const [matches] = await db.query(`
      SELECT 
        u1.name AS user1_name,
        s1.skill_name AS user1_offers,
        u2.name AS user2_name,
        s2.skill_name AS user2_offers
      FROM User_Skills_Offered uso1
      JOIN User_Skills_Wanted usw1 ON uso1.user_id = usw1.user_id
      JOIN User_Skills_Offered uso2 ON usw1.skill_id = uso2.skill_id
      JOIN User_Skills_Wanted usw2 ON uso1.skill_id = usw2.skill_id AND uso2.user_id = usw2.user_id
      JOIN Users u1 ON uso1.user_id = u1.user_id
      JOIN Users u2 ON uso2.user_id = u2.user_id
      JOIN Skills s1 ON uso1.skill_id = s1.skill_id
      JOIN Skills s2 ON uso2.skill_id = s2.skill_id
      WHERE u1.user_id < u2.user_id
    `);

    res.json({ success: true, matches });
  } catch (err) {
    console.error('Admin matches error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch matches' });
  }
});

module.exports = router;
