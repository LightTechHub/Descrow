// backend/controllers/wallet.controller.js
const Wallet = require('../models/Wallet.model');
const Withdrawal = require('../models/Withdrawal.model');
const User = require('../models/User.model');
const Escrow = require('../models/Escrow.model');
const crypto = require('crypto');
const axios = require('axios');

// ── helper: get or create wallet for user ─────────────────────────────────────
const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  return wallet;
};

// ── GET /api/wallet ────────────────────────────────────────────────────────────
exports.getWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn,
        currency: wallet.currency
      }
    });
  } catch (err) {
    console.error('getWallet error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/wallet/transactions ───────────────────────────────────────────────
exports.getWalletTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const wallet = await getOrCreateWallet(req.user.id);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sorted = [...wallet.transactions].reverse(); // newest first
    const paginated = sorted.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        transactions: paginated,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: wallet.transactions.length,
          pages: Math.ceil(wallet.transactions.length / parseInt(limit))
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/wallet/withdraw ──────────────────────────────────────────────────
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankName, accountName, accountNumber, bankCode } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }
    if (!bankName || !accountName || !accountNumber) {
      return res.status(400).json({ success: false, message: 'Bank details required' });
    }

    const parsedAmount = parseFloat(amount);
    const wallet = await getOrCreateWallet(req.user.id);

    // ── Payout hold check: funds credited but not yet available ─────────────────
    // Check if any recent credits have payoutAvailableAt in the future
    const Escrow = require('../models/Escrow.model');
    const heldEscrows = await Escrow.find({
      seller: req.user.id,
      status: 'completed',
      'payment.payoutAvailableAt': { $gt: new Date() }
    }).select('title payment.payoutAvailableAt');

    if (heldEscrows.length > 0) {
      const earliestRelease = heldEscrows.reduce((min, e) => {
        const t = new Date(e.payment.payoutAvailableAt);
        return t < min ? t : min;
      }, new Date(heldEscrows[0].payment.payoutAvailableAt));

      const minutesLeft = Math.ceil((earliestRelease - Date.now()) / 60000);
      const hoursLeft = Math.ceil(minutesLeft / 60);
      return res.status(400).json({
        success: false,
        message: `Your funds are under a security hold. Available to withdraw in ${hoursLeft > 1 ? `${hoursLeft} hours` : `${minutesLeft} minutes`}.`,
        code: 'PAYOUT_HOLD',
        payoutAvailableAt: earliestRelease
      });
    }

    if (wallet.balance < parsedAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₦${wallet.balance.toLocaleString()}`
      });
    }

    // Minimum withdrawal: ₦1,000
    if (parsedAmount < 1000) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₦1,000' });
    }

    const reference = `WD_${req.user.id}_${Date.now()}`;

    // Create withdrawal record
    const withdrawal = await Withdrawal.create({
      user: req.user.id,
      wallet: wallet._id,
      amount: parsedAmount,
      currency: wallet.currency,
      bankDetails: { bankName, accountName, accountNumber, bankCode },
      reference,
      status: 'pending'
    });

    // Debit wallet immediately (hold the funds)
    await wallet.debit(parsedAmount, `Withdrawal to ${bankName} - ${accountNumber}`, withdrawal._id, reference);

    // Attempt Paystack transfer if keys configured
    if (process.env.PAYSTACK_SECRET_KEY) {
      try {
        // 1. Create transfer recipient
        const recipientRes = await axios.post(
          'https://api.paystack.co/transferrecipient',
          {
            type: 'nuban',
            name: accountName,
            account_number: accountNumber,
            bank_code: bankCode || '000',
            currency: 'NGN'
          },
          { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
        );

        const recipientCode = recipientRes.data?.data?.recipient_code;

        // 2. Initiate transfer
        const transferRes = await axios.post(
          'https://api.paystack.co/transfer',
          {
            source: 'balance',
            amount: parsedAmount * 100, // kobo
            recipient: recipientCode,
            reason: `Dealcross withdrawal - ${reference}`,
            reference
          },
          { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
        );

        const transferCode = transferRes.data?.data?.transfer_code;
        const transferStatus = transferRes.data?.data?.status;

        withdrawal.paystackRecipientCode = recipientCode;
        withdrawal.paystackTransferCode = transferCode;
        withdrawal.status = transferStatus === 'success' ? 'completed' : 'processing';
        if (transferStatus === 'success') withdrawal.completedAt = new Date();
        withdrawal.processedAt = new Date();
        await withdrawal.save();

        console.log(`✅ Paystack transfer initiated: ${transferCode} for ${reference}`);
      } catch (paystackErr) {
        console.error('⚠️ Paystack transfer failed, withdrawal queued for manual processing:', paystackErr.message);
        // Don't fail — funds already debited, admin will process manually
        withdrawal.status = 'processing';
        withdrawal.adminNote = `Auto-transfer failed: ${paystackErr.message}. Process manually.`;
        withdrawal.processedAt = new Date();
        await withdrawal.save();
      }
    } else {
      // No Paystack keys — queue for manual processing
      withdrawal.status = 'processing';
      withdrawal.adminNote = 'PAYSTACK_SECRET_KEY not set. Process manually.';
      withdrawal.processedAt = new Date();
      await withdrawal.save();
    }

    // ── Auto-approval threshold ─────────────────────────────────────────────────
    const AUTO_APPROVE_THRESHOLD = parseInt(process.env.WITHDRAWAL_AUTO_APPROVE_THRESHOLD || '50000');

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        withdrawalId: withdrawal._id,
        reference: withdrawal.reference,
        amount: parsedAmount,
        status: withdrawal.status,
        bankDetails: { bankName, accountName, accountNumber },
        autoApproved: parsedAmount <= AUTO_APPROVE_THRESHOLD
      }
    });

    // Send withdrawal requested email (fire-and-forget after response)
    try {
      const emailService = require('../services/email.service');
      const User = require('../models/User.model');
      const user = await User.findById(req.user.id).select('name email');
      if (user) {
        await emailService.sendWithdrawalEmail(user.email, user.name, 'requested', {
          amount: parsedAmount, currency: 'NGN',
          bankName, accountName, reference: withdrawal.reference
        });
      }
    } catch (emailErr) {
      console.error('withdrawal email failed:', emailErr.message);
    }
  } catch (err) {
    console.error('requestWithdrawal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/wallet/withdrawals ────────────────────────────────────────────────
exports.getWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Withdrawal.countDocuments({ user: req.user.id })
    ]);

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/wallet/banks ─────────────────────────────────────────────────────
// Proxy Paystack bank list so frontend doesn't need the secret key
exports.getBankList = async (req, res) => {
  try {
    const response = await axios.get('https://api.paystack.co/bank?currency=NGN&perPage=100', {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });
    res.json({ success: true, data: response.data?.data || [] });
  } catch (err) {
    // Fallback common Nigerian banks if Paystack call fails
    res.json({
      success: true,
      data: [
        { name: 'Access Bank', code: '044' },
        { name: 'Citibank', code: '023' },
        { name: 'Diamond Bank', code: '063' },
        { name: 'Ecobank Nigeria', code: '050' },
        { name: 'Fidelity Bank', code: '070' },
        { name: 'First Bank of Nigeria', code: '011' },
        { name: 'First City Monument Bank', code: '214' },
        { name: 'Guaranty Trust Bank', code: '058' },
        { name: 'Heritage Bank', code: '030' },
        { name: 'Keystone Bank', code: '082' },
        { name: 'Polaris Bank', code: '076' },
        { name: 'Providus Bank', code: '101' },
        { name: 'Stanbic IBTC Bank', code: '221' },
        { name: 'Standard Chartered Bank', code: '068' },
        { name: 'Sterling Bank', code: '232' },
        { name: 'SunTrust Bank', code: '100' },
        { name: 'Union Bank of Nigeria', code: '032' },
        { name: 'United Bank For Africa', code: '033' },
        { name: 'Unity Bank', code: '215' },
        { name: 'Wema Bank', code: '035' },
        { name: 'Zenith Bank', code: '057' },
        { name: 'Kuda Bank', code: '50211' },
        { name: 'OPay', code: '100004' },
        { name: 'Palmpay', code: '100033' },
        { name: 'Moniepoint', code: '50515' }
      ]
    });
  }
};

// ── POST /api/wallet/verify-account ───────────────────────────────────────────
// Verify account name via Paystack
exports.verifyBankAccount = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ success: false, message: 'Account number and bank code required' });
    }

    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    res.json({
      success: true,
      data: {
        accountName: response.data?.data?.account_name,
        accountNumber: response.data?.data?.account_number
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not verify account. Please check details.' });
  }
};

// ── INTERNAL: credit wallet on escrow completion ───────────────────────────────
// Called from escrow.controller.js confirmDelivery
exports.creditWalletOnCompletion = async (sellerId, escrow) => {
  try {
    const wallet = await getOrCreateWallet(sellerId);
    const sellerReceives = escrow.payment?.sellerReceives
      ? parseFloat(escrow.payment.sellerReceives.toString())
      : parseFloat(escrow.amount.toString());

    await wallet.credit(
      sellerReceives,
      `Payment for escrow: ${escrow.title}`,
      escrow._id,
      escrow.escrowId,
      `CREDIT_${escrow.escrowId}_${Date.now()}`
    );

    console.log(`✅ Wallet credited ₦${sellerReceives} for seller ${sellerId} — escrow ${escrow.escrowId}`);
    return { success: true, amount: sellerReceives };
  } catch (err) {
    console.error('❌ creditWalletOnCompletion error:', err);
    return { success: false, error: err.message };
  }
};

// ── ADMIN: GET /api/admin/withdrawals ──────────────────────────────────────────
exports.adminGetWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Withdrawal.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: PATCH /api/admin/withdrawals/:id ────────────────────────────────────
exports.adminUpdateWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const withdrawal = await Withdrawal.findById(id).populate('user', 'name email');
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

    const validTransitions = {
      processing: ['completed', 'failed'],
      pending: ['processing', 'failed', 'cancelled']
    };

    if (!validTransitions[withdrawal.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${withdrawal.status} to ${status}`
      });
    }

    // If marking as failed, refund the wallet
    if (status === 'failed' || status === 'cancelled') {
      const wallet = await Wallet.findOne({ user: withdrawal.user._id });
      if (wallet) {
        const before = wallet.balance;
        wallet.balance += withdrawal.amount;
        wallet.totalWithdrawn = Math.max(0, wallet.totalWithdrawn - withdrawal.amount);
        wallet.transactions.push({
          type: 'refund',
          amount: withdrawal.amount,
          currency: wallet.currency,
          description: `Withdrawal refunded: ${status} — ${adminNote || ''}`,
          withdrawalId: withdrawal._id,
          status: 'completed',
          balanceBefore: before,
          balanceAfter: wallet.balance,
          reference: `REFUND_${withdrawal.reference}`
        });
        await wallet.save();
      }
    }

    withdrawal.status = status;
    withdrawal.adminNote = adminNote || withdrawal.adminNote;
    withdrawal.processedBy = (req.admin || req.user)?._id;
    if (status === 'completed') withdrawal.completedAt = new Date();
    await withdrawal.save();

    // Send email notification for completed/failed
    try {
      const emailService = require('../services/email.service');
      const userDoc = await User.findById(withdrawal.user._id || withdrawal.user).select('name email');
      if (userDoc && ['completed', 'failed'].includes(status)) {
        await emailService.sendWithdrawalEmail(userDoc.email, userDoc.name, status, {
          amount: withdrawal.amount, currency: withdrawal.currency,
          bankName: withdrawal.bankDetails.bankName,
          accountName: withdrawal.bankDetails.accountName,
          reference: withdrawal.reference
        });
      }
    } catch (emailErr) {
      console.error('withdrawal status email failed:', emailErr.message);
    }

    res.json({ success: true, message: `Withdrawal marked as ${status}`, data: withdrawal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/wallet/deposit/initiate ─────────────────────────────────────────
// Initiates a Paystack payment to top up wallet balance.
// On payment success, Paystack webhook calls /api/wallet/deposit/verify.
exports.initiateDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount < 500) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is ₦500.' });
    }
    if (parsedAmount > 10000000) {
      return res.status(400).json({ success: false, message: 'Maximum single deposit is ₦10,000,000.' });
    }

    const user = await User.findById(req.user.id).select('email name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const reference = `DEP_${req.user.id}_${Date.now()}`;

    // Initialize Paystack payment
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: Math.round(parsedAmount * 100), // kobo
        reference,
        callback_url: `${process.env.FRONTEND_URL}/wallet?deposit=success`,
        metadata: {
          userId: req.user.id,
          purpose: 'wallet_deposit',
          amount: parsedAmount,
          currency: 'NGN'
        }
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const { authorization_url, access_code } = response.data?.data || {};

    if (!authorization_url) {
      return res.status(500).json({ success: false, message: 'Could not initialize payment. Try again.' });
    }

    res.json({
      success: true,
      data: {
        authorization_url,
        access_code,
        reference,
        amount: parsedAmount
      }
    });
  } catch (err) {
    console.error('initiateDeposit error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Deposit initialization failed. Try again.' });
  }
};

// ── POST /api/wallet/deposit/verify ──────────────────────────────────────────
// Called by frontend after Paystack redirect, OR by Paystack webhook.
// Verifies the transaction and credits the wallet.
exports.verifyDeposit = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference required' });
    }

    // Verify with Paystack
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const txData = paystackRes.data?.data;

    if (!txData || txData.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment not successful. No funds credited.' });
    }

    // Guard: only process wallet_deposit transactions
    if (txData.metadata?.purpose !== 'wallet_deposit') {
      return res.status(400).json({ success: false, message: 'This reference is not a wallet deposit.' });
    }

    const userId = txData.metadata?.userId || req.user?.id;
    if (!userId) return res.status(400).json({ success: false, message: 'Could not identify user.' });

    const amountNGN = txData.amount / 100; // convert from kobo

    // Idempotency: check if this reference was already processed
    const wallet = await getOrCreateWallet(userId);
    const alreadyProcessed = wallet.transactions.some(t => t.reference === reference);
    if (alreadyProcessed) {
      return res.json({ success: true, message: 'Already processed.', data: { alreadyCredited: true } });
    }

    // Credit wallet
    const before = wallet.balance;
    wallet.balance += amountNGN;
    wallet.totalEarned += amountNGN;
    wallet.transactions.push({
      type: 'credit',
      amount: amountNGN,
      currency: 'NGN',
      description: `Wallet top-up via Paystack`,
      status: 'completed',
      balanceBefore: before,
      balanceAfter: wallet.balance,
      reference
    });
    await wallet.save();

    // Notify user
    try {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification(
        userId,
        'payment_received',
        'Wallet Top-up Successful!',
        `₦${amountNGN.toLocaleString()} has been added to your wallet.`,
        '/wallet',
        { amount: amountNGN, reference }
      );
    } catch (_) {}

    console.log(`✅ Wallet deposit verified: ₦${amountNGN} for user ${userId} — ref ${reference}`);

    res.json({
      success: true,
      message: `₦${amountNGN.toLocaleString()} added to your wallet.`,
      data: { amount: amountNGN, newBalance: wallet.balance }
    });

  } catch (err) {
    console.error('verifyDeposit error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Deposit verification failed.' });
  }
};

// ── POST /api/escrow/:id/fund-from-wallet ─────────────────────────────────────
// Called from EscrowDetailsPage PaymentChoiceModal when buyer pays from wallet balance
exports.fundEscrowFromWallet = async (req, res) => {
  try {
    const { id: escrowId } = req.params;
    const userId = req.user.id;

    const Escrow = require('../models/Escrow.model');
    const escrow = await Escrow.findById(escrowId);
    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });
    if (escrow.buyer.toString() !== userId)
      return res.status(403).json({ success: false, message: 'Only the buyer can fund this escrow' });
    if (escrow.status !== 'accepted')
      return res.status(400).json({ success: false, message: `Escrow must be accepted first (current: ${escrow.status})` });

    const amount = escrow.payment?.buyerPays
      ? parseFloat(escrow.payment.buyerPays.toString())
      : parseFloat(escrow.amount.toString());

    const wallet = await getOrCreateWallet(userId);
    if (wallet.balance < amount)
      return res.status(400).json({ success: false, message: `Insufficient wallet balance. Need ₦${amount.toLocaleString()}, available ₦${wallet.balance.toLocaleString()}` });

    // Debit wallet
    const reference = `ESCROW_FUND_${escrowId}_${Date.now()}`;
    await wallet.debit(amount, `Escrow funded: ${escrow.title}`, null, reference);

    // Update escrow to funded
    escrow.status = 'funded';
    escrow.payment = escrow.payment || {};
    escrow.payment.method = 'wallet';
    escrow.payment.reference = reference;
    escrow.payment.paidAt = new Date();
    escrow.payment.buyerPays = amount;
    escrow.timeline = escrow.timeline || [];
    escrow.timeline.push({
      status: 'funded',
      timestamp: new Date(),
      actor: userId,
      actorRole: 'buyer',
      note: 'Funded from wallet balance'
    });
    await escrow.save();

    // Notify seller
    try {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification(
        escrow.seller,
        'escrow_funded',
        'Escrow Funded!',
        `"${escrow.title}" has been funded. You can now start delivery.`,
        `/escrow/${escrowId}`,
        { escrowId }
      );
    } catch (_) {}

    res.json({ success: true, message: 'Escrow funded successfully from wallet!', data: { escrowId, amount, reference } });
  } catch (err) {
    console.error('fundEscrowFromWallet error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
