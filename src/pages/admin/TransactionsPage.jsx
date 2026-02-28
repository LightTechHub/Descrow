// src/pages/admin/TransactionsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Download, Eye, Loader, Package,
  CheckCircle, Clock, XCircle, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

// ── Transaction Detail Modal ───────────────────────────────────────────────────
const TransactionDetailModal = ({ transaction, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await adminService.getTransactionDetails(transaction._id);
        setDetails(res.data || res);
      } catch (err) {
        setDetails(transaction); // fallback to row data
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [transaction._id]);

  const t = details || transaction;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{t.title || t.itemName || 'Transaction'}</h2>
            <p className="text-sm font-mono text-gray-400">{t.escrowId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-red-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Buyer</p>
                  <p className="text-white font-semibold">{t.buyer?.name || '—'}</p>
                  <p className="text-gray-400 text-xs">{t.buyer?.email}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Seller</p>
                  <p className="text-white font-semibold">{t.seller?.name || '—'}</p>
                  <p className="text-gray-400 text-xs">{t.seller?.email}</p>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="text-white font-bold text-lg">
                    {t.currency || '₦'}{(t.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <p className="text-white capitalize">{t.transactionType?.replace(/_/g, ' ') || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="text-white capitalize">{t.status?.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-gray-300 text-sm">{t.description || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Created</p><p className="text-white">{new Date(t.createdAt).toLocaleString()}</p></div>
                <div><p className="text-gray-500">Updated</p><p className="text-white">{new Date(t.updatedAt).toLocaleString()}</p></div>
              </div>

              {t.milestones?.length > 0 && (
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Milestones ({t.milestones.length})</p>
                  {t.milestones.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-gray-300">{m.description}</span>
                      <span className="text-white font-semibold">{t.currency}{m.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main TransactionsPage ──────────────────────────────────────────────────────
const TransactionsPage = ({ admin }) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, currentPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setCurrentPage(1); fetchTransactions(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await adminService.getTransactions({
        status: statusFilter,
        page: currentPage,
        limit: 20,
        search
      });
      // FIX: correct response structure
      const data = response.data || response;
      setTransactions(data.escrows || data.transactions || []);
      setTotalPages(data.pagination?.pages || data.totalPages || 1);
      setTotalCount(data.pagination?.total || data.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // FIX: use actual Escrow model status values
  const getStatusBadge = (status) => {
    const map = {
      pending:             { color: 'bg-gray-500/20 text-gray-400',    icon: Clock },
      accepted:            { color: 'bg-blue-500/20 text-blue-400',    icon: Clock },
      funded:              { color: 'bg-indigo-500/20 text-indigo-400', icon: Clock },
      in_progress:         { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
      delivered:           { color: 'bg-cyan-500/20 text-cyan-400',    icon: Package },
      inspection_pending:  { color: 'bg-orange-500/20 text-orange-400', icon: Clock },
      inspection_passed:   { color: 'bg-teal-500/20 text-teal-400',    icon: CheckCircle },
      inspection_failed:   { color: 'bg-red-500/20 text-red-400',      icon: XCircle },
      disputed:            { color: 'bg-red-600/20 text-red-500',      icon: AlertCircle },
      completed:           { color: 'bg-green-500/20 text-green-400',  icon: CheckCircle },
      paid_out:            { color: 'bg-green-600/20 text-green-500',  icon: CheckCircle },
      refunded:            { color: 'bg-purple-500/20 text-purple-400', icon: XCircle },
      cancelled:           { color: 'bg-gray-600/20 text-gray-500',    icon: XCircle },
      expired:             { color: 'bg-gray-600/20 text-gray-500',    icon: XCircle }
    };
    const badge = map[status] || map.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">All Transactions</h1>
              <p className="text-sm text-gray-400">{totalCount.toLocaleString()} total escrows</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchTransactions} className="p-2 hover:bg-gray-700 rounded-lg transition">
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Escrow ID or title..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="funded">Funded</option>
              <option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option>
              <option value="inspection_pending">Inspection Pending</option>
              <option value="disputed">Disputed</option>
              <option value="completed">Completed</option>
              <option value="paid_out">Paid Out</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Escrow ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Buyer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Seller</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan="8" className="px-6 py-12 text-center">
                    <Loader className="w-8 h-8 text-red-600 animate-spin mx-auto" />
                  </td></tr>
                ) : transactions.length > 0 ? transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-gray-700/40 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-300">{tx.escrowId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{tx.title || tx.itemName || '—'}</p>
                      <p className="text-gray-500 text-xs capitalize">{tx.transactionType?.replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{tx.buyer?.name || '—'}</p>
                      <p className="text-gray-400 text-xs">{tx.buyer?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{tx.seller?.name || '—'}</p>
                      <p className="text-gray-400 text-xs">{tx.seller?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-semibold text-sm">
                        {tx.currency || '₦'}{(tx.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* FIX: opens admin modal, not user-facing escrow page */}
                      <button onClick={() => setSelectedTx(tx)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">No transactions found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-400">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 flex items-center gap-1 text-sm">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 flex items-center gap-1 text-sm">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedTx && (
        <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
};

export default TransactionsPage;
