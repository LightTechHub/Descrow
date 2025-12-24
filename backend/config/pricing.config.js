// backend/config/pricing.config.js - DYNAMIC PRICING SYSTEM
const EXCHANGE_RATES = {
  USD: 1,
  NGN: 1550,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  KES: 129,
  GHS: 12,
  ZAR: 18.5,
  INR: 83
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  NGN: '₦',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  KES: 'KSh',
  GHS: 'GH₵',
  ZAR: 'R',
  INR: '₹'
};

// Base pricing in USD
const TIERS_BASE_USD = {
  free: {
    name: 'Free',
    monthlyCostUSD: 0,
    setupFeeUSD: 0,
    maxTransactionsPerMonth: 3,
    maxTransactionAmountUSD: 500,
    escrowFeePercent: 5.0, // 5%
    features: [
      '3 transactions per month',
      'Max $500 per transaction',
      'Basic support',
      'Buyer & seller protection'
    ]
  },

  starter: {
    name: 'Starter',
    monthlyCostUSD: 0,
    setupFeeUSD: 0,
    maxTransactionsPerMonth: 5,
    maxTransactionAmountUSD: 1000,
    escrowFeePercent: 3.5, // 3.5%
    features: [
      '5 transactions per month',
      'Max $1,000 per transaction',
      'Email support',
      'Lower fees than Free'
    ]
  },

  growth: {
    name: 'Growth',
    monthlyCostUSD: 5,
    setupFeeUSD: 0,
    maxTransactionsPerMonth: 50,
    maxTransactionAmountUSD: 10000,
    escrowFeePercent: 2.5, // 2.5%
    features: [
      '50 transactions per month',
      'Max $10,000 per transaction',
      'Priority support',
      'Lower fees (2.5%)',
      'Advanced analytics'
    ]
  },

  enterprise: {
    name: 'Enterprise',
    monthlyCostUSD: 15,
    setupFeeUSD: 0,
    maxTransactionsPerMonth: -1, // Unlimited
    maxTransactionAmountUSD: -1, // Unlimited
    escrowFeePercent: 1.5, // 1.5%
    features: [
      'Unlimited transactions',
      'Unlimited amounts',
      'Premium 24/7 support',
      'Lowest fees (1.5%)',
      'Dedicated account manager',
      'Custom workflows'
    ]
  },

  api: {
    name: 'API Tier',
    monthlyCostUSD: 50,
    setupFeeUSD: 80,
    maxTransactionsPerMonth: -1,
    maxTransactionAmountUSD: -1,
    escrowFeePercent: 1.0, // 1%
    features: [
      'Full API access',
      'Webhook support',
      'White-label option',
      'Unlimited transactions',
      'Lowest fees (1%)',
      'Technical support',
      'SLA guarantee',
      'Bulk operations'
    ]
  }
};

// Convert amount from USD to target currency
const convertCurrency = (amountUSD, targetCurrency) => {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return Math.round(amountUSD * rate * 100) / 100;
};

// Format currency with symbol
const formatCurrency = (amount, currency) => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
};

// Get tier pricing in user's currency
const getTierPricing = (tierName, userCurrency = 'USD') => {
  const tier = TIERS_BASE_USD[tierName];
  if (!tier) return null;

  const monthlyCost = convertCurrency(tier.monthlyCostUSD, userCurrency);
  const setupFee = convertCurrency(tier.setupFeeUSD, userCurrency);
  const maxAmount = tier.maxTransactionAmountUSD === -1 
    ? -1 
    : convertCurrency(tier.maxTransactionAmountUSD, userCurrency);

  return {
    ...tier,
    currency: userCurrency,
    monthlyCost,
    setupFee,
    maxTransactionAmount: maxAmount,
    monthlyCostFormatted: formatCurrency(monthlyCost, userCurrency),
    setupFeeFormatted: formatCurrency(setupFee, userCurrency),
    maxTransactionAmountFormatted: maxAmount === -1 
      ? 'Unlimited' 
      : formatCurrency(maxAmount, userCurrency)
  };
};

// Get all tiers in user's currency
const getAllTiersInCurrency = (userCurrency = 'USD') => {
  return Object.keys(TIERS_BASE_USD).map(key => ({
    id: key,
    ...getTierPricing(key, userCurrency)
  }));
};

// Calculate upgrade cost
const calculateUpgradeCost = (currentTier, targetTier, currency = 'USD') => {
  const target = getTierPricing(targetTier, currency);
  if (!target) return null;

  const totalDue = target.setupFee + target.monthlyCost;

  return {
    setupFee: target.setupFee,
    setupFeeFormatted: target.setupFeeFormatted,
    monthlyCost: target.monthlyCost,
    monthlyCostFormatted: target.monthlyCostFormatted,
    totalDue,
    totalDueFormatted: formatCurrency(totalDue, currency),
    currency
  };
};

module.exports = {
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
  TIERS_BASE_USD,
  convertCurrency,
  formatCurrency,
  getTierPricing,
  getAllTiersInCurrency,
  calculateUpgradeCost
};
