// src/components/admin/AdminSidebar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  AlertTriangle,
  Users,
  BarChart3,
  CreditCard,
  Key,
  UserCog,
  LogOut,
  Shield,
  DollarSign
} from 'lucide-react';
import adminService from '../../services/adminService';

const AdminSidebar = ({ admin, activePage }) => {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard',
      permission: null  // always visible
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Receipt,
      path: '/admin/transactions',
      permission: 'viewTransactions'
    },
    {
      id: 'disputes',
      label: 'Disputes',
      icon: AlertTriangle,
      path: '/admin/disputes',
      permission: 'manageDisputes'
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      path: '/admin/users',
      permission: 'verifyUsers'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/admin/analytics',
      permission: 'viewAnalytics'
    },
    {
      id: 'fees',
      label: 'Fee Management',
      icon: DollarSign,
      path: '/admin/fees',
      permission: null,   // show to all admins — master controls via UI
      masterOnly: false
    },
    {
      id: 'payments',
      label: 'Payment Gateways',
      icon: CreditCard,
      path: '/admin/payments',
      permission: null,
      masterOnly: true
    },
    {
      id: 'api',
      label: 'API Management',
      icon: Key,
      path: '/admin/api',
      permission: null,
      masterOnly: true
    },
    {
      id: 'admins',
      label: 'Admin Management',
      icon: UserCog,
      path: '/admin/admins',
      permission: null,
      masterOnly: true
    }
  ];

  // FIX: safe permission check — if permission is null show to all;
  // masterOnly items only show to master role
  const isVisible = (item) => {
    if (item.masterOnly && admin?.role !== 'master') return false;
    if (!item.permission) return true;
    return admin?.permissions?.[item.permission] === true;
  };

  // FIX: actually clears token before navigating
  const handleLogout = () => {
    adminService.logout();
    navigate('/admin/login');
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-xl font-bold">SecureEscrow</h1>
            <p className="text-xs text-gray-400">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Admin Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold">{admin?.name?.charAt(0) || 'A'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{admin?.name || 'Admin'}</p>
            <p className="text-xs text-gray-400 capitalize">{admin?.role || 'admin'}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (!isVisible(item)) return null;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activePage === item.id
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
