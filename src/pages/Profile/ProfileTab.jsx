‎src/pages/Profile/ProfileTab.jsx‎
Original file line number	Diff line number	Diff line change
@@ -1,321 +1,277 @@
import React, { useState } from 'react';
import { Camera, Loader, Save } from 'lucide-react';
// File: src/pages/Profile/ProfilePage.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Shield, 
  Settings, 
  FileCheck, 
  CreditCard,
  ArrowLeft,
  Loader,
  AlertTriangle
} from 'lucide-react';
import ProfileTab from './ProfileTab';
import KYCTab from './KYCTab';
import SecurityTab from './SecurityTab';
import SettingsTab from './SettingsTab';
import BankAccountTab from '../../components/Profile/BankAccountTab';
import profileService from 'services/profileService';
import { authService } from 'services/authService';
import toast from 'react-hot-toast';
const ProfileTab = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    bio: user.bio || '',
    address: {
      street: user.address?.street || '',
      city: user.address?.city || '',
      state: user.address?.state || '',
      country: user.address?.country || '',
      postalCode: user.address?.postalCode || ''
    },
    businessInfo: {
      companyName: user.businessInfo?.companyName || '',
      website: user.businessInfo?.website || ''
    },
    socialLinks: {
      twitter: user.socialLinks?.twitter || '',
      linkedin: user.socialLinks?.linkedin || ''
    }
  });
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    // Check URL params for tab
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'kyc', 'bank-accounts', 'security', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }

    try {
      setUploading(true);
      const response = await profileService.uploadAvatar(file);
    fetchProfile();
    fetchKYCStatus();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileService.getProfile();
      
      if (response.success) {
        toast.success('Avatar updated successfully!');
        onUpdate && onUpdate();
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload avatar');
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const response = await profileService.updateProfile(formData);
      const response = await profileService.getKYCStatus();
      if (response.success) {
        toast.success('Profile updated successfully!');
        onUpdate && onUpdate();
        setKycStatus(response.data);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
      console.error('Failed to fetch KYC status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar Upload */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Profile Picture
        </h3>
        
        <div className="flex items-center gap-6">
          <div className="relative">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-200 dark:border-gray-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Loader className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
  const handleTabChange = (tab) => {
    // ✅ FIXED: Only block bank accounts, allow KYC access
    if (tab === 'bank-accounts' && kycStatus?.status !== 'approved') {
      toast.error('Complete KYC verification to add bank accounts');
      return;
    }
    
    setActiveTab(tab);
    setSearchParams({ tab });
  };

          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer">
              <Camera className="w-5 h-5" />
              {uploading ? 'Uploading...' : 'Change Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              JPG, PNG or GIF. Max size 5MB.
            </p>
          </div>
        </div>
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

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Personal Information
        </h3>
  if (!user) {
    return null;
  }

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
          />
        </div>
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'kyc', label: 'Verification', icon: FileCheck },
    { id: 'bank-accounts', label: 'Bank Accounts', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
          />
        </div>
  // Check if user can access escrow features
  const canAccessEscrowFeatures = kycStatus?.status === 'approved';

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white resize-none"
          />
        </div>
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

        {/* Address */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
            Address
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                placeholder="Street Address"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
              />
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
            <input
              type="text"
              name="address.city"
              value={formData.address.city}
              onChange={handleChange}
              placeholder="City"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
            <input
              type="text"
              name="address.state"
              value={formData.address.state}
              onChange={handleChange}
              placeholder="State/Province"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
            <input
              type="text"
              name="address.country"
              value={formData.address.country}
              onChange={handleChange}
              placeholder="Country"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
            <input
              type="text"
              name="address.postalCode"
              value={formData.address.postalCode}
              onChange={handleChange}
              placeholder="Postal Code"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Business Info */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
            Business Information (Optional)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="businessInfo.companyName"
              value={formData.businessInfo.companyName}
              onChange={handleChange}
              placeholder="Company Name"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
            <input
              type="url"
              name="businessInfo.website"
              value={formData.businessInfo.website}
              onChange={handleChange}
              placeholder="Website URL"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
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
                {user.verified && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
                    ✓ Verified Email
                  </span>
                )}
                {kycStatus?.status === 'approved' && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium rounded-full">
                    ✓ KYC Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* KYC Warning Banner */}
          {!canAccessEscrowFeatures && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Complete KYC Verification
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    You need to verify your identity to create escrows and add bank accounts for payouts.
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange('kyc')}
                  className="ml-auto px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition"
                >
                  Verify Now
                </button>
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
                
                // ✅ FIXED: Only disable bank accounts, not KYC
                const isDisabled = tab.id === 'bank-accounts' && 
                                 !canAccessEscrowFeatures;

        {/* Social Links */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
            Social Links (Optional)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="url"
              name="socialLinks.twitter"
              value={formData.socialLinks.twitter}
              onChange={handleChange}
              placeholder="Twitter URL"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
            <input
              type="url"
              name="socialLinks.linkedin"
              value={formData.socialLinks.linkedin}
              onChange={handleChange}
              placeholder="LinkedIn URL"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
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
                    title={isDisabled ? 'Complete KYC verification to access bank accounts' : ''}
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
            {/* Payout Information */}
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
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <ProfileTab user={user} onUpdate={handleProfileUpdate} />
            )}
          </button>
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
      </form>
      </div>
    </div>
  );
};

export default ProfileTab;
