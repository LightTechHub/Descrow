import React, { useState } from 'react';
import {
  Camera, Save, Edit2, X, User, Phone, Mail, MapPin,
  Building2, Link as LinkIcon, Calendar, CheckCircle,
  Briefcase, Globe, Hash,
} from 'lucide-react';
import profileService from '../../services/profileService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Fixes avatar 404: uses backend root URL (no /api) for static files
const resolveAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base =
    process.env.REACT_APP_BACKEND_URL ||
    (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '') ||
    '';
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
};

const ProfileTab = ({ user, onUpdate }) => {
  const { updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Always build form from current user so existing data is pre-filled
  const buildForm = () => ({
    name:  user.name  || '',
    phone: user.phone || '',
    bio:   user.bio   || '',
    address: {
      street:     user.address?.street     || '',
      city:       user.address?.city       || '',
      state:      user.address?.state      || '',
      country:    user.address?.country    || user.country || '',
      postalCode: user.address?.postalCode || user.address?.zipCode || '',
    },
    businessInfo: {
      companyName:        user.businessInfo?.companyName        || '',
      companyType:        user.businessInfo?.companyType        || '',
      industry:           user.businessInfo?.industry           || '',
      taxId:              user.businessInfo?.taxId              || '',
      registrationNumber: user.businessInfo?.registrationNumber || '',
      website:            user.businessInfo?.website            || '',
    },
    socialLinks: {
      twitter:  user.socialLinks?.twitter  || '',
      linkedin: user.socialLinks?.linkedin || '',
      website:  user.socialLinks?.website  || '',
    },
  });

  const [formData, setFormData] = useState(buildForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max file size is 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    try {
      setUploading(true);
      const response = await profileService.uploadAvatar(file);
      if (response.success) {
        toast.success('Photo updated!');
        onUpdate && onUpdate();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name:        formData.name,
        phone:       formData.phone,
        bio:         formData.bio,
        address:     formData.address,
        socialLinks: formData.socialLinks,
      };
      if (user.accountType === 'business') {
        const bi = { ...formData.businessInfo };
        if (!bi.companyType) delete bi.companyType;
        if (!bi.industry)    delete bi.industry;
        payload.businessInfo = bi;
      }

      const response = await profileService.updateProfile(payload);
      if (response.success) {
        toast.success('Profile saved!');
        setEditMode(false);
        // Sync to context/localStorage so country persists on reload
        if (response.data) updateUser(response.data);
        onUpdate && onUpdate();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData(buildForm());
  };

  const avatarInitial = () => {
    if (user.accountType === 'business')
      return user.businessInfo?.companyName?.charAt(0)?.toUpperCase() || user.name?.charAt(0)?.toUpperCase() || 'B';
    return user.name?.charAt(0)?.toUpperCase() || 'U';
  };

  const displayName = () =>
    user.accountType === 'business'
      ? user.businessInfo?.companyName || user.name || 'Business Account'
      : user.name || 'User';

  const country = () =>
    user.address?.country || user.country || 'Not provided';

  const memberSince = () => {
    if (!user.createdAt) return 'Recently joined';
    try { return new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return 'Recently joined'; }
  };

  // ─── VIEW MODE ──────────────────────────────────────────────────────────────
  if (!editMode) {
    return (
      <div className="space-y-6">
        {/* Avatar + header */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          </div>
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              {user.profilePicture ? (
                <img src={resolveAvatarUrl(user.profilePicture)} alt={displayName()}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-200 dark:border-gray-700">
                  {avatarInitial()}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{displayName()}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{user.email}</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer text-sm">
                <Camera className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Change Photo'}
                <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow icon={User}      label="Full Name"    value={user.name || 'Not provided'} />
            <InfoRow icon={Mail}      label="Email"        value={user.email} verified={user.verified} />
            <InfoRow icon={Phone}     label="Phone"        value={user.phone || 'Not provided'} />
            <InfoRow icon={MapPin}    label="Country"      value={country()} />
            <InfoRow icon={Building2} label="Account Type" value={user.accountType === 'business' ? 'Business Account' : 'Individual Account'} />
            <InfoRow icon={Calendar}  label="Member Since" value={memberSince()} />
          </div>
          {user.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bio</p>
              <p className="text-gray-700 dark:text-gray-300">{user.bio}</p>
            </div>
          )}
        </div>

        {/* Address */}
        {(user.address?.city || user.address?.country) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Address</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {[user.address?.street, user.address?.city, user.address?.state,
                user.address?.postalCode, user.address?.country || user.country]
                .filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {/* Business info */}
        {user.accountType === 'business' && user.businessInfo && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Business Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.businessInfo.companyName        && <InfoRow icon={Building2} label="Company Name"        value={user.businessInfo.companyName} />}
              {user.businessInfo.companyType        && <InfoRow icon={Briefcase} label="Company Type"        value={user.businessInfo.companyType.replace(/_/g, ' ')} />}
              {user.businessInfo.industry           && <InfoRow icon={Briefcase} label="Industry"            value={user.businessInfo.industry.replace(/_/g, ' ')} />}
              {user.businessInfo.taxId              && <InfoRow icon={Hash}      label="Tax ID"              value={user.businessInfo.taxId} />}
              {user.businessInfo.registrationNumber && <InfoRow icon={Hash}      label="Reg. Number"         value={user.businessInfo.registrationNumber} />}
              {user.businessInfo.website            && <InfoRow icon={Globe}     label="Website"             value={user.businessInfo.website} isLink />}
            </div>
          </div>
        )}

        {/* Social links */}
        {(user.socialLinks?.twitter || user.socialLinks?.linkedin || user.socialLinks?.website) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LinkIcon className="w-5 h-5" /> Social Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.socialLinks.twitter  && <InfoRow icon={LinkIcon} label="Twitter"  value={user.socialLinks.twitter}  isLink />}
              {user.socialLinks.linkedin && <InfoRow icon={LinkIcon} label="LinkedIn" value={user.socialLinks.linkedin} isLink />}
              {user.socialLinks.website  && <InfoRow icon={Globe}    label="Website"  value={user.socialLinks.website}  isLink />}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── EDIT MODE ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h3>
          <button type="button" onClick={handleCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <Field label={user.accountType === 'business' ? 'Owner Full Name *' : 'Full Name *'}>
            <input required type="text" name="name" value={formData.name} onChange={handleChange}
              className={inputCls} />
          </Field>
          <Field label="Phone Number">
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
              placeholder="+234 800 000 0000" className={inputCls} />
          </Field>
          <Field label="Bio">
            <textarea rows={4} name="bio" value={formData.bio} onChange={handleChange}
              placeholder="Tell us about yourself..." className={`${inputCls} resize-none`} />
          </Field>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input type="text" name="address.street" value={formData.address.street}
              onChange={handleChange} placeholder="Street Address" className={inputCls} />
          </div>
          <input type="text" name="address.city" value={formData.address.city}
            onChange={handleChange} placeholder="City" className={inputCls} />
          <input type="text" name="address.state" value={formData.address.state}
            onChange={handleChange} placeholder="State / Province" className={inputCls} />
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Country</label>
            <select name="address.country" value={formData.address.country}
              onChange={handleChange} className={inputCls}>
              <option value="">Select Country</option>
              {[
                'Nigeria','United States','United Kingdom','Canada','Ghana','Kenya',
                'South Africa','Australia','Germany','France','India','Japan',
                'China','Brazil','Mexico','Italy','Spain','Netherlands','Sweden',
                'Norway','Denmark','Finland','Switzerland','Belgium','Austria',
                'Portugal','Ireland','New Zealand','Singapore','Malaysia',
                'United Arab Emirates','Saudi Arabia','Israel','Turkey','Russia',
                'Poland','Egypt','Morocco','Tunisia','Algeria','Uganda','Tanzania',
                'Rwanda','Ethiopia','Zambia','Zimbabwe','Senegal','Cameroon','Angola',
              ].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input type="text" name="address.postalCode" value={formData.address.postalCode}
            onChange={handleChange} placeholder="Postal Code" className={inputCls} />
        </div>
      </div>

      {/* Business info */}
      {user.accountType === 'business' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Business Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="businessInfo.companyName" value={formData.businessInfo.companyName}
              onChange={handleChange} placeholder="Company Name" className={inputCls} />
            <select name="businessInfo.companyType" value={formData.businessInfo.companyType}
              onChange={handleChange} className={inputCls}>
              <option value="">Company Type {user.businessInfo?.companyType ? `(current: ${user.businessInfo.companyType})` : ''}</option>
              <option value="sole_proprietor">Sole Proprietor</option>
              <option value="partnership">Partnership</option>
              <option value="llc">LLC</option>
              <option value="corporation">Corporation</option>
              <option value="ngo">NGO</option>
              <option value="other">Other</option>
            </select>
            <select name="businessInfo.industry" value={formData.businessInfo.industry}
              onChange={handleChange} className={inputCls}>
              <option value="">Industry {user.businessInfo?.industry ? `(current: ${user.businessInfo.industry})` : ''}</option>
              <option value="ecommerce">E-commerce</option>
              <option value="real_estate">Real Estate</option>
              <option value="freelance">Freelance</option>
              <option value="saas">SaaS / Software</option>
              <option value="professional_services">Professional Services</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="retail">Retail</option>
              <option value="technology">Technology</option>
              <option value="logistics">Logistics</option>
              <option value="fashion">Fashion</option>
              <option value="services">Services</option>
              <option value="other">Other</option>
            </select>
            <input type="text" name="businessInfo.taxId" value={formData.businessInfo.taxId}
              onChange={handleChange} placeholder="Tax ID" className={inputCls} />
            <input type="text" name="businessInfo.registrationNumber" value={formData.businessInfo.registrationNumber}
              onChange={handleChange} placeholder="Registration Number" className={inputCls} />
            <input type="url" name="businessInfo.website" value={formData.businessInfo.website}
              onChange={handleChange} placeholder="https://yourcompany.com" className={inputCls} />
          </div>
        </div>
      )}

      {/* Social */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Social Links</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="url" name="socialLinks.twitter" value={formData.socialLinks.twitter}
            onChange={handleChange} placeholder="https://twitter.com/handle" className={inputCls} />
          <input type="url" name="socialLinks.linkedin" value={formData.socialLinks.linkedin}
            onChange={handleChange} placeholder="https://linkedin.com/in/profile" className={inputCls} />
          <input type="url" name="socialLinks.website" value={formData.socialLinks.website}
            onChange={handleChange} placeholder="https://yourwebsite.com" className={inputCls} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={handleCancel} disabled={loading}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {loading
            ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            : <><Save className="w-5 h-5" /> Save Changes</>}
        </button>
      </div>
    </form>
  );
};

const inputCls = 'w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const InfoRow = ({ icon: Icon, label, value, verified, isLink }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      {isLink
        ? <a href={value} target="_blank" rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline truncate block">{value}</a>
        : <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
            {value}
            {verified && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
          </p>
      }
    </div>
  </div>
);

export default ProfileTab;
