const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../db');

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName, email and password are required' });
    }

    // Check duplicate
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (full_name, email, password, role)
      VALUES (${fullName}, ${email}, ${hashed}, 'user')
      RETURNING id, full_name, email, role, kyc_status, created_at
    `;

    // Create account with $50,000 starting balance
    const [account] = await sql`
      INSERT INTO accounts (user_id, balance)
      VALUES (${user.id}, 50000.00)
      RETURNING id, balance
    `;

    // Seed default card
    await sql`
      INSERT INTO cards (user_id, label, number, holder, expiry, color, card_type)
      VALUES (
        ${user.id},
        'Primary Card',
        '4242 4242 4242 4242',
        ${user.full_name.toUpperCase()},
        '12/28',
        '#4F46E5',
        'visa'
      )
    `;

    // Seed welcome transaction
    await sql`
      INSERT INTO transactions (account_id, merchant, category, amount, type, icon, note, reference_id)
      VALUES (
        ${account.id},
        'Welcome Bonus',
        'Income',
        50000.00,
        'credit',
        'gift-outline',
        'Welcome to BrowserStack Bank!',
        ${'TXN' + Date.now()}
      )
    `;

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ token, user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role, kycStatus: user.kyc_status } });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token, user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role, kycStatus: user.kyc_status, avatarUrl: user.avatar_url } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});


module.exports = router;