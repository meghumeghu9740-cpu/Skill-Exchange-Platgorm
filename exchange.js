const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET MATCH USERS
router.get('/match-users', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.user_id;

    // What current user wants & offers
    const [myWanted] = await db.query(
      'SELECT skill_id, priority_level FROM User_Skills_Wanted WHERE user_id = ?',
      [currentUserId]
    );
    const [myOffered] = await db.query(
      'SELECT skill_id, skill_level FROM User_Skills_Offered WHERE user_id = ?',
      [currentUserId]
    );

    const myWantedIds = myWanted.map(w => w.skill_id);
    const myOfferedIds = myOffered.map(o => o.skill_id);

    if (myWantedIds.length === 0) {
      return res.json({ success: true, matches: [] });
    }

    // Get all other active users
    const [otherUsers] = await db.query(
      `SELECT user_id, name, email, credits, rating 
       FROM Users 
       WHERE user_id != ? AND (status IS NULL OR status = 'active')`,
      [currentUserId]
    );

    const matches = [];

    for (const other of otherUsers) {
      // Skills other user offers that I want
      const [theyOffer] = await db.query(
        `SELECT uso.skill_id, s.skill_name, uso.skill_level 
         FROM User_Skills_Offered uso
         JOIN Skills s ON uso.skill_id = s.skill_id
         WHERE uso.user_id = ? AND uso.skill_id IN (?)`,
        [other.user_id, myWantedIds.length > 0 ? myWantedIds : [0]]
      );

      if (theyOffer.length === 0) continue;

      // Skills other user wants that I offer
      const [theyWant] = await db.query(
        `SELECT usw.skill_id, s.skill_name, usw.priority_level 
         FROM User_Skills_Wanted usw
         JOIN Skills s ON usw.skill_id = s.skill_id
         WHERE usw.user_id = ? AND usw.skill_id IN (?)`,
        [other.user_id, myOfferedIds.length > 0 ? myOfferedIds : [0]]
      );

      const isMutual = theyWant.length > 0;
      const match_type = isMutual ? 'mutual' : 'partial';

      // Build skill pairs
      const skill_pairs = [];
      if (isMutual) {
        for (const offer of theyOffer) {
          for (const want of theyWant) {
            skill_pairs.push({
              they_offer: { skill_id: offer.skill_id, skill_name: offer.skill_name, level: offer.skill_level },
              they_want: { skill_id: want.skill_id, skill_name: want.skill_name, priority: want.priority_level }
            });
          }
        }
      } else {
        for (const offer of theyOffer) {
          skill_pairs.push({
            they_offer: { skill_id: offer.skill_id, skill_name: offer.skill_name, level: offer.skill_level },
            they_want: null
          });
        }
      }

      const match_score = (isMutual ? 100 : 50) + (other.rating || 0) * 10;

      matches.push({
        user_id: other.user_id,
        name: other.name,
        email: other.email,
        rating: other.rating,
        match_type,
        match_score,
        skill_pairs
      });
    }

    // Sort by match_score descending
    matches.sort((a, b) => b.match_score - a.match_score);

    res.json({ success: true, matches });
  } catch (err) {
    console.error('Match users error:', err);
    res.status(500).json({ success: false, message: 'Failed to calculate matches' });
  }
});

// SEND EXCHANGE REQUEST
router.post('/send-request', authenticateToken, async (req, res) => {
  try {
    const sender_id = req.user.user_id;
    const { receiver_id, skill_offered_id, skill_requested_id } = req.body;

    if (!receiver_id || !skill_offered_id || !skill_requested_id) {
      return res.status(400).json({ success: false, message: 'Missing required request fields' });
    }

    // Check for existing pending request between these two users for same skills
    const [existing] = await db.query(
      `SELECT request_id FROM Exchange_Requests 
       WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
      [sender_id, receiver_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a pending request with this user' });
    }

    await db.query(
      `INSERT INTO Exchange_Requests (sender_id, receiver_id, skill_offered_id, skill_requested_id, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [sender_id, receiver_id, skill_offered_id, skill_requested_id]
    );

    res.json({ success: true, message: 'Exchange request sent successfully' });
  } catch (err) {
    console.error('Send request error:', err);
    res.status(500).json({ success: false, message: 'Failed to send exchange request' });
  }
});

// GET MY REQUESTS
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Sent requests
    const [sent] = await db.query(
      `SELECT 
         er.request_id, er.receiver_id AS other_user_id, u.name AS other_user_name,
         s1.skill_name AS skill_offered, s2.skill_name AS skill_requested,
         er.status, er.created_at
       FROM Exchange_Requests er
       JOIN Users u ON er.receiver_id = u.user_id
       JOIN Skills s1 ON er.skill_offered_id = s1.skill_id
       JOIN Skills s2 ON er.skill_requested_id = s2.skill_id
       WHERE er.sender_id = ? ORDER BY er.created_at DESC`,
      [userId]
    );

    // Received requests
    const [received] = await db.query(
      `SELECT 
         er.request_id, er.sender_id AS other_user_id, u.name AS other_user_name,
         s1.skill_name AS skill_offered, s2.skill_name AS skill_requested,
         er.status, er.created_at
       FROM Exchange_Requests er
       JOIN Users u ON er.sender_id = u.user_id
       JOIN Skills s1 ON er.skill_offered_id = s1.skill_id
       JOIN Skills s2 ON er.skill_requested_id = s2.skill_id
       WHERE er.receiver_id = ? ORDER BY er.created_at DESC`,
      [userId]
    );

    res.json({ success: true, sent, received });
  } catch (err) {
    console.error('Get my-requests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// UPDATE REQUEST STATUS (Accept/Reject)
router.post('/update-request-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { request_id, status } = req.body;

    if (!request_id || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid request or status' });
    }

    const [result] = await db.query(
      `UPDATE Exchange_Requests SET status = ? 
       WHERE request_id = ? AND (receiver_id = ? OR sender_id = ?)`,
      [status, request_id, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Request not found or unauthorized' });
    }

    res.json({ success: true, message: `Request ${status} successfully` });
  } catch (err) {
    console.error('Update request status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update request status' });
  }
});

// CANCEL REQUEST
router.post('/cancel-request', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { request_id } = req.body;

    await db.query(
      `DELETE FROM Exchange_Requests WHERE request_id = ? AND sender_id = ? AND status = 'pending'`,
      [request_id, userId]
    );

    res.json({ success: true, message: 'Request cancelled' });
  } catch (err) {
    console.error('Cancel request error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel request' });
  }
});

// COMPLETE EXCHANGE
router.post('/complete-exchange', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { request_id } = req.body;

    const [reqRows] = await db.query(
      'SELECT * FROM Exchange_Requests WHERE request_id = ? AND (sender_id = ? OR receiver_id = ?)',
      [request_id, userId, userId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Update status to completed
    await db.query(
      `UPDATE Exchange_Requests SET status = 'completed' WHERE request_id = ?`,
      [request_id]
    );

    // Record transaction
    await db.query(
      `INSERT INTO Transactions (request_id, credits_transferred) VALUES (?, 5)
       ON DUPLICATE KEY UPDATE transaction_date = CURRENT_TIMESTAMP`,
      [request_id]
    );

    res.json({ success: true, message: 'Exchange completed successfully! 🎉' });
  } catch (err) {
    console.error('Complete exchange error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete exchange' });
  }
});

// RATE USER
router.post('/rate-user', authenticateToken, async (req, res) => {
  try {
    const from_user = req.user.user_id;
    const { to_user_id, rating, feedback } = req.body;

    if (!to_user_id || !rating) {
      return res.status(400).json({ success: false, message: 'Target user and rating are required' });
    }

    const ratingVal = parseInt(rating);
    if (ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Save rating
    await db.query(
      `INSERT INTO Ratings (from_user, to_user, rating, feedback)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), feedback = VALUES(feedback)`,
      [from_user, to_user_id, ratingVal, feedback || '']
    );

    // Recalculate average rating for target user
    const [[avgResult]] = await db.query(
      'SELECT AVG(rating) AS avg_rating FROM Ratings WHERE to_user = ?',
      [to_user_id]
    );

    const newAvg = parseFloat(avgResult.avg_rating || 0).toFixed(1);

    await db.query(
      'UPDATE Users SET rating = ? WHERE user_id = ?',
      [newAvg, to_user_id]
    );

    res.json({ success: true, message: 'Rating submitted successfully' });
  } catch (err) {
    console.error('Rate user error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

module.exports = router;
