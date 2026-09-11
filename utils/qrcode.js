const QRCode = require('qrcode');

function getClientBaseUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function getItemPageUrl(itemId) {
  return `${getClientBaseUrl()}/items/${itemId}`;
}

const QR_PNG_OPTIONS = {
  type: 'png',
  width: 512,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: {
    dark: '#0c0e14',
    light: '#ffffff',
  },
};

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** In-memory QR PNG for GET /api/items/:id/qr (no filesystem dependency). */
async function generateItemQrPngBuffer(itemId) {
  const targetUrl = getItemPageUrl(itemId);
  return QRCode.toBuffer(targetUrl, QR_PNG_OPTIONS);
}

/**
 * Printable campus flyer (SVG) with embedded QR — opens cleanly and prints well.
 */
async function generateItemFlyerSvg(item) {
  const targetUrl = getItemPageUrl(item._id);
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    width: 420,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#0c0e14', light: '#ffffff' },
  });

  const title = escapeXml(item.title);
  const location = escapeXml(
    item.location?.building
      ? `${item.location.name} — ${item.location.building}`
      : item.location?.name || 'Campus'
  );
  const description = escapeXml((item.description || '').slice(0, 120));
  const contactHint = escapeXml(item.postedBy?.name ? `Posted by ${item.postedBy.name}` : 'Posted on ReclaimIt');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c0e14"/>
      <stop offset="100%" stop-color="#161922"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1100" fill="url(#bg)"/>
  <rect x="36" y="36" width="728" height="1028" rx="28" fill="none" stroke="#ffb347" stroke-width="3" opacity="0.85"/>
  <text x="400" y="110" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" fill="#ffb347" letter-spacing="4">RECLAIMIT</text>
  <text x="400" y="155" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#f3f5fb">LOST ITEM</text>
  <text x="400" y="210" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="600" fill="#ffffff">${title}</text>
  <text x="400" y="255" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#9aa1b8">${location}</text>
  <text x="400" y="295" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#9499b0">${description}</text>
  <rect x="190" y="340" width="420" height="420" rx="24" fill="#ffffff"/>
  <image href="${qrDataUrl}" x="215" y="365" width="370" height="370"/>
  <text x="400" y="810" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="600" fill="#ffb347">Scan to help return this item</text>
  <text x="400" y="850" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#f0f2f8">Opens the ReclaimIt listing — claim or message the owner</text>
  <text x="400" y="900" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#636a84">${contactHint}</text>
  <text x="400" y="960" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#636a84">Campus Lost &amp; Found · reclaimit</text>
  <text x="400" y="1000" text-anchor="middle" font-family="Segoe UI, Consolas, monospace" font-size="11" fill="#4a5168">${escapeXml(targetUrl)}</text>
</svg>`;
}

module.exports = {
  getItemPageUrl,
  generateItemQrPngBuffer,
  generateItemFlyerSvg,
};
