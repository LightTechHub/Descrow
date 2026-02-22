// src/pages/Profile/ProfilePage.jsx
// COMPLETE FIXED VERSION - PROPERLY LOADS AND DISPLAYS BUSINESS INFO
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Shield, Settings, FileCheck, CreditCard, ArrowLeft, Loader,
  AlertTriangle, Mail, CheckCircle, Camera, Crown, TrendingUp, Code
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const hasFetched = useRef(false);
  const pollIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Get full profile data from API (this includes businessInfo)
      const [profileResponse, kycResponse] = await Promise.allSettled([
        profileService.getProfile(),
        profileService.getKYCStatus()
      ]);

      if (profileResponse.status === 'fulfilled' && profileResponse.value.success) {
        const profileData = profileResponse.value.data;
        const userData = profileData.user || profileData;
        
        // Log to see what we're getting
        console.log('📊 Profile data loaded:', userData);
        console.log('🏢 Business info:', userData.businessInfo);
        console.log('📧 Email:', userData.email);
        
        if (!userData.kycStatus) {
          userData.kycStatus = {
            status: 'unverified',
            tier: 'basic',
            documents: [],
            personalInfo: {},
            businessInfo: {}
          };
        }
        
        setUser(userData);
      }

      if (kycResponse.status === 'fulfilled' && kycResponse.value.success) {
        const kycData = kycResponse.value.data;
        setKycStatus(kycData);
        
        const isVerified = kycData.isKYCVerified && 
                          (kycData.status === 'approved' || kycData.status === 'completed');
        
        if (isVerified && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        setKycStatus({ 
          status: 'unverified', 
          tier: 'basic',
          isKYCVerified: false,
          documents: [],
          personalInfo: {},
          businessInfo: {}
        });
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (!silent) toast.error('Failed to load profile data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const isVerified = kycStatus?.isKYCVerified && 
                      (kycStatus?.status === 'approved' || kycStatus?.status === 'completed');
    
    if (activeTab === 'kyc' && !isVerified) {
      pollIntervalRef.current = setInterval(() => {
        fetchData(true);
      }, 10000);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [activeTab, kycStatus?.isKYCVerified, kycStatus?.status, fetchData]);

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
      const isKYCApproved = kycStatus?.isKYCVerified === true;
      
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await profileService.uploadAvatar(file);

      if (response.success) {
        toast.success('Profile picture updated successfully');
        
        setUser(prev => ({
          ...prev,
          profilePicture: response.data.profilePicture || response.data.avatarUrl
        }));
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div 
          className="rounded-full h-8 w-8 border-b-2 border-blue-600"
          style={{ 
            animation: 'spin 1s linear infinite',
            borderBottomColor: '#2563eb',
            borderRightColor: 'transparent',
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent'
          }}
        ></div>
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Unable to load user profile
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
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

  const isEmailVerified = user?.verified === true;
  const isKYCApproved = kycStatus?.isKYCVerified === true;
  const canAccessEscrowFeatures = isEmailVerified && isKYCApproved;

  const getTierInfo = (tier) => {
    const tiers = {
      free: { name: 'Free', color: 'gray', icon: Shield },
      starter: { name: 'Starter', color: 'blue', icon: Shield },
      growth: { name: 'Growth', color: 'green', icon: TrendingUp },
      enterprise: { name: 'Enterprise', color: 'purple', icon: Crown },
      api: { name: 'API', color: 'indigo', icon: Code }
    };
    return tiers[tier?.toLowerCase()] || tiers.free;
  };

  const tierInfo = getTierInfo(user.tier);

  // ===== FIXED: Get display name based on account type =====
  const getDisplayName = () => {
    if (user.accountType === 'business') {
      // For business accounts, show company name first
      console.log('🏢 Business account - companyName:', user.businessInfo?.companyName);
      return user.businessInfo?.companyName || user.name || 'Business Account';
    } else {
      // For individual accounts, show personal name
      return user.name || 'User';
    }
  };

  // ===== FIXED: Debug what we have =====
  console.log('👤 Current user data:', {
    accountType: user.accountType,
    name: user.name,
    businessInfo: user.businessInfo,
    companyName: user.businessInfo?.companyName
  });

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
            {/* Avatar Section */}
            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              
              {user.profilePicture ? (
                <img
                  src={(() => {
                    const url = user.profilePicture;
                    if (url.startsWith('http')) return url;
                    if (url.startsWith('/')) return `${process.env.REACT_APP_API_URL || ''}${url}`;
                    return `${process.env.REACT_APP_API_URL || ''}/uploads/avatars/${url}`;
                  })()}
                  alt={getDisplayName()}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.querySelector('.fallback-avatar').classList.remove('hidden');
                  }}
                />
              ) : null}
              
              {/* Fallback Avatar - SOLID BLUE */}
              <div className={`w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-gray-800 shadow-lg ${user.profilePicture ? 'hidden' : ''} fallback-avatar`}>
                {user.accountType === 'business' 
                  ? (user.businessInfo?.companyName?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || 'B')
                  : (user.name?.charAt(0).toUpperCase() || 'U')
                }
              </div>
              
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploadingAvatar ? (
                  <div 
                    className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                    style={{ animation: 'spin 1s linear infinite' }}
                  ></div>
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
            </div>

            <div className="flex-1">
              {/* ===== FIXED: Display Name - Company name for business ===== */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getDisplayName()}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              
              {/* ===== FIXED: Show owner name for business accounts ===== */}
              {user.accountType === 'business' && user.name && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  <User className="w-3 h-3 inline mr-1" />
                  Owner: {user.name}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => navigate('/upgrade')}
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition hover:shadow-md ${
                    tierInfo.color === 'gray' ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-200' :
                    tierInfo.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 hover:bg-blue-200' :
                    tierInfo.color === 'green' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 hover:bg-green-200' :
                    tierInfo.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 hover:bg-purple-200' :
                    'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200'
                  }`}
                  title="Click to upgrade tier"
                >
                  <tierInfo.icon className="w-3 h-3" />
                  {tierInfo.name.toUpperCase()} TIER
                  {user.tier !== 'enterprise' && user.tier !== 'api' && (
                    <span className="ml-1">↗</span>
                  )}
                </button>

                {user.accountType && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.accountType === 'business'
                      ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
                      : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                  }`}>
                    {user.accountType === 'business' ? '🏢 BUSINESS' : '👤 INDIVIDUAL'}
                  </span>
                )}

                {isEmailVerified && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Email Verified
                  </span>
                )}
                {isKYCApproved && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Identity Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isEmailVerified && <EmailVerificationWarning />}
          {isEmailVerified && !isKYCApproved && (
            <KYCVerificationWarning 
              kycStatus={kycStatus} 
              onVerifyClick={() => handleTabChange('kyc')}
            />
          )}

          {['free', 'starter', 'growth'].includes(user.tier?.toLowerCase()) && canAccessEscrowFeatures && (
            <TierUpgradeCTA currentTier={user.tier} navigate={navigate} />
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <TabSidebar 
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isEmailVerified={isEmailVerified}
              isKYCApproved={isKYCApproved}
            />
            {canAccessEscrowFeatures && <PayoutInfo />}
          </div>

          <div className="lg:col-span-3">
            <TabContent 
              activeTab={activeTab}
              user={user}
              kycStatus={kycStatus}
              onUpdate={handleProfileUpdate}
              kycVerified={canAccessEscrowFeatures}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const TierUpgradeCTA = ({ currentTier, navigate }) => {
  const getUpgradeMessage = () => {
    switch (currentTier?.toLowerCase()) {
      case 'free':
        return {
          message: 'Upgrade to Starter for more transactions and lower fees',
          nextTier: 'Starter',
          color: 'blue'
        };
      case 'starter':
        return {
          message: 'Upgrade to Growth for milestone payments and unlimited transactions',
          nextTier: 'Growth',
          color: 'green'
        };
      case 'growth':
        return {
          message: 'Upgrade to Enterprise for API access and custom branding',
          nextTier: 'Enterprise',
          color: 'purple'
        };
      default:
        return null;
    }
  };

  const upgradeInfo = getUpgradeMessage();
  if (!upgradeInfo) return null;

  return (
    <div className={`mt-4 bg-${
      upgradeInfo.color === 'blue' ? 'blue' :
      upgradeInfo.color === 'green' ? 'green' :
      'purple'
    }-50 dark:bg-${
      upgradeInfo.color === 'blue' ? 'blue' :
      upgradeInfo.color === 'green' ? 'green' :
      'purple'
    }-900/20 border border-${
      upgradeInfo.color === 'blue' ? 'blue' :
      upgradeInfo.color === 'green' ? 'green' :
      'purple'
    }-200 dark:border-${
      upgradeInfo.color === 'blue' ? 'blue' :
      upgradeInfo.color === 'green' ? 'green' :
      'purple'
    }-800 rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <Crown className={`w-6 h-6 text-${
          upgradeInfo.color === 'blue' ? 'blue' :
          upgradeInfo.color === 'green' ? 'green' :
          'purple'
        }-600 flex-shrink-0`} />
        <div className="flex-1">
          <p className={`text-sm font-semibold text-${
            upgradeInfo.color === 'blue' ? 'blue' :
            upgradeInfo.color === 'green' ? 'green' :
            'purple'
          }-900 dark:text-${
            upgradeInfo.color === 'blue' ? 'blue' :
            upgradeInfo.color === 'green' ? 'green' :
            'purple'
          }-200`}>
            Unlock More Features
          </p>
          <p className={`text-sm mt-1 text-${
            upgradeInfo.color === 'blue' ? 'blue' :
            upgradeInfo.color === 'green' ? 'green' :
            'purple'
          }-800 dark:text-${
            upgradeInfo.color === 'blue' ? 'blue' :
            upgradeInfo.color === 'green' ? 'green' :
            'purple'
          }-300`}>
            {upgradeInfo.message}
          </p>
        </div>
        <button
          onClick={() => navigate('/upgrade')}
          className={`px-6 py-2.5 bg-${
            upgradeInfo.color === 'blue' ? 'blue' :
            upgradeInfo.color === 'green' ? 'green' :
            'purple'
          }-600 hover:bg-${
            upgradeInfo.color === 'blue' ? 'blue' :
            upgradeInfo.color === 'green' ? 'green' :
            'purple'
          }-700 text-white text-sm font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2`}
        >
          <Crown className="w-4 h-4" />
          Upgrade to {upgradeInfo.nextTier}
        </button>
      </div>
    </div>
  );
};

const EmailVerificationWarning = () => (
  <div className="mt-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-4">
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
);

const KYCVerificationWarning = ({ kycStatus, onVerifyClick }) => {
  let message = 'Complete identity verification to unlock all features.';
  let buttonText = 'Start Verification';
  
  if (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress') {
    message = 'Your identity verification is being reviewed. This usually takes 24-48 hours.';
    buttonText = null;
  } else if (kycStatus?.status === 'rejected') {
    message = `Verification was rejected: ${kycStatus.rejectionReason || 'Please try again with correct information.'}`;
    buttonText = 'Try Again';
  }
  
  return (
    <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Identity Verification Required
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            {message}
          </p>
        </div>
        {buttonText && (
          <button
            onClick={onVerifyClick}
            className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition whitespace-nowrap"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

const TabSidebar = ({ tabs, activeTab, onTabChange, isEmailVerified, isKYCApproved }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;

      let isDisabled = false;
      let disabledReason = '';

      if (tab.id === 'kyc' && !isEmailVerified) {
        isDisabled = true;
        disabledReason = 'Verify email first';
      } else if (tab.id === 'bank-accounts') {
        if (!isEmailVerified) {
          isDisabled = true;
          disabledReason = 'Verify email first';
        } else if (!isKYCApproved) {
          isDisabled = true;
          disabledReason = 'Complete identity verification first';
        }
      }

      return (
        <button
          key={tab.id}
          onClick={() => !isDisabled && onTabChange(tab.id)}
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
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{tab.label}</span>
          {isDisabled && <span className="text-xs text-gray-400">🔒</span>}
        </button>
      );
    })}
  </div>
);

const PayoutInfo = () => (
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
);

const TabContent = ({ activeTab, user, kycStatus, onUpdate, kycVerified }) => {
  switch (activeTab) {
    case 'profile':
      return <ProfileTab user={user} onUpdate={onUpdate} />;
    case 'kyc':
      return <KYCTab user={user} kycStatus={kycStatus} onUpdate={onUpdate} />;
    case 'bank-accounts':
      return <BankAccountTab user={user} onUpdate={onUpdate} kycVerified={kycVerified} />;
    case 'security':
      return <SecurityTab user={user} onUpdate={onUpdate} />;
    case 'settings':
      return <SettingsTab user={user} onUpdate={onUpdate} />;
    default:
      return <ProfileTab user={user} onUpdate={onUpdate} />;
  }
};

export default ProfilePage;
