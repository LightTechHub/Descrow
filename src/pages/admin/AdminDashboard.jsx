// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, DollarSign, Package, AlertCircle,
  TrendingUp, Shield, LogOut, Loader,
  RefreshCw, ChevronRight, LayoutDashboard,
  Settings, Key, CreditCard, UserCog, Menu, X, Banknote
} from 'lucide-react';
import { adminService } from '../../services/adminService';

// ── Sidebar navigation items ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, permission: null },
  { path: '/admin/users',        label: 'Users',        icon: Users,           permission: 'verifyUsers' },
  { path: '/admin/transactions', label: 'Transactions', icon: Package,         permission: 'viewTransactions' },
  { path: '/admin/disputes',     label: 'Disputes',     icon: AlertCircle,     permission: 'manageDisputes' },
  { path: '/admin/analytics',    label: 'Analytics',    icon: TrendingUp,      permission: 'viewAnalytics' },
  { path: '/admin/withdrawals',  label: 'Withdrawals',  icon: Banknote,        permission: 'viewTransactions' },
  { path: '/admin/platform',     label: 'Platform',     icon: Shield,          permission: null },
  { path: '/admin/admins',       label: 'Admins',       icon: UserCog,         masterOnly: true },
  { path: '/admin/fees',         label: 'Fee Settings', icon: Settings,        masterOnly: true },
  { path: '/admin/payments',     label: 'Payments',     icon: CreditCard,      masterOnly: true },
  { path: '/admin/api',          label: 'API Docs',     icon: Key,             masterOnly: true },
];

const Sidebar = ({ admin, onLogout, collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMaster = admin?.role === 'master';

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.masterOnly) return isMaster;
    if (item.permission) return isMaster || admin?.permissions?.[item.permission];
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-gray-900 border-r border-gray-700 z-30 transition-all duration-300 flex flex-col
        ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'}`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
          <Shield className="w-8 h-8 text-red-500 flex-shrink-0" />
          {!collapsed && (
            <div>
              <p className="text-white font-bold text-sm">Dealcross</p>
              <p className="text-red-400 text-xs uppercase font-semibold">Admin Portal</p>
            </div>
          )}
        </div>

        {/* Admin info */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-white text-sm font-semibold truncate">{admin?.name}</p>
            <p className="text-xs text-gray-400 truncate">{admin?.email}</p>
            <span className="inline-block mt-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full uppercase font-semibold">
              {admin?.role}
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium
                  ${isActive
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-gray-700">
          <button onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition text-sm font-medium
              ${collapsed ? 'justify-center' : ''}`}>
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

const AdminDashboard = ({ admin }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentEscrows, setRecentEscrows] = useState([]);
  const [recentDisputes, setRecentDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDashboardStats();
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

  const sidebarWidth = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64';

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <Sidebar
        admin={admin}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(s => !s)}
      />

      {/* Main content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarWidth}`}>

        {/* Top bar */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarCollapsed(s => !s)}
              className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400">
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
          </div>
          <button onClick={fetchDashboardData}
            className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        <main className="p-6 space-y-6">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Quick Nav */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { permission: 'viewTransactions', path: '/admin/transactions', icon: Package,     label: 'Transactions', color: 'text-blue-400',   count: stats?.totalEscrows },
              { permission: 'manageDisputes',   path: '/admin/disputes',     icon: AlertCircle, label: 'Disputes',     color: 'text-yellow-400', count: stats?.pendingDisputes },
              { permission: 'verifyUsers',      path: '/admin/users',        icon: Users,       label: 'Users',        color: 'text-green-400',  count: stats?.totalUsers },
              { permission: 'viewTransactions', path: '/admin/withdrawals',  icon: Banknote,    label: 'Withdrawals',  color: 'text-orange-400', count: null },
              { permission: null,               path: '/admin/platform',     icon: Shield,      label: 'Platform',     color: 'text-cyan-400',   count: null },
              { permission: 'viewAnalytics',    path: '/admin/analytics',    icon: TrendingUp,  label: 'Analytics',    color: 'text-purple-400', count: null }
            ].filter(item => admin?.role === 'master' || admin?.permissions?.[item.permission])
             .map((item) => {
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
                    <p className="text-xs text-gray-500 mt-0.5">{item.count?.toLocaleString()} total</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-white">Recent Escrows</h2>
                <button onClick={() => navigate('/admin/transactions')}
                  className="text-xs text-red-400 hover:text-red-300 transition">View all →</button>
              </div>
              <div className="divide-y divide-gray-700">
                {recentEscrows.length > 0 ? recentEscrows.slice(0, 5).map((escrow) => (
                  <div key={escrow._id} className="px-6 py-3 hover:bg-gray-700/40 transition">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="font-medium text-white text-sm truncate">
                          {escrow.title || escrow.itemName || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-400">{escrow.buyer?.name} → {escrow.seller?.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-green-400">₦{(escrow.amount || 0).toLocaleString()}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          escrow.status === 'completed' || escrow.status === 'paid_out' ? 'bg-green-500/20 text-green-400' :
                          escrow.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>{escrow.status?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm">No recent escrows</div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-white">Recent Disputes</h2>
                <button onClick={() => navigate('/admin/disputes')}
                  className="text-xs text-red-400 hover:text-red-300 transition">View all →</button>
              </div>
              <div className="divide-y divide-gray-700">
                {recentDisputes.length > 0 ? recentDisputes.slice(0, 5).map((dispute) => (
                  <div key={dispute._id} className="px-6 py-3 hover:bg-gray-700/40 transition">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="font-medium text-white text-sm capitalize">
                          {dispute.reason?.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-400">{dispute.escrow?.escrowId || '—'} · {dispute.initiatedBy?.name}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        dispute.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                        dispute.status === 'under_review' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{dispute.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                  </div>
                )) : (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm">No recent disputes</div>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
