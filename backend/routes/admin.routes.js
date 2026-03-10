// backend/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protectAdmin, checkPermission, masterOnly } = require('../middleware/admin.middleware');
const { body } = require('express-validator');

// ======================================================
// =============== DEBUG ROUTE (DELETE AFTER USE) =======
// ======================================================
router.get('/debug-token', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const Admin = require('../models/Admin.model');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.json({ error: 'no token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    res.json({
      decoded,
      adminFound: !!admin,
      adminId: admin?._id,
      adminStatus: admin?.status,
      jwtSecretSet: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length
    });
  } catch (err) {
    res.json({ error: err.message, name: err.name });
  }
});

// ======================================================
// =============== PUBLIC ADMIN ROUTES ==================
// ======================================================

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  adminController.login
);

// ======================================================
// =============== PROTECTED ADMIN ROUTES ===============
// ======================================================

router.get('/dashboard', protectAdmin, adminController.getDashboardStats);

// Transactions
router.get('/transactions', protectAdmin, checkPermission('viewTransactions'), adminController.getTransactions);
router.get('/transactions/:transactionId', protectAdmin, checkPermission('viewTransactions'), adminController.getTransactionDetails);

// Disputes
router.get('/disputes', protectAdmin, checkPermission('manageDisputes'), adminController.getDisputes);
router.put('/disputes/:disputeId/assign', protectAdmin, checkPermission('manageDisputes'), adminController.assignDispute);
router.put('/disputes/:disputeId/resolve', protectAdmin, checkPermission('manageDisputes'), adminController.resolveDispute);

// Users
router.get('/users', protectAdmin, checkPermission('verifyUsers'), adminController.getUsers);
router.get('/users/:userId', protectAdmin, checkPermission('verifyUsers'), adminController.getUserDetails);
router.put('/users/:userId/tier', protectAdmin, checkPermission('verifyUsers'), adminController.changeUserTier);
router.put('/users/:userId/kyc', protectAdmin, checkPermission('verifyUsers'), adminController.reviewKYC);
router.put('/users/:userId/toggle-status', protectAdmin, checkPermission('verifyUsers'), adminController.toggleUserStatus);

// Analytics
router.get('/analytics', protectAdmin, checkPermission('viewAnalytics'), adminController.getAnalytics);
router.get('/platform-stats', protectAdmin, checkPermission('viewAnalytics'), adminController.getPlatformStats);

// ======================================================
// ========== ADMIN MANAGEMENT (MASTER ONLY) ============
// ======================================================

router.get('/admins', protectAdmin, masterOnly, adminController.getAdmins);
router.post('/admins', protectAdmin, masterOnly,
  [
    body('name').notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('permissions').optional().isObject().withMessage('Permissions must be an object')
  ],
  adminController.createSubAdmin
);
router.put('/admins/:adminId/permissions', protectAdmin, masterOnly,
  [body('permissions').isObject().withMessage('Permissions must be an object')],
  adminController.updateSubAdminPermissions
);
router.put('/admins/:adminId/toggle-status', protectAdmin, masterOnly, adminController.toggleAdminStatus);
router.delete('/admins/:adminId', protectAdmin, masterOnly, adminController.deleteSubAdmin);

// ======================================================
// =========== FEE MANAGEMENT (MASTER ONLY) =============
// ======================================================

router.get('/fees', protectAdmin, masterOnly, adminController.getFeeSettings);
router.put('/fees/update', protectAdmin, masterOnly,
  [
    body('tier').isIn(['starter', 'growth', 'enterprise', 'api']).withMessage('Invalid tier'),
    body('feeType').isIn(['fees', 'monthlyCost', 'setupFee', 'maxTransactionAmount', 'maxTransactionsPerMonth']).withMessage('Invalid fee type'),
    body('field').optional().isString().withMessage('Field must be a string'),
    body('currency').optional().isIn(['NGN', 'USD', 'crypto']).withMessage('Invalid currency'),
    body('value').notEmpty().withMessage('Value required')
  ],
  adminController.updateFeeSettings
);
router.put('/fees/bulk-update', protectAdmin, masterOnly,
  [
    body('tier').isIn(['starter', 'growth', 'enterprise', 'api']).withMessage('Invalid tier'),
    body('updates').isObject().withMessage('Updates object required')
  ],
  adminController.bulkUpdateTierFees
);
router.put('/fees/gateway-costs', protectAdmin, masterOnly,
  [
    body('gateway').isIn(['paystack', 'flutterwave', 'crypto']).withMessage('Invalid gateway'),
    body('currency').optional().isIn(['NGN', 'USD']).withMessage('Invalid currency'),
    body('field').notEmpty().withMessage('Field required'),
    body('value').notEmpty().withMessage('Value required')
  ],
  adminController.updateGatewayCosts
);
router.get('/fees/history', protectAdmin, masterOnly, adminController.getFeeSettingsHistory);
router.post('/fees/reset', protectAdmin, masterOnly,
  [body('tier').isIn(['starter', 'growth', 'enterprise', 'api', 'all']).withMessage('Invalid tier')],
  adminController.resetFeesToDefault
);

// ── Withdrawal management ────────────────────────────────────────────
const { adminGetWithdrawals, adminUpdateWithdrawal } = require('../controllers/wallet.controller');
router.get('/withdrawals', protectAdmin, adminGetWithdrawals);
router.patch('/withdrawals/:id', protectAdmin, adminUpdateWithdrawal);
router.get('/withdrawals/settings', protectAdmin, masterOnly, adminController.getWithdrawalSettings);
router.put('/withdrawals/settings', protectAdmin, masterOnly, adminController.updateWithdrawalSettings);

// ── Escrow intervention ──────────────────────────────────────────────
router.post('/escrow/:id/force-complete', protectAdmin, [
  body('reason').notEmpty().withMessage('Reason required')
], adminController.forceCompleteEscrow);
router.post('/escrow/:id/force-cancel', protectAdmin, [
  body('reason').notEmpty().withMessage('Reason required')
], adminController.forceCancelEscrow);

// ── User ban/unban ──────────────────────────────────────────────────
router.post('/users/:id/ban', protectAdmin, [
  body('reason').notEmpty().withMessage('Reason required')
], adminController.banUser);
router.post('/users/:id/unban', protectAdmin, adminController.unbanUser);

// ── Wallet management ────────────────────────────────────────────────
router.get('/users/:userId/wallet', protectAdmin, adminController.getUserWallet);
router.post('/users/:userId/wallet/credit', protectAdmin, masterOnly, [
  body('amount').isNumeric().isFloat({ min: 1 }).withMessage('Valid amount required'),
  body('reason').notEmpty().withMessage('Reason required')
], adminController.adminCreditWallet);
router.post('/users/:userId/wallet/debit', protectAdmin, masterOnly, [
  body('amount').isNumeric().isFloat({ min: 1 }).withMessage('Valid amount required'),
  body('reason').notEmpty().withMessage('Reason required')
], adminController.adminDebitWallet);

// ── Broadcast notifications ──────────────────────────────────────────
router.post('/broadcast', protectAdmin, masterOnly, [
  body('title').notEmpty().withMessage('Title required'),
  body('message').notEmpty().withMessage('Message required')
], adminController.broadcastNotification);

// ── Revenue dashboard ────────────────────────────────────────────────
router.get('/revenue', protectAdmin, adminController.getRevenueStats);


// scripts/backfill-wallets.js
// Run ONCE: node scripts/backfill-wallets.js
// Finds all completed escrows and credits seller wallets retroactively.
// Safe to re-run — skips escrows already credited (checks for existing transaction).

require('dotenv').config();
const mongoose = require('mongoose');

// ── Load models ───────────────────────────────────────────────────────────────
const Escrow   = require('../models/Escrow.model');
const Wallet   = require('../models/Wallet.model');
const User     = require('../models/User.model');

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Find all completed escrows with a seller
  const escrows = await Escrow.find({ status: 'completed' })
    .populate('buyer seller', 'name email')
    .lean();

  console.log(`\n📦 Found ${escrows.length} completed escrow(s)\n`);

  let credited = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const escrow of escrows) {
    try {
      const sellerId = escrow.seller?._id || escrow.seller;
      if (!sellerId) {
        console.log(`⚠️  Skipping ${escrow.escrowId || escrow._id} — no seller`);
        skipped++;
        continue;
      }

      const wallet = await getOrCreateWallet(sellerId);

      // Check if this escrow was already credited (idempotency)
      const alreadyCredited = wallet.transactions.some(
        tx => tx.escrowId?.toString() === escrow._id.toString() && tx.type === 'credit'
      );

      if (alreadyCredited) {
        console.log(`⏭️  Already credited: ${escrow.escrowId || escrow._id}`);
        skipped++;
        continue;
      }

      // Calculate seller's amount
      let sellerReceives;
      if (escrow.payment?.sellerReceives) {
        sellerReceives = parseFloat(escrow.payment.sellerReceives.toString());
      } else if (escrow.amount) {
        // Fallback: use full amount (fee wasn't tracked)
        sellerReceives = parseFloat(escrow.amount.toString());
        console.log(`  ℹ️  No sellerReceives found for ${escrow.escrowId} — using full amount ₦${sellerReceives}`);
      } else {
        console.log(`⚠️  Skipping ${escrow.escrowId || escrow._id} — no amount`);
        skipped++;
        continue;
      }

      if (isNaN(sellerReceives) || sellerReceives <= 0) {
        console.log(`⚠️  Skipping ${escrow.escrowId || escrow._id} — invalid amount: ${sellerReceives}`);
        skipped++;
        continue;
      }

      // Use completion date if available, otherwise createdAt
      const completedAt = escrow.delivery?.confirmedAt || escrow.updatedAt || new Date();

      await wallet.credit(
        sellerReceives,
        `[Backfill] Payment for: ${escrow.title}`,
        escrow._id,
        escrow.escrowId,
        `BACKFILL_${escrow.escrowId || escrow._id}_${Date.now()}`
      );

      console.log(`✅ Credited ₦${sellerReceives.toLocaleString()} → ${escrow.seller?.name || sellerId} | Escrow: ${escrow.escrowId || escrow._id} | "${escrow.title}"`);
      credited++;

    } catch (err) {
      console.error(`❌ Error on escrow ${escrow._id}:`, err.message);
      errors++;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log('  BACKFILL COMPLETE');
  console.log('══════════════════════════════════════');
  console.log(`  ✅ Credited : ${credited}`);
  console.log(`  ⏭️  Skipped  : ${skipped}`);
  console.log(`  ❌ Errors   : ${errors}`);
  console.log(`  📦 Total    : ${escrows.length}`);
  console.log('══════════════════════════════════════\n');

  // Show final wallet balances for all affected sellers
  if (credited > 0) {
    console.log('📊 Updated wallet balances:\n');
    const processed = new Set();
    for (const escrow of escrows) {
      const sellerId = (escrow.seller?._id || escrow.seller)?.toString();
      if (!sellerId || processed.has(sellerId)) continue;
      processed.add(sellerId);
      const wallet = await Wallet.findOne({ user: sellerId });
      if (wallet) {
        console.log(`  ${escrow.seller?.name || sellerId} (${escrow.seller?.email || ''})`);
        console.log(`    Balance:         ₦${wallet.balance.toLocaleString()}`);
        console.log(`    Total Earned:    ₦${wallet.totalEarned.toLocaleString()}`);
        console.log(`    Total Withdrawn: ₦${wallet.totalWithdrawn.toLocaleString()}`);
        console.log('');
      }
    }
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

module.exports = router;
