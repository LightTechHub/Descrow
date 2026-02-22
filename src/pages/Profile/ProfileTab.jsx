// src/pages/Profile/ProfileTab.jsx
// COMPLETE FIXED VERSION - WITH COMPANY NAME FIX AND COUNTRY DROPDOWN
import React, { useState } from 'react';
import { 
  Camera, Loader, Save, Edit2, X, User, Phone, Mail, MapPin, 
  Building2, Link as LinkIcon, Calendar, CheckCircle, Briefcase, 
  Globe, Hash
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
      companyType: user.businessInfo?.companyType || '',
      industry: user.businessInfo?.industry || '',
      taxId: user.businessInfo?.taxId || '',
      registrationNumber: user.businessInfo?.registrationNumber || '',
      website: user.businessInfo?.website || ''
    },
    socialLinks: {
      twitter: user.socialLinks?.twitter || '',
      linkedin: user.socialLinks?.linkedin || '',
      website: user.socialLinks?.website || ''
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
        companyType: user.businessInfo?.companyType || '',
        industry: user.businessInfo?.industry || '',
        taxId: user.businessInfo?.taxId || '',
        registrationNumber: user.businessInfo?.registrationNumber || '',
        website: user.businessInfo?.website || ''
      },
      socialLinks: {
        twitter: user.socialLinks?.twitter || '',
        linkedin: user.socialLinks?.linkedin || '',
        website: user.socialLinks?.website || ''
      }
    });
  };

  // Helper function to format date safely
  const formatMemberSince = () => {
    if (!user.createdAt) return 'Recently joined';
    try {
      const date = new Date(user.createdAt);
      if (isNaN(date.getTime())) return 'Recently joined';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'Recently joined';
    }
  };

  // Helper function to get country from multiple sources
  const getUserCountry = () => {
    return user.country 
      || user.address?.country 
      || user.businessInfo?.businessAddress?.country 
      || 'Not provided';
  };

  // VIEW MODE
  if (!editMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
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

          {/* Avatar - SOLID BLUE (no gradient) */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              {user.profilePicture ? (
                <img
                  src={(() => {
                    const url = user.profilePicture;
                    if (url.startsWith('http')) return url;
                    if (url.startsWith('/')) return `${process.env.REACT_APP_API_URL || ''}${url}`;
                    return `${process.env.REACT_APP_API_URL || ''}/uploads/avatars/${url}`;
                  })()}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.querySelector('.fallback-avatar').classList.remove('hidden');
                  }}
                />
              ) : null}
              
              {/* Fallback Avatar - SOLID BLUE */}
              <div className={`w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-200 dark:border-gray-700 ${user.profilePicture ? 'hidden' : ''} fallback-avatar`}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div 
                    className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                    style={{ animation: 'spin 1s linear infinite' }}
                  ></div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {user.accountType === 'business' 
                  ? (user.businessInfo?.companyName || user.name)
                  : user.name
                }
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{user.email}</p>
              
              {/* Show owner name for business accounts */}
              {user.accountType === 'business' && user.name && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <User className="w-3 h-3 inline mr-1" />
                  Owner: {user.name}
                </p>
              )}
              
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer text-sm">
                <Camera className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Change Photo'}
                <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem icon={User} label="Full Name" value={user.name || 'Not provided'} />
            <InfoItem icon={Mail} label="Email" value={user.email} verified={user.verified} />
            <InfoItem icon={Phone} label="Phone" value={user.phone || 'Not provided'} />
            {/* FIXED: Country from multiple sources */}
            <InfoItem icon={MapPin} label="Country" value={getUserCountry()} />
            {user.accountType && (
              <InfoItem 
                icon={Building2} 
                label="Account Type" 
                value={user.accountType === 'business' ? 'Business Account' : 'Individual Account'}
                badge={user.accountType === 'business' ? 'BUSINESS' : 'PERSONAL'}
              />
            )}
            {/* FIXED: Member Since with fallback */}
            <InfoItem 
              icon={Calendar} 
              label="Member Since" 
              value={formatMemberSince()} 
            />
          </div>

          {user.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</h4>
              <p className="text-gray-600 dark:text-gray-400">{user.bio}</p>
            </div>
          )}
        </div>

        {/* Address */}
        {(user.address?.street || user.address?.city || user.address?.state || user.address?.country) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Address</h3>
            <div className="space-y-3">
              {user.address?.street && <p className="text-gray-600 dark:text-gray-400">{user.address.street}</p>}
              <p className="text-gray-600 dark:text-gray-400">
                {[
                  user.address?.city, 
                  user.address?.state, 
                  user.address?.postalCode, 
                  user.address?.country || user.country
                ].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Business Info */}
        {user.accountType === 'business' && user.businessInfo && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.businessInfo?.companyName && (
                <InfoItem icon={Building2} label="Company Name" value={user.businessInfo.companyName} />
              )}
              {user.businessInfo?.companyType && (
                <InfoItem icon={Briefcase} label="Company Type" value={user.businessInfo.companyType.replace('_', ' ').toUpperCase()} />
              )}
              {user.businessInfo?.industry && (
                <InfoItem icon={Briefcase} label="Industry" value={user.businessInfo.industry} />
              )}
              {user.businessInfo?.taxId && (
                <InfoItem icon={Hash} label="Tax ID" value={user.businessInfo.taxId} />
              )}
              {user.businessInfo?.registrationNumber && (
                <InfoItem icon={Hash} label="Registration Number" value={user.businessInfo.registrationNumber} />
              )}
              {user.businessInfo?.website && (
                <InfoItem icon={Globe} label="Website" value={user.businessInfo.website} isLink />
              )}
            </div>
          </div>
        )}

        {/* Social Links */}
        {(user.socialLinks?.twitter || user.socialLinks?.linkedin || user.socialLinks?.website) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Social Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.socialLinks?.twitter && <SocialLink platform="Twitter" url={user.socialLinks.twitter} />}
              {user.socialLinks?.linkedin && <SocialLink platform="LinkedIn" url={user.socialLinks.linkedin} />}
              {user.socialLinks?.website && <SocialLink platform="Website" url={user.socialLinks.website} />}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== EDIT MODE ====================
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h3>
          <button type="button" onClick={handleCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Full Name / Owner Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {user.accountType === 'business' ? 'Owner Full Name *' : 'Full Name *'}
          </label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required
            placeholder={user.accountType === 'business' ? 'John Doe' : 'Your name'}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
          {user.accountType === 'business' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This is the name of the person who owns this business account
            </p>
          )}
        </div>

        {/* Company Name (Business Only) */}
        {user.accountType === 'business' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name *
            </label>
            <input 
              type="text" 
              name="businessInfo.companyName" 
              value={formData.businessInfo.companyName} 
              onChange={handleChange} 
              required
              placeholder="Acme Corporation"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
          </div>
        )}

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
          <input 
            type="tel" 
            name="phone" 
            value={formData.phone} 
            onChange={handleChange} 
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
          <textarea 
            name="bio" 
            value={formData.bio} 
            onChange={handleChange} 
            rows={4} 
            placeholder="Tell us about yourself or your business..."
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none" 
          />
        </div>
      </div>

      {/* Address Section - WITH FULL COUNTRY DROPDOWN */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input 
              type="text" 
              name="address.street" 
              value={formData.address.street} 
              onChange={handleChange} 
              placeholder="Street Address"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
          </div>
          <input 
            type="text" 
            name="address.city" 
            value={formData.address.city} 
            onChange={handleChange} 
            placeholder="City"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
          <input 
            type="text" 
            name="address.state" 
            value={formData.address.state} 
            onChange={handleChange} 
            placeholder="State/Province"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
          
            {/* Full Name / Owner Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {user.accountType === 'business' ? 'Owner Full Name *' : 'Full Name *'}
          </label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required
            placeholder={user.accountType === 'business' ? 'John Doe' : 'Your name'}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
          {user.accountType === 'business' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This is the name of the person who owns this business account
            </p>
          )}
        </div>

        {/* Company Name (Business Only) */}
        {user.accountType === 'business' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name *
            </label>
            <input 
              type="text" 
              name="businessInfo.companyName" 
              value={formData.businessInfo.companyName} 
              onChange={handleChange} 
              required
              placeholder="Acme Corporation"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
          </div>
        )}

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
          <input 
            type="tel" 
            name="phone" 
            value={formData.phone} 
            onChange={handleChange} 
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
          <textarea 
            name="bio" 
            value={formData.bio} 
            onChange={handleChange} 
            rows={4} 
            placeholder="Tell us about yourself or your business..."
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none" 
          />
        </div>
      </div>

      {/* Address Section - WITH FULL COUNTRY DROPDOWN */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input 
              type="text" 
              name="address.street" 
              value={formData.address.street} 
              onChange={handleChange} 
              placeholder="Street Address"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
          </div>
          <input 
            type="text" 
            name="address.city" 
            value={formData.address.city} 
            onChange={handleChange} 
            placeholder="City"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
          <input 
            type="text" 
            name="address.state" 
            value={formData.address.state} 
            onChange={handleChange} 
            placeholder="State/Province"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
          
          {/* COUNTRY DROPDOWN - Full list of countries */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Country</label>
            <select
              name="address.country"
              value={formData.address.country}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="">Select Country</option>
              <option value="United States">United States</option>
              <option value="Nigeria">Nigeria</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Ghana">Ghana</option>
              <option value="Kenya">Kenya</option>
              <option value="South Africa">South Africa</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="India">India</option>
              <option value="Japan">Japan</option>
              <option value="China">China</option>
              <option value="Brazil">Brazil</option>
              <option value="Mexico">Mexico</option>
              <option value="Italy">Italy</option>
              <option value="Spain">Spain</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Sweden">Sweden</option>
              <option value="Norway">Norway</option>
              <option value="Denmark">Denmark</option>
              <option value="Finland">Finland</option>
              <option value="Switzerland">Switzerland</option>
              <option value="Belgium">Belgium</option>
              <option value="Austria">Austria</option>
              <option value="Portugal">Portugal</option>
              <option value="Ireland">Ireland</option>
              <option value="New Zealand">New Zealand</option>
              <option value="Singapore">Singapore</option>
              <option value="Malaysia">Malaysia</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Saudi Arabia">Saudi Arabia</option>
              <option value="Israel">Israel</option>
              <option value="Turkey">Turkey</option>
              <option value="Russia">Russia</option>
              <option value="Ukraine">Ukraine</option>
              <option value="Poland">Poland</option>
              <option value="Czech Republic">Czech Republic</option>
              <option value="Hungary">Hungary</option>
              <option value="Romania">Romania</option>
              <option value="Greece">Greece</option>
              <option value="Egypt">Egypt</option>
              <option value="Morocco">Morocco</option>
              <option value="Tunisia">Tunisia</option>
              <option value="Algeria">Algeria</option>
              <option value="Uganda">Uganda</option>
              <option value="Tanzania">Tanzania</option>
              <option value="Rwanda">Rwanda</option>
              <option value="Ethiopia">Ethiopia</option>
              <option value="Zambia">Zambia</option>
              <option value="Zimbabwe">Zimbabwe</option>
              <option value="Botswana">Botswana</option>
              <option value="Namibia">Namibia</option>
              <option value="Mozambique">Mozambique</option>
              <option value="Angola">Angola</option>
              <option value="Cameroon">Cameroon</option>
              <option value="Senegal">Senegal</option>
            </select>
          </div>
          
          <input 
            type="text" 
            name="address.postalCode" 
            value={formData.address.postalCode} 
            onChange={handleChange} 
            placeholder="Postal Code"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
        </div>
      </div>

      {/* Business Info (Business Only) */}
      {user.accountType === 'business' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Business Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              name="businessInfo.companyName" 
              value={formData.businessInfo.companyName} 
              onChange={handleChange} 
              placeholder="Company Name"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
            <select 
              name="businessInfo.companyType" 
              value={formData.businessInfo.companyType} 
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="">Company Type</option>
              <option value="sole_proprietor">Sole Proprietor</option>
              <option value="partnership">Partnership</option>
              <option value="llc">LLC</option>
              <option value="corporation">Corporation</option>
              <option value="ngo">NGO</option>
              <option value="other">Other</option>
            </select>
            <input 
              type="text" 
              name="businessInfo.industry" 
              value={formData.businessInfo.industry} 
              onChange={handleChange} 
              placeholder="Industry"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
            <input 
              type="text" 
              name="businessInfo.taxId" 
              value={formData.businessInfo.taxId} 
              onChange={handleChange} 
              placeholder="Tax ID"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
            <input 
              type="text" 
              name="businessInfo.registrationNumber" 
              value={formData.businessInfo.registrationNumber} 
              onChange={handleChange} 
              placeholder="Registration Number"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
            <input 
              type="url" 
              name="businessInfo.website" 
              value={formData.businessInfo.website} 
              onChange={handleChange} 
              placeholder="Website URL"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
            />
          </div>
        </div>
      )}

      {/* Social Links */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Social Links</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="url" 
            name="socialLinks.twitter" 
            value={formData.socialLinks.twitter} 
            onChange={handleChange} 
            placeholder="Twitter URL"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
          <input 
            type="url" 
            name="socialLinks.linkedin" 
            value={formData.socialLinks.linkedin} 
            onChange={handleChange} 
            placeholder="LinkedIn URL"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
          <input 
            type="url" 
            name="socialLinks.website" 
            value={formData.socialLinks.website} 
            onChange={handleChange} 
            placeholder="Website URL"
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white" 
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={handleCancel} disabled={loading}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <div 
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                style={{ animation: 'spin 1s linear infinite' }}
              ></div>
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

const InfoItem = ({ icon: Icon, label, value, verified, isLink, badge }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline truncate">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
            {value}
            {verified && <CheckCircle className="w-4 h-4 text-green-500" />}
          </p>
        )}
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            badge === 'BUSINESS' 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  </div>
);

const SocialLink = ({ platform, url }) => (
  <a href={url} target="_blank" rel="noopener noreferrer"
    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400">{platform}</p>
      <p className="text-sm font-medium text-blue-600 hover:underline truncate">{url}</p>
    </div>
  </a>
);

export default ProfileTab;