const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET CHAT MESSAGES FOR REQUEST
router.get('/messages/:requestId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const requestId = req.params.requestId;

    // Verify user is part of this exchange request
    const [reqRows] = await db.query(
      'SELECT sender_id, receiver_id FROM Exchange_Requests WHERE request_id = ? AND (sender_id = ? OR receiver_id = ?)',
      [requestId, userId, userId]
    );

    if (reqRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to chat' });
    }

    const [messages] = await db.query(
      `SELECT message_id, request_id, sender_id, message_text, sent_at 
       FROM Exchange_Messages 
       WHERE request_id = ? 
       ORDER BY sent_at ASC`,
      [requestId]
    );

    res.json({ success: true, messages });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat messages' });
  }
});

// SEND CHAT MESSAGE
router.post('/messages/:requestId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const requestId = req.params.requestId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    // Verify authorization
    const [reqRows] = await db.query(
      'SELECT sender_id, receiver_id FROM Exchange_Requests WHERE request_id = ? AND (sender_id = ? OR receiver_id = ?)',
      [requestId, userId, userId]
    );

    if (reqRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Unauthorized chat action' });
    }

    await db.query(
      `INSERT INTO Exchange_Messages (request_id, sender_id, message_text) VALUES (?, ?, ?)`,
      [requestId, userId, message.trim()]
    );

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Failed to send chat message' });
  }
});

module.exports = router;
