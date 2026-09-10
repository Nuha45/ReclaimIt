const nodemailer = require('nodemailer');

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
  return sendEmail({
    to: owner.email,
    subject: `New claim request for "${item.title}"`,
    text: `${claimerName} requested to claim "${item.title}". Review it: ${href}`,
    html: wrapHtml({
      title: 'New claim request',
      body: `<strong>${claimerName}</strong> requested to claim <strong>${item.title}</strong>. Review their verification answers and accept or reject the claim.`,
      ctaLabel: 'Review claim',
      ctaHref: href,
    }),
  });
}

async function sendClaimDecisionEmail({ claimer, item, decision }) {
  const accepted = decision === 'accepted';
  const href = accepted
    ? clientUrl(`/chat`)
    : clientUrl(`/items/${item._id}`);
  return sendEmail({
    to: claimer.email,
    subject: accepted
      ? `Claim accepted — "${item.title}"`
      : `Claim update — "${item.title}"`,
    text: accepted
      ? `Your claim for "${item.title}" was accepted. Open Messages on ReclaimIt to coordinate.`
      : `Your claim for "${item.title}" was rejected by the owner.`,
    html: wrapHtml({
      title: accepted ? 'Claim accepted' : 'Claim rejected',
      body: accepted
        ? `Great news — your claim for <strong>${item.title}</strong> was accepted. Open Messages to coordinate the handoff.`
        : `Your claim for <strong>${item.title}</strong> was rejected. The item may still be available for others.`,
      ctaLabel: accepted ? 'Open Messages' : 'View item',
      ctaHref: href,
    }),
  });
}

async function sendClaimCompletedEmail({ user, item, otherName }) {
  const href = clientUrl(`/items/${item._id}`);
  return sendEmail({
    to: user.email,
    subject: `Return completed — leave a review`,
    text: `The return for "${item.title}" is complete. Please rate ${otherName}: ${href}`,
    html: wrapHtml({
      title: 'Return completed',
      body: `The handoff for <strong>${item.title}</strong> is marked complete. Please leave a short review for <strong>${otherName}</strong> to keep campus handoffs trustworthy.`,
      ctaLabel: 'Leave a review',
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
  clientUrl,
};
