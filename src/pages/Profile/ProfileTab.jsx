import React, { useState } from 'react';
import { Camera, Loader, Save } from 'lucide-react';
import profileService from '../../services/profileService';
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

    // Validate file
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
        onUpdate && onUpdate();
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
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
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Personal Information
        </h3>

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
          </div>
        </div>

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
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileTab;
