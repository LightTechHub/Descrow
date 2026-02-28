// src/pages/admin/DisputesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Loader, CheckCircle, Clock,
  Eye, X, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

// ── Dispute Detail Modal ───────────────────────────────────────────────────────
const DisputeDetailModal = ({ dispute, onClose, onResolved }) => {
  const [resolutionData, setResolutionData] = useState({
    resolution: '',
    winner: '',
    refundAmount: '',
    notes: ''
  });
  const [resolving, setResolving] = useState(false);

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionData.resolution) { toast.error('Resolution summary required'); return; }
    if (!resolutionData.winner) { toast.error('Please select a winner'); return; }

    try {
      setResolving(true);
      await adminService.resolveDispute(dispute._id, {
        resolution: resolutionData.resolution,
        winner: resolutionData.winner,
        refundAmount: parseFloat(resolutionData.refundAmount) || 0,
        notes: resolutionData.notes
      });
      toast.success('Dispute resolved successfully');
      onResolved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const isResolved = dispute.status === 'resolved';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Dispute Details</h2>
            <p className="text-sm text-gray-400">{dispute.escrow?.escrowId || dispute._id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Initiated By</p>
              <p className="text-white font-semibold">{dispute.initiatedBy?.name || '—'}</p>
              <p className="text-gray-400 text-xs">{dispute.initiatedBy?.email}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Escrow Amount</p>
              <p className="text-white font-semibold text-lg">
                {dispute.escrow?.currency || '$'}{(dispute.escrow?.amount || 0).toLocaleString()}
              </p>
              <p className="text-gray-400 text-xs">{dispute.escrow?.title}</p>
            </div>
          </div>

          {/* Dispute Info */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Reason</p>
              <p className="text-white capitalize">{dispute.reason?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{dispute.description}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Filed On</p>
              <p className="text-gray-300 text-sm">{new Date(dispute.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Already resolved display */}
          {isResolved && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <p className="text-green-400 font-semibold mb-2">✓ Resolved</p>
              <p className="text-sm text-green-300">
                <strong>Winner:</strong> {dispute.resolution?.winner || '—'}
              </p>
              <p className="text-sm text-green-300">
                <strong>Resolution:</strong> {dispute.resolution?.summary || dispute.resolution?.resolution || '—'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Resolved {new Date(dispute.resolvedAt || dispute.updatedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Resolve form */}
          {!isResolved && (
            <form onSubmit={handleResolve} className="space-y-4 border-t border-gray-700 pt-4">
              <h3 className="font-semibold text-white">Submit Resolution</h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Summary *
                </label>
                <textarea
                  value={resolutionData.resolution}
                  onChange={(e) => setResolutionData({ ...resolutionData, resolution: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Explain your decision clearly..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Winner *</label>
                <select
                  value={resolutionData.winner}
                  onChange={(e) => setResolutionData({ ...resolutionData, winner: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select winner</option>
                  <option value="buyer">Buyer — Release refund to buyer</option>
                  <option value="seller">Seller — Release payment to seller</option>
                </select>
              </div>

              {resolutionData.winner === 'buyer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Refund Amount (leave blank for full refund)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={resolutionData.refundAmount}
                    onChange={(e) => setResolutionData({ ...resolutionData, refundAmount: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500"
                    placeholder="0.00 (blank = full refund)"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Internal Notes (optional)
                </label>
                <textarea
                  value={resolutionData.notes}
                  onChange={(e) => setResolutionData({ ...resolutionData, notes: e.target.value })}
                  rows="2"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Internal notes not shown to users..."
                />
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  ⚠️ This action is irreversible. Both parties will be notified.
                </p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition">
                  Cancel
                </button>
                <button type="submit" disabled={resolving}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
                  {resolving ? <><Loader className="w-4 h-4 animate-spin" /> Resolving...</> : 'Submit Resolution'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main DisputesPage ──────────────────────────────────────────────────────────
const DisputesPage = ({ admin }) => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDispute, setSelectedDispute] = useState(null);

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter, currentPage]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDisputes({
        status: statusFilter,
        page: currentPage,
        limit: 20
      });
      // FIX: backend returns response.data.disputes / response.data.pagination
      const data = response.data || response;
      setDisputes(data.disputes || []);
      setTotalPages(data.pagination?.pages || data.totalPages || 1);
      setTotalCount(data.pagination?.total || data.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open:         { color: 'bg-red-500/20 text-red-400',    icon: AlertCircle, text: 'Open' },
      under_review: { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock, text: 'Under Review' },
      resolved:     { color: 'bg-green-500/20 text-green-400', icon: CheckCircle, text: 'Resolved' }
    };
    const badge = badges[status] || badges.open;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />{badge.text}
      </span>
    );
  };

  // Summary counts
  const openCount = disputes.filter(d => d.status === 'open').length;
  const reviewCount = disputes.filter(d => d.status === 'under_review').length;

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
              <h1 className="text-2xl font-bold text-white">Dispute Management</h1>
              <p className="text-sm text-gray-400">
                {totalCount} total · {openCount} open · {reviewCount} under review
              </p>
            </div>
          </div>
          <button onClick={fetchDisputes} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex gap-3">
            {[
              { value: '', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'under_review', label: 'Under Review' },
              { value: 'resolved', label: 'Resolved' }
            ].map(opt => (
              <button key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  statusFilter === opt.value
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Escrow</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Initiated By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Filed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center">
                    <Loader className="w-8 h-8 text-red-600 animate-spin mx-auto" />
                  </td></tr>
                ) : disputes.length > 0 ? disputes.map((dispute) => (
                  <tr key={dispute._id} className="hover:bg-gray-700/40 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-300">
                        {dispute.escrow?.escrowId || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium capitalize">
                        {dispute.reason?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-gray-500 text-xs line-clamp-1">{dispute.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{dispute.initiatedBy?.name || '—'}</p>
                      <p className="text-gray-400 text-xs">{dispute.initiatedBy?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-semibold text-sm">
                        {dispute.escrow?.currency || '$'}
                        {(dispute.escrow?.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(dispute.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-xs">
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedDispute(dispute)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition mr-1">
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                      {dispute.status !== 'resolved' && (
                        <button onClick={() => setSelectedDispute(dispute)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-semibold">
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No disputes found</td></tr>
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

      {selectedDispute && (
        <DisputeDetailModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolved={fetchDisputes}
        />
      )}
    </div>
  );
};

export default DisputesPage;
