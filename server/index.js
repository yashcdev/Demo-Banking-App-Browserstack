require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createSchema } = require('./schema');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const transactionRoutes = require('./routes/transactions');
const cardRoutes = require('./routes/cards');
const userRoutes = require('./routes/users');
const shopRoutes = require('./routes/shop');
const messageRoutes = require('./routes/messages');
const pushTokenRoutes = require('./routes/push-tokens');
const avatarRoutes = require('./routes/avatar');
const receiptRoutes = require('./routes/receipt');

const app = express();
app.use(cors());
// Large enough for a base64 profile photo (see MAX_IMAGE_CHARS in routes/avatar.js)
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// ── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'BrowserStack Bank Server running' }));

app.use('/auth', authRoutes);
app.use('/account/avatar', avatarRoutes);
app.use('/account', accountRoutes);
app.use('/transactions', transactionRoutes);
app.use('/cards', cardRoutes);
app.use('/users', userRoutes);
app.use('/shop/orders', receiptRoutes);
app.use('/shop', shopRoutes);
app.use('/messages', messageRoutes);
app.use('/push-tokens', pushTokenRoutes);

// ── Stripe Payment Sheet ─────────────────────────────────────────────────────
app.post('/payment-sheet', async (req, res) => {
  try {
    const { amount = 1099, currency = 'usd', customerName = 'Alex Johnson' } = req.body;

    const customer = await stripe.customers.create({
      name: customerName,
      metadata: { source: 'browserstack-bank-app' },
    });

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-06-20' }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      metadata: { integration: 'browserstack-bank-mobile' },
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await createSchema();
    app.listen(PORT, () => {
      console.log(`\n🏦 BrowserStack Bank Server`);
      console.log(`   Running on http://localhost:${PORT}`);
      console.log(`   POST /auth/signup       — register user`);
      console.log(`   POST /auth/login        — login`);
      console.log(`   GET  /account/profile   — user profile`);
      console.log(`   GET  /account/balance   — account balance`);
      console.log(`   GET  /transactions      — transaction history`);
      console.log(`   POST /transactions/transfer — send money`);
      console.log(`   POST /transactions/payment  — record card payment`);
      console.log(`   GET  /cards             — list cards`);
      console.log(`   POST /cards             — create card`);
      console.log(`   PATCH /cards/:id        — update card`);
      console.log(`   DELETE /cards/:id       — delete card`);
      console.log(`   POST /payment-sheet     — Stripe payment sheet\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();