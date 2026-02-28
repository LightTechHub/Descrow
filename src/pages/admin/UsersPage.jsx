// src/pages/admin/UsersPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Loader, CheckCircle, XCircle,
  Ban, UserCheck, Eye, ChevronLeft, ChevronRight,
  Shield, RefreshCw, X, User, TrendingUp, Building
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

// ── Inline User Details Modal ─────────────────────────────────────────────────
const UserDetailsModal = ({ user, onClose, onRefresh }) => {
  const [saving, setSaving] = useState(false);
  const [newTier, setNewTier] = useState(user.tier || 'starter');
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await adminService.getUserDetails(user._id);
        if (res.success) setUserDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch user details:', err);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [user._id]);

  const handleKYCAction = async (action) => {
    const reason = action === 'reject'
      ? window.prompt('Rejection reason (required):')
      : '';
    if (action === 'reject' && !reason) return;
    try {
      setSaving(true);
      await adminService.reviewKYC(user._id, action, reason);
      toast.success(`KYC ${action}d successfully`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} KYC`);
    } finally {
      setSaving(false);
    }
  };

  const handleTierChange = async () => {
    if (newTier === user.tier) return;
    try {
      setSaving(true);
      await adminService.changeUserTier(user._id, newTier);
      toast.success(`Tier changed to ${newTier}`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change tier');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const action = user.isActive ? 'suspend' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    try {
      setSaving(true);
      await adminService.toggleUserStatus(user._id, action);
      toast.success(`User ${action}d successfully`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const kycStatus = user.kycStatus?.status || user.kycStatus || 'unverified';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">Basic Info</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div><p className="text-gray-500">ID</p><p className="text-gray-300 font-mono text-xs">{user._id}</p></div>
                <div><p className="text-gray-500">Account Type</p><p className="text-white capitalize">{user.accountType || 'individual'}</p></div>
                <div><p className="text-gray-500">Joined</p><p className="text-white">{new Date(user.createdAt).toLocaleDateString()}</p></div>
                <div><p className="text-gray-500">Email Verified</p>
                  <p className={user.verified ? 'text-green-400' : 'text-red-400'}>
                    {user.verified ? '✓ Verified' : '✗ Not Verified'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">Status</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div><p className="text-gray-500">Current Tier</p>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold uppercase">{user.tier}</span>
                </div>
                <div><p className="text-gray-500">KYC Status</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    kycStatus === 'approved' ? 'bg-green-500/20 text-green-400' :
                    kycStatus === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    kycStatus === 'under_review' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>{kycStatus}</span>
                </div>
                <div><p className="text-gray-500">Account Status</p>
                  <span className={user.isActive !== false ? 'text-green-400' : 'text-red-400'}>
                    {user.isActive !== false ? '● Active' : '● Suspended'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KYC Documents — show if business account has submitted docs */}
          {user.accountType === 'business' && user.kycStatus?.documents?.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Building className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Business Documents</h3>
                <span className="text-xs text-gray-500">({user.kycStatus.documents.length} files)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {user.kycStatus.documents.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-600">
                    <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{doc.originalName || doc.type}</p>
                      <p className="text-xs text-gray-500 capitalize">{doc.type?.replace(/_/g, ' ')}</p>
                    </div>
                  </a>
                ))}
              </div>
              {user.kycStatus?.diditVerifiedAt && (
                <p className="text-xs text-green-400 mt-2">
                  ✓ DiDIT identity verified on {new Date(user.kycStatus.diditVerifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Recent Escrows */}
          {!loadingDetails && userDetails?.escrows?.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h3 className="font-semibold text-white mb-3">Recent Escrows</h3>
              <div className="space-y-2">
                {userDetails.escrows.slice(0, 5).map((esc) => (
                  <div key={esc._id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-gray-400 text-xs">{esc.escrowId}</span>
                    <span className="text-white truncate mx-2 flex-1">{esc.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      esc.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      esc.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{esc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          <div className="border-t border-gray-700 pt-4 space-y-4">
            <h3 className="font-semibold text-white">Admin Actions</h3>

            {/* KYC Review */}
            {(kycStatus === 'under_review' || kycStatus === 'pending' || kycStatus === 'pending_documents') && (
              <div className="flex gap-3">
                <button onClick={() => handleKYCAction('approve')} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-semibold">
                  <CheckCircle className="w-4 h-4" /> Approve KYC
                </button>
                <button onClick={() => handleKYCAction('reject')} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-semibold">
                  <XCircle className="w-4 h-4" /> Reject KYC
                </button>
              </div>
            )}

            {/* Tier Change */}
            <div className="flex gap-3 items-center">
              <select value={newTier} onChange={(e) => setNewTier(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500">
                <option value="starter">Starter (Free)</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
                <option value="api">API</option>
              </select>
              <button onClick={handleTierChange} disabled={saving || newTier === user.tier}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-semibold">
                Change Tier
              </button>
            </div>

            {/* Suspend / Activate */}
            <button onClick={handleToggleStatus} disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
                user.isActive !== false
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}>
              <Ban className="w-4 h-4" />
              {user.isActive !== false ? 'Suspend Account' : 'Activate Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main UsersPage ─────────────────────────────────────────────────────────────
const UsersPage = ({ admin }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ verified: '', kycStatus: '', tier: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [filters, currentPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers({
        ...filters,
        page: currentPage,
        limit: 20,
        search
      });
      // FIX: backend returns response.data.users and response.data.pagination
      const data = response.data || response;
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || data.totalPages || 1);
      setTotalCount(data.pagination?.total || data.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getKYCBadge = (user) => {
    const status = user.kycStatus?.status || user.kycStatus || 'unverified';
    const colors = {
      approved:          'bg-green-500/20 text-green-400',
      rejected:          'bg-red-500/20 text-red-400',
      under_review:      'bg-purple-500/20 text-purple-400',
      pending_documents: 'bg-blue-500/20 text-blue-400',
      pending:           'bg-yellow-500/20 text-yellow-400',
      unverified:        'bg-gray-500/20 text-gray-400'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.unverified}`}>
        {status.replace(/_/g, ' ')}
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
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-sm text-gray-400">{totalCount.toLocaleString()} total users</p>
            </div>
          </div>
          <button onClick={fetchUsers} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500" />
            </div>
            <select value={filters.tier} onChange={(e) => { setFilters({ ...filters, tier: e.target.value }); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500">
              <option value="">All Tiers</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
              <option value="api">API</option>
            </select>
            <select value={filters.kycStatus} onChange={(e) => { setFilters({ ...filters, kycStatus: e.target.value }); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500">
              <option value="">All KYC</option>
              <option value="unverified">Unverified</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="pending_documents">Pending Docs</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">KYC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan="8" className="px-6 py-12 text-center">
                    <Loader className="w-8 h-8 text-red-600 animate-spin mx-auto" />
                  </td></tr>
                ) : users.length > 0 ? users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-700/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <p className="text-white font-medium text-sm">{user.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-xs capitalize">{user.accountType || 'individual'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold uppercase">{user.tier}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-300 text-sm">{user.email}</p>
                        {user.verified
                          ? <span className="text-xs text-green-400">✓ verified</span>
                          : <span className="text-xs text-yellow-400">✗ unverified</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getKYCBadge(user)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${user.isActive !== false ? 'text-green-400' : 'text-red-400'}`}>
                        {user.isActive !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-xs">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedUser(user)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500">No users found</td></tr>
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

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
};

export default UsersPage;
