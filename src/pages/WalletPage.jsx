// src/pages/WalletPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle,
  XCircle, AlertCircle, Loader, RefreshCw, ChevronRight,
  Building2, CreditCard, ArrowLeft, X, Eye, EyeOff, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';

// ── API helper ─────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    ...options
  });
  return res.json();
};

// ── Deposit Modal ─────────────────────────────────────────────────────────────
const DepositModal = ({ onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const API = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

  const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 250000];

  const handleDeposit = async () => {
    const amountNGN = parseInt(amount);
    if (!amountNGN || amountNGN < 500) return toast.error('Minimum deposit is ₦500');
    if (amountNGN > 10000000) return toast.error('Maximum single deposit is ₦10,000,000');

    setLoading(true);
    try {
      const res = await fetch(`${API}/wallet/deposit/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ amount: amountNGN })
      });
      const data = await res.json();
      if (data.success && data.data?.authorizationUrl) {
        // Redirect to Paystack checkout
        window.location.href = data.data.authorizationUrl;
      } else {
        toast.error(data.message || 'Failed to initiate deposit');
      }
    } catch (err) {
      toast.error('Failed to connect to payment gateway');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Funds to Wallet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Powered by Paystack · Secure payment</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (₦)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="500"
                className="w-full pl-8 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl text-xl font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Quick amounts</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q}
                  onClick={() => setAmount(q.toString())}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold border transition ${
                    parseInt(amount) === q
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  ₦{q.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading || !amount || parseInt(amount) < 500}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader className="w-5 h-5 animate-spin" /> Processing...</> : <>Continue to Payment</>}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            You'll be redirected to Paystack to complete the payment securely.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Withdrawal Modal ───────────────────────────────────────────────────────────
const WithdrawalModal = ({ balance, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1=form, 2=verify, 3=confirm
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [form, setForm] = useState({
    amount: '',
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    apiFetch('/wallet/banks').then(res => {
      setBanks(res.data || []);
      setLoadingBanks(false);
    });
  }, []);

  const handleBankChange = (e) => {
    const bank = banks.find(b => b.code === e.target.value);
    setForm(f => ({ ...f, bankCode: e.target.value, bankName: bank?.name || '' }));
    setVerifiedName('');
  };

  const handleAccountChange = (e) => {
    setForm(f => ({ ...f, accountNumber: e.target.value }));
    setVerifiedName('');
  };

  const verifyAccount = async () => {
    if (!form.accountNumber || !form.bankCode) {
      toast.error('Select bank and enter account number first');
      return;
    }
    if (form.accountNumber.length !== 10) {
      toast.error('Account number must be 10 digits');
      return;
    }
    setVerifying(true);
    try {
      const res = await apiFetch('/wallet/verify-account', {
        method: 'POST',
        body: JSON.stringify({ accountNumber: form.accountNumber, bankCode: form.bankCode })
      });
      if (res.success) {
        setVerifiedName(res.data.accountName);
        setForm(f => ({ ...f, accountName: res.data.accountName }));
        toast.success('Account verified!');
      } else {
        toast.error(res.message || 'Verification failed');
      }
    } catch {
      toast.error('Could not verify account');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount < 1000) { toast.error('Minimum withdrawal is ₦1,000'); return; }
    if (amount > balance) { toast.error('Amount exceeds available balance'); return; }
    if (!form.bankCode) { toast.error('Select a bank'); return; }
    if (!form.accountNumber) { toast.error('Enter account number'); return; }
    if (!verifiedName) { toast.error('Please verify your account number first'); return; }

    setSubmitting(true);
    try {
      const res = await apiFetch('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          bankName: form.bankName,
          accountName: form.accountName,
          accountNumber: form.accountNumber,
          bankCode: form.bankCode
        })
      });

      if (res.success) {
        toast.success('Withdrawal request submitted!');
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Withdrawal failed');
      }
    } catch {
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Withdraw Funds</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Available: <span className="font-semibold text-green-600">₦{balance.toLocaleString()}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Amount (₦)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">₦</span>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                min="1000"
                max={balance}
                className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[5000, 10000, 50000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setForm(f => ({ ...f, amount: Math.min(amt, balance).toString() }))}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition text-gray-700 dark:text-gray-300"
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
              <button
                onClick={() => setForm(f => ({ ...f, amount: balance.toString() }))}
                className="flex-1 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition text-blue-700 dark:text-blue-300"
              >
                Max
              </button>
            </div>
          </div>

          {/* Bank */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bank</label>
            {loadingBanks ? (
              <div className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-xl">
                <Loader className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Loading banks...</span>
              </div>
            ) : (
              <select
                value={form.bankCode}
                onChange={handleBankChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select bank</option>
                {banks.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Account Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.accountNumber}
                onChange={handleAccountChange}
                placeholder="0123456789"
                maxLength={10}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
              />
              <button
                onClick={verifyAccount}
                disabled={verifying || form.accountNumber.length !== 10 || !form.bankCode}
                className="px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                {verifying ? <Loader className="w-4 h-4 animate-spin" /> : 'Verify'}
              </button>
            </div>
            {verifiedName && (
              <div className="mt-2 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-green-800 dark:text-green-200">{verifiedName}</span>
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Withdrawals are processed within 1–3 business days. Minimum withdrawal is ₦1,000.
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.amount || !verifiedName}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader className="w-5 h-5 animate-spin" />Processing...</>
            ) : (
              <>
                <ArrowUpCircle className="w-5 h-5" />
                Withdraw ₦{parseFloat(form.amount || 0).toLocaleString()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Transaction type badge ─────────────────────────────────────────────────────
const TxBadge = ({ type }) => {
  const map = {
    credit:     { label: 'Credit',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: ArrowDownCircle },
    withdrawal: { label: 'Withdrawal', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',         icon: ArrowUpCircle },
    refund:     { label: 'Refund',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',     icon: RefreshCw },
    fee:        { label: 'Fee',        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',        icon: AlertCircle },
    debit:      { label: 'Debit',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: ArrowUpCircle }
  };
  const cfg = map[type] || map.debit;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};

// ── Withdrawal status badge ────────────────────────────────────────────────────
const WdBadge = ({ status }) => {
  const map = {
    pending:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700',    icon: Loader },
    completed:  { label: 'Completed',  color: 'bg-green-100 text-green-700',  icon: CheckCircle },
    failed:     { label: 'Failed',     color: 'bg-red-100 text-red-700',      icon: XCircle },
    cancelled:  { label: 'Cancelled',  color: 'bg-gray-100 text-gray-700',    icon: XCircle }
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
};

// ── Main WalletPage ────────────────────────────────────────────────────────────
const WalletPage = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [balanceHidden, setBalanceHidden] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, txRes, wdRes] = await Promise.all([
        apiFetch('/wallet'),
        apiFetch('/wallet/transactions?limit=30'),
        apiFetch('/wallet/withdrawals?limit=20')
      ]);

      if (walletRes.success) setWallet(walletRes.data);
      if (txRes.success) setTransactions(txRes.data.transactions || []);
      if (wdRes.success) setWithdrawals(wdRes.data.withdrawals || []);
    } catch (err) {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [fetchData, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const balance = wallet?.balance || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">Available Balance</p>
              <div className="flex items-center gap-3">
                <p className="text-5xl font-bold tracking-tight">
                  {balanceHidden ? '••••••' : `₦${balance.toLocaleString()}`}
                </p>
                <button
                  onClick={() => setBalanceHidden(h => !h)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  {balanceHidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="p-3 bg-white/15 rounded-xl">
              <Wallet className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-blue-200 text-xs font-medium">Total Earned</p>
              <p className="text-2xl font-bold mt-1">₦{(wallet?.totalEarned || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-blue-200 text-xs font-medium">Total Withdrawn</p>
              <p className="text-2xl font-bold mt-1">₦{(wallet?.totalWithdrawn || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex-1 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-blue-50 transition flex items-center justify-center gap-2 shadow-lg"
            >
              <ArrowDownCircle className="w-5 h-5" />
              Add Funds
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={balance < 1000}
              className="flex-1 py-4 bg-white/20 text-white border border-white/30 rounded-xl font-bold text-lg hover:bg-white/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ArrowUpCircle className="w-5 h-5" />
              {balance < 1000 ? 'Min ₦1,000' : 'Withdraw'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { key: 'transactions', label: 'Transaction History' },
              { key: 'withdrawals', label: 'Withdrawals' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-4 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activeTab === 'transactions' && (
              transactions.length === 0 ? (
                <div className="py-16 text-center">
                  <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Funds will appear here when buyers confirm delivery
                  </p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'credit' ? 'bg-green-100 dark:bg-green-900/30' :
                      tx.type === 'refund' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {tx.type === 'credit' || tx.type === 'refund'
                        ? <ArrowDownCircle className={`w-5 h-5 ${tx.type === 'credit' ? 'text-green-600' : 'text-blue-600'}`} />
                        : <ArrowUpCircle className="w-5 h-5 text-red-500" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString()}
                        {tx.escrowRef && <span className="ml-2 font-mono">#{tx.escrowRef.slice(-6)}</span>}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-base ${
                        tx.type === 'credit' || tx.type === 'refund'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-500 dark:text-red-400'
                      }`}>
                        {tx.type === 'credit' || tx.type === 'refund' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Bal: ₦{(tx.balanceAfter || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === 'withdrawals' && (
              withdrawals.length === 0 ? (
                <div className="py-16 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No withdrawals yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Your withdrawal history will appear here
                  </p>
                </div>
              ) : (
                withdrawals.map((wd) => (
                  <div key={wd._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {wd.bankDetails?.bankName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                        {wd.bankDetails?.accountNumber} · {wd.bankDetails?.accountName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(wd.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="font-bold text-base text-red-500 dark:text-red-400">
                        -₦{wd.amount.toLocaleString()}
                      </p>
                      <WdBadge status={wd.status} />
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {showWithdrawModal && (
        <WithdrawalModal
          balance={balance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={fetchData}
        />
      )}

      {showDepositModal && (
        <DepositModal
          onClose={() => setShowDepositModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default WalletPage;
