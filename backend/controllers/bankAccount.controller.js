// backend/controllers/bankAccount.controller.js
const BankAccount = require('../models/BankAccount.model');
const User = require('../models/User.model');
const Escrow = require('../models/Escrow.model');
const axios = require('axios');

// ── Live bank list from Paystack (cached 24hrs) ───────────────────────────────
let banksCache = { data: null, fetchedAt: null };
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchNigerianBanks() {
  const now = Date.now();
  if (banksCache.data && banksCache.fetchedAt && (now - banksCache.fetchedAt) < CACHE_TTL_MS) {
    return banksCache.data;
  }
  try {
    const response = await axios.get(
      'https://api.paystack.co/bank?country=nigeria&use_cursor=false&perPage=100',
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    if (response.data.status && response.data.data) {
      const banks = response.data.data.map(b => ({ name: b.name, code: b.code }));
      banksCache = { data: banks, fetchedAt: now };
      console.log(`Fetched ${banks.length} banks from Paystack`);
      return banks;
    }
  } catch (e) {
    console.error('Failed to fetch banks from Paystack:', e.message);
  }
  // Fallback hardcoded list (active Nigerian banks only)
  return [
    { name: 'Access Bank', code: '044' },
    { name: 'Ecobank Nigeria', code: '050' },
    { name: 'Fidelity Bank Nigeria', code: '070' },
    { name: 'First Bank of Nigeria', code: '011' },
    { name: 'First City Monument Bank', code: '214' },
    { name: 'Guaranty Trust Bank', code: '058' },
    { name: 'Jaiz Bank', code: '301' },
    { name: 'Keystone Bank Limited', code: '082' },
    { name: 'Polaris Bank', code: '076' },
    { name: 'Stanbic IBTC Bank Nigeria Limited', code: '221' },
    { name: 'Standard Chartered Bank', code: '068' },
    { name: 'Sterling Bank', code: '232' },
    { name: 'Union Bank of Nigeria', code: '032' },
    { name: 'United Bank for Africa', code: '033' },
    { name: 'Unity Bank Plc', code: '215' },
    { name: 'Wema Bank', code: '035' },
    { name: 'Zenith Bank', code: '057' },
    { name: 'Opay', code: '999992' },
    { name: 'Palmpay', code: '999991' },
    { name: 'Kuda Microfinance Bank', code: '090267' },
    { name: 'Moniepoint Microfinance Bank', code: '090405' },
    { name: 'VFD Microfinance Bank', code: '090110' },
  ];
}

// International banks template (for Flutterwave)
const INTERNATIONAL_BANKS = [
  { name: 'Bank of America', code: 'BOFAUS3N', country: 'US', currency: 'USD' },
  { name: 'Chase Bank', code: 'CHASUS33', country: 'US', currency: 'USD' },
  { name: 'Wells Fargo', code: 'WFBIUS6S', country: 'US', currency: 'USD' },
  { name: 'HSBC UK', code: 'MIDLGB22', country: 'GB', currency: 'GBP' },
  { name: 'Barclays Bank', code: 'BARCGB22', country: 'GB', currency: 'GBP' },
  { name: 'Deutsche Bank', code: 'DEUTDEFF', country: 'DE', currency: 'EUR' },
  { name: 'BNP Paribas', code: 'BNPAFRPP', country: 'FR', currency: 'EUR' },
];

// ── Bank account verification helper ─────────────────────────────────────────
async function verifyBankAccountHelper(accountData) {
  const { accountNumber, bankCode, currency, bankName } = accountData;
  try {
    if (currency === 'NGN') {
      const response = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      if (response.data.status) {
        return {
          success: true,
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number,
          provider: 'paystack',
          verifiedAt: new Date(),
        };
      }
      return { success: false, message: response.data.message || 'Verification failed' };
    }

    if (['USD', 'EUR', 'GBP'].includes(currency)) {
      return {
        success: true,
        accountName: accountData.accountName,
        accountNumber,
        provider: 'flutterwave',
        verifiedAt: new Date(),
        note: 'Account will be verified during first transfer',
      };
    }

    return { success: false, message: `Verification not available for ${currency} accounts` };
  } catch (error) {
    console.error('Bank verification error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Account verification failed',
      provider: currency === 'NGN' ? 'paystack' : 'flutterwave',
    };
  }
}

// ── Paystack transfer helper ──────────────────────────────────────────────────
async function initiatePaystackTransfer(bankAccount, amount, reference) {
  try {
    const recipientResponse = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: 'nuban',
        name: bankAccount.accountName,
        account_number: bankAccount.accountNumber,
        bank_code: bankAccount.bankCode,
        currency: 'NGN',
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );
    if (!recipientResponse.data.status) throw new Error('Failed to create transfer recipient');
    const recipientCode = recipientResponse.data.data.recipient_code;

    const transferResponse = await axios.post(
      'https://api.paystack.co/transfer',
      { source: 'balance', amount: Math.round(amount * 100), recipient: recipientCode, reason: `Payout for escrow ${reference}` },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );
    if (!transferResponse.data.status) throw new Error('Transfer initiation failed');
    return { success: true, transfer_code: transferResponse.data.data.transfer_code, reference: transferResponse.data.data.reference };
  } catch (error) {
    console.error('Paystack transfer error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Transfer failed' };
  }
}

// ── Flutterwave transfer helper ───────────────────────────────────────────────
async function initiateFlutterwaveTransfer(bankAccount, amount, reference) {
  try {
    const transferResponse = await axios.post(
      'https://api.flutterwave.com/v3/transfers',
      {
        account_bank: bankAccount.bankCode,
        account_number: bankAccount.accountNumber,
        amount,
        narration: `Payout for escrow ${reference}`,
        currency: bankAccount.currency,
        reference: `ESCROW_${reference}_${Date.now()}`,
        beneficiary_name: bankAccount.accountName,
      },
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );
    if (transferResponse.data.status !== 'success') throw new Error('Transfer initiation failed');
    return { success: true, transfer_code: transferResponse.data.data.id, reference: transferResponse.data.data.reference };
  } catch (error) {
    console.error('Flutterwave transfer error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'International transfer failed' };
  }
}

// ── CONTROLLER METHODS ────────────────────────────────────────────────────────

exports.getBanks = async (req, res) => {
  try {
    const { currency, country } = req.query;

    if (currency === 'NGN') {
      const banks = await fetchNigerianBanks();
      return res.json({ success: true, data: { banks, provider: 'paystack', verification: 'automatic' } });
    }

    if (['USD', 'EUR', 'GBP'].includes(currency)) {
      const filtered = INTERNATIONAL_BANKS.filter(b => b.currency === currency && (!country || b.country === country));
      return res.json({
        success: true,
        data: { banks: filtered, provider: 'flutterwave', verification: 'manual', requiredFields: ['accountNumber', 'accountName', 'swiftCode'] },
      });
    }

    res.json({ success: true, data: { banks: [], provider: 'manual', verification: 'manual' }, message: 'Contact support for bank account setup in this currency' });
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banks' });
  }
};

exports.addBankAccount = async (req, res) => {
  try {
    const { accountNumber, bankCode, bankName, currency, accountType, swiftCode, iban, routingNumber, accountName: manualAccountName } = req.body;

    if (!accountNumber || !bankCode || !bankName || !currency)
      return res.status(400).json({ success: false, message: 'Account number, bank code, bank name, and currency are required' });

    if (['USD', 'EUR', 'GBP'].includes(currency)) {
      if (!swiftCode) return res.status(400).json({ success: false, message: 'SWIFT/BIC code is required for international accounts' });
      if (!manualAccountName) return res.status(400).json({ success: false, message: 'Account name is required for international accounts' });
    }

    const user = await User.findById(req.user._id);
    if (!user.kycStatus || user.kycStatus.status !== 'approved')
      return res.status(403).json({ success: false, message: 'KYC verification required to add bank accounts', action: 'complete_kyc', kycRequired: true });

    const verificationResult = await verifyBankAccountHelper({ accountNumber, bankCode, currency, bankName, accountName: manualAccountName });
    if (!verificationResult.success)
      return res.status(400).json({ success: false, message: verificationResult.message || 'Could not verify bank account', provider: verificationResult.provider });

    const accountName = verificationResult.accountName || manualAccountName;

    const existingAccount = await BankAccount.findOne({ user: req.user._id, accountNumber, bankCode, currency });
    if (existingAccount) return res.status(400).json({ success: false, message: 'This bank account is already linked to your account' });

    const userAccountsCount = await BankAccount.countDocuments({ user: req.user._id });
    if (userAccountsCount >= 5) return res.status(400).json({ success: false, message: 'Maximum of 5 bank accounts allowed per user' });

    const bankAccount = new BankAccount({
      user: req.user._id, accountName, accountNumber, bankName, bankCode,
      currency: currency || 'NGN', accountType: accountType || 'personal',
      swiftCode, iban, routingNumber, isVerified: true,
      isPrimary: userAccountsCount === 0,
      verificationData: { verifiedAt: verificationResult.verifiedAt || new Date(), verificationMethod: verificationResult.provider, verificationResponse: { accountName } },
      provider: currency === 'NGN' ? 'paystack' : 'flutterwave',
    });

    await bankAccount.save();
    await User.findByIdAndUpdate(req.user._id, { hasBankAccount: true, $inc: { 'stats.bankAccountsCount': 1 } });

    res.status(201).json({ success: true, message: 'Bank account added and verified successfully', data: { bankAccount, verification: { isVerified: true, provider: bankAccount.provider } } });
  } catch (error) {
    console.error('Add bank account error:', error);
    res.status(500).json({ success: false, message: 'Failed to add bank account' });
  }
};

exports.getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ user: req.user._id }).sort({ isPrimary: -1, createdAt: -1 });
    const user = await User.findById(req.user._id);
    const kycVerified = user.kycStatus?.status === 'approved';
    res.json({ success: true, data: { accounts, kycVerified, canAddAccounts: kycVerified, limits: { maxAccounts: 5, currentCount: accounts.length } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bank accounts' });
  }
};

exports.setPrimaryAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOne({ _id: req.params.accountId, user: req.user._id });
    if (!account) return res.status(404).json({ success: false, message: 'Bank account not found' });
    if (!account.isVerified) return res.status(400).json({ success: false, message: 'Only verified accounts can be set as primary' });
    account.isPrimary = true;
    await account.save();
    res.json({ success: true, message: 'Primary account updated', data: { account } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to set primary account' });
  }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOne({ _id: req.params.accountId, user: req.user._id });
    if (!account) return res.status(404).json({ success: false, message: 'Bank account not found' });

    const activeEscrows = await Escrow.countDocuments({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
      status: { $in: ['accepted', 'funded', 'delivered'] },
    });
    const totalAccounts = await BankAccount.countDocuments({ user: req.user._id });
    if (activeEscrows > 0 && totalAccounts === 1)
      return res.status(400).json({ success: false, message: 'Cannot delete your only bank account while you have active escrows' });

    const wasPrimary = account.isPrimary;
    await account.deleteOne();

    if (wasPrimary) {
      const next = await BankAccount.findOne({ user: req.user._id, isVerified: true }).sort({ createdAt: 1 });
      if (next) { next.isPrimary = true; await next.save(); }
    }
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.bankAccountsCount': -1 } });
    res.json({ success: true, message: 'Bank account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete bank account' });
  }
};

exports.validateBankAccount = async (req, res) => {
  try {
    const { accountNumber, bankCode, currency } = req.body;
    const result = await verifyBankAccountHelper({ accountNumber, bankCode, currency, bankName: '' });
    if (!result.success) return res.status(400).json({ success: false, message: result.message, valid: false });
    res.json({ success: true, data: { valid: true, accountName: result.accountName, provider: result.provider } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to validate bank account' });
  }
};

exports.verifyBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOne({ _id: req.params.accountId, user: req.user._id });
    if (!account) return res.status(404).json({ success: false, message: 'Bank account not found' });
    if (account.isVerified) return res.status(400).json({ success: false, message: 'Bank account is already verified' });

    const result = await verifyBankAccountHelper({ accountNumber: account.accountNumber, bankCode: account.bankCode, currency: account.currency, bankName: account.bankName, accountName: account.accountName });
    if (!result.success) return res.status(400).json({ success: false, message: result.message || 'Verification failed' });

    account.isVerified = true;
    account.verificationData = { verifiedAt: new Date(), verificationMethod: result.provider, verificationResponse: { accountName: result.accountName } };
    await account.save();
    res.json({ success: true, message: 'Bank account verified successfully', data: { account } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify bank account' });
  }
};

exports.initiatePayout = async (req, res) => {
  try {
    const { escrowId, accountId } = req.body;
    const escrow = await Escrow.findById(escrowId).populate('seller buyer');
    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });
    if (escrow.seller._id.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Only seller can request payout' });
    if (escrow.status !== 'completed') return res.status(400).json({ success: false, message: 'Payout only available for completed escrows' });
    if (escrow.payout?.paidOut) return res.status(400).json({ success: false, message: 'Payout already processed' });

    const bankAccount = accountId
      ? await BankAccount.findOne({ _id: accountId, user: req.user._id })
      : await BankAccount.findOne({ user: req.user._id, isPrimary: true, currency: escrow.currency });

    if (!bankAccount) return res.status(404).json({ success: false, message: `No ${escrow.currency} bank account found. Please add one first.`, action: 'add_bank_account', requiredCurrency: escrow.currency });
    if (!bankAccount.isVerified) return res.status(400).json({ success: false, message: 'Bank account not verified' });
    if (bankAccount.currency !== escrow.currency) return res.status(400).json({ success: false, message: `Escrow currency (${escrow.currency}) does not match bank account currency (${bankAccount.currency})` });

    const payoutResult = bankAccount.currency === 'NGN'
      ? await initiatePaystackTransfer(bankAccount, escrow.payment?.sellerReceives || escrow.amount, escrow.escrowId || escrow._id)
      : await initiateFlutterwaveTransfer(bankAccount, escrow.payment?.sellerReceives || escrow.amount, escrow.escrowId || escrow._id);

    if (!payoutResult.success) return res.status(400).json({ success: false, message: payoutResult.message || 'Payout failed' });

    escrow.payout = {
      accountId: bankAccount._id, accountNumber: bankAccount.accountNumber, bankName: bankAccount.bankName,
      currency: bankAccount.currency, amount: escrow.payment?.sellerReceives || escrow.amount,
      provider: bankAccount.provider, transferCode: payoutResult.transfer_code,
      reference: payoutResult.reference, paidOut: true, paidOutAt: new Date(),
    };
    await escrow.save();

    res.json({ success: true, message: 'Payout initiated successfully', data: { transferCode: payoutResult.transfer_code, amount: escrow.payment?.sellerReceives, currency: bankAccount.currency, accountNumber: bankAccount.accountNumber, bankName: bankAccount.bankName, estimatedDelivery: '1-3 business days' } });
  } catch (error) {
    console.error('Initiate payout error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payout' });
  }
};

exports.getPayoutMethods = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const accounts = await BankAccount.find({ user: req.user._id, isVerified: true });
    const byCurrency = (cur) => accounts.filter(a => a.currency === cur);
    res.json({ success: true, data: {
      methods: {
        ngn: { available: byCurrency('NGN').length > 0, provider: 'paystack', accounts: byCurrency('NGN') },
        usd: { available: byCurrency('USD').length > 0, provider: 'flutterwave', accounts: byCurrency('USD') },
        eur: { available: byCurrency('EUR').length > 0, provider: 'flutterwave', accounts: byCurrency('EUR') },
        gbp: { available: byCurrency('GBP').length > 0, provider: 'flutterwave', accounts: byCurrency('GBP') },
      },
      kycVerified: user.kycStatus?.status === 'approved',
      canReceivePayouts: user.kycStatus?.status === 'approved' && accounts.length > 0,
    }});
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payout methods' });
  }
};

exports.getPayoutHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, currency } = req.query;
    const skip = (page - 1) * limit;
    let query = { $or: [{ buyer: req.user._id }, { seller: req.user._id }], 'payout.paidOut': true };
    if (currency) query.currency = currency;
    const [payouts, total] = await Promise.all([
      Escrow.find(query).populate('buyer seller', 'name email').sort({ 'payout.paidOutAt': -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Escrow.countDocuments(query),
    ]);
    res.json({ success: true, data: { payouts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payout history' });
  }
};

exports.getSupportedCurrencies = async (req, res) => {
  res.json({ success: true, data: { currencies: [
    { code: 'NGN', name: 'Nigerian Naira', provider: 'paystack', verification: 'automatic' },
    { code: 'USD', name: 'US Dollar', provider: 'flutterwave', verification: 'manual' },
    { code: 'EUR', name: 'Euro', provider: 'flutterwave', verification: 'manual' },
    { code: 'GBP', name: 'British Pound', provider: 'flutterwave', verification: 'manual' },
  ]}});
};

exports.getAccountStats = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ user: req.user._id });
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: { stats: {
      totalAccounts: accounts.length,
      verifiedAccounts: accounts.filter(a => a.isVerified).length,
      primaryAccount: accounts.find(a => a.isPrimary),
      canReceivePayouts: user.kycStatus?.status === 'approved' && accounts.some(a => a.isVerified),
    }}});
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch account statistics' });
  }
};

exports.getAccountLimits = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const count = await BankAccount.countDocuments({ user: req.user._id });
    res.json({ success: true, data: { limits: { maxAccounts: 5, currentAccounts: count, canAddMore: count < 5, kycRequired: user.kycStatus?.status !== 'approved', remainingAccounts: Math.max(0, 5 - count) } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch account limits' });
  }
};

exports.paystackWebhook = async (req, res) => {
  try {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.status(401).json({ success: false, message: 'Invalid signature' });
    console.log('Paystack webhook:', req.body.event);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

exports.flutterwaveWebhook = async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    if (!secretHash || req.headers['verif-hash'] !== secretHash) return res.status(401).json({ success: false, message: 'Invalid signature' });
    console.log('Flutterwave webhook:', req.body.event);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

// Stubs for admin/unused endpoints
exports.adminVerifyBankAccount = async (req, res) => res.status(501).json({ success: false, message: 'Not implemented' });
exports.adminUpdateAccountStatus = async (req, res) => res.status(501).json({ success: false, message: 'Not implemented' });
exports.adminGetBankAccounts = async (req, res) => res.status(501).json({ success: false, message: 'Not implemented' });
exports.getBankAccount = async (req, res) => res.status(501).json({ success: false, message: 'Not implemented' });
exports.updateBankAccount = async (req, res) => res.status(501).json({ success: false, message: 'Not implemented' });
exports.cancelPayout = async (req, res) => res.status(501).json({ success: false, message: 'Not implemented' });
exports.getPayoutDetails = async (req, res) => res.status(501).json({ success: false, message: 'Not implemented' });

module.exports = exports;