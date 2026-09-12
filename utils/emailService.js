const nodemailer = require('nodemailer');
const {
  receivedForPoster,
  acceptedForSubmitter,
  rejectedForSubmitter,
  isLostItem,
} = require('./itemTerminology');

let transporter = null;

function isEmailConfigured() {
  const user = process.env.EMAIL;
  const pass = process.env.EMAIL_PASSWORD || process.env.PASSWORD;
  return Boolean(user && pass);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;

  const user = process.env.EMAIL;
  const pass = process.env.EMAIL_PASSWORD || process.env.PASSWORD;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user, pass },
  });

  return transporter;
}

function clientUrl(path = '') {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function wrapHtml({ title, body, ctaLabel, ctaHref }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0c0e14;font-family:Segoe UI,Arial,sans-serif;color:#f3f5fb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161922;border:1px solid #2a3144;border-radius:16px;padding:28px;">
        <tr><td style="font-size:13px;letter-spacing:3px;color:#ffb347;font-weight:700;">RECLAIMIT</td></tr>
        <tr><td style="padding-top:16px;font-size:22px;font-weight:700;color:#f3f5fb;">${title}</td></tr>
        <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#9aa1b8;">${body}</td></tr>
        ${
          ctaHref
            ? `<tr><td style="padding-top:24px;">
                <a href="${ctaHref}" style="display:inline-block;background:#ffb347;color:#0c0e14;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;">${ctaLabel || 'Open ReclaimIt'}</a>
              </td></tr>`
            : ''
        }
        <tr><td style="padding-top:28px;font-size:12px;color:#636a84;">Campus Lost & Found · Do not reply to this automated message.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send email. Never throws to callers — logs and returns { sent: false } on failure.
 * Safe to await or fire-and-forget from controllers.
 */
async function sendEmail({ to, subject, text, html }) {
  if (!to) return { sent: false, reason: 'missing_recipient' };

  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[email:skipped] To: ${to} | ${subject}`);
    }
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || `"ReclaimIt" <${process.env.EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[email:error]', err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendClaimReceivedEmail({ owner, claimerName, item }) {
  const href = clientUrl(`/items/${item._id}`);
  const copy = receivedForPoster({ item, actorName: claimerName });
  return sendEmail({
    to: owner.email,
    subject: copy.title.includes('Found')
      ? `Someone Found Your Item — "${item.title}"`
      : `New Claim Request — "${item.title}"`,
    text: `${copy.message} ${href}`,
    html: wrapHtml({
      title: copy.title,
      body: copy.message,
      ctaLabel: isLostItem(item) ? 'Review found report' : 'Review claim',
      ctaHref: href,
    }),
  });
}

async function sendClaimDecisionEmail({ claimer, item, decision }) {
  const accepted = decision === 'accepted';
  const copy = accepted
    ? acceptedForSubmitter({ item })
    : rejectedForSubmitter({ item });
  const href = accepted ? clientUrl(`/chat`) : clientUrl(`/items/${item._id}`);
  return sendEmail({
    to: claimer.email,
    subject: `${copy.title} — "${item.title}"`,
    text: `${copy.message} ${href}`,
    html: wrapHtml({
      title: copy.title,
      body: copy.message,
      ctaLabel: accepted ? 'Open Messages' : 'View item',
      ctaHref: href,
    }),
  });
}

async function sendClaimCompletedEmail({ user, item, otherName }) {
  const href = clientUrl(`/items/${item._id}`);
  return sendEmail({
    to: user.email,
    subject: `Item Returned — leave a review`,
    text: `"${item.title}" has been marked as returned. Please rate ${otherName}: ${href}`,
    html: wrapHtml({
      title: 'Item Returned',
      body: `The handoff for <strong>${item.title}</strong> is marked complete. Please leave a short review for <strong>${otherName}</strong> to keep campus handoffs trustworthy.`,
      ctaLabel: 'Leave a review',
      ctaHref: href,
    }),
  });
}

async function sendPasswordResetEmail({ user, resetToken }) {
  const href = clientUrl(`/reset-password?token=${encodeURIComponent(resetToken)}`);
  const minutes = Number(process.env.PASSWORD_RESET_EXPIRE_MINUTES || 60);
  return sendEmail({
    to: user.email,
    subject: 'Reset your ReclaimIt password',
    text: `You requested a password reset. Open this link within ${minutes} minutes to choose a new password: ${href}\n\nIf you did not request this, you can ignore this email.`,
    html: wrapHtml({
      title: 'Reset your password',
      body: `Hi ${user.name},<br/><br/>We received a request to reset your ReclaimIt password. This link expires in <strong>${minutes} minutes</strong>. If you did not request a reset, you can safely ignore this email.`,
      ctaLabel: 'Reset password',
      ctaHref: href,
    }),
  });
}

async function sendNewMessageEmail({ recipient, senderName, preview, itemId }) {
  const href = itemId ? clientUrl(`/chat?user=&item=${itemId}`) : clientUrl('/chat');
  const safePreview = String(preview || '').slice(0, 140);
  return sendEmail({
    to: recipient.email,
    subject: `New message from ${senderName}`,
    text: `${senderName}: ${safePreview}\n\nOpen chat: ${clientUrl('/chat')}`,
    html: wrapHtml({
      title: 'New message',
      body: `<strong>${senderName}</strong> sent you a message:<br/><br/><em>“${safePreview}”</em>`,
      ctaLabel: 'Open chat',
      ctaHref: clientUrl('/chat'),
    }),
  });
}

module.exports = {
  isEmailConfigured,
  sendEmail,
  sendClaimReceivedEmail,
  sendClaimDecisionEmail,
  sendClaimCompletedEmail,
  sendNewMessageEmail,
  sendPasswordResetEmail,
  clientUrl,
};
