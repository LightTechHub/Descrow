// File: src/pages/Profile/ProfilePage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Shield, 
  Settings, 
  FileCheck, 
  CreditCard,
  ArrowLeft,
  Loader,
  AlertTriangle,
  Mail,
  Bug,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import ProfileTab from './ProfileTab';
import KYCTab from './KYCTab';
import SecurityTab from './SecurityTab';
import SettingsTab from './SettingsTab';
import BankAccountTab from '../../components/Profile/BankAccountTab';
import profileService from '../../services/profileService';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState({ status: 'unverified', isKYCVerified: false });
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState(null);
  const [fixing, setFixing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  const hasFetched = useRef(false);
  const pollIntervalRef = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const [profileResponse, kycResponse] = await Promise.allSettled([
        profileService.getProfile(),
        profileService.getKYCStatus()
      ]);

      if (profileResponse.status === 'fulfilled' && profileResponse.value.success) {
        const profileData = profileResponse.value.data;
        setUser(profileData);
      }

      if (kycResponse.status === 'fulfilled' && kycResponse.value.success) {
        const kycData = kycResponse.value.data;
        setKycStatus(kycData);
        
        // Stop polling if KYC is approved
        if (kycData.status === 'approved' && kycData.isKYCVerified) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } else {
        setKycStatus({ status: 'unverified', isKYCVerified: false });
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (!silent) toast.error('Failed to load profile data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [navigate]);

  // Poll for KYC status updates when on KYC tab
  useEffect(() => {
    if (activeTab === 'kyc' && kycStatus?.status !== 'approved') {
      pollIntervalRef.current = setInterval(() => {
        console.log('🔄 Polling KYC status...');
        fetchData(true);
      }, 10000);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [activeTab, kycStatus?.status, fetchData]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [fetchData]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'kyc', 'bank-accounts', 'security', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
    
    if (tab === 'bank-accounts') {
      const isEmailVerified = user?.verified;
      const isKYCApproved = kycStatus?.isKYCVerified && kycStatus?.status === 'approved';
      
      if (!isEmailVerified) {
        toast.error('Please verify your email first');
        return;
      }
      if (!isKYCApproved) {
        toast.error('Complete KYC verification to add bank accounts');
        return;
      }
    }
  };

  const handleProfileUpdate = () => {
    hasFetched.current = false;
    fetchData();
  };

  const handleShowDebugInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://descrow-backend-5ykg.onrender.com/api/users/debug/kyc-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const debugData = await response.json();
      setDebugInfo(debugData.data || debugData);
      console.log('🔍 Debug Info from API:', debugData);
      setShowDebug(true);
    } catch (error) {
      console.error('Debug fetch error:', error);
      toast.error('Failed to fetch debug info');
    }
  };

  const handleForceFixKYC = async () => {
    try {
      setFixing(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Not authenticated. Please login again.');
        return;
      }
      
      console.log('🔄 Attempting to force sync KYC status...');
      
      const response = await fetch('https://descrow-backend-5ykg.onrender.com/api/users/kyc/force-sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('📥 Force sync result:', data);
      
      if (data.success) {
        toast.success('✅ KYC status synced successfully!');
        hasFetched.current = false;
        await fetchData();
        await handleShowDebugInfo();
      } else {
        toast.error('❌ Failed to sync: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Force fix error:', error);
      toast.error('Failed to sync KYC status');
    } finally {
      setFixing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Profile Not Found
          </h3>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'kyc', label: 'Verification', icon: FileCheck },
    { id: 'bank-accounts', label: 'Bank Accounts', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const isEmailVerified = user?.verified;
  const isKYCApproved = kycStatus?.isKYCVerified && kycStatus?.status === 'approved';
  const canAccessEscrowFeatures = isEmailVerified && isKYCApproved;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-gray-800 shadow-lg">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.name || 'User'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                  {(user.tier || 'FREE').toUpperCase()}
                </span>
                {isEmailVerified && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Email Verified
                  </span>
                )}
                {isKYCApproved ? (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    KYC Verified
                  </span>
                ) : (
                  <button
                    onClick={() => handleTabChange('kyc')}
                    className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium rounded-full transition"
                  >
                    Verify Now
                  </button>
                )}
              </div>
            </div>
          </div>

          {!isEmailVerified && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Verify Your Email Address
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Check your inbox for the verification email.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isEmailVerified && !isKYCApproved && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Complete KYC Verification
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Verify your identity to create escrows and add bank accounts.
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange('kyc')}
                  className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition whitespace-nowrap"
                >
                  Verify Now
                </button>
              </div>
            </div>
          )}

          {/* Debug Tools */}
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
                <h3 className="font-bold text-yellow-900 dark:text-yellow-200">
                  🔧 Debug Tools
                </h3>
              </div>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-yellow-700 dark:text-yellow-400 hover:underline"
              >
                {showDebug ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showDebug && (
              <div className="space-y-2">
                <button
                  onClick={handleShowDebugInfo}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Bug className="w-4 h-4" />
                  Show Debug Info
                </button>
                
                <button
                  onClick={handleForceFixKYC}
                  disabled={fixing}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {fixing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Force Fix KYC
                    </>
                  )}
                </button>
                
                {debugInfo && (
                  <div className="mt-3 p-3 bg-gray-900 text-green-400 text-xs rounded-lg overflow-auto max-h-60 font-mono">
                    <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                let isDisabled = false;
                if (tab.id === 'kyc' && !isEmailVerified) isDisabled = true;
                if (tab.id === 'bank-accounts' && (!isEmailVerified || !isKYCApproved)) isDisabled = true;

                return (
                  <button
                    key={tab.id}
                    onClick={() => !isDisabled && handleTabChange(tab.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-left transition ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : isDisabled
                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{tab.label}</span>
                    {isDisabled && <span className="text-xs">🔒</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3">
            {activeTab === 'profile' && <ProfileTab user={user} onUpdate={handleProfileUpdate} />}
            {activeTab === 'kyc' && <KYCTab user={user} onUpdate={handleProfileUpdate} />}
            {activeTab === 'bank-accounts' && <BankAccountTab user={user} onUpdate={handleProfileUpdate} kycVerified={canAccessEscrowFeatures} />}
            {activeTab === 'security' && <SecurityTab user={user} onUpdate={handleProfileUpdate} />}
            {activeTab === 'settings' && <SettingsTab user={user} onUpdate={handleProfileUpdate} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;