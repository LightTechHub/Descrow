// src/pages/admin/AdminManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Plus, Loader, Edit, Trash2,
  UserX, UserCheck, X, RefreshCw
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const PERMISSION_LABELS = {
  viewTransactions: 'View Transactions',
  manageDisputes:   'Manage Disputes',
  verifyUsers:      'Verify Users',
  viewAnalytics:    'View Analytics',
  managePayments:   'Manage Payments',
  manageAPI:        'Manage API',
  manageAdmins:     'Manage Admins'
};

const DEFAULT_PERMISSIONS = {
  viewTransactions: false,
  manageDisputes:   false,
  verifyUsers:      false,
  viewAnalytics:    false,
  managePayments:   false,
  manageAPI:        false,
  manageAdmins:     false
};

// ── Permissions Checklist ─────────────────────────────────────────────────────
const PermissionsChecklist = ({ permissions, onChange }) => (
  <div className="space-y-2 bg-gray-900 rounded-lg p-4 border border-gray-700">
    {Object.keys(PERMISSION_LABELS).map((key) => (
      <label key={key} className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={!!permissions[key]}
          onChange={(e) => onChange({ ...permissions, [key]: e.target.checked })}
          className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500"
        />
        <span className="text-sm text-gray-300 group-hover:text-white transition">
          {PERMISSION_LABELS[key]}
        </span>
      </label>
    ))}
  </div>
);

// ── Create Modal ──────────────────────────────────────────────────────────────
const CreateAdminModal = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    permissions: { ...DEFAULT_PERMISSIONS }
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminService.createSubAdmin(formData);
      toast.success('Sub-admin created successfully');
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create sub-admin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Create Sub-Admin</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
            <input type="text" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500"
              placeholder="John Doe" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
            <input type="email" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500"
              placeholder="admin@company.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
            <input type="password" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500"
              placeholder="Minimum 8 characters" required minLength={8} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
            <PermissionsChecklist
              permissions={formData.permissions}
              onChange={(perms) => setFormData({ ...formData, permissions: perms })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
              {saving ? <><Loader className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Sub-Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit Permissions Modal ────────────────────────────────────────────────────
const EditPermissionsModal = ({ adminUser, onClose, onUpdated }) => {
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMISSIONS, ...adminUser.permissions });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminService.updateAdminPermissions(adminUser._id, permissions);
      toast.success('Permissions updated successfully');
      onUpdated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Permissions</h2>
            <p className="text-sm text-gray-400 mt-0.5">{adminUser.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <PermissionsChecklist permissions={permissions} onChange={setPermissions} />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
              {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminManagementPage = ({ admin }) => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAdmins();
      // FIX: handle both response.data.admins and response.admins
      const data = response.data || response;
      setAdmins(data.admins || []);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (adminId, currentStatus) => {
    const action = currentStatus === 'active' ? 'suspend' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this admin?`)) return;
    try {
      await adminService.toggleAdminStatus(adminId);
      toast.success(`Admin ${action}d`);
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (adminId, adminName) => {
    if (!window.confirm(`Delete sub-admin "${adminName}"? This cannot be undone.`)) return;
    try {
      await adminService.deleteSubAdmin(adminId);
      toast.success('Sub-admin deleted');
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete admin');
    }
  };

  // Only master admins can access this page
  if (admin?.role !== 'master') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-white font-semibold">Access Denied</p>
          <p className="text-gray-400 text-sm">Only master admins can manage sub-admins</p>
          <button onClick={() => navigate('/admin/dashboard')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-white">Admin Management</h1>
              <p className="text-sm text-gray-400">{admins.length} admin accounts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAdmins} className="p-2 hover:bg-gray-700 rounded-lg transition">
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold">
              <Plus className="w-4 h-4" /> Create Sub-Admin
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Permissions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center">
                    <Loader className="w-8 h-8 text-red-600 animate-spin mx-auto" />
                  </td></tr>
                ) : admins.length > 0 ? admins.map((adminUser) => (
                  <tr key={adminUser._id} className="hover:bg-gray-700/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                          {adminUser.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{adminUser.name}</p>
                          <p className="text-gray-400 text-xs">{adminUser.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        adminUser.role === 'master' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {adminUser.role === 'master' ? 'Master' : 'Sub-Admin'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {adminUser.role === 'master' ? (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">All Access</span>
                        ) : (
                          Object.entries(adminUser.permissions || {})
                            .filter(([, v]) => v)
                            .map(([key]) => (
                              <span key={key} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                                {PERMISSION_LABELS[key] || key}
                              </span>
                            ))
                        )}
                        {adminUser.role !== 'master' &&
                          !Object.values(adminUser.permissions || {}).some(Boolean) && (
                          <span className="text-gray-500 text-xs">No permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${
                        adminUser.status === 'active' || adminUser.isActive !== false
                          ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {adminUser.status === 'active' || adminUser.isActive !== false ? '● Active' : '● Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-xs">
                        {new Date(adminUser.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {adminUser.role !== 'master' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditingAdmin(adminUser)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                            title="Edit Permissions">
                            <Edit className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(adminUser._id, adminUser.status || (adminUser.isActive !== false ? 'active' : 'suspended'))}
                            className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition"
                            title={adminUser.status === 'active' ? 'Suspend' : 'Activate'}>
                            {adminUser.status === 'active' || adminUser.isActive !== false
                              ? <UserX className="w-4 h-4 text-white" />
                              : <UserCheck className="w-4 h-4 text-white" />
                            }
                          </button>
                          <button onClick={() => handleDelete(adminUser._id, adminUser.name)}
                            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                            title="Delete">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">Protected</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No admins found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showCreate && (
        <CreateAdminModal onClose={() => setShowCreate(false)} onCreated={fetchAdmins} />
      )}
      {editingAdmin && (
        <EditPermissionsModal
          adminUser={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onUpdated={fetchAdmins}
        />
      )}
    </div>
  );
};

export default AdminManagementPage;
