// Cloudinary client, configured from the environment.
// Exports `null` when credentials are missing so callers can respond with a clear error.
let cloudinary = null;

try {
  const { v2 } = require('cloudinary');
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinary = v2;
  }
} catch {
  cloudinary = null;
}

module.exports = { cloudinary };
