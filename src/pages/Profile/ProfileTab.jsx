// src/pages/Profile/ProfileTab.jsx
import React, { useState } from 'react';
import { 
  Camera, 
  Loader, 
  Save, 
  Edit2, 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Link as LinkIcon,
  Calendar,
  CheckCircle
} from 'lucide-react';
import profileService from '../../services/profileService';
import toast from 'react-hot-toast';

const ProfileTab = ({ user, onUpdate }) => {
  const [editMode, setEditMode] = useState(false);
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
      country: user.address?.country || user.country || '',
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

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    try {
      setUploading(true);
      const response = await profileService.uploadAvatar(file);

      if (response.success) {
        toast.success('Avatar updated successfully!');
        onUpdate && onUpdate();
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await profileService.updateProfile(formData);

      if (response.success) {
        toast.success('Profile updated successfully!');
        setEditMode(false);
        onUpdate && onUpdate();
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    // Reset form data
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      bio: user.bio || '',
      address: {
        street: user.address?.street || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        country: user.address?.country || user.country || '',
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
  };

  // ✅ VIEW MODE (Default)
  if (!editMode) {
    return (
      <div className="space-y-6">
        {/* Header with Avatar and Edit Button */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profile Information
            </h3>
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          {/* Avatar Section */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-200 dark:border-gray-700">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {user.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{user.email}</p>
              
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer text-sm">
                <Camera className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Change Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem 
              icon={User} 
              label="Full Name" 
              value={user.name || 'Not provided'} 
            />
            <InfoItem 
              icon={Mail} 
              label="Email" 
              value={user.email}
              verified={user.verified}
            />
            <InfoItem 
              icon={Phone} 
              label="Phone Number" 
              value={user.phone || 'Not provided'} 
            />
            <InfoItem 
              icon={MapPin} 
              label="Country" 
              value={user.country || user.address?.country || 'Not provided'} 
            />
            {user.accountType && (
              <InfoItem 
                icon={Building2} 
                label="Account Type" 
                value={user.accountType === 'business' ? 'Business' : 'Individual'} 
              />
            )}
            <InfoItem 
              icon={Calendar} 
              label="Member Since" 
              value={new Date(user.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} 
            />
          </div>

          {user.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {user.bio}
              </p>
            </div>
          )}
        </div>

        {/* Address Card (Only if data exists) */}
        {(user.address?.street || user.address?.city || user.address?.state) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Address
            </h3>
            
            <div className="space-y-3">
              {user.address?.street && (
                <p className="text-gray-600 dark:text-gray-400">{user.address.street}</p>
              )}
              <p className="text-gray-600 dark:text-gray-400">
                {[
                  user.address?.city,
                  user.address?.state,
                  user.address?.postalCode,
                  user.address?.country
                ].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Business Info (Only for business accounts with data) */}
        {user.accountType === 'business' && (user.businessInfo?.companyName || user.businessInfo?.website) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.businessInfo?.companyName && (
                <InfoItem 
                  icon={Building2} 
                  label="Company Name" 
                  value={user.businessInfo.companyName} 
                />
              )}
              {user.businessInfo?.website && (
                <InfoItem 
                  icon={LinkIcon} 
                  label="Website" 
                  value={user.businessInfo.website}
                  isLink
                />
              )}
            </div>
          </div>
        )}

        {/* Social Links (Only if data exists) */}
        {(user.socialLinks?.twitter || user.socialLinks?.linkedin) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Social Links
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.socialLinks?.twitter && (
                <SocialLink 
                  platform="Twitter" 
                  url={user.socialLinks.twitter} 
                />
              )}
              {user.socialLinks?.linkedin && (
                <SocialLink 
                  platform="LinkedIn" 
                  url={user.socialLinks.linkedin} 
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ✅ EDIT MODE (Only shows when Edit button clicked)
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Profile
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

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
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
        </div>

        {/* Phone */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
        </div>

        {/* Bio */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white resize-none"
          />
        </div>
      </div>

      {/* Address */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
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
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
            />
          </div>
          <input
            type="text"
            name="address.city"
            value={formData.address.city}
            onChange={handleChange}
            placeholder="City"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
          <input
            type="text"
            name="address.state"
            value={formData.address.state}
            onChange={handleChange}
            placeholder="State/Province"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
          <input
            type="text"
            name="address.country"
            value={formData.address.country}
            onChange={handleChange}
            placeholder="Country"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
          <input
            type="text"
            name="address.postalCode"
            value={formData.address.postalCode}
            onChange={handleChange}
            placeholder="Postal Code"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Business Info (Only for business accounts) */}
      {user.accountType === 'business' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
            Business Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="businessInfo.companyName"
              value={formData.businessInfo.companyName}
              onChange={handleChange}
              placeholder="Company Name"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
            />
            <input
              type="url"
              name="businessInfo.website"
              value={formData.businessInfo.website}
              onChange={handleChange}
              placeholder="Website URL"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Social Links */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
          Social Links
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="url"
            name="socialLinks.twitter"
            value={formData.socialLinks.twitter}
            onChange={handleChange}
            placeholder="Twitter URL"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
          <input
            type="url"
            name="socialLinks.linkedin"
            value={formData.socialLinks.linkedin}
            onChange={handleChange}
            placeholder="LinkedIn URL"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
          )}
        </button>
      </div>
    </form>
  );
};

// ✅ InfoItem Component (for clean display)
const InfoItem = ({ icon: Icon, label, value, verified, isLink }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      {isLink ? (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:underline truncate block"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          {value}
          {verified && <CheckCircle className="w-4 h-4 text-green-500" />}
        </p>
      )}
    </div>
  </div>
);

// ✅ SocialLink Component
const SocialLink = ({ platform, url }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
  >
    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400">{platform}</p>
      <p className="text-sm font-medium text-blue-600 hover:underline truncate">
        {url}
      </p>
    </div>
  </a>
);

export default ProfileTab;