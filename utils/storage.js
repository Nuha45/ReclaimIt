const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { AppError } = require('./helpers');

function getStorageDriver() {
  const driver = (process.env.STORAGE_DRIVER || 'local').trim().toLowerCase();
  if (driver === 'cloudinary' || driver === 'local') return driver;
  throw new Error(`Invalid STORAGE_DRIVER "${process.env.STORAGE_DRIVER}". Use "local" or "cloudinary".`);
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function uploadBufferToCloudinary(buffer) {
  const folder = process.env.CLOUDINARY_FOLDER || 'reclaimit/items';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function destroyCloudinaryPublicId(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Best-effort rollback only
  }
}

/**
 * Persist multer files and return public URLs for Item.images / ItemPhoto.url.
 * @param {Express.Multer.File[]} files
 * @returns {Promise<string[]>}
 */
async function saveUploadedImages(files) {
  if (!files?.length) return [];

  const driver = getStorageDriver();

  if (driver === 'local') {
    return files.map((file) => `/uploads/${file.filename}`);
  }

  if (!isCloudinaryConfigured()) {
    throw new AppError(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      503
    );
  }

  configureCloudinary();

  const urls = [];
  const uploadedPublicIds = [];

  try {
    for (const file of files) {
      if (!file.buffer?.length) {
        throw new AppError('Uploaded image data is missing', 400);
      }
      const result = await uploadBufferToCloudinary(file.buffer);
      uploadedPublicIds.push(result.public_id);
      urls.push(result.secure_url);
    }
    return urls;
  } catch (err) {
    await Promise.all(uploadedPublicIds.map((id) => destroyCloudinaryPublicId(id)));

    if (err instanceof AppError) throw err;

    const message =
      err?.message && typeof err.message === 'string'
        ? err.message
        : 'Image upload failed. Please try again.';
    throw new AppError(message, 502);
  }
}

/** Remove local multer files after a failed request (cloudinary driver uses memory only). */
function cleanupLocalUploads(files) {
  if (!files?.length || getStorageDriver() !== 'local') return;

  const uploadDir = process.env.UPLOAD_PATH || 'uploads';
  for (const file of files) {
    if (!file.filename) continue;
    const absolute = path.join(process.cwd(), uploadDir, file.filename);
    fs.unlink(absolute, () => {});
  }
}

module.exports = {
  getStorageDriver,
  isCloudinaryConfigured,
  saveUploadedImages,
  cleanupLocalUploads,
};
