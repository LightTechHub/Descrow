import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard,
  ShoppingCart,
  Store,
  List,
  Bell,
  Settings,
  LogOut,
  Plus
} from 'lucide-react';

import BusinessOverviewTab from '../components/Dashboard/BusinessOverviewTab';
import OverviewTab from '../components/Dashboard/OverviewTab';
import BuyingTab from '../components/Dashboard/BuyingTab';
import SellingTab from '../components/Dashboard/SellingTab';
import CreateEscrowModal from '../components/CreateEscrowModal';

import { authService } from '../services/authService';
import profileService from '../services/profileService';
import notificationService from '../services/notificationService';

const UnifiedDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUser, setLoadingUser] = useState(true);
  
  useEffect(() => {
    fetchUserData();
    
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'buying', 'selling', 'all'].includes(tab)) {
      setActiveTab(tab);
    }

    const action = searchParams.get('action');
    if (action === 'create') {
      setShowCreateModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }

    fetchUnreadCount();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoadingUser(true);
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      console.log('🔄 Fetching fresh user data from API...');
      const response = await profileService.getProfile();
      
      if (response.success && response.data?.user) {
        const freshUser = response.data.user;
        console.log('✅ Fresh user data:', {
          email: freshUser.email,
          verified: freshUser.verified,
          isKYCVerified: freshUser.isKYCVerified,
          kycStatus: freshUser.kycStatus?.status,
          accountType: freshUser.accountType
        });
        
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      } else {
        console.warn('⚠️ API failed, using cached user');
        setUser(currentUser);
      }
    } catch (error) {
      console.error('❌ Failed to fetch user data:', error);
      
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/login');
      }
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getNotifications(1, 1, true);
      if (response.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleLogout = () => {
    authService.logout();
  };

  const handleOpenCreateModal = async () => {
    console.log('🎯 Opening create modal - refreshing user data first...');
    
    try {
      const response = await profileService.getProfile();
      if (response.success && response.data?.user) {
        const freshUser = response.data.user;
        console.log('✅ Refreshed user before modal:', {
          verified: freshUser.verified,
          isKYCVerified: freshUser.isKYCVerified,
          kycStatus: freshUser.kycStatus?.status
        });
        setUser(freshUser);
      }
    } catch (error) {
      console.error('⚠️ Failed to refresh user, using cached:', error);
    }
    
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    window.location.reload();
  };

  if (loadingUser || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'buying', label: 'Buying', icon: ShoppingCart },
    { id: 'selling', label: 'Selling', icon: Store },
    { id: 'all', label: 'All Transactions', icon: List }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Title & User Info */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.accountType === 'business' && user.businessInfo?.companyName 
                  ? user.businessInfo.companyName 
                  : 'Dashboard'
                }
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Welcome back, {user.name}
              </p>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Create Button */}
              <button
                onClick={handleOpenCreateModal}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                Create Escrow
              </button>

              {/* Notifications */}
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Profile */}
              <button
                onClick={() => navigate('/profile')}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <Settings className="w-6 h-6" />
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-2 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          user.accountType === 'business' ? (
            <BusinessOverviewTab user={user} />
          ) : (
            <OverviewTab user={user} />
          )
        )}
        {activeTab === 'buying' && <BuyingTab user={user} />}
        {activeTab === 'selling' && <SellingTab user={user} />}
        {activeTab === 'all' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                All Transactions
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Combined view of all your buying and selling transactions
              </p>
            </div>
            <BuyingTab user={user} />
            <div className="border-t border-gray-200 dark:border-gray-800 my-8"></div>
            <SellingTab user={user} />
          </div>
        )}
      </main>

      {/* Floating Create Button (Mobile) */}
      <button
        onClick={handleOpenCreateModal}
        className="sm:hidden fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition z-50"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create Escrow Modal */}
      {showCreateModal && (
        <CreateEscrowModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default UnifiedDashboard;