// File: src/pages/Profile/ProfilePage.jsx - FINAL SIMPLIFIED VERSION

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Shield, Settings, FileCheck, CreditCard,
  ArrowLeft, Loader, AlertTriangle, Mail
} from 'lucide-react';
import ProfileTab from './ProfileTab';
import KYCTab from './KYCTab';
import SecurityTab from './SecurityTab';
import SettingsTab from './SettingsTab';
import BankAccountTab from '../../components/Profile/BankAccountTab';
import profileService from 'services/profileService';
import { authService } from 'services/authService';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    return ['profile', 'kyc', 'bank-accounts', 'security', 'settings'].includes(tab) ? tab : 'profile';
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState({ status: 'unverified', isKYCVerified: false });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Service layer handles deduplication
        const [profileResponse, kycResponse] = await Promise.all([
          profileService.getProfile(),
          profileService.getKYCStatus()
        ]);

        if (profileResponse.success) {
          setUser(profileResponse.data);
        }

        if (kycResponse.success) {
          setKycStatus(kycResponse.data);
        } else {
          setKycStatus({ status: 'unverified', isKYCVerified: false });
        }
      } catch (error) {
        console.error('Fetch error:', error);
        if (error.response?.status !== 429) {
          toast.error('Failed to load profile data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

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
    window.history.replaceState({}, '', url);

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
    profileService.clearCache();
    window.location.reload();
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Unable to load user profile
          </p>
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
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
                    ✓ Email Verified
                  </span>
                )}
                {isKYCApproved && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
                    ✓ KYC Verified
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

// Rest of components remain the same...
const EmailVerificationWarning = () => (
  <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
    <div className="flex items-center gap-3">
      <Mail className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800 dark:text-red-200">
          Verify Your Email Address
        </p>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
          Check your inbox for the verification email. Email verification is required for KYC.
        </p>
      </div>
    </div>
  </div>
);

const KYCVerificationWarning = ({ kycStatus, onVerifyClick }) => {
  let message = 'You need to verify your identity to create escrows and add bank accounts for payouts.';
  let buttonText = 'Verify Now';
  
  if (kycStatus?.status === 'pending') {
    message = 'Your KYC documents are under review. This usually takes 24-48 hours.';
    buttonText = null;
  } else if (kycStatus?.status === 'rejected') {
    message = `Your KYC was rejected: ${kycStatus.rejectionReason || 'Please resubmit with correct information.'}`;
    buttonText = 'Resubmit KYC';
  }
  
  return (
    <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Complete KYC Verification
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
          disabledReason = 'Complete KYC first';
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
      return <KYCTab user={user} onUpdate={onUpdate} />;
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