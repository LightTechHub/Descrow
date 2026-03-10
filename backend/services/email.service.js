// backend/services/email.service.js - COMPLETE WITH ALL TEMPLATES
// ADDED: sendNewDeviceAlertEmail, sendAccountLockedEmail, sendKYCStatusEmail, sendWithdrawalEmail
const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@dealcross.net';
    const baseUrl = process.env.FRONTEND_URL || 'https://dealcross.net';
    this.frontendUrl = baseUrl.replace(/\/$/, '');
    if (!process.env.RESEND_API_KEY) console.warn('⚠️ RESEND_API_KEY not configured - emails will fail');
  }

  // ─── shared header/footer ────────────────────────────────────────────────────
  _wrap(headerColor, headerText, bodyHtml) {
    return `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:${headerColor};color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
      .content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}
      .button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}
      .details{background:white;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #e5e7eb}
      .footer{text-align:center;padding:20px;color:#666;font-size:12px}
      .alert{background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:15px;margin:15px 0}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>${headerText}</h1></div>
      <div class="content">${bodyHtml}</div>
      <div class="footer"><p>© ${new Date().getFullYear()} Dealcross. All rights reserved.</p><p>This is an automated email. Do not reply.</p></div>
    </div></body></html>`;
  }

  async _send(to, subject, html) {
    return this.resend.emails.send({ from: this.fromEmail, to, subject, html });
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH EMAILS
  // ═══════════════════════════════════════════════════════════════

  async sendVerificationEmail(email, name, verificationToken) {
    try {
      const url = `${this.frontendUrl}/verify-email?token=${verificationToken}`;
      const html = this._wrap(
        'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
        '✉️ Verify Your Email',
        `<p>Hi ${name},</p>
         <p>Thanks for joining Dealcross! Please verify your email address to get started:</p>
         <a href="${url}" class="button">Verify Email Address</a>
         <p>Or copy this link into your browser:</p>
         <p style="word-break:break-all;background:#e5e7eb;padding:10px;border-radius:5px">${url}</p>
         <p>⏰ This link will expire in 7 days.</p>
         <p>If you didn't create this account, please ignore this email.</p>`
      );
      await this._send(email, '✉️ Verify Your Email - Dealcross', html);
      console.log(`✅ Verification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, name, resetToken) {
    try {
      const url = `${this.frontendUrl}/reset-password?token=${resetToken}`;
      const html = this._wrap(
        'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)',
        '🔐 Password Reset Request',
        `<p>Hi ${name},</p>
         <p>We received a request to reset your Dealcross password.</p>
         <a href="${url}" class="button" style="background:#ef4444">Reset Password</a>
         <p>Or copy this link: ${url}</p>
         <p>⚠️ This link expires in 1 hour.</p>
         <p>If you didn't request this, ignore this email.</p>`
      );
      await this._send(email, '🔐 Reset Your Dealcross Password', html);
      console.log(`✅ Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendPasswordChangedEmail(email, name) {
    try {
      const html = this._wrap(
        'linear-gradient(135deg,#10b981 0%,#059669 100%)',
        '🔐 Password Changed',
        `<p>Hi ${name},</p>
         <p>Your Dealcross password was successfully changed.</p>
         <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
         <p>⚠️ If you didn't make this change, contact our support team immediately.</p>`
      );
      await this._send(email, '🔐 Password Changed - Dealcross', html);
      console.log(`✅ Password changed email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send password changed email:', error);
      throw error;
    }
  }

  // NEW: new device login alert
  async sendNewDeviceAlertEmail(email, name, deviceInfo) {
    try {
      const html = this._wrap(
        'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
        '🔔 New Device Login',
        `<p>Hi ${name},</p>
         <p>We noticed a new login to your Dealcross account from an unrecognized device.</p>
         <div class="details">
           <h3>Login Details</h3>
           <p><strong>Browser:</strong> ${deviceInfo.browser} on ${deviceInfo.os}</p>
           <p><strong>Device:</strong> ${deviceInfo.deviceType}</p>
           <p><strong>IP Address:</strong> ${deviceInfo.ip}</p>
           <p><strong>Time:</strong> ${deviceInfo.time}</p>
         </div>
         <div class="alert">
           <p><strong>⚠️ Was this you?</strong></p>
           <p>If you did not log in from this device, please change your password immediately and enable 2FA.</p>
         </div>
         <a href="${this.frontendUrl}/profile?tab=security" class="button" style="background:#f59e0b">Review Security Settings</a>`
      );
      await this._send(email, '🔔 New Device Login Alert - Dealcross', html);
      console.log(`✅ New device alert sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send new device alert:', error);
      throw error;
    }
  }

  // NEW: account locked email
  async sendAccountLockedEmail(email, name, lockDurationMinutes = 30) {
    try {
      const html = this._wrap(
        'linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)',
        '🔒 Account Temporarily Locked',
        `<p>Hi ${name},</p>
         <p>Your Dealcross account has been temporarily locked due to too many failed login attempts.</p>
         <div class="details">
           <p><strong>Lock Duration:</strong> ${lockDurationMinutes} minutes</p>
           <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
         </div>
         <p>Your account will automatically unlock after the lock period. If you've forgotten your password, you can reset it:</p>
         <a href="${this.frontendUrl}/forgot-password" class="button" style="background:#ef4444">Reset Password</a>
         <p>If this wasn't you, please change your password as soon as possible.</p>`
      );
      await this._send(email, '🔒 Account Locked - Dealcross', html);
      console.log(`✅ Account locked email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send account locked email:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // KYC EMAILS
  // ═══════════════════════════════════════════════════════════════

  async sendKYCStatusEmail(email, name, status, rejectionReason = null) {
    try {
      const isApproved = status === 'approved';
      const html = this._wrap(
        isApproved
          ? 'linear-gradient(135deg,#10b981 0%,#059669 100%)'
          : 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)',
        isApproved ? '✅ Identity Verified!' : '❌ Verification Not Approved',
        isApproved
          ? `<p>Hi ${name},</p>
             <p>Congratulations! Your identity has been successfully verified on Dealcross.</p>
             <div class="details">
               <p>✅ You can now create and participate in escrow transactions</p>
               <p>✅ Add bank accounts for withdrawals</p>
               <p>✅ Access all platform features</p>
             </div>
             <a href="${this.frontendUrl}/dashboard" class="button" style="background:#10b981">Go to Dashboard</a>`
          : `<p>Hi ${name},</p>
             <p>Unfortunately, we were unable to verify your identity at this time.</p>
             ${rejectionReason ? `<div class="details"><p><strong>Reason:</strong> ${rejectionReason}</p></div>` : ''}
             <p>You can resubmit your verification with corrected information.</p>
             <a href="${this.frontendUrl}/profile?tab=kyc" class="button" style="background:#ef4444">Retry Verification</a>`
      );
      await this._send(email, isApproved ? '✅ Identity Verified - Dealcross' : '❌ KYC Verification Update - Dealcross', html);
      console.log(`✅ KYC ${status} email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send KYC status email:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WITHDRAWAL EMAILS
  // ═══════════════════════════════════════════════════════════════

  async sendWithdrawalEmail(email, name, status, withdrawalDetails) {
    try {
      const { amount, currency, bankName, accountName, reference } = withdrawalDetails;
      const amountStr = `${currency} ${Number(amount).toLocaleString()}`;

      const isCompleted = status === 'completed';
      const isFailed = status === 'failed';

      const html = this._wrap(
        isCompleted
          ? 'linear-gradient(135deg,#10b981 0%,#059669 100%)'
          : isFailed
          ? 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)'
          : 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
        isCompleted ? '💸 Withdrawal Successful' : isFailed ? '❌ Withdrawal Failed' : '⏳ Withdrawal Requested',
        `<p>Hi ${name},</p>
         ${isCompleted
           ? `<p>Your withdrawal has been successfully processed and sent to your bank account.</p>`
           : isFailed
           ? `<p>Unfortunately, your withdrawal could not be processed. Your funds have been returned to your wallet.</p>`
           : `<p>Your withdrawal request has been received and is being processed.</p>`}
         <div class="details">
           <h3>Withdrawal Details</h3>
           <p><strong>Amount:</strong> ${amountStr}</p>
           <p><strong>Bank:</strong> ${bankName}</p>
           <p><strong>Account:</strong> ${accountName}</p>
           <p><strong>Reference:</strong> ${reference}</p>
           <p><strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
         </div>
         ${!isCompleted && !isFailed ? '<p>Processing typically takes 1-3 business days. You will receive another email when completed.</p>' : ''}
         <a href="${this.frontendUrl}/wallet" class="button">View Wallet</a>`
      );

      const subjects = { completed: '💸 Withdrawal Successful - Dealcross', failed: '❌ Withdrawal Failed - Dealcross', requested: '⏳ Withdrawal Requested - Dealcross', processing: '⏳ Withdrawal Processing - Dealcross' };
      await this._send(email, subjects[status] || '💼 Withdrawal Update - Dealcross', html);
      console.log(`✅ Withdrawal ${status} email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send withdrawal email:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT / ESCROW EMAILS (existing, unchanged)
  // ═══════════════════════════════════════════════════════════════

  async sendPaymentConfirmedEmail(buyerEmail, buyerName, sellerEmail, sellerName, escrowDetails) {
    try {
      const { escrowId, title, amount, currency, buyerPaid } = escrowDetails;

      await this._send(buyerEmail, `✅ Payment Confirmed - Escrow #${escrowId}`,
        this._wrap('linear-gradient(135deg,#667eea 0%,#764ba2 100%)', '✅ Payment Confirmed!',
          `<p>Hi ${buyerName},</p><p>Your payment is now safely held in escrow.</p>
           <div class="details"><p><strong>Escrow ID:</strong> ${escrowId}</p><p><strong>Item:</strong> ${title}</p><p><strong>Amount Paid:</strong> ${currency} ${buyerPaid?.toLocaleString()}</p></div>
           <a href="${this.frontendUrl}/escrow/${escrowId}" class="button">View Escrow</a>`));

      await this._send(sellerEmail, `💰 Payment Received - Escrow #${escrowId}`,
        this._wrap('linear-gradient(135deg,#10b981 0%,#059669 100%)', '💰 Payment Received!',
          `<p>Hi ${sellerName},</p><p>The buyer has paid. Funds are held in escrow.</p>
           <div class="details"><p><strong>Escrow ID:</strong> ${escrowId}</p><p><strong>Item:</strong> ${title}</p><p><strong>Amount:</strong> ${currency} ${amount?.toLocaleString()}</p></div>
           <a href="${this.frontendUrl}/escrow/${escrowId}" class="button" style="background:#10b981">Manage Delivery</a>`));

      console.log(`✅ Payment confirmation emails sent for escrow ${escrowId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send payment confirmation emails:', error);
      throw error;
    }
  }

  async sendDeliveryNotificationEmail(buyerEmail, buyerName, sellerName, escrowDetails) {
    try {
      const { escrowId, title, trackingNumber } = escrowDetails;
      const html = this._wrap('linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)', '📦 Item Delivered!',
        `<p>Hi ${buyerName},</p><p>${sellerName} has marked your item as delivered!</p>
         <div class="details"><p><strong>Escrow ID:</strong> ${escrowId}</p><p><strong>Item:</strong> ${title}</p>${trackingNumber ? `<p><strong>Tracking:</strong> ${trackingNumber}</p>` : ''}</div>
         <p>⚠️ Please confirm only once you've received and inspected the item.</p>
         <a href="${this.frontendUrl}/escrow/${escrowId}" class="button" style="background:#3b82f6">Confirm Delivery</a>`);
      await this._send(buyerEmail, `📦 Item Delivered - Escrow #${escrowId}`, html);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send delivery notification:', error);
      throw error;
    }
  }

  async sendCompletionEmail(sellerEmail, sellerName, buyerName, escrowDetails) {
    try {
      const { escrowId, title, sellerReceives, currency } = escrowDetails;
      const html = this._wrap('linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)', '🎉 Transaction Complete!',
        `<p>Hi ${sellerName},</p><p>${buyerName} has confirmed delivery. Your payment is being processed.</p>
         <div class="details"><p><strong>Escrow ID:</strong> ${escrowId}</p><p><strong>Item:</strong> ${title}</p><p><strong>You Receive:</strong> ${currency} ${sellerReceives?.toLocaleString()}</p></div>
         <p>Funds will be added to your Dealcross wallet. <a href="${this.frontendUrl}/wallet">Withdraw here</a>.</p>`);
      await this._send(sellerEmail, `🎉 Transaction Complete - Escrow #${escrowId}`, html);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send completion email:', error);
      throw error;
    }
  }

  async sendDisputeNotificationEmail(emails, escrowDetails) {
    try {
      const { escrowId, title, raisedBy } = escrowDetails;
      const html = this._wrap('linear-gradient(135deg,#ef4444 0%,#dc2626 100%)', '⚠️ Dispute Raised',
        `<p>A dispute has been raised for escrow #${escrowId}.</p>
         <div class="details" style="border:2px solid #fecaca"><p><strong>Item:</strong> ${title}</p><p><strong>Raised By:</strong> ${raisedBy}</p></div>
         <p>Funds are frozen until resolution (3-5 business days).</p>
         <a href="${this.frontendUrl}/escrow/${escrowId}" class="button" style="background:#ef4444">View Dispute</a>`);
      for (const email of emails) {
        await this._send(email, `⚠️ Dispute Raised - Escrow #${escrowId}`, html);
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send dispute notifications:', error);
      throw error;
    }
  }

  async sendTierUpgradeEmail(email, name, tierName) {
    try {
      const html = this._wrap('linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)', '🎉 Tier Upgrade Complete!',
        `<p>Hi ${name},</p><p>You've successfully upgraded to <strong>${tierName}</strong> tier.</p>
         <div class="details"><p>✅ Lower transaction fees</p><p>💰 Higher transaction limits</p><p>⚡ Priority support</p></div>
         <a href="${this.frontendUrl}/dashboard" class="button" style="background:#8b5cf6">Go to Dashboard</a>`);
      await this._send(email, `🎉 Welcome to ${tierName} Tier - Dealcross`, html);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send tier upgrade email:', error);
      throw error;
    }
  }

  // Keep sendWelcomeEmail as alias for sendVerificationEmail (backward compat)
  async sendWelcomeEmail(email, name, verificationToken) {
    return this.sendVerificationEmail(email, name, verificationToken);
  }
}

module.exports = new EmailService();
