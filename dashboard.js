const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get user core metrics
    const [userRows] = await db.query(
      'SELECT credits, rating FROM Users WHERE user_id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { credits, rating } = userRows[0];

    // Counts
    const [[{ offered_count }]] = await db.query(
      'SELECT COUNT(*) AS offered_count FROM User_Skills_Offered WHERE user_id = ?',
      [userId]
    );

    const [[{ wanted_count }]] = await db.query(
      'SELECT COUNT(*) AS wanted_count FROM User_Skills_Wanted WHERE user_id = ?',
      [userId]
    );

    const [[{ completed_count }]] = await db.query(
      `SELECT COUNT(*) AS completed_count FROM Exchange_Requests 
       WHERE (sender_id = ? OR receiver_id = ?) AND status = 'completed'`,
      [userId, userId]
    );

    // Recent activity (last 5 exchange requests)
    const [requests] = await db.query(
      `SELECT 
         er.request_id,
         er.sender_id,
         er.receiver_id,
         er.status,
         er.created_at,
         u_sender.name AS sender_name,
         u_recv.name AS receiver_name,
         sk_off.skill_name AS skill_offered,
         sk_req.skill_name AS skill_requested
       FROM Exchange_Requests er
       JOIN Users u_sender ON er.sender_id = u_sender.user_id
       JOIN Users u_recv ON er.receiver_id = u_recv.user_id
       JOIN Skills sk_off ON er.skill_offered_id = sk_off.skill_id
       JOIN Skills sk_req ON er.skill_requested_id = sk_req.skill_id
       WHERE er.sender_id = ? OR er.receiver_id = ?
       ORDER BY er.created_at DESC
       LIMIT 5`,
      [userId, userId]
    );

    const recent_activity = requests.map(r => {
      const isSender = r.sender_id === userId;
      return {
        request_id: r.request_id,
        other_user_name: isSender ? r.receiver_name : r.sender_name,
        skill_offered: r.skill_offered,
        skill_requested: r.skill_requested,
        direction: isSender ? 'Sent' : 'Received',
        status: r.status,
        created_at: r.created_at
      };
    });

    res.json({
      success: true,
      stats: {
        credits,
        rating,
        skills_offered: offered_count,
        skills_wanted: wanted_count,
        exchanges_completed: completed_count
      },
      recent_activity
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
  }
});

module.exports = router;
