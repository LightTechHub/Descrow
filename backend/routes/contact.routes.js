// backend/routes/contact.routes.js
const express = require('express');
const { Resend } = require('resend');

const resend       = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@dealcross.net';
const FROM_EMAIL    = process.env.FROM_EMAIL    || 'Dealcross <noreply@dealcross.net>';

// ── Contact router  (mounted at /api/contact) ─────────────────────────────────
const contactRouter = express.Router();

contactRouter.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message)
      return res.status(400).json({ success: false, message: 'All fields are required.' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email address.' });

    if (message.length < 10)
      return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });

    if (!process.env.RESEND_API_KEY) {
      console.log(`Contact (no Resend key): ${name} <${email}> - ${subject}`);
      return res.json({ success: true, message: "Message received! We will get back to you within 24 hours." });
    }

    // Notify admin
    const { error: adminError } = await resend.emails.send({
      from: FROM_EMAIL,
      to:   [SUPPORT_EMAIL],
      replyTo: email,
      subject: `[Contact Form] ${subject}`,
      html: `<div style="font-family:Arial;max-width:600px">
        <div style="background:#1d4ed8;color:#fff;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">New Contact Form Submission</h2>
          <p style="margin:4px 0 0;opacity:.8;font-size:14px">dealcross.net</p>
        </div>
        <div style="background:#f9fafb;padding:24px;border-radius:0 0 8px 8px">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background:#fff;padding:12px;border-radius:6px;border:1px solid #e5e7eb">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>`
    });

    if (adminError) {
      console.error('Resend admin notify error:', adminError);
    }

    // Auto-reply to sender
    await resend.emails.send({
      from: FROM_EMAIL,
      to:   [email],
      subject: 'We received your message - Dealcross Support',
      html: `<div style="font-family:Arial;max-width:600px;padding:20px">
        <h2 style="color:#1d4ed8">Hi ${name},</h2>
        <p>Thank you for contacting Dealcross. We will respond within 24 hours.</p>
        <div style="background:#f9fafb;padding:16px;border-left:4px solid #1d4ed8;border-radius:4px">
          <strong>Your message:</strong><br><br>${message.replace(/\n/g, '<br>')}
        </div>
        <p>Check our <a href="https://dealcross.net/faq" style="color:#1d4ed8">FAQ page</a> for quick answers.</p>
        <p style="color:#9ca3af;font-size:12px">Dealcross Support · Aba, Abia State, Nigeria</p>
      </div>`
    }).catch(e => console.error('Auto-reply error:', e.message));

    res.json({ success: true, message: "Message sent! We will get back to you within 24 hours." });

  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});

// ── Newsletter router  (mounted at /api/newsletter) ───────────────────────────
const newsletterRouter = express.Router();

newsletterRouter.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Valid email address required.' });

    console.log(`Newsletter signup: ${email}`);

    if (!process.env.RESEND_API_KEY) {
      return res.json({ success: true, message: 'Subscribed! You will receive Dealcross updates.' });
    }

    // Notify admin
    await resend.emails.send({
      from: FROM_EMAIL,
      to:   [SUPPORT_EMAIL],
      subject: `[Newsletter Signup] ${email}`,
      text: `New newsletter subscriber: ${email}\n\nAdd to mailing list.`
    }).catch(e => console.error('Newsletter admin notify error:', e.message));

    // Confirmation to subscriber
    await resend.emails.send({
      from: FROM_EMAIL,
      to:   [email],
      subject: 'You are subscribed to Dealcross updates',
      html: `<div style="font-family:Arial;max-width:600px;padding:20px">
        <h2 style="color:#1d4ed8">Welcome to Dealcross Updates!</h2>
        <p>You have successfully subscribed to our newsletter.</p>
        <p>You will receive security tips, platform updates, and escrow guides from us.</p>
        <p style="color:#6b7280;font-size:13px">
          If you did not subscribe, you can safely ignore this email.<br>
          To unsubscribe, reply with "unsubscribe" in the subject.
        </p>
        <p style="color:#9ca3af;font-size:12px">Dealcross Team · Aba, Abia State, Nigeria</p>
      </div>`
    }).catch(e => console.error('Newsletter confirm error:', e.message));

    res.json({ success: true, message: 'Subscribed! Check your email for confirmation.' });

  } catch (err) {
    console.error('subscribeNewsletter error:', err);
    res.status(500).json({ success: false, message: 'Subscription failed. Please try again.' });
  }
});

module.exports = { contactRouter, newsletterRouter };
