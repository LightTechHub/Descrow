// File: src/pages/Profile/ProfilePage.jsx - CORRECTED IMPORTS
import React, { useState, useEffect, useCallback } from 'react';
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
  Mail
} from 'lucide-react';
import ProfileTab from './ProfileTab';
import KYCTab from './KYCTab'; // ✅ KEEP this import
import SecurityTab from './SecurityTab';
import SettingsTab from './SettingsTab';
import BankAccountTab from '../../components/Profile/BankAccountTab';
import profileService from 'services/profileService';
import { authService } from 'services/authService';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await profileService.getProfile();
      
      if (response.success) {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKYCStatus = useCallback(async () => {
    try {
      const response = await profileService.getKYCStatus();
      if (response.success) {
        setKycStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    }
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const tab = searchParams.get('tab');
    if (tab && ['profile', 'kyc', 'bank-accounts', 'security', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }

    fetchProfile();
    fetchKYCStatus();
  }, [fetchProfile, fetchKYCStatus, navigate, searchParams]);

  const handleTabChange = (tab) => {
    // ✅ FIXED: Only block bank accounts if KYC not approved
    if (tab === 'bank-accounts') {
      if (!user?.verified) {
        toast.error('Please verify your email first');
        return;
      }
      if (!kycStatus?.isKYCVerified || kycStatus?.status !== 'approved') {
        toast.error('Complete KYC verification to add bank accounts');
        return;
      }
    }
    
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleProfileUpdate = () => {
    fetchProfile();
    fetchKYCStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'kyc', label: 'Verification', icon: FileCheck },
    { id: 'bank-accounts', label: 'Bank Accounts', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // ✅ Check full verification status
  const isEmailVerified = user?.verified;
  const isKYCVerified = kycStatus?.isKYCVerified && kycStatus?.status === 'approved';
  const canAccessEscrowFeatures = isEmailVerified && isKYCVerified;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
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
            {/* Avatar */}
            <div className="relative">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-gray-800 shadow-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                  {user.tier?.toUpperCase() || 'FREE'}
                </span>
                {isEmailVerified && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
                    ✓ Email Verified
                  </span>
                )}
                {isKYCVerified && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
                    ✓ KYC Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ✅ FIXED: Email Verification Warning (First Priority) */}
          {!isEmailVerified && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Verify Your Email Address
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Check your inbox for the verification email we sent you. You must verify your email before you can complete KYC verification.
                  </p>
                </div>
                <button
                  onClick={() => {/* TODO: Resend verification email */}}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition whitespace-nowrap"
                >
                  Resend Email
                </button>
              </div>
            </div>
          )}

          {/* ✅ KYC Warning (Only show if email is verified) */}
          {isEmailVerified && !isKYCVerified && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Complete KYC Verification
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {kycStatus?.status === 'pending' 
                      ? 'Your KYC documents are under review. This usually takes 24-48 hours.'
                      : kycStatus?.status === 'rejected'
                      ? `Your KYC was rejected: ${kycStatus.rejectionReason || 'Please resubmit with correct information.'}`
                      : 'You need to verify your identity to create escrows and add bank accounts for payouts.'
                    }
                  </p>
                </div>
                {kycStatus?.status !== 'pending' && (
                  <button
                    onClick={() => handleTabChange('kyc')}
                    className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition whitespace-nowrap"
                  >
                    {kycStatus?.status === 'rejected' ? 'Resubmit KYC' : 'Verify Now'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                // ✅ FIXED: Disable logic
                let isDisabled = false;
                let disabledReason = '';
                
                if (tab.id === 'kyc' && !isEmailVerified) {
                  isDisabled = true;
                  disabledReason = 'Verify email first';
                } else if (tab.id === 'bank-accounts') {
                  if (!isEmailVerified) {
                    isDisabled = true;
                    disabledReason = 'Verify email first';
                  } else if (!isKYCVerified) {
                    isDisabled = true;
                    disabledReason = 'Complete KYC first';
                  }
                }

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
                    title={isDisabled ? disabledReason : ''}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                    {isDisabled && (
                      <span className="ml-auto text-xs text-gray-400">🔒</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ✅ Payout Information (only show if fully verified) */}
            {canAccessEscrowFeatures && (
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-2">
                  💰 Automatic Payouts
                </h4>
                <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <p><strong>NGN:</strong> Paystack → Bank Transfer</p>
                  <p><strong>USD/Foreign:</strong> Flutterwave → Bank/Crypto</p>
                  <p><strong>Crypto:</strong> NowPayments → Wallet</p>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                  Funds auto-transfer within 24h of escrow completion
                </p>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <ProfileTab user={user} onUpdate={handleProfileUpdate} />
            )}
            {activeTab === 'kyc' && (
              <KYCTab user={user} onUpdate={handleProfileUpdate} />
            )}
            {activeTab === 'bank-accounts' && (
              <BankAccountTab 
                user={user} 
                onUpdate={handleProfileUpdate}
                kycVerified={canAccessEscrowFeatures}
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab user={user} onUpdate={handleProfileUpdate} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab user={user} onUpdate={handleProfileUpdate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;