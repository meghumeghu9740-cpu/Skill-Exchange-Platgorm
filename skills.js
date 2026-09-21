const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET ALL SKILLS DIRECTORY
router.get('/all-skills', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT skill_id, skill_name, category 
       FROM Skills 
       WHERE status IS NULL OR status = 'approved' 
       ORDER BY category, skill_name`
    );
    res.json({ success: true, skills: rows });
  } catch (err) {
    console.error('Fetch all skills error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch skills' });
  }
});

// GET LOGGED-IN USER'S OFFERED AND WANTED SKILLS
router.get('/my-skills', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [offered] = await db.query(
      `SELECT uso.id, uso.skill_id, uso.skill_level, s.skill_name, s.category
       FROM User_Skills_Offered uso
       JOIN Skills s ON uso.skill_id = s.skill_id
       WHERE uso.user_id = ?`,
      [userId]
    );

    const [wanted] = await db.query(
      `SELECT usw.id, usw.skill_id, usw.priority_level, s.skill_name, s.category
       FROM User_Skills_Wanted usw
       JOIN Skills s ON usw.skill_id = s.skill_id
       WHERE usw.user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      offered,
      wanted
    });
  } catch (err) {
    console.error('Fetch my-skills error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user skills' });
  }
});

// ADD SKILL OFFERED
router.post('/add-skill-offer', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { skill_id, skill_level } = req.body;

    if (!skill_id) {
      return res.status(400).json({ success: false, message: 'Skill ID is required' });
    }

    const level = skill_level || 'beginner';

    await db.query(
      `INSERT INTO User_Skills_Offered (user_id, skill_id, skill_level) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE skill_level = VALUES(skill_level)`,
      [userId, skill_id, level]
    );

    res.json({ success: true, message: 'Skill offered added successfully' });
  } catch (err) {
    console.error('Add skill offer error:', err);
    res.status(500).json({ success: false, message: 'Failed to add offered skill' });
  }
});

// ADD SKILL WANTED
router.post('/add-skill-wanted', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { skill_id, priority_level } = req.body;

    if (!skill_id) {
      return res.status(400).json({ success: false, message: 'Skill ID is required' });
    }

    const priority = priority_level ? parseInt(priority_level) : 3;

    await db.query(
      `INSERT INTO User_Skills_Wanted (user_id, skill_id, priority_level) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE priority_level = VALUES(priority_level)`,
      [userId, skill_id, priority]
    );

    res.json({ success: true, message: 'Skill wanted added successfully' });
  } catch (err) {
    console.error('Add skill wanted error:', err);
    res.status(500).json({ success: false, message: 'Failed to add wanted skill' });
  }
});

// REMOVE SKILL OFFERED
router.delete('/remove-skill-offer/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const offerId = req.params.id;

    await db.query(
      'DELETE FROM User_Skills_Offered WHERE id = ? AND user_id = ?',
      [offerId, userId]
    );

    res.json({ success: true, message: 'Offered skill removed' });
  } catch (err) {
    console.error('Remove skill offer error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove offered skill' });
  }
});

// REMOVE SKILL WANTED
router.delete('/remove-skill-wanted/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const wantedId = req.params.id;

    await db.query(
      'DELETE FROM User_Skills_Wanted WHERE id = ? AND user_id = ?',
      [wantedId, userId]
    );

    res.json({ success: true, message: 'Wanted skill removed' });
  } catch (err) {
    console.error('Remove skill wanted error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove wanted skill' });
  }
});

module.exports = router;
