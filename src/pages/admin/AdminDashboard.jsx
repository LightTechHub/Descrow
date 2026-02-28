// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, DollarSign, Package, AlertCircle,
  TrendingUp, Activity, Shield, LogOut, Loader,
  RefreshCw, ChevronRight
} from 'lucide-react';
import { adminService } from '../../services/adminService';

const AdminDashboard = ({ admin }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentEscrows, setRecentEscrows] = useState([]);
  const [recentDisputes, setRecentDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDashboardStats();
      // FIX: handle both response.data and direct response
      const data = response.data || response;
      setStats(data.stats || data);
      setRecentEscrows(data.recentEscrows || []);
      setRecentDisputes(data.recentDisputes || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // FIX: use adminService.logout() to clear token properly
  const handleLogout = () => {
    adminService.logout();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-red-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: (stats?.totalUsers || 0).toLocaleString(),
      sub: `+${stats?.todayUsers || 0} today`,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20'
    },
    {
      label: 'Total Escrows',
      value: (stats?.totalEscrows || 0).toLocaleString(),
      sub: `${stats?.activeEscrows || 0} active`,
      icon: Package,
      color: 'text-green-400',
      bg: 'bg-green-500/20'
    },
    {
      label: 'Total Revenue',
      value: `₦${(stats?.totalRevenue || 0).toLocaleString()}`,
      sub: `${stats?.completedEscrows || 0} completed`,
      icon: DollarSign,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20'
    },
    {
      label: 'Open Disputes',
      value: (stats?.pendingDisputes || 0).toLocaleString(),
      sub: stats?.pendingDisputes > 0 ? 'Needs attention' : 'All clear',
      icon: AlertCircle,
      color: stats?.pendingDisputes > 0 ? 'text-red-400' : 'text-green-400',
      bg: stats?.pendingDisputes > 0 ? 'bg-red-500/20' : 'bg-green-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-400">Welcome back, {admin?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchDashboardData}
                className="p-2 hover:bg-gray-700 rounded-lg transition">
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
              <div className="text-right hidden md:block">
                <p className="text-xs text-gray-400">Role</p>
                <p className="text-sm font-semibold text-red-400 uppercase">{admin?.role}</p>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition">
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-gray-800 rounded-lg border border-gray-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white mb-0.5">{card.value}</p>
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { permission: 'viewTransactions', path: '/admin/transactions', icon: Package, label: 'Transactions', color: 'text-blue-400', count: stats?.totalEscrows },
            { permission: 'manageDisputes', path: '/admin/disputes', icon: AlertCircle, label: 'Disputes', color: 'text-yellow-400', count: stats?.pendingDisputes },
            { permission: 'verifyUsers', path: '/admin/users', icon: Users, label: 'Users', color: 'text-green-400', count: stats?.totalUsers },
            { permission: 'viewAnalytics', path: '/admin/analytics', icon: TrendingUp, label: 'Analytics', color: 'text-purple-400', count: null }
          ].filter(item => admin?.permissions?.[item.permission]).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition text-left group">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-7 h-7 ${item.color}`} />
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition" />
                </div>
                <p className="font-semibold text-white text-sm">{item.label}</p>
                {item.count !== null && item.count !== undefined && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.count.toLocaleString()} total</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Escrows */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Escrows</h2>
              {admin?.permissions?.viewTransactions && (
                <button onClick={() => navigate('/admin/transactions')}
                  className="text-xs text-red-400 hover:text-red-300 transition">
                  View all →
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-700">
              {recentEscrows.length > 0 ? recentEscrows.slice(0, 5).map((escrow) => (
                <div key={escrow._id} className="px-6 py-3 hover:bg-gray-700/40 transition">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-medium text-white text-sm truncate">
                        {escrow.title || escrow.itemName || 'Untitled'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {escrow.buyer?.name} → {escrow.seller?.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-green-400">
                        ₦{(escrow.amount || 0).toLocaleString()}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        escrow.status === 'completed' || escrow.status === 'paid_out'
                          ? 'bg-green-500/20 text-green-400'
                          : escrow.status === 'disputed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {escrow.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">No recent escrows</div>
              )}
            </div>
          </div>

          {/* Recent Disputes */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Disputes</h2>
              {admin?.permissions?.manageDisputes && (
                <button onClick={() => navigate('/admin/disputes')}
                  className="text-xs text-red-400 hover:text-red-300 transition">
                  View all →
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-700">
              {recentDisputes.length > 0 ? recentDisputes.slice(0, 5).map((dispute) => (
                <div key={dispute._id} className="px-6 py-3 hover:bg-gray-700/40 transition">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-medium text-white text-sm capitalize">
                        {dispute.reason?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {dispute.escrow?.escrowId || '—'} · {dispute.initiatedBy?.name}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      dispute.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                      dispute.status === 'under_review' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {dispute.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(dispute.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">No recent disputes</div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;
