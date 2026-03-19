// src/pages/WalletPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle,
  XCircle, AlertCircle, Loader, RefreshCw,
  Building2, ArrowLeft, X, Eye, EyeOff, Info, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';

// ── Safe API base URL ──────────────────────────────────────────────────────────
const buildAPIUrl = () => {
  const raw = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
  return `https://${raw.replace(/\/$/, '')}`;
};
const API_BASE = buildAPIUrl();

const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    ...options
  });
  return res.json();
};

// ── Deposit Modal ──────────────────────────────────────────────────────────────
const DepositModal = ({ onClose }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const QUICK = [5000, 10000, 25000, 50000, 100000, 250000];

  const handleDeposit = async () => {
    const n = parseInt(amount);
    if (!n || n < 500) return toast.error('Minimum deposit is ₦500');
    if (n > 10000000) return toast.error('Maximum single deposit is ₦10,000,000');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/wallet/deposit/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ amount: n })
      });
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.message || 'Failed to initiate deposit'); return; }
      const url = data.data?.authorization_url || data.data?.authorizationUrl;
      if (url) { window.location.href = url; }
      else toast.error('Payment gateway did not return a redirect URL.');
    } catch { toast.error('Failed to connect to payment gateway'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Funds to Wallet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Powered by Paystack · Secure payment</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"><XCircle className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (₦)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="500"
                className="w-full pl-8 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl text-xl font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Quick amounts</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK.map(q => (
                <button key={q} onClick={() => setAmount(q.toString())}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold border transition ${parseInt(amount) === q ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'}`}>
                  ₦{q.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleDeposit} disabled={loading || !amount || parseInt(amount) < 500}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <><Loader className="w-5 h-5 animate-spin" /> Processing...</> : 'Continue to Payment'}
          </button>
          <p className="text-xs text-gray-400 text-center">You'll be redirected to Paystack to complete payment securely.</p>
        </div>
      </div>
    </div>
  );
};

// ── Withdrawal Modal ───────────────────────────────────────────────────────────
// FIX: Now loads user's saved/linked bank accounts from /bank-accounts first.
// Falls back to manual entry only when user has no linked accounts.
const WithdrawalModal = ({ balance, onClose, onSuccess }) => {
  const navigate = useNavigate();

  // Saved accounts
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [useManual, setUseManual] = useState(false);

  // Manual entry
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [manualForm, setManualForm] = useState({ bankCode: '', bankName: '', accountNumber: '', accountName: '' });

  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load user's saved verified bank accounts from /bank-accounts
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/bank-accounts');
        if (res.success) {
          const verified = (res.data?.accounts || []).filter(a => a.isVerified && a.status === 'active');
          setSavedAccounts(verified);
          if (verified.length > 0) {
            // Auto-select primary account, else first one
            const primary = verified.find(a => a.isPrimary) || verified[0];
            setSelectedAccountId(primary._id);
          } else {
            // No verified accounts — go straight to manual
            setUseManual(true);
          }
        } else {
          setUseManual(true);
        }
      } catch {
        setUseManual(true);
      } finally {
        setLoadingAccounts(false);
      }
    };
    load();
  }, []);

  // Load Paystack bank list only when manual mode is active
  useEffect(() => {
    if (!useManual || banks.length > 0) return;
    setLoadingBanks(true);
    apiFetch('/wallet/banks')
      .then(res => setBanks(res.data || []))
      .finally(() => setLoadingBanks(false));
  }, [useManual, banks.length]);

  const verifyAccount = async () => {
    if (!manualForm.accountNumber || !manualForm.bankCode) return toast.error('Select bank and enter account number first');
    if (manualForm.accountNumber.length !== 10) return toast.error('Account number must be 10 digits');
    setVerifying(true);
    try {
      const res = await apiFetch('/wallet/verify-account', {
        method: 'POST',
        body: JSON.stringify({ accountNumber: manualForm.accountNumber, bankCode: manualForm.bankCode })
      });
      if (res.success) {
        setVerifiedName(res.data.accountName);
        setManualForm(f => ({ ...f, accountName: res.data.accountName }));
        toast.success('Account verified!');
      } else {
        toast.error(res.message || 'Verification failed');
      }
    } catch { toast.error('Could not verify account'); }
    finally { setVerifying(false); }
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount < 1000) return toast.error('Minimum withdrawal is ₦1,000');
    if (parsedAmount > balance) return toast.error('Amount exceeds available balance');

    let bankDetails;
    if (!useManual) {
      const account = savedAccounts.find(a => a._id === selectedAccountId);
      if (!account) return toast.error('Please select a bank account');
      bankDetails = { bankName: account.bankName, accountName: account.accountName, accountNumber: account.accountNumber, bankCode: account.bankCode };
    } else {
      if (!manualForm.bankCode) return toast.error('Select a bank');
      if (!manualForm.accountNumber) return toast.error('Enter account number');
      if (!verifiedName) return toast.error('Please verify your account number first');
      bankDetails = { bankName: manualForm.bankName, accountName: manualForm.accountName, accountNumber: manualForm.accountNumber, bankCode: manualForm.bankCode };
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: parsedAmount, ...bankDetails })
      });
      if (res.success) { toast.success('Withdrawal request submitted!'); onSuccess(); onClose(); }
      else toast.error(res.message || 'Withdrawal failed');
    } catch { toast.error('Withdrawal failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[92vh] overflow-y-auto">

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
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amount (₦)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">₦</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="1000" max={balance}
                className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 text-lg font-semibold" />
            </div>
            <div className="flex gap-2 mt-2">
              {[5000, 10000, 50000].map(amt => (
                <button key={amt} onClick={() => setAmount(Math.min(amt, balance).toString())}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition text-gray-700 dark:text-gray-300">
                  ₦{amt.toLocaleString()}
                </button>
              ))}
              <button onClick={() => setAmount(balance.toString())}
                className="flex-1 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 rounded-lg transition text-blue-700 dark:text-blue-300">
                Max
              </button>
            </div>
          </div>

          {/* Bank account section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {useManual ? 'Enter Bank Details' : 'Select Bank Account'}
              </label>
              {/* Only show toggle if user actually has saved accounts */}
              {savedAccounts.length > 0 && (
                <button onClick={() => { setUseManual(u => !u); setVerifiedName(''); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  {useManual ? '← Use saved account' : 'Enter manually'}
                </button>
              )}
            </div>

            {/* ── SAVED ACCOUNTS MODE ── */}
            {!useManual && (
              loadingAccounts ? (
                <div className="flex items-center gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <Loader className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Loading your bank accounts...</span>
                </div>
              ) : savedAccounts.length === 0 ? (
                // No verified linked accounts — prompt to add
                <div className="p-5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center">
                  <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">No linked bank accounts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Go to your profile to link a bank account</p>
                  <button onClick={() => { onClose(); navigate('/profile?tab=banking'); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">
                    <Plus className="w-4 h-4" /> Link Bank Account
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedAccounts.map(account => (
                    <button key={account._id} onClick={() => setSelectedAccountId(account._id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition text-left ${
                        selectedAccountId === account._id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedAccountId === account._id ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <Building2 className={`w-5 h-5 ${selectedAccountId === account._id ? 'text-blue-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {account.bankName}
                          {account.isPrimary && (
                            <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">Primary</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {account.accountNumber} · {account.accountName}
                        </p>
                      </div>
                      {selectedAccountId === account._id && <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                    </button>
                  ))}

                  {/* Add another account shortcut */}
                  <button onClick={() => { onClose(); navigate('/profile?tab=banking'); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add another bank account</span>
                  </button>
                </div>
              )
            )}

            {/* ── MANUAL ENTRY MODE ── */}
            {useManual && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank</label>
                  {loadingBanks ? (
                    <div className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-xl">
                      <Loader className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">Loading banks...</span>
                    </div>
                  ) : (
                    <select value={manualForm.bankCode}
                      onChange={e => { const b = banks.find(b => b.code === e.target.value); setManualForm(f => ({ ...f, bankCode: e.target.value, bankName: b?.name || '' })); setVerifiedName(''); }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500">
                      <option value="">Select bank</option>
                      {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
                  <div className="flex gap-2">
                    <input type="text" value={manualForm.accountNumber}
                      onChange={e => { setManualForm(f => ({ ...f, accountNumber: e.target.value })); setVerifiedName(''); }}
                      placeholder="0123456789" maxLength={10}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 font-mono tracking-widest" />
                    <button onClick={verifyAccount}
                      disabled={verifying || manualForm.accountNumber.length !== 10 || !manualForm.bankCode}
                      className="px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap">
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
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Withdrawals are processed within 1–3 business days. Minimum withdrawal is ₦1,000.
            </p>
          </div>

          {/* Submit */}
          <button onClick={handleSubmit}
            disabled={submitting || !amount || (!useManual && !selectedAccountId) || (useManual && !verifiedName)}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {submitting
              ? <><Loader className="w-5 h-5 animate-spin" />Processing...</>
              : <><ArrowUpCircle className="w-5 h-5" />Withdraw ₦{parseFloat(amount || 0).toLocaleString()}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Status badges ──────────────────────────────────────────────────────────────
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
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />{cfg.label}
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
    } catch { toast.error('Failed to load wallet'); }
    finally { setLoading(false); }
  }, []);

  // Auto-verify deposit after Paystack redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositStatus = params.get('deposit');
    const reference = params.get('reference') || params.get('trxref');
    if (depositStatus === 'success' && reference) {
      window.history.replaceState({}, '', '/wallet');
      apiFetch('/wallet/deposit/verify', { method: 'POST', body: JSON.stringify({ reference }) })
        .then(res => {
          if (res.success) { toast.success(res.message || 'Wallet funded successfully!'); fetchData(); }
          else toast.error(res.message || 'Could not verify deposit');
        })
        .catch(() => toast.error('Deposit verification failed. Contact support if funds were deducted.'));
    }
  }, [fetchData]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [fetchData, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  const balance = wallet?.balance || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
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
                <p className="text-5xl font-bold tracking-tight">{balanceHidden ? '••••••' : `₦${balance.toLocaleString()}`}</p>
                <button onClick={() => setBalanceHidden(h => !h)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition">
                  {balanceHidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="p-3 bg-white/15 rounded-xl"><Wallet className="w-8 h-8" /></div>
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
            <button onClick={() => setShowDepositModal(true)}
              className="flex-1 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-blue-50 transition flex items-center justify-center gap-2 shadow-lg">
              <ArrowDownCircle className="w-5 h-5" /> Add Funds
            </button>
            <button onClick={() => setShowWithdrawModal(true)} disabled={balance < 1000}
              className="flex-1 py-4 bg-white/20 text-white border border-white/30 rounded-xl font-bold text-lg hover:bg-white/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <ArrowUpCircle className="w-5 h-5" />
              {balance < 1000 ? 'Min ₦1,000' : 'Withdraw'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[{ key: 'transactions', label: 'Transaction History' }, { key: 'withdrawals', label: 'Withdrawals' }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-4 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
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
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Funds will appear here when buyers confirm delivery</p>
                </div>
              ) : transactions.map(tx => (
                <div key={tx._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'credit' ? 'bg-green-100 dark:bg-green-900/30' : tx.type === 'refund' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {tx.type === 'credit' || tx.type === 'refund'
                      ? <ArrowDownCircle className={`w-5 h-5 ${tx.type === 'credit' ? 'text-green-600' : 'text-blue-600'}`} />
                      : <ArrowUpCircle className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{tx.description || tx.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(tx.createdAt).toLocaleString()}
                      {tx.escrowRef && <span className="ml-2 font-mono">#{tx.escrowRef.slice(-6)}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-base ${tx.type === 'credit' || tx.type === 'refund' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      {tx.type === 'credit' || tx.type === 'refund' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Bal: ₦{(tx.balanceAfter || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
            {activeTab === 'withdrawals' && (
              withdrawals.length === 0 ? (
                <div className="py-16 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No withdrawals yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your withdrawal history will appear here</p>
                </div>
              ) : withdrawals.map(wd => (
                <div key={wd._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{wd.bankDetails?.bankName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{wd.bankDetails?.accountNumber} · {wd.bankDetails?.accountName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(wd.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="font-bold text-base text-red-500 dark:text-red-400">-₦{wd.amount.toLocaleString()}</p>
                    <WdBadge status={wd.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showWithdrawModal && <WithdrawalModal balance={balance} onClose={() => setShowWithdrawModal(false)} onSuccess={fetchData} />}
      {showDepositModal && <DepositModal onClose={() => setShowDepositModal(false)} />}
    </div>
  );
};

export default WalletPage;
