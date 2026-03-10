// src/pages/Subscription/UpgradePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Zap, TrendingUp, Crown, Code,
  Check, X, Loader, ArrowRight, AlertCircle,
  ChevronDown, ChevronUp, HelpCircle, Star,
  Globe, Lock, Headphones, BarChart2, Repeat, Layers
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'NGN', symbol: '₦', label: 'NGN' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'KES', symbol: 'KSh', label: 'KES' },
  { code: 'GHS', symbol: 'GH₵', label: 'GHS' },
];

const TIER_META = {
  starter:    { icon: Shield,    color: 'slate',   badge: null,          description: 'Perfect for individuals getting started with escrow' },
  growth:     { icon: TrendingUp, color: 'blue',   badge: 'Popular',     description: 'For growing businesses with regular transactions' },
  enterprise: { icon: Crown,     color: 'purple',  badge: 'Best Value',  description: 'Unlimited power for high-volume operations' },
  api:        { icon: Code,      color: 'indigo',  badge: 'Developer',   description: 'Full API access for custom integrations & platforms' },
};

const COLOR_MAP = {
  slate:  { ring: 'ring-slate-400',  bg: 'bg-slate-600',   text: 'text-slate-600',   badge: 'bg-slate-100 text-slate-700',   btn: 'bg-slate-700 hover:bg-slate-800',   light: 'bg-slate-50 dark:bg-slate-900/20' },
  blue:   { ring: 'ring-blue-500',   bg: 'bg-blue-600',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700',     btn: 'bg-blue-600 hover:bg-blue-700',     light: 'bg-blue-50 dark:bg-blue-900/20' },
  purple: { ring: 'ring-purple-500', bg: 'bg-purple-600',  text: 'text-purple-600',  badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', light: 'bg-purple-50 dark:bg-purple-900/20' },
  indigo: { ring: 'ring-indigo-500', bg: 'bg-indigo-600',  text: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700', light: 'bg-indigo-50 dark:bg-indigo-900/20' },
};

const COMPARISON_FEATURES = [
  { label: 'Transactions / month',    key: 'maxTransactionsPerMonth',  format: v => v === -1 ? 'Unlimited' : v },
  { label: 'Max transaction amount',  key: 'maxTransactionAmountFormatted' },
  { label: 'Escrow fee (buyer)',       key: 'buyerFeePercentage' },
  { label: 'Escrow fee (seller)',      key: 'sellerFeePercentage' },
  { label: 'Dispute resolution',      key: 'disputeResolution',        format: v => v ? '✓' : '—' },
  { label: 'Priority support',        key: 'prioritySupport',          format: v => v ? '✓' : '—' },
  { label: 'API access',              key: 'apiAccess',                format: v => v ? '✓' : '—' },
  { label: 'Multi-party escrow',      key: 'multiPartyEscrow',         format: v => v ? '✓' : '—' },
  { label: 'Milestone payments',      key: 'milestonePayments',        format: v => v ? '✓' : '—' },
  { label: 'White-label options',     key: 'customBranding',           format: v => v ? '✓' : '—' },
];

const FAQ = [
  { q: 'Can I switch plans later?', a: 'You can upgrade at any time. Downgrades take effect at the end of your billing cycle.' },
  { q: 'Is KYC required for all plans?', a: 'KYC is required for Growth, Enterprise, and API tiers to comply with financial regulations.' },
  { q: 'What payment methods do you accept?', a: 'We accept card payments via Paystack, including Visa, Mastercard, and Verve (NGN).' },
  { q: 'Are there hidden fees?', a: 'No. Our fee structure is fully transparent — you only pay the escrow fee per transaction and the monthly subscription if applicable.' },
  { q: 'What happens if I cancel?', a: 'You keep full access until your billing period ends. No refunds are issued for partial months.' },
  { q: 'Do API tier keys auto-generate?', a: 'Yes — API credentials are automatically generated and shown once after payment. Save them securely.' },
];

// ── Main Component ────────────────────────────────────────────────────────────
const UpgradePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(true);
  const [upgrading, setUpgrading]     = useState(false);
  const [tiers, setTiers]             = useState([]);
  const [currentTier, setCurrentTier] = useState('starter');
  const [selectedTier, setSelectedTier] = useState(null);
  const [upgradeCost, setUpgradeCost] = useState(null);
  const [currency, setCurrency]       = useState('USD');
  const [showComparison, setShowComparison] = useState(false);
  const [openFaq, setOpenFaq]         = useState(null);
  const [calcVolume, setCalcVolume]   = useState('');
  const [savings, setSavings]         = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTiers(); }, [currency]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/subscription/tiers?currency=${currency}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTiers(res.data.data.tiers);
        setCurrentTier(res.data.data.currentTier);
      }
    } catch (err) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTier = async (tier) => {
    const tierOrder = ['free', 'starter', 'growth', 'enterprise', 'api'];
    if (tier.id === currentTier) { toast.info('This is your current plan'); return; }
    if (tierOrder.indexOf(tier.id) <= tierOrder.indexOf(currentTier)) {
      toast.error('Downgrades are not available');
      return;
    }
    setSelectedTier(tier);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/subscription/calculate-upgrade`,
        { targetTier: tier.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) setUpgradeCost(res.data.data.cost);
    } catch {
      toast.error('Failed to calculate cost');
    }
  };

  const handleUpgrade = async () => {
    if (!selectedTier) return;
    try {
      setUpgrading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/subscription/upgrade`,
        { targetTier: selectedTier.id, paymentMethod: 'paystack' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        const { paymentUrl } = res.data.data;
        if (paymentUrl) {
          toast.success('Redirecting to payment...');
          window.location.href = paymentUrl;
        } else {
          toast.success(res.data.message);
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate upgrade';
      toast.error(msg);
      if (err.response?.data?.action === 'complete_kyc') {
        setTimeout(() => navigate('/kyc-verification'), 2000);
      }
    } finally {
      setUpgrading(false);
    }
  };

  const calculateSavings = async () => {
    if (!calcVolume || !selectedTier) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/subscription/savings`,
        { monthlyVolume: parseFloat(calcVolume), currency, targetTier: selectedTier.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) setSavings(res.data.data);
    } catch {
      // silently fail — savings calc is optional
    }
  };

  const tierOrder = ['free', 'starter', 'growth', 'enterprise', 'api'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Hero ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full uppercase tracking-wider mb-4">
            Pricing
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-8">
            No hidden fees. Pay only for what you use. Upgrade or cancel anytime.
          </p>

          {/* Currency switcher */}
          <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  currency === c.code
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Current plan: <span className="font-semibold capitalize text-gray-600 dark:text-gray-300">{currentTier}</span>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* ── Tier Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {tiers.map((tier) => {
            const meta   = TIER_META[tier.id] || TIER_META.starter;
            const colors = COLOR_MAP[meta.color];
            const Icon   = meta.icon;
            const isCurrentTier = tier.id === currentTier;
            const isSelected    = selectedTier?.id === tier.id;
            const canUpgrade    = tierOrder.indexOf(tier.id) > tierOrder.indexOf(currentTier);
            const isPopular     = meta.badge === 'Popular';

            return (
              <div
                key={tier.id}
                onClick={() => handleSelectTier(tier)}
                className={`relative bg-white dark:bg-gray-900 rounded-2xl border-2 p-6 flex flex-col transition-all duration-200 ${
                  isSelected
                    ? `${colors.ring} ring-2 shadow-xl scale-[1.02]`
                    : isCurrentTier
                    ? 'border-gray-300 dark:border-gray-700'
                    : canUpgrade
                    ? 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer hover:shadow-lg'
                    : 'border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Badge */}
                {meta.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold rounded-full ${colors.badge}`}>
                    {meta.badge}
                  </span>
                )}
                {isCurrentTier && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700">
                    Current Plan
                  </span>
                )}

                {/* Icon */}
                <div className={`w-11 h-11 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Name & desc */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{tier.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{meta.description}</p>

                {/* Price */}
                <div className="mb-5">
                  {tier.monthlyCost === 0 ? (
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white">Free</p>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{tier.monthlyCostFormatted}</p>
                        <p className="text-sm text-gray-500 mb-1">/mo</p>
                      </div>
                      {tier.setupFee > 0 && (
                        <p className="text-xs text-gray-500 mt-1">+ {tier.setupFeeFormatted} one-time setup</p>
                      )}
                    </>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{tier.buyerFeePercentage} escrow fee</p>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features?.slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 ${colors.text} flex-shrink-0 mt-0.5`} />
                      <span className="text-gray-600 dark:text-gray-400">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrentTier ? (
                  <div className="w-full py-2.5 text-center bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-semibold text-gray-500">
                    Current Plan
                  </div>
                ) : canUpgrade ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSelectTier(tier); }}
                    className={`w-full py-2.5 ${colors.btn} text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2`}
                  >
                    Select Plan <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-full py-2.5 text-center bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-semibold text-gray-400">
                    Not Available
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Upgrade Summary Modal ── */}
        {selectedTier && upgradeCost && (
          <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Summary</h2>
              <button onClick={() => { setSelectedTier(null); setUpgradeCost(null); setSavings(null); }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Line items */}
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Upgrading from</span>
                <span className="font-medium capitalize text-gray-900 dark:text-white">{currentTier}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Upgrading to</span>
                <span className="font-semibold text-gray-900 dark:text-white">{selectedTier.name}</span>
              </div>
              {upgradeCost.monthlyCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Monthly subscription</span>
                  <span className="text-gray-900 dark:text-white">{upgradeCost.monthlyCostFormatted}</span>
                </div>
              )}
              {upgradeCost.setupFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">One-time setup fee</span>
                  <span className="text-gray-900 dark:text-white">{upgradeCost.setupFeeFormatted}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                <span className="font-bold text-gray-900 dark:text-white">Total due today</span>
                <span className="text-2xl font-extrabold text-blue-600">{upgradeCost.totalDueFormatted}</span>
              </div>
            </div>

            {/* Savings calculator */}
            {upgradeCost.totalDue > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Savings Calculator</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={`Monthly volume (${currency})`}
                    value={calcVolume}
                    onChange={e => setCalcVolume(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={calculateSavings}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition">
                    Calculate
                  </button>
                </div>
                {savings && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${savings.worthUpgrading ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'}`}>
                    {savings.recommendation}
                  </div>
                )}
              </div>
            )}

            {/* KYC warning */}
            {['growth', 'enterprise', 'api'].includes(selectedTier.id) && (
              <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">KYC Required</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Identity verification is required for this plan. You'll be redirected if not completed.</p>
                </div>
              </div>
            )}

            {/* API note */}
            {selectedTier.id === 'api' && (
              <div className="flex gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-5">
                <Lock className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">API Keys Auto-Generated</p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">Your API key and secret will be shown once after payment. Save them immediately.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setSelectedTier(null); setUpgradeCost(null); setSavings(null); }}
                className="flex-1 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm">
                Cancel
              </button>
              <button onClick={handleUpgrade} disabled={upgrading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2">
                {upgrading
                  ? <><Loader className="w-4 h-4 animate-spin" /> Processing...</>
                  : <>{upgradeCost.totalDue === 0 ? 'Upgrade Free' : 'Proceed to Payment'} <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Feature Comparison Table ── */}
        <div className="mb-10">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2 mx-auto text-sm font-semibold text-blue-600 hover:text-blue-700 transition mb-4"
          >
            {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showComparison ? 'Hide' : 'Show'} full feature comparison
          </button>

          {showComparison && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400 w-48">Feature</th>
                      {tiers.map(t => (
                        <th key={t.id} className={`text-center px-4 py-4 text-sm font-bold ${t.id === currentTier ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                          {t.name}
                          {t.id === currentTier && <span className="block text-xs font-normal text-green-500">Current</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_FEATURES.map((feat, i) => (
                      <tr key={feat.key} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">{feat.label}</td>
                        {tiers.map(t => {
                          const raw = t[feat.key];
                          const val = feat.format ? feat.format(raw) : (raw ?? '—');
                          const isCheck = val === '✓';
                          const isDash  = val === '—';
                          return (
                            <td key={t.id} className="px-4 py-3 text-center text-sm">
                              {isCheck
                                ? <Check className="w-4 h-4 text-green-500 mx-auto" />
                                : isDash
                                ? <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
                                : <span className="font-semibold text-gray-900 dark:text-white">{val}</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Why Upgrade Highlights ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Globe,       title: 'Global Currencies',   desc: '16 currencies supported' },
            { icon: Lock,        title: 'Secure Escrow',       desc: 'Funds held until confirmed' },
            { icon: Headphones,  title: 'Priority Support',    desc: 'From Growth tier upward' },
            { icon: BarChart2,   title: 'Advanced Analytics',  desc: 'Full transaction reporting' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className="text-center border-t border-gray-200 dark:border-gray-800 pt-10">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Questions about pricing?{' '}
            <a href="mailto:support@dealcross.net" className="text-blue-600 hover:underline font-medium">Contact our team</a>
          </p>
          <p className="text-xs text-gray-400 mt-2">All prices shown in {currency}. Exchange rates updated regularly.</p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
