const express = require('express');
const { sql } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { serverError } = require('../middleware/error');
const { cloudinary } = require('../cloudinary');

const router = express.Router();

const MAX_IMAGE_CHARS = 8 * 1024 * 1024; // ~6 MB of image once base64-decoded

async function destroyImage(publicId) {
  if (!cloudinary || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    // The database record is the source of truth; a failed remote delete must not block the user.
    console.warn('[Avatar] Cloudinary delete failed:', err?.message);
  }
}

// PUT /account/avatar — upload or replace the profile photo.
// Body: { image: "data:image/jpeg;base64,..." }
router.put('/', authMiddleware, async (req, res) => {
  try {
    if (!cloudinary) return res.status(503).json({ error: 'Image storage is not configured.' });

    const { image } = req.body;
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'A base64 image is required.' });
    }
    if (image.length > MAX_IMAGE_CHARS) {
      return res.status(413).json({ error: 'Image is too large. Please choose a smaller photo.' });
    }

    const userId = req.user.userId;
    const [current] = await sql`SELECT avatar_public_id FROM users WHERE id = ${userId}`;

    // Upload the new image first, so a failed upload never leaves the user without a photo.
    const uploaded = await cloudinary.uploader.upload(image, {
      folder: 'bs-bank/avatars',
      public_id: `user_${userId}_${Date.now()}`,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      resource_type: 'image',
    });

    await sql`
      UPDATE users
      SET avatar_url = ${uploaded.secure_url}, avatar_public_id = ${uploaded.public_id}
      WHERE id = ${userId}
    `;

    // The old photo and its record are replaced: remove the previous image from Cloudinary.
    await destroyImage(current?.avatar_public_id);

    res.json({ avatarUrl: uploaded.secure_url });
  } catch (err) {
    serverError(res, err, 'Avatar PUT');
  }
});

// DELETE /account/avatar — remove the profile photo.
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [current] = await sql`SELECT avatar_public_id FROM users WHERE id = ${userId}`;

    await sql`UPDATE users SET avatar_url = NULL, avatar_public_id = NULL WHERE id = ${userId}`;
    await destroyImage(current?.avatar_public_id);

    res.json({ avatarUrl: null });
  } catch (err) {
    serverError(res, err, 'Avatar DELETE');
  }
});

module.exports = router;
