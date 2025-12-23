// backend/config/fee.config.js - COMPLETE DYNAMIC PRICING SYSTEM
const FeeSettings = require('../models/FeeSettings.model');

// ======================================================
//           EXCHANGE RATES (Updated regularly)
// ======================================================

const EXCHANGE_RATES = {
  // Base currency: USD
  USD: 1,
  NGN: 1550,    // Nigerian Naira
  EUR: 0.92,    // Euro
  GBP: 0.79,    // British Pound
  CAD: 1.35,    // Canadian Dollar
  AUD: 1.52,    // Australian Dollar
  KES: 129,     // Kenyan Shilling
  GHS: 12,      // Ghanaian Cedi
  ZAR: 18.5,    // South African Rand
  XOF: 605,     // West African CFA
  XAF: 605,     // Central African CFA
  INR: 83,      // Indian Rupee
  CNY: 7.2,     // Chinese Yuan
  JPY: 148,     // Japanese Yen
  BRL: 4.9,     // Brazilian Real
  MXN: 17.2     // Mexican Peso
};

// ======================================================
//           CURRENCY SYMBOLS & FORMATTING
// ======================================================

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
  XOF: 'CFA',
  XAF: 'FCFA',
  INR: '₹',
  CNY: '¥',
  JPY: '¥',
  BRL: 'R$',
  MXN: 'MX$'
};

// ======================================================
//           TIER PRICING (Base in USD)
// ======================================================

const TIERS_BASE_USD = {
  starter: {
    name: 'Starter',
    monthlyCostUSD: 0,
    setupFeeUSD: 0,
    maxTransactionAmountUSD: 500,
    maxTransactionsPerMonth: 10,
    
    fees: {
      buyer: 0.0175,   // 1.75%
      seller: 0.0175   // 1.75%
    },
    
    features: [
      'Standard processing',
      'Basic email support',
      '10 transactions per month',
      'Max $500 per transaction',
      'Buyer & seller protection',
      'Dispute resolution'
    ]
  },

  growth: {
    name: 'Growth',
    monthlyCostUSD: 5,      // $5/month
    setupFeeUSD: 0,
    maxTransactionAmountUSD: 5000,
    maxTransactionsPerMonth: 50,
    
    fees: {
      buyer: 0.015,    // 1.5%
      seller: 0.015    // 1.5%
    },
    
    features: [
      'Fast processing (24h)',
      'Priority support',
      '50 transactions per month',
      'Max $5,000 per transaction',
      'Lower fees than Starter',
      'Advanced analytics',
      'Custom notifications'
    ]
  },

  enterprise: {
    name: 'Enterprise',
    monthlyCostUSD: 15,     // $15/month
    setupFeeUSD: 0,
    maxTransactionAmountUSD: -1,  // Unlimited
    maxTransactionsPerMonth: -1,  // Unlimited
    
    fees: {
      buyer: 0.0125,   // 1.25%
      seller: 0.0125   // 1.25%
    },
    
    features: [
      'Instant processing',
      'Premium 24/7 support',
      'Unlimited transactions',
      'Unlimited transaction amounts',
      'Dedicated account manager',
      'Lowest fees',
      'Advanced reporting',
      'White-label options',
      'Custom workflows'
    ]
  },

  api: {
    name: 'API Tier',
    monthlyCostUSD: 50,      // $50/month
    setupFeeUSD: 80,         // $80 one-time
    maxTransactionAmountUSD: -1,
    maxTransactionsPerMonth: -1,
    
    fees: {
      buyer: 0.01,     // 1%
      seller: 0.01     // 1%
    },
    
    features: [
      'Full API access',
      'Webhook support',
      'White-label option',
      'Custom integration support',
      'Dedicated account manager',
      'Priority processing',
      'Bulk transaction support',
      'Complete developer docs',
      'Sandbox environment',
      'Technical support',
      'SLA guarantee'
    ]
  }
};

// ======================================================
//           GATEWAY COSTS (Base in USD)
// ======================================================

const GATEWAY_COSTS_BASE = {
  paystack: {
    percentage: 0.015,  // 1.5%
    flatFeeUSD: 0.10,
    capUSD: 2,
    transferFee: {
      smallUSD: 0.10,
      mediumUSD: 0.25,
      largeUSD: 0.50
    }
  },

  flutterwave: {
    percentage: 0.014,  // 1.4%
    flatFeeUSD: 0,
    transferFeeUSD: 0
  },

  crypto: {
    percentage: 0.005,  // 0.5%
    flatFeeUSD: 0,
    transferFeeUSD: 0
  }
};

// ======================================================
//           HELPER FUNCTIONS
// ======================================================

// Convert any amount from USD to target currency
const convertCurrency = (amountInUSD, targetCurrency) => {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return Math.round(amountInUSD * rate * 100) / 100; // Round to 2 decimals
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
    
    // Formatted strings
    monthlyCostFormatted: formatCurrency(monthlyCost, userCurrency),
    setupFeeFormatted: formatCurrency(setupFee, userCurrency),
    maxTransactionAmountFormatted: maxAmount === -1 
      ? 'Unlimited' 
      : formatCurrency(maxAmount, userCurrency),
    
    // Fee percentages
    buyerFeePercentage: (tier.fees.buyer * 100).toFixed(2) + '%',
    sellerFeePercentage: (tier.fees.seller * 100).toFixed(2) + '%',
    combinedFeePercentage: ((tier.fees.buyer + tier.fees.seller) * 100).toFixed(2) + '%'
  };
};

// Get all tiers in user's currency
const getAllTiersInCurrency = (userCurrency = 'USD') => {
  return Object.keys(TIERS_BASE_USD).map(key => ({
    id: key,
    ...getTierPricing(key, userCurrency)
  }));
};

// ======================================================
//           DATABASE INTEGRATION
// ======================================================

async function getActiveFeeSettings() {
  try {
    let settings = await FeeSettings.findOne({ isActive: true });
    if (!settings) {
      // Create default settings
      settings = await FeeSettings.create({
        isActive: true,
        tiers: TIERS_BASE_USD,
        exchangeRates: EXCHANGE_RATES,
        gatewayCosts: GATEWAY_COSTS_BASE
      });
    }
    return settings;
  } catch (error) {
    console.error('Error fetching fee settings:', error);
    return null;
  }
}

// ======================================================
//           FEE CALCULATION
// ======================================================

const calculateFees = async (amount, currency, userTier = 'starter', paymentMethod = 'flutterwave') => {
  const settings = await getActiveFeeSettings();
  
  // Get tier data (database first, fallback to constants)
  const tierData = settings && settings.tiers[userTier] 
    ? settings.tiers[userTier] 
    : TIERS_BASE_USD[userTier] || TIERS_BASE_USD.starter;
  
  const baseAmount = parseFloat(amount);
  
  // Calculate fees
  const buyerFee = baseAmount * tierData.fees.buyer;
  const sellerFee = baseAmount * tierData.fees.seller;
  const buyerPays = baseAmount + buyerFee;
  const sellerReceives = baseAmount - sellerFee;
  const totalPlatformFee = buyerFee + sellerFee;
  
  // Calculate gateway costs (convert from USD base)
  const gatewayCosts = settings ? settings.gatewayCosts : GATEWAY_COSTS_BASE;
  let gatewayCost = 0;
  let gatewayIncoming = 0;
  let gatewayOutgoing = 0;
  
  if (paymentMethod === 'paystack') {
    const costs = gatewayCosts.paystack;
    const flatFee = convertCurrency(costs.flatFeeUSD, currency);
    const cap = convertCurrency(costs.capUSD, currency);
    
    gatewayIncoming = (buyerPays * costs.percentage) + flatFee;
    if (cap && gatewayIncoming > cap) {
      gatewayIncoming = cap;
    }
    
    // Transfer fees
    const smallLimit = convertCurrency(50, currency);
    const mediumLimit = convertCurrency(500, currency);
    
    if (sellerReceives <= smallLimit) {
      gatewayOutgoing = convertCurrency(costs.transferFee.smallUSD, currency);
    } else if (sellerReceives <= mediumLimit) {
      gatewayOutgoing = convertCurrency(costs.transferFee.mediumUSD, currency);
    } else {
      gatewayOutgoing = convertCurrency(costs.transferFee.largeUSD, currency);
    }
    
    gatewayCost = gatewayIncoming + gatewayOutgoing;
    
  } else if (paymentMethod === 'flutterwave') {
    const costs = gatewayCosts.flutterwave;
    gatewayIncoming = buyerPays * costs.percentage;
    gatewayOutgoing = convertCurrency(costs.transferFeeUSD, currency);
    gatewayCost = gatewayIncoming + gatewayOutgoing;
    
  } else if (paymentMethod === 'crypto') {
    const costs = gatewayCosts.crypto;
    gatewayIncoming = buyerPays * costs.percentage;
    gatewayOutgoing = 0;
    gatewayCost = gatewayIncoming;
  }
  
  const platformProfit = totalPlatformFee - gatewayCost;
  const profitPercentage = (platformProfit / baseAmount) * 100;
  
  return {
    amount: parseFloat(baseAmount.toFixed(2)),
    currency,
    buyerFee: parseFloat(buyerFee.toFixed(2)),
    sellerFee: parseFloat(sellerFee.toFixed(2)),
    buyerPays: parseFloat(buyerPays.toFixed(2)),
    sellerReceives: parseFloat(sellerReceives.toFixed(2)),
    buyerFeePercentage: parseFloat((tierData.fees.buyer * 100).toFixed(2)),
    sellerFeePercentage: parseFloat((tierData.fees.seller * 100).toFixed(2)),
    totalFeePercentage: parseFloat(((tierData.fees.buyer + tierData.fees.seller) * 100).toFixed(2)),
    
    // Formatted
    buyerPaysFormatted: formatCurrency(buyerPays, currency),
    sellerReceivesFormatted: formatCurrency(sellerReceives, currency),
    buyerFeeFormatted: formatCurrency(buyerFee, currency),
    sellerFeeFormatted: formatCurrency(sellerFee, currency),
    
    // Gateway costs
    gatewayIncoming: parseFloat(gatewayIncoming.toFixed(2)),
    gatewayOutgoing: parseFloat(gatewayOutgoing.toFixed(2)),
    totalGatewayCost: parseFloat(gatewayCost.toFixed(2)),
    
    // Platform profit
    platformProfit: parseFloat(platformProfit.toFixed(2)),
    profitPercentage: parseFloat(profitPercentage.toFixed(2)),
    
    tier: userTier,
    paymentMethod,
    
    breakdown: {
      buyerFeeDescription: `${(tierData.fees.buyer * 100).toFixed(2)}% escrow protection fee`,
      sellerFeeDescription: `${(tierData.fees.seller * 100).toFixed(2)}% platform service fee`,
      totalFeeDescription: `${((tierData.fees.buyer + tierData.fees.seller) * 100).toFixed(2)}% combined - covers ALL costs`,
      note: 'Both buyer and seller equally protected. No hidden fees.'
    }
  };
};

// ======================================================
//           UPGRADE BENEFITS
// ======================================================

const getUpgradeBenefits = async (currentTier, targetTier, userCurrency = 'USD') => {
  const current = getTierPricing(currentTier, userCurrency);
  const target = getTierPricing(targetTier, userCurrency);

  if (!current || !target) return null;

  const monthlyCostDiff = target.monthlyCost - current.monthlyCost;
  const setupFeeDiff = target.setupFee - current.setupFee;
  
  const buyerFeeReduction = ((current.fees.buyer - target.fees.buyer) * 100).toFixed(2);
  const sellerFeeReduction = ((current.fees.seller - target.fees.seller) * 100).toFixed(2);

  return {
    currentTier: current.name,
    targetTier: target.name,
    currency: userCurrency,
    
    costs: {
      monthlyCostDifference: monthlyCostDiff,
      monthlyCostDifferenceFormatted: formatCurrency(monthlyCostDiff, userCurrency),
      setupFeeDifference: setupFeeDiff,
      setupFeeDifferenceFormatted: formatCurrency(setupFeeDiff, userCurrency),
      totalFirstPayment: monthlyCostDiff + setupFeeDiff,
      totalFirstPaymentFormatted: formatCurrency(monthlyCostDiff + setupFeeDiff, userCurrency)
    },
    
    savings: {
      buyerFeeReduction: `${buyerFeeReduction}%`,
      sellerFeeReduction: `${sellerFeeReduction}%`,
      combinedReduction: `${((parseFloat(buyerFeeReduction) + parseFloat(sellerFeeReduction)) / 2).toFixed(2)}%`
    },
    
    newFeatures: target.features.filter(f => !current.features.includes(f)),
    
    limits: {
      current: {
        transactionsPerMonth: current.maxTransactionsPerMonth === -1 ? 'Unlimited' : current.maxTransactionsPerMonth,
        maxAmount: current.maxTransactionAmountFormatted
      },
      target: {
        transactionsPerMonth: target.maxTransactionsPerMonth === -1 ? 'Unlimited' : target.maxTransactionsPerMonth,
        maxAmount: target.maxTransactionAmountFormatted
      }
    }
  };
};

// ======================================================
//           CALCULATE MONTHLY SAVINGS
// ======================================================

const calculateMonthlySavings = async (monthlyVolume, currency, currentTier, targetTier) => {
  const currentFees = await calculateFees(monthlyVolume, currency, currentTier);
  const targetFees = await calculateFees(monthlyVolume, currency, targetTier);

  const currentTotal = currentFees.totalPlatformFee;
  const targetTotal = targetFees.totalPlatformFee;
  const grossSavings = currentTotal - targetTotal;

  const targetTierInfo = getTierPricing(targetTier, currency);
  const subscriptionCost = targetTierInfo.monthlyCost;
  const netSavings = grossSavings - subscriptionCost;

  return {
    currency,
    currentFees: currentTotal,
    targetFees: targetTotal,
    grossSavings: parseFloat(grossSavings.toFixed(2)),
    grossSavingsFormatted: formatCurrency(grossSavings, currency),
    subscriptionCost,
    subscriptionCostFormatted: formatCurrency(subscriptionCost, currency),
    netSavings: parseFloat(netSavings.toFixed(2)),
    netSavingsFormatted: formatCurrency(netSavings, currency),
    worthUpgrading: netSavings > 0,
    breakEvenVolume: subscriptionCost / (currentFees.totalFeePercentage - targetFees.totalFeePercentage) * 100,
    recommendation: netSavings > 0 
      ? `Save ${formatCurrency(netSavings, currency)} per month!`
      : `Need ${formatCurrency(Math.abs(netSavings), currency)} more volume to break even`
  };
};

// ======================================================
//           MAIN EXPORTS
// ======================================================

module.exports = {
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
  TIERS_BASE_USD,
  GATEWAY_COSTS_BASE,
  
  // Functions
  convertCurrency,
  formatCurrency,
  getTierPricing,
  getAllTiersInCurrency,
  calculateFees,
  getUpgradeBenefits,
  calculateMonthlySavings,
  getActiveFeeSettings,
  
  // Simple calculator for frontend
  calculateSimpleFees: async (amount, currency) => {
    return await calculateFees(amount, currency, 'starter', 'flutterwave');
  },
  
  // Check if amount within tier limit
  isAmountWithinLimit: async (amount, currency, tierName) => {
    const tierInfo = getTierPricing(tierName, currency);
    if (!tierInfo) return false;
    if (tierInfo.maxTransactionAmount === -1) return true;
    return amount <= tierInfo.maxTransactionAmount;
  },
  
  // Get fee explanation
  getFeeExplanation: (currency, tierName = 'starter') => {
    const tier = getTierPricing(tierName, currency);
    if (!tier) return null;
    
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const exampleAmount = currency === 'NGN' ? 10000 : 100;
    const buyerFee = (exampleAmount * tier.fees.buyer).toFixed(2);
    const sellerFee = (exampleAmount * tier.fees.seller).toFixed(2);
    const buyerPays = (exampleAmount * (1 + tier.fees.buyer)).toFixed(2);
    const sellerReceives = (exampleAmount * (1 - tier.fees.seller)).toFixed(2);
    
    return {
      tier: tier.name,
      buyer: {
        percentage: tier.buyerFeePercentage,
        description: 'Escrow Protection Fee',
        details: 'Your payment is held securely until you confirm delivery.',
        example: `For a ${symbol}${exampleAmount} item, you pay ${symbol}${buyerFee} extra (${symbol}${buyerPays} total)`
      },
      seller: {
        percentage: tier.sellerFeePercentage,
        description: 'Platform Service Fee',
        details: 'Covers secure processing, instant payouts, and fraud protection.',
        example: `For a ${symbol}${exampleAmount} sale, you receive ${symbol}${sellerReceives}`
      },
      combined: {
        total: tier.combinedFeePercentage,
        description: 'Fair & Transparent Pricing',
        details: 'No hidden fees. Covers all costs including gateway fees and support.'
      }
    };
  }
};