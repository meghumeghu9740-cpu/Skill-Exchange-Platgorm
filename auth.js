const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// REGISTER USER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    // Check existing email
    const [existing] = await db.query('SELECT user_id FROM Users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO Users (name, email, password, credits, rating) VALUES (?, ?, ?, 10, 0)',
      [name, email, hashedPassword]
    );

    const user_id = result.insertId;
    const userPayload = { user_id, name, email, credits: 10, rating: 0 };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// LOGIN USER
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Check account status
    if (user.status && user.status !== 'active') {
      return res.status(403).json({ success: false, message: `Account is ${user.status}. Please contact support.` });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const userPayload = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      credits: user.credits,
      rating: user.rating
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// GET LOGGED IN USER PROFILE
router.get('/my-profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, name, email, credits, rating, created_at, status FROM Users WHERE user_id = ?',
      [req.user.user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];

    // Optional profile extra info
    let profileExtra = {};
    try {
      const [profRows] = await db.query('SELECT * FROM My_Profile WHERE user_id = ?', [req.user.user_id]);
      if (profRows.length > 0) profRows[0];
    } catch (e) {
      // My_Profile table might not be initialized
    }

    // Ratings received
    const [ratings] = await db.query(
      `SELECT r.rating_id, r.rating, r.feedback, r.created_at, u.name AS reviewer_name 
       FROM Ratings r 
       JOIN Users u ON r.from_user = u.user_id 
       WHERE r.to_user = ? ORDER BY r.created_at DESC`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      user,
      profile: profileExtra,
      ratings
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

module.exports = router;
