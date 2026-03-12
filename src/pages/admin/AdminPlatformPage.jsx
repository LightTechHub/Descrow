// src/pages/admin/AdminPlatformPage.jsx
// ── Admin Platform Control Centre ──────────────────────────────────────────
// Covers all new features: wallet deposits, KYC unlock requests, referrals,
// newsletter subscribers, contact submissions, broadcast notifications,
// withdrawal settings, and platform revenue overview.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Wallet, ShieldCheck, Users, Mail, MessageSquare,
  Bell, Settings, TrendingUp, RefreshCw, Loader, CheckCircle,
  XCircle, AlertTriangle, Send, Unlock, Eye, Download,
  DollarSign, Lock, Megaphone, ChevronDown, Search, Filter
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

// ── Shared Components ─────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color = 'blue', sub }) => (
  <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs sm:text-sm text-gray-400">{label}</span>
      <div className={`p-2 rounded-lg bg-${color}-900/30`}>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
    </div>
    <p className="text-xl sm:text-2xl font-bold text-white">{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

const SectionHeader = ({ title, sub, action }) => (
  <div className="flex items-start justify-between mb-4 sm:mb-6">
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
      {sub && <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{sub}</p>}
    </div>
    {action}
  </div>
);

const Badge = ({ label, color = 'gray' }) => {
  const colors = {
    green:  'bg-green-900/40 text-green-300 border-green-700',
    red:    'bg-red-900/40 text-red-300 border-red-700',
    yellow: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    blue:   'bg-blue-900/40 text-blue-300 border-blue-700',
    gray:   'bg-gray-700 text-gray-300 border-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {label}
    </span>
  );
};

// ── Tab: Wallet Deposits ──────────────────────────────────────────────────────
const WalletDepositsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminService.getWalletDeposits()
      .then(r => { if (r.success) setData(r.data); })
      .catch(() => toast.error('Failed to load deposits'))
      .finally(() => setLoading(false));
  }, []);

  const deposits = data?.deposits || [];
  const filtered = deposits.filter(d =>
    !search || d.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const totalVolume = deposits.reduce((s, d) => s + (d.amount || 0), 0);
  const totalCount  = deposits.length;
  const avgAmount   = totalCount ? Math.round(totalVolume / totalCount) : 0;

  if (loading) return <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-blue-400 animate-spin" /></div>;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total Deposits"   value={totalCount.toLocaleString()}           icon={Wallet}      color="blue" />
        <StatCard label="Total Volume"     value={`₦${totalVolume.toLocaleString()}`}    icon={DollarSign}  color="green" />
        <StatCard label="Average Deposit"  value={`₦${avgAmount.toLocaleString()}`}      icon={TrendingUp}  color="purple" sub="per transaction" />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or reference..."
            className="bg-transparent text-sm text-white placeholder-gray-500 flex-1 outline-none"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr className="text-left text-xs text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 hidden sm:table-cell">Reference</th>
                <th className="px-4 py-3 hidden md:table-cell">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No deposits found</td></tr>
              ) : filtered.map((d, i) => (
                <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3"><div className="text-white text-xs font-medium">{d.userEmail || '—'}</div><div className="text-gray-500 text-xs">{d.userName || ''}</div></td>
                  <td className="px-4 py-3 font-bold text-green-300">₦{(d.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell font-mono text-xs">{d.reference?.slice(-12) || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell capitalize">{d.method || 'paystack'}</td>
                  <td className="px-4 py-3">
                    <Badge label={d.status || 'completed'} color={d.status === 'failed' ? 'red' : 'green'} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell text-xs">
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Tab: KYC Queue & Field Unlock ─────────────────────────────────────────────
const KYCTab = () => {
  const [queue, setQueue] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [unlockModal, setUnlockModal] = useState(null); // userId
  const [unlockReason, setUnlockReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchQueue = useCallback(() => {
    setLoading(true);
    adminService.getKYCQueue()
      .then(r => {
        if (r.success) {
          setQueue(r.data?.users || []);
          if (r.data?.counts) setCounts(r.data.counts);
        }
      })
      .catch(() => toast.error('Failed to load KYC queue'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleUnlock = async () => {
    if (!unlockReason.trim()) return toast.error('Please provide a reason for unlocking');
    setProcessing(true);
    try {
      const r = await adminService.unlockKYCFields(unlockModal, unlockReason);
      if (r.success) {
        toast.success('KYC fields unlocked for user');
        setUnlockModal(null);
        setUnlockReason('');
        fetchQueue();
      } else {
        toast.error(r.message || 'Failed to unlock');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to unlock KYC fields');
    } finally {
      setProcessing(false);
    }
  };

  const statusColor = (s) => ({
    approved: 'green', pending: 'yellow', rejected: 'red',
    pending_documents: 'blue', unverified: 'gray'
  }[s] || 'gray');

  if (loading) return <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-blue-400 animate-spin" /></div>;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Pending Review', value: counts.pending,  color: 'yellow', icon: AlertTriangle },
          { label: 'Approved',       value: counts.approved, color: 'green',  icon: CheckCircle },
          { label: 'Rejected',       value: counts.rejected, color: 'red',    icon: XCircle },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">KYC Submissions</h3>
          <p className="text-xs text-gray-400 mt-0.5">Review and manage user identity verifications. Use "Unlock Fields" to allow a verified user to update their name after KYC approval.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr className="text-left text-xs text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 hidden sm:table-cell">Account Type</th>
                <th className="px-4 py-3">KYC Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Method</th>
                <th className="px-4 py-3 hidden lg:table-cell">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">KYC queue is empty</td></tr>
              ) : queue.map((user, i) => (
                <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium text-sm">{user.name || '—'}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell capitalize text-xs">{user.accountType || 'individual'}</td>
                  <td className="px-4 py-3">
                    <Badge label={user.kycStatus?.status || 'unverified'} color={statusColor(user.kycStatus?.status)} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs capitalize">{user.kycStatus?.verificationMethod || 'auto'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell text-xs">
                    {user.kycStatus?.submittedAt ? new Date(user.kycStatus.submittedAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {user.kycStatus?.status === 'approved' && (
                      <button
                        onClick={() => setUnlockModal(user._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 border border-amber-700 rounded-lg text-xs font-semibold transition"
                      >
                        <Unlock className="w-3.5 h-3.5" /> Unlock Fields
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unlock Modal */}
      {unlockModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-white mb-2">Unlock KYC Fields</h3>
            <p className="text-sm text-gray-400 mb-4">
              This allows the user to change their name or business name after KYC approval.
              This action is logged and audited. Provide a clear reason.
            </p>
            <textarea
              value={unlockReason}
              onChange={e => setUnlockReason(e.target.value)}
              rows={3}
              placeholder="Reason for unlocking (e.g. Legal name change, clerical error, court order...)"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setUnlockModal(null); setUnlockReason(''); }} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition">Cancel</button>
              <button onClick={handleUnlock} disabled={processing || !unlockReason.trim()} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? <Loader className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} Confirm Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab: Referral Management ──────────────────────────────────────────────────
const ReferralsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    adminService.getReferralStats()
      .then(r => { if (r.success) setData(r.data); })
      .catch(() => toast.error('Failed to load referral data'))
      .finally(() => setLoading(false));
  }, []);

  const handleAdjust = async () => {
    if (!adjustAmount || !adjustReason.trim()) return toast.error('Amount and reason required');
    setProcessing(true);
    try {
      const r = await adminService.adjustReferralCredit(adjustModal._id, parseFloat(adjustAmount), adjustReason);
      if (r.success) {
        toast.success('Referral credit adjusted');
        setAdjustModal(null);
        setAdjustAmount('');
        setAdjustReason('');
      } else {
        toast.error(r.message || 'Failed to adjust');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to adjust credit');
    } finally {
      setProcessing(false);
    }
  };

  const topReferrers = data?.referrers || data?.topReferrers || [];

  if (loading) return <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-blue-400 animate-spin" /></div>;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Referrers"    value={data?.totalReferrers ?? 0}                              icon={Users}     color="blue" />
        <StatCard label="Total Credits Paid" value={`₦${(data?.totalCreditsPaid || 0).toLocaleString()}`}  icon={DollarSign} color="green" />
        <StatCard label="Pending Credits"    value={`₦${(data?.pendingCredits   || 0).toLocaleString()}`}  icon={AlertTriangle} color="yellow" />
        <StatCard label="Referral Signups"   value={data?.totalReferralSignups ?? 0}                        icon={TrendingUp} color="purple" />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Top Referrers</h3>
            <p className="text-xs text-gray-400 mt-0.5">Manually adjust referral credits if there is a discrepancy. All adjustments are logged.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr className="text-left text-xs text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Referrals</th>
                <th className="px-4 py-3">Credits Earned</th>
                <th className="px-4 py-3 hidden md:table-cell">Credits Paid</th>
                <th className="px-4 py-3 hidden lg:table-cell">Pending</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topReferrers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No referral data yet</td></tr>
              ) : topReferrers.map((r, i) => (
                <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{r.totalReferrals || 0}</td>
                  <td className="px-4 py-3 font-bold text-green-300">₦{(r.totalEarnings || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">₦{(r.paidEarnings || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge label={`₦${(r.pendingEarnings || 0).toLocaleString()}`} color={r.pendingEarnings > 0 ? 'yellow' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setAdjustModal(r)}
                      className="px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-700 rounded-lg text-xs font-semibold transition"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adjustModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-white mb-1">Adjust Referral Credit</h3>
            <p className="text-sm text-gray-400 mb-4">User: <strong className="text-white">{adjustModal.name}</strong></p>
            <input
              type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
              placeholder="Amount (₦) — negative to deduct"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <input
              type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
              placeholder="Reason for adjustment"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setAdjustModal(null)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition">Cancel</button>
              <button onClick={handleAdjust} disabled={processing} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? <Loader className="w-4 h-4 animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab: Communications (Newsletter + Contact Submissions) ─────────────────────
const CommunicationsTab = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadingS, setLoadingS] = useState(true);
  const [loadingC, setLoadingC] = useState(true);
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '', target: 'all' });
  const [broadcasting, setBroadcasting] = useState(false);
  const [view, setView] = useState('broadcast'); // 'broadcast' | 'newsletter' | 'contacts'

  useEffect(() => {
    adminService.getNewsletterSubscribers()
      .then(r => { if (r.success) setSubscribers(r.data?.subscribers || r.data || []); })
      .catch(() => {})
      .finally(() => setLoadingS(false));
    adminService.getContactSubmissions()
      .then(r => { if (r.success) setContacts(r.data?.submissions || r.data || []); })
      .catch(() => {})
      .finally(() => setLoadingC(false));
  }, []);

  const handleBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.message) return toast.error('Title and message required');
    if (!window.confirm(`Send notification to ${broadcastData.target === 'all' ? 'ALL users' : broadcastData.target + ' users'}?`)) return;
    setBroadcasting(true);
    try {
      const r = await adminService.broadcastNotification(broadcastData);
      if (r.success) {
        toast.success(`Notification sent to ${r.data?.sent || 'all'} users`);
        setBroadcastData({ title: '', message: '', target: 'all' });
      } else {
        toast.error(r.message || 'Broadcast failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Broadcast failed');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { key: 'broadcast', label: 'Broadcast Notification', icon: Megaphone },
          { key: 'newsletter', label: `Newsletter (${subscribers.length})`, icon: Mail },
          { key: 'contacts', label: `Contact Submissions (${contacts.length})`, icon: MessageSquare },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${view === t.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Broadcast */}
      {view === 'broadcast' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 sm:p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-blue-900/30 rounded-lg"><Megaphone className="w-5 h-5 text-blue-400" /></div>
            <div>
              <h3 className="text-base font-bold text-white">Send Platform Notification</h3>
              <p className="text-xs text-gray-400">This creates in-app notifications for the selected audience.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Target Audience</label>
              <select
                value={broadcastData.target}
                onChange={e => setBroadcastData(d => ({ ...d, target: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                <option value="verified">Verified Users Only</option>
                <option value="unverified">Unverified Users Only</option>
                <option value="free_tier">Free Tier</option>
                <option value="paid_tiers">Paid Tiers (Starter, Growth, Enterprise)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Notification Title</label>
              <input
                value={broadcastData.title}
                onChange={e => setBroadcastData(d => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Platform Maintenance Notice"
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Message</label>
              <textarea
                value={broadcastData.message}
                onChange={e => setBroadcastData(d => ({ ...d, message: e.target.value }))}
                rows={4}
                placeholder="Your notification message..."
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 text-white rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-3">
              <p className="text-xs text-yellow-300">⚠️ This will send to all selected users immediately. There is no undo.</p>
            </div>
            <button
              onClick={handleBroadcast}
              disabled={broadcasting || !broadcastData.title || !broadcastData.message}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {broadcasting ? <><Loader className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Broadcast</>}
            </button>
          </div>
        </div>
      )}

      {/* Newsletter Subscribers */}
      {view === 'newsletter' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Newsletter Subscribers</h3>
              <p className="text-xs text-gray-400 mt-0.5">{subscribers.length} total subscribers</p>
            </div>
            <button
              onClick={() => {
                const csv = 'Email,Date\n' + subscribers.map(s => `${s.email || s},${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}`).join('\n');
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'newsletter.csv'; a.click();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          {loadingS ? (
            <div className="flex justify-center py-8"><Loader className="w-6 h-6 text-blue-400 animate-spin" /></div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              {subscribers.length === 0 ? (
                <p className="px-4 py-8 text-center text-gray-500 text-sm">No subscribers yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-700 sticky top-0 bg-gray-800">
                    <tr className="text-left text-xs text-gray-400">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s, i) => (
                      <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-white">{s.email || s}</td>
                        <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell text-xs">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contact Submissions */}
      {view === 'contacts' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">Contact Form Submissions</h3>
            <p className="text-xs text-gray-400 mt-0.5">Messages received from the public contact form</p>
          </div>
          {loadingC ? (
            <div className="flex justify-center py-8"><Loader className="w-6 h-6 text-blue-400 animate-spin" /></div>
          ) : contacts.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-500 text-sm">No contact submissions</p>
          ) : (
            <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
              {contacts.map((c, i) => (
                <div key={i} className="p-4 hover:bg-gray-700/30 transition">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <span className="font-semibold text-white text-sm">{c.name}</span>
                      <span className="text-gray-400 text-xs ml-2">{c.email}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : ''}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-blue-400 mb-1">{c.subject}</p>
                  <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">{c.message}</p>
                  <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject || '')}`}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:underline">
                    <Mail className="w-3 h-3" /> Reply via email
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Tab: Withdrawal Settings ──────────────────────────────────────────────────
const WithdrawalSettingsTab = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.getWithdrawalSettings()
      .then(r => { if (r.success) setSettings(r.data); })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await adminService.updateWithdrawalSettings(settings);
      if (r.success) toast.success('Withdrawal settings updated');
      else toast.error(r.message || 'Failed to save');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const Field = ({ label, field, type = 'number', prefix }) => (
    <div>
      <label className="text-xs font-medium text-gray-400 mb-1.5 block">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
        <input
          type={type}
          value={settings?.[field] ?? ''}
          onChange={e => setSettings(s => ({ ...s, [field]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
          className={`w-full ${prefix ? 'pl-8' : 'pl-4'} pr-4 py-2.5 bg-gray-800 border border-gray-600 text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-blue-400 animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-green-900/30 rounded-lg"><Settings className="w-5 h-5 text-green-400" /></div>
          <div>
            <h3 className="text-base font-bold text-white">Withdrawal Limits & Auto-Approval</h3>
            <p className="text-xs text-gray-400">Configure thresholds that control when withdrawals are automatically approved vs require manual review.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Field label="Minimum Withdrawal (₦)"              field="minAmount"                   prefix="₦" />
          <Field label="Maximum Single Withdrawal (₦)"       field="maxAmount"                   prefix="₦" />
          <Field label="Auto-Approve Below (₦)"              field="autoApproveThreshold"        prefix="₦" />
          <Field label="Payout Hold Hours"                   field="payoutHoldHours"             />
          <Field label="Daily Limit Per User (₦)"            field="dailyLimit"                  prefix="₦" />
          <Field label="Monthly Limit Per User (₦)"          field="monthlyLimit"                prefix="₦" />
        </div>

        <div className="border-t border-gray-700 pt-4 mb-5">
          <h4 className="text-sm font-semibold text-white mb-3">Feature Flags</h4>
          {[
            { label: 'Withdrawals Enabled',        field: 'enabled' },
            { label: 'Auto-Approve Enabled',       field: 'autoApproveEnabled' },
            { label: 'Require KYC for Withdrawal', field: 'requireKYC' },
          ].map(({ label, field }) => (
            <label key={field} className="flex items-center justify-between py-2 cursor-pointer group">
              <span className="text-sm text-gray-300 group-hover:text-white transition">{label}</span>
              <div
                onClick={() => setSettings(s => ({ ...s, [field]: !s?.[field] }))}
                className={`relative w-10 h-5 rounded-full transition cursor-pointer ${settings?.[field] ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${settings?.[field] ? 'left-5' : 'left-0.5'}`} />
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'deposits',    label: 'Wallet Deposits',       icon: Wallet },
  { key: 'kyc',         label: 'KYC Control',           icon: ShieldCheck },
  { key: 'referrals',   label: 'Referrals',             icon: Users },
  { key: 'comms',       label: 'Communications',        icon: Bell },
  { key: 'withdrawal',  label: 'Withdrawal Settings',   icon: Settings },
];

const AdminPlatformPage = ({ admin }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'deposits');

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-xl">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Platform Control Centre</h1>
              <p className="text-xs sm:text-sm text-gray-400">Deposits · KYC · Referrals · Communications · Withdrawal Settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 sm:mb-8 scrollbar-hide border-b border-gray-800">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-t-lg text-xs sm:text-sm font-medium whitespace-nowrap transition flex-shrink-0 border-b-2 -mb-px ${
                activeTab === t.key
                  ? 'text-blue-400 border-blue-400 bg-blue-900/10'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'deposits'   && <WalletDepositsTab />}
          {activeTab === 'kyc'        && <KYCTab />}
          {activeTab === 'referrals'  && <ReferralsTab />}
          {activeTab === 'comms'      && <CommunicationsTab />}
          {activeTab === 'withdrawal' && <WithdrawalSettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminPlatformPage;
