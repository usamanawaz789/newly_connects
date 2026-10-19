// Vercel serverless function: POST /api/contact
// Emails the inquiry to the company inbox and sends a confirmation to the visitor.
// SMTP settings come from environment variables (see .env.example).
const nodemailer = require('nodemailer');

const FIELDS = { name: 120, email: 180, company: 180, service: 180, timeline: 60, budget: 20, message: 10000 };
const SINGLE_LINE = ['name', 'email', 'company', 'service', 'timeline', 'budget'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LABELS = { name: 'Name', email: 'Email', company: 'Company', service: 'Service', timeline: 'Timeline', budget: 'Budget (USD)', message: 'Message' };

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function readForm(body) {
  const f = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    let v = String(body[key] ?? '').trim().slice(0, max);
    if (SINGLE_LINE.includes(key)) v = v.replace(/[\r\n]+/g, ' ');
    f[key] = v;
  }
  if (!f.name) return { error: 'Please enter your name.' };
  if (!EMAIL_RE.test(f.email)) return { error: 'Please enter a valid email address.' };
  if (f.message.length < 15) return { error: 'Please tell us a little more about your project.' };
  if (f.budget && !/^[\d,]+$/.test(f.budget)) return { error: 'Budget must be a dollar amount in numbers only.' };
  return { form: f };
}

function transport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 465;
  return nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  // Honeypot: real visitors never see or fill this field.
  if (body.website) return res.status(200).json({ ok: true });

  const { form: f, error } = readForm(body);
  if (error) return res.status(400).json({ error });

  const mailer = transport();
  if (!mailer) {
    console.error('Contact form: SMTP_HOST, SMTP_USER and SMTP_PASS must be set.');
    return res.status(500).json({ error: 'Email is not configured yet.' });
  }

  const inbox = process.env.CONTACT_EMAIL || 'contact@newlyconnects.com';
  const from = { name: 'Newly Connects', address: process.env.MAIL_FROM || process.env.SMTP_USER };
  const rows = Object.keys(FIELDS).filter(k => f[k]);

  try {
    await mailer.sendMail({
      from,
      to: inbox,
      replyTo: { name: f.name, address: f.email },
      subject: `New inquiry from ${f.name}${f.company ? ` (${f.company})` : ''}`,
      text: rows.map(k => `${LABELS[k]}: ${f[k]}`).join('\n\n'),
      html: '<h2>New website inquiry</h2><table cellpadding="6">' +
        rows.map(k => `<tr><td valign="top"><b>${LABELS[k]}</b></td><td>${escapeHtml(f[k]).replace(/\n/g, '<br>')}</td></tr>`).join('') +
        '</table>',
    });
  } catch (err) {
    console.error('Contact form: failed to send inquiry', err);
    return res.status(502).json({ error: 'We could not send your inquiry.' });
  }

  // The confirmation deliberately leaves out the visitor's message, so the form
  // cannot be used to send arbitrary content to other people from our address.
  try {
    await mailer.sendMail({
      from,
      to: { name: f.name, address: f.email },
      replyTo: inbox,
      subject: 'We received your inquiry – Newly Connects',
      text: `Hi ${f.name},\n\nThank you for contacting Newly Connects. We have received your inquiry and will get back to you shortly.\n\nIf you need to reach us sooner, call 223-369-5352 or reply to this email.\n\nNewly Connects\ncontact@newlyconnects.com`,
      html: `<p>Hi ${escapeHtml(f.name)},</p><p>Thank you for contacting Newly Connects. We have received your inquiry and will get back to you shortly.</p><p>If you need to reach us sooner, call <a href="tel:2233695352">223-369-5352</a> or reply to this email.</p><p>Newly Connects<br><a href="mailto:contact@newlyconnects.com">contact@newlyconnects.com</a></p>`,
    });
  } catch (err) {
    // The inquiry already reached the inbox, so the visitor still gets a success response.
    console.error('Contact form: failed to send confirmation', err);
  }

  return res.status(200).json({ ok: true });
};
