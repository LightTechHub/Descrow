// backend/controllers/contact.controller.js
const nodemailer = require('nodemailer');

// ── POST /api/contact ─────────────────────────────────────────────────────────
exports.submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (message.length < 10) {
      return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });
    }

    // ── Email admin ────────────────────────────────────────────────────────────
    // Only attempts to send if EMAIL credentials are configured.
    // Uses nodemailer with SMTP. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in Render env.
    // Falls through gracefully if not configured.
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
          port:   parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_PORT === '465',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        // Notify admin
        await transporter.sendMail({
          from:    `"Dealcross Contact" <${process.env.EMAIL_USER}>`,
          to:      process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
          subject: `[Contact Form] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #1e3a5f;">New Contact Form Submission</h2>
              <table style="width:100%; border-collapse:collapse;">
                <tr><td style="padding:8px; font-weight:bold; color:#555;">Name:</td><td style="padding:8px;">${name}</td></tr>
                <tr><td style="padding:8px; font-weight:bold; color:#555;">Email:</td><td style="padding:8px;"><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td style="padding:8px; font-weight:bold; color:#555;">Subject:</td><td style="padding:8px;">${subject}</td></tr>
              </table>
              <div style="margin-top:16px; padding:16px; background:#f8fafc; border-left:4px solid #1e3a5f; border-radius:4px;">
                <strong>Message:</strong><br><br>${message.replace(/\n/g, '<br>')}
              </div>
              <hr style="margin:24px 0; border:none; border-top:1px solid #e2e8f0;">
              <p style="color:#888; font-size:12px;">Submitted via dealcross.net contact form</p>
            </div>
          `
        });

        // Auto-reply to sender
        await transporter.sendMail({
          from:    `"Dealcross Support" <${process.env.EMAIL_USER}>`,
          to:      email,
          subject: `We received your message — Dealcross`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #1e3a5f;">Hi ${name},</h2>
              <p>Thank you for reaching out to Dealcross. We've received your message and will get back to you within 24 hours.</p>
              <div style="margin:16px 0; padding:16px; background:#f8fafc; border-left:4px solid #1e3a5f; border-radius:4px;">
                <strong>Your message:</strong><br><br>${message.replace(/\n/g, '<br>')}
              </div>
              <p>In the meantime, you can visit our <a href="https://dealcross.net/faq" style="color:#1e3a5f;">FAQ page</a> for quick answers.</p>
              <p style="color:#888; font-size:12px;">— The Dealcross Team</p>
            </div>
          `
        });

        console.log(`✅ Contact form email sent from ${email}`);
      } catch (emailErr) {
        // Email failure is non-fatal — still return success to user
        console.error('⚠️ Contact email send failed:', emailErr.message);
      }
    } else {
      console.log(`📝 Contact form (no email configured): ${name} <${email}> — ${subject}`);
    }

    res.json({
      success: true,
      message: 'Message received! We will get back to you within 24 hours.'
    });

  } catch (err) {
    console.error('submitContact error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again or email us directly.' });
  }
};

// ── POST /api/newsletter ──────────────────────────────────────────────────────
exports.subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email address required.' });
    }

    // ⚠️ TODO: Wire to real email service (Mailchimp, Resend, ConvertKit, etc.)
    // For now: log and email admin to add to list manually
    console.log(`📧 Newsletter signup: ${email}`);

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
          port:   parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_PORT === '465',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        await transporter.sendMail({
          from:    `"Dealcross" <${process.env.EMAIL_USER}>`,
          to:      process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
          subject: `[Newsletter Signup] ${email}`,
          text:    `New newsletter subscriber: ${email}\nAdd to mailing list.`
        });
      } catch (e) {
        console.error('Newsletter email log failed:', e.message);
      }
    }

    res.json({ success: true, message: 'Subscribed successfully! Welcome to Dealcross updates.' });

  } catch (err) {
    console.error('subscribeNewsletter error:', err);
    res.status(500).json({ success: false, message: 'Subscription failed. Please try again.' });
  }
};
