// src/pages/admin/WithdrawalsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Loader, CheckCircle, XCircle,
  Clock, ChevronLeft, ChevronRight, Search, Building2, Eye, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    ...options
  });
  return res.json();
};

// ── Status badge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:    { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock, label: 'Pending' },
    processing: { color: 'bg-blue-500/20 text-blue-400',    icon: Loader, label: 'Processing' },
    completed:  { color: 'bg-green-500/20 text-green-400',  icon: CheckCircle, label: 'Completed' },
    failed:     { color: 'bg-red-500/20 text-red-400',      icon: XCircle, label: 'Failed' },
    cancelled:  { color: 'bg-gray-500/20 text-gray-400',    icon: XCircle, label: 'Cancelled' }
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
};

// ── Update Modal ───────────────────────────────────────────────────────────────
const UpdateModal = ({ withdrawal, onClose, onSuccess }) => {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const options = {
    pending: ['processing', 'failed', 'cancelled'],
    processing: ['completed', 'failed']
  }[withdrawal.status] || [];

  const handleSubmit = async () => {
    if (!status) { toast.error('Select a status'); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/withdrawals/${withdrawal._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote: note })
      });
      if (res.success) {
        toast.success(`Withdrawal marked as ${status}`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Update Withdrawal</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Details */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">User:</span>
              <span className="text-white font-semibold">{withdrawal.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount:</span>
              <span className="text-white font-bold text-base">₦{withdrawal.amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bank:</span>
              <span className="text-white">{withdrawal.bankDetails?.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Account:</span>
              <span className="text-white font-mono">{withdrawal.bankDetails?.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Account Name:</span>
              <span className="text-white">{withdrawal.bankDetails?.accountName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Reference:</span>
              <span className="text-gray-300 font-mono text-xs">{withdrawal.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Status:</span>
              <StatusBadge status={withdrawal.status} />
            </div>
          </div>

          {withdrawal.adminNote && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-400 font-semibold mb-1">Previous Note:</p>
              <p className="text-xs text-yellow-300">{withdrawal.adminNote}</p>
            </div>
          )}

          {options.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Update Status To</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select new status</option>
                  {options.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Admin Note (optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Transfer completed via Paystack dashboard"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !status}
                className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Update Status'}
              </button>
            </>
          ) : (
            <p className="text-center text-gray-500 py-4">
              This withdrawal is {withdrawal.status} — no further updates available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main WithdrawalsPage ───────────────────────────────────────────────────────
const WithdrawalsPage = () => {
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState({ pending: 0, processing: 0, totalPendingAmount: 0 });

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/admin/withdrawals?status=${statusFilter}&page=${currentPage}&limit=20`);
      if (res.success) {
        setWithdrawals(res.data.withdrawals || []);
        setTotalPages(res.data.pagination?.pages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [pendingRes, processingRes] = await Promise.all([
        apiFetch('/admin/withdrawals?status=pending&limit=100'),
        apiFetch('/admin/withdrawals?status=processing&limit=100')
      ]);
      const pendingList = pendingRes.data?.withdrawals || [];
      const processingList = processingRes.data?.withdrawals || [];
      setStats({
        pending: pendingRes.data?.pagination?.total || 0,
        processing: processingRes.data?.pagination?.total || 0,
        totalPendingAmount: [...pendingList, ...processingList].reduce((s, w) => s + w.amount, 0)
      });
    } catch {}
  };

  useEffect(() => { fetchWithdrawals(); }, [statusFilter, currentPage]);
  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Withdrawal Requests</h1>
              <p className="text-sm text-gray-400">{totalCount} total requests</p>
            </div>
          </div>
          <button onClick={() => { fetchWithdrawals(); fetchStats(); }} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-3xl font-bold text-yellow-400 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-gray-400 text-sm">Processing</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">{stats.processing}</p>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-gray-400 text-sm">Total Queued (₦)</p>
            <p className="text-3xl font-bold text-white mt-1">₦{stats.totalPendingAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  {['User', 'Amount', 'Bank', 'Account', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan="7" className="py-12 text-center">
                    <Loader className="w-8 h-8 text-red-600 animate-spin mx-auto" />
                  </td></tr>
                ) : withdrawals.length === 0 ? (
                  <tr><td colSpan="7" className="py-12 text-center text-gray-500">No withdrawals found</td></tr>
                ) : withdrawals.map(wd => (
                  <tr key={wd._id} className="hover:bg-gray-700/40 transition">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-semibold">{wd.user?.name || '—'}</p>
                      <p className="text-gray-400 text-xs">{wd.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-bold">₦{wd.amount?.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{wd.bankDetails?.bankName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-mono text-sm">{wd.bankDetails?.accountNumber}</p>
                      <p className="text-gray-400 text-xs">{wd.bankDetails?.accountName}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={wd.status} /></td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-xs">{new Date(wd.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(wd)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1 text-sm transition">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1 text-sm transition">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {selected && (
        <UpdateModal
          withdrawal={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => { fetchWithdrawals(); fetchStats(); setSelected(null); }}
        />
      )}
    </div>
  );
};

export default WithdrawalsPage;
