const express = require('express');
const { sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /users — the 5 oldest users except the current user (transfer recipients)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, full_name, email
      FROM users
      WHERE id != ${req.user.userId}
      ORDER BY created_at ASC
      LIMIT 5
    `;
    res.json({
      users: rows.map(u => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        avatar: u.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        account: '****' + u.id.slice(-4),
      })),
    });
  } catch (err) {
    console.error('Users error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;