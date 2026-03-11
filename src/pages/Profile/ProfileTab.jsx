// File: src/pages/ProfileTab.jsx
// ✅ NEW: KYC field locking — name/businessName locked after KYC approval
// ✅ FIXED: Mobile-first sizing throughout
import React, { useState } from 'react';
import { Lock, User, Phone, Globe, MapPin, FileText, Save, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';

const ProfileTab = ({ user, onUpdate, kycApproved = false }) => {
  const isLocked = kycApproved; // Name/business fields locked after KYC

  const [form, setForm] = useState({
    name:  user?.name  || '',
    phone: user?.phone || '',
    bio:   user?.bio   || '',
    address: {
      street:  user?.address?.street  || '',
      city:    user?.address?.city    || '',
      state:   user?.address?.state   || '',
      country: user?.address?.country || '',
    },
    businessInfo: {
      companyName:    user?.businessInfo?.companyName    || '',
      businessType:   user?.businessInfo?.businessType   || '',
      website:        user?.businessInfo?.website        || '',
      registrationNo: user?.businessInfo?.registrationNo || '',
    }
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (path, value) => {
    const keys = path.split('.');
    if (keys.length === 1) {
      setForm(f => ({ ...f, [keys[0]]: value }));
    } else {
      setForm(f => ({ ...f, [keys[0]]: { ...f[keys[0]], [keys[1]]: value } }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put('/users/profile', form);
      if (res.data.success) {
        toast.success('Profile updated successfully');
        if (onUpdate) onUpdate(res.data.data.user);
      } else {
        toast.error(res.data.message || 'Failed to update profile');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const isBusinessAccount = user?.accountType === 'business';

  const LockedBadge = () => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
      <Lock className="w-3 h-3" /> Locked after KYC
    </span>
  );

  const FieldWrapper = ({ label, locked = false, children }) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {locked && <LockedBadge />}
      </div>
      {children}
    </div>
  );

  const inputClass = (locked = false) =>
    `w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base transition outline-none ${
      locked
        ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed select-none'
        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">

      {/* KYC Locked Info Banner */}
      {isLocked && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 sm:p-4">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
            <strong>Identity verified.</strong> Your name{isBusinessAccount ? ' and business name are' : ' is'} locked to protect against identity fraud.
            To request a change, contact <a href="mailto:support@dealcross.net" className="underline font-semibold">support@dealcross.net</a>.
          </p>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <FieldWrapper label={isBusinessAccount ? 'Owner Name' : 'Full Name'} locked={isLocked}>
            <div className="relative">
              {isLocked && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />}
              <input
                type="text"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                readOnly={isLocked}
                className={inputClass(isLocked) + (isLocked ? ' pr-9' : '')}
                placeholder="Your full name"
              />
            </div>
          </FieldWrapper>

          <FieldWrapper label="Phone Number">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className={inputClass() + ' pl-9'}
                placeholder="+234 800 000 0000"
              />
            </div>
          </FieldWrapper>
        </div>

        <div className="mt-4 sm:mt-5">
          <FieldWrapper label="Bio / Description">
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <textarea
                value={form.bio}
                onChange={e => handleChange('bio', e.target.value)}
                rows={3}
                className={inputClass() + ' pl-9 resize-none'}
                placeholder="Brief description about yourself or your business..."
                maxLength={300}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{form.bio.length}/300</p>
          </FieldWrapper>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Address</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(can be updated anytime)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {[
            { label: 'Street Address', key: 'street', placeholder: '12 Main Street', colSpan: 'sm:col-span-2' },
            { label: 'City', key: 'city', placeholder: 'Aba' },
            { label: 'State', key: 'state', placeholder: 'Abia State' },
            { label: 'Country', key: 'country', placeholder: 'Nigeria' },
          ].map(({ label, key, placeholder, colSpan }) => (
            <div key={key} className={colSpan || ''}>
              <FieldWrapper label={label}>
                <input
                  type="text"
                  value={form.address[key]}
                  onChange={e => handleChange(`address.${key}`, e.target.value)}
                  className={inputClass()}
                  placeholder={placeholder}
                />
              </FieldWrapper>
            </div>
          ))}
        </div>
      </div>

      {/* Business Info */}
      {isBusinessAccount && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Business Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <FieldWrapper label="Business / Company Name" locked={isLocked}>
              <div className="relative">
                {isLocked && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />}
                <input
                  type="text"
                  value={form.businessInfo.companyName}
                  onChange={e => handleChange('businessInfo.companyName', e.target.value)}
                  readOnly={isLocked}
                  className={inputClass(isLocked) + (isLocked ? ' pr-9' : '')}
                  placeholder="Acme Ltd"
                />
              </div>
            </FieldWrapper>
            <FieldWrapper label="Business Type">
              <input
                type="text"
                value={form.businessInfo.businessType}
                onChange={e => handleChange('businessInfo.businessType', e.target.value)}
                className={inputClass()}
                placeholder="e.g. E-commerce, Technology"
              />
            </FieldWrapper>
            <FieldWrapper label="Website">
              <input
                type="url"
                value={form.businessInfo.website}
                onChange={e => handleChange('businessInfo.website', e.target.value)}
                className={inputClass()}
                placeholder="https://yourcompany.com"
              />
            </FieldWrapper>
            <FieldWrapper label="Registration Number">
              <input
                type="text"
                value={form.businessInfo.registrationNo}
                onChange={e => handleChange('businessInfo.registrationNo', e.target.value)}
                className={inputClass()}
                placeholder="RC 1234567"
              />
            </FieldWrapper>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm sm:text-base transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>
    </form>
  );
};

export default ProfileTab;
