const express = require('express');
const { sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { cloudinary } = require('../cloudinary');

const router = express.Router();

// GET /account/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, full_name, email, role, kyc_status, avatar_url, created_at
      FROM users WHERE id = ${req.user.userId}
    `;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [account] = await sql`
      SELECT id, balance, currency FROM accounts WHERE user_id = ${req.user.userId}
    `;

    res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      kycStatus: user.kyc_status,
      avatarUrl: user.avatar_url,
      memberSince: user.created_at,
      account: account || null,
    });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// GET /account/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const [account] = await sql`
      SELECT balance, currency FROM accounts WHERE user_id = ${req.user.userId}
    `;
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const balance = parseFloat(account.balance);
    res.json({
      balance,
      savings: Math.round(balance * 0.73 * 100) / 100,
      checking: Math.round(balance * 0.27 * 100) / 100,
      currency: account.currency,
    });
  } catch (err) {
    console.error('Balance error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

const PROTECTED_EMAILS = ['yash@gmail.com'];

// DELETE /account  — permanently delete the authenticated user's account and all data
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    // Fetch the user's email to check if it's protected
    const [userRow] = await sql`SELECT email FROM users WHERE id = ${userId}`;
    if (userRow && PROTECTED_EMAILS.includes(userRow.email.toLowerCase())) {
      return res.status(403).json({ error: 'This account cannot be deleted.' });
    }
    // Delete in dependency order: transactions → accounts → cards → orders → otps → push_tokens → user
    const [account] = await sql`SELECT id FROM accounts WHERE user_id = ${userId}`;
    if (account) {
      await sql`DELETE FROM transactions WHERE account_id = ${account.id}`;
    }
    await sql`DELETE FROM accounts WHERE user_id = ${userId}`;
    await sql`DELETE FROM cards WHERE user_id = ${userId}`;
    await sql`DELETE FROM orders WHERE user_id = ${userId}`;
    await sql`DELETE FROM otps WHERE email = (SELECT email FROM users WHERE id = ${userId})`;
    // Delete the Cloudinary profile image if one is stored and Cloudinary is configured
    if (cloudinary) {
      const [profileRow] = await sql`SELECT avatar_public_id FROM users WHERE id = ${userId}`;
      if (profileRow?.avatar_public_id) {
        try {
          await cloudinary.uploader.destroy(profileRow.avatar_public_id, { invalidate: true });
        } catch (e) {
          console.warn('Cloudinary delete failed (non-fatal):', e?.message);
        }
      }
    }
    await sql`DELETE FROM push_tokens WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete account error:', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;