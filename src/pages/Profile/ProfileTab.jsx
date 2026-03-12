// File: src/pages/ProfileTab.jsx
//
// KYC LOCKING POLICY (after verification):
//   FROZEN (cannot change at all):
//     - Full Name / Owner Name
//     - Phone Number
//     - Address (street, city, state, country)
//     - Business Name
//     - Business Type
//     - CAC / Registration Number
//
//   FREE EDIT (editable, but requires password confirmation before saving):
//     - Profile Picture / Avatar
//     - Bio / Description
//     - Social Links (Twitter, LinkedIn, Website)
//     - Business Website
//
//   FREE EDIT (no KYC involved, password confirmation still required):
//     - All fields above when KYC is NOT yet approved
//
// PASSWORD CONFIRMATION MODAL:
//   - Any save attempt triggers a modal asking for current password
//   - Password is verified against POST /api/users/verify-password
//   - Only on success does the actual profile update call happen
//
import React, { useState, useMemo, useCallback } from 'react';
import {
  Lock, User, Phone, Globe, MapPin, FileText, Save, Loader,
  CheckCircle, Twitter, Linkedin, Link as LinkIcon, ImageIcon,
  ShieldCheck, Eye, EyeOff, KeyRound, AlertCircle, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const buildInitialForm = (user) => ({
  name:   user?.name   || '',
  phone:  user?.phone  || '',
  bio:    user?.bio    || '',
  avatar: user?.avatar || '',
  address: {
    street:  user?.address?.street  || '',
    city:    user?.address?.city    || '',
    state:   user?.address?.state   || '',
    country: user?.address?.country || '',
  },
  socialLinks: {
    twitter:  user?.socialLinks?.twitter  || '',
    linkedin: user?.socialLinks?.linkedin || '',
    website:  user?.socialLinks?.website  || '',
  },
  businessInfo: {
    companyName:    user?.businessInfo?.companyName    || '',
    businessType:   user?.businessInfo?.businessType   || '',
    website:        user?.businessInfo?.website        || '',
    registrationNo: user?.businessInfo?.registrationNo || '',
  },
});

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ─────────────────────────────────────────────────────────────────────────────
// Password Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────
const PasswordConfirmModal = ({ onConfirm, onCancel }) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setError('Please enter your password'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/users/verify-password', { password });
      if (res.data.success) {
        onConfirm();
      } else {
        setError(res.data.message || 'Incorrect password');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-sm p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Confirm Your Identity</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enter your password to save changes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Why we ask */}
        <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            For your security, all profile changes require your current password - even small ones.
            This prevents someone with access to your session from modifying your details silently.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoFocus
                placeholder="Enter your current password"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader className="w-4 h-4 animate-spin" /> Verifying...</>
                : 'Confirm & Save'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Field Components
// ─────────────────────────────────────────────────────────────────────────────

// Standard editable field wrapper
const Field = ({ label, children, hint, required: req }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {req && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">{hint}</span>}
    </div>
    {children}
  </div>
);

// Frozen field - dashed border, lock icon, tooltip, "Verified" badge on label
// Communicates clearly: this is intentionally locked, not broken
const FrozenField = ({ label, value, reason }) => (
  <div className="group relative">
    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800 tracking-wide">
        <ShieldCheck className="w-2.5 h-2.5" /> KYC VERIFIED
      </span>
    </div>

    {/* The frozen field itself */}
    <div className="relative flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 cursor-not-allowed select-none gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate block">
          {value || <span className="text-gray-400 dark:text-gray-500 font-normal italic">Not set</span>}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
      </div>
    </div>

    {/* Hover tooltip */}
    <div className="absolute bottom-full left-0 mb-2 z-20 hidden group-hover:block pointer-events-none w-72">
      <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-2xl leading-relaxed">
        <p className="font-semibold mb-1 text-green-300">🔒 Locked after KYC verification</p>
        <p className="text-gray-300">{reason}</p>
        <p className="mt-1.5 text-gray-400">To change this, contact <span className="text-blue-300 font-medium">support@dealcross.net</span> with supporting documents.</p>
        <div className="absolute top-full left-5 border-[5px] border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  </div>
);

const inputBase =
  'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition';

// Section card wrapper
const SectionCard = ({ icon: Icon, title, subtitle, badge, children, accent }) => (
  <div className={`rounded-2xl border p-4 sm:p-6 transition ${
    accent
      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
  }`}>
    <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5 flex-wrap">
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${accent ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
    {children}
  </div>
);

const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-sm">
    <CheckCircle className="w-3.5 h-3.5" /> Identity Verified
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const ProfileTab = ({ user, onUpdate, kycApproved = false }) => {
  const isBusinessAccount = user?.accountType === 'business';
  const initial = useMemo(() => buildInitialForm(user), [user]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.post('/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        set('avatar', res.data.data?.url || res.data.url);
        toast.success('Photo uploaded');
      } else {
        toast.error(res.data.message || 'Upload failed');
      }
    } catch {
      // Fallback: use object URL locally (works even without upload endpoint)
      const objectUrl = URL.createObjectURL(file);
      set('avatar', objectUrl);
      toast.success('Photo selected - save to apply');
    } finally {
      setUploading(false);
    }
  };

  const isDirty = useMemo(() => !deepEqual(form, initial), [form, initial]);

  const set = useCallback((path, value) => {
    const keys = path.split('.');
    setForm(f => {
      if (keys.length === 1) return { ...f, [keys[0]]: value };
      return { ...f, [keys[0]]: { ...f[keys[0]], [keys[1]]: value } };
    });
  }, []);

  // Step 1: user clicks Save → show password modal
  const handleSaveRequest = (e) => {
    e.preventDefault();
    if (!isDirty) return;
    setShowPasswordModal(true);
  };

  // Step 2: password verified → actually save
  const handleConfirmedSave = async () => {
    setShowPasswordModal(false);
    setSaving(true);
    try {
      // Build payload - frozen fields are excluded entirely.
      // Backend enforces the same rules, but excluding them means
      // no false 403 errors from unchanged-but-still-sent fields.
      const payload = {
        bio:         form.bio,
        avatar:      form.avatar,
        socialLinks: form.socialLinks,
      };

      if (!kycApproved) {
        // All fields freely editable before KYC
        payload.name    = form.name;
        payload.phone   = form.phone;
        payload.address = form.address;
        payload.businessInfo = form.businessInfo;
      } else {
        // After KYC: name, phone, address are locked.
        // Business fields are locked only if they already have a saved value.
        // If a field was empty at KYC approval time, the user can still set it once.
        const biz = { website: form.businessInfo.website };
        if (!initial.businessInfo.businessType)   biz.businessType   = form.businessInfo.businessType;
        if (!initial.businessInfo.registrationNo) biz.registrationNo = form.businessInfo.registrationNo;
        if (!initial.businessInfo.companyName)    biz.companyName    = form.businessInfo.companyName;
        payload.businessInfo = biz;
        // name, phone, address remain locked regardless
      }

      const res = await API.put('/users/profile', payload);
      if (res.data.success) {
        toast.success('Profile updated successfully');
        if (onUpdate) onUpdate(res.data.data?.user || res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Reasons shown in tooltips - specific per field
  const lockReasons = {
    name:           'Your legal name was verified against your government ID during KYC.',
    phone:          'Your phone number was registered and verified during KYC. It is used for 2FA and dispute contact.',
    address:        'Your residential or business address was verified as part of your identity documents.',
    companyName:    'Your business name was verified against your CAC registration documents.',
    businessType:   'Your business category determines your regulatory and fee treatment - set during KYC.',
    registrationNo: 'Your CAC / registration number is a legal identifier and cannot be changed after verification.',
  };

  return (
    <>
      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <PasswordConfirmModal
          onConfirm={handleConfirmedSave}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}

      <form onSubmit={handleSaveRequest} className="space-y-5 sm:space-y-6">

        {/* ── KYC Status Banner ──────────────────────────────────────────────── */}
        {kycApproved ? (
          <div className="flex items-start gap-3.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl px-4 sm:px-5 py-4">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-800 dark:text-green-300 mb-1">
                ✓ Identity Verified - Your account is fully trusted
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                Core identity fields (name, phone, address{isBusinessAccount ? ', business name, type & registration number' : ''}) are
                permanently locked to protect you against fraud and impersonation.
                You can still update your bio, picture, social links{isBusinessAccount ? ' and business website' : ''}.
                To change a locked field, email{' '}
                <a href="mailto:support@dealcross.net" className="underline font-semibold hover:text-green-600 dark:hover:text-green-300 transition">
                  support@dealcross.net
                </a>{' '}
                with legal documentation.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 sm:px-5 py-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-0.5">
                Identity Not Yet Verified
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                All fields are editable now. After you complete KYC verification, your identity fields will be locked permanently to protect your account.
              </p>
            </div>
          </div>
        )}

        {/* ── Profile Picture ────────────────────────────────────────────────── */}
        <SectionCard
          icon={ImageIcon}
          title="Profile Picture"
          subtitle="Freely editable - no KYC restriction"
        >
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Live preview */}
            <div className="flex-shrink-0">
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt="Avatar preview"
                  className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-blue-100 dark:ring-blue-900/50 bg-gray-100 dark:bg-gray-800"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div
                className={`${form.avatar ? 'hidden' : 'flex'} w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center text-white text-2xl sm:text-3xl font-extrabold ring-4 ring-blue-100 dark:ring-blue-900/50`}
              >
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl text-blue-600 dark:text-blue-400 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading
                  ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</>
                  : <><ImageIcon className="w-4 h-4" /> {form.avatar ? 'Change Photo' : 'Upload Photo'}</>
                }
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                JPG, PNG or WebP, max 5MB. Tap to open your camera roll or file browser.
              </p>
              {form.avatar && (
                <button
                  type="button"
                  onClick={() => set('avatar', '')}
                  className="mt-2 w-full text-xs text-red-500 dark:text-red-400 hover:underline text-center"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Personal Information ───────────────────────────────────────────── */}
        <SectionCard
          icon={User}
          title="Personal Information"
          badge={kycApproved ? <VerifiedBadge /> : null}
          accent={kycApproved}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

            {/* Full Name */}
            {kycApproved ? (
              <FrozenField
                label={isBusinessAccount ? 'Owner / Director Name' : 'Full Name'}
                value={form.name}
                reason={lockReasons.name}
              />
            ) : (
              <Field label={isBusinessAccount ? 'Owner / Director Name' : 'Full Name'} required>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className={inputBase}
                  placeholder="Your full legal name"
                  required
                />
              </Field>
            )}

            {/* Phone Number */}
            {kycApproved ? (
              <FrozenField label="Phone Number" value={form.phone} reason={lockReasons.phone} />
            ) : (
              <Field label="Phone Number">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className={inputBase + ' pl-10'}
                    placeholder="+234 800 000 0000"
                  />
                </div>
              </Field>
            )}

            {/* Bio - always editable */}
            <div className="sm:col-span-2">
              <Field label="Bio / Description" hint={`${form.bio.length}/300 - always editable`}>
                <div className="relative">
                  <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <textarea
                    value={form.bio}
                    onChange={e => set('bio', e.target.value)}
                    rows={3}
                    maxLength={300}
                    className={inputBase + ' pl-10 resize-none'}
                    placeholder="A brief description about yourself or your business..."
                  />
                </div>
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── Address ───────────────────────────────────────────────────────── */}
        <SectionCard
          icon={MapPin}
          title="Address"
          subtitle={kycApproved ? 'Locked after KYC verification' : 'Will be locked after KYC'}
          badge={kycApproved ? <VerifiedBadge /> : null}
          accent={kycApproved}
        >
          {kycApproved ? (
            // All address fields frozen after KYC
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="sm:col-span-2">
                <FrozenField label="Street Address" value={form.address.street} reason={lockReasons.address} />
              </div>
              <FrozenField label="City"    value={form.address.city}    reason={lockReasons.address} />
              <FrozenField label="State"   value={form.address.state}   reason={lockReasons.address} />
              <FrozenField label="Country" value={form.address.country} reason={lockReasons.address} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="sm:col-span-2">
                <Field label="Street Address">
                  <input type="text" value={form.address.street} onChange={e => set('address.street', e.target.value)}
                    className={inputBase} placeholder="12 Bank Road" />
                </Field>
              </div>
              <Field label="City">
                <input type="text" value={form.address.city} onChange={e => set('address.city', e.target.value)}
                  className={inputBase} placeholder="Aba" />
              </Field>
              <Field label="State">
                <input type="text" value={form.address.state} onChange={e => set('address.state', e.target.value)}
                  className={inputBase} placeholder="Abia State" />
              </Field>
              <Field label="Country">
                <input type="text" value={form.address.country} onChange={e => set('address.country', e.target.value)}
                  className={inputBase} placeholder="Nigeria" />
              </Field>
            </div>
          )}
        </SectionCard>

        {/* ── Social Links (always editable) ────────────────────────────────── */}
        <SectionCard
          icon={LinkIcon}
          title="Social Links"
          subtitle="Always editable - no KYC restriction"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <Field label="Twitter / X">
              <div className="relative">
                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="url" value={form.socialLinks.twitter}
                  onChange={e => set('socialLinks.twitter', e.target.value)}
                  className={inputBase + ' pl-10'} placeholder="https://twitter.com/yourhandle" />
              </div>
            </Field>
            <Field label="LinkedIn">
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="url" value={form.socialLinks.linkedin}
                  onChange={e => set('socialLinks.linkedin', e.target.value)}
                  className={inputBase + ' pl-10'} placeholder="https://linkedin.com/in/yourname" />
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Personal Website">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="url" value={form.socialLinks.website}
                    onChange={e => set('socialLinks.website', e.target.value)}
                    className={inputBase + ' pl-10'} placeholder="https://yourwebsite.com" />
                </div>
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── Business Information (business accounts only) ─────────────────── */}
        {isBusinessAccount && (
          <SectionCard
            icon={Globe}
            title="Business Information"
            subtitle={kycApproved ? 'Most fields locked - website still editable' : 'Will be locked after KYC'}
            badge={kycApproved ? <VerifiedBadge /> : null}
            accent={kycApproved}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

              {/* Business Name - locked after KYC */}
              {kycApproved && initial.businessInfo.companyName ? (
                <FrozenField label="Business / Company Name" value={form.businessInfo.companyName} reason={lockReasons.companyName} />
              ) : (
                <Field label="Business / Company Name" hint={kycApproved && !initial.businessInfo.companyName ? "Set once - locked after saving" : ""}>
                  <input type="text" value={form.businessInfo.companyName}
                    onChange={e => set('businessInfo.companyName', e.target.value)}
                    className={inputBase} placeholder="Acme Ltd" />
                </Field>
              )}

              {/* Business Type - locked after KYC */}
              {kycApproved && initial.businessInfo.businessType ? (
                <FrozenField label="Business Type / Category" value={form.businessInfo.businessType} reason={lockReasons.businessType} />
              ) : (
                <Field label="Business Type / Category" hint={kycApproved && !initial.businessInfo.businessType ? "Set once - locked after saving" : ""}>
                  <input type="text" value={form.businessInfo.businessType}
                    onChange={e => set('businessInfo.businessType', e.target.value)}
                    className={inputBase} placeholder="e.g. E-commerce, Technology" />
                </Field>
              )}

              {/* CAC Registration Number - locked after KYC */}
              {kycApproved && initial.businessInfo.registrationNo ? (
                <FrozenField label="CAC / Registration Number" value={form.businessInfo.registrationNo} reason={lockReasons.registrationNo} />
              ) : (
                <Field label="CAC / Registration Number" hint={kycApproved && !initial.businessInfo.registrationNo ? "Set once - locked after saving" : ""}>
                  <input type="text" value={form.businessInfo.registrationNo}
                    onChange={e => set('businessInfo.registrationNo', e.target.value)}
                    className={inputBase} placeholder="RC 1234567" />
                </Field>
              )}

              {/* Business Website - always editable even after KYC */}
              <Field label="Business Website" hint="Always editable">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="url" value={form.businessInfo.website}
                    onChange={e => set('businessInfo.website', e.target.value)}
                    className={inputBase + ' pl-10'} placeholder="https://yourbusiness.com" />
                </div>
              </Field>
            </div>

            {/* Locked field explanation (only shown after KYC, only to business accounts) */}
            {kycApproved && (
              <div className="mt-5 flex items-start gap-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5">
                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Business name, type and registration number were verified against your CAC documents. They are permanently
                  locked. Your business website URL remains editable at any time.
                </p>
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Save Bar ──────────────────────────────────────────────────────── */}
        <div className="sticky bottom-0 -mx-1 sm:-mx-0">
          <div className={`flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 rounded-2xl border transition-all ${
            isDirty
              ? 'bg-blue-600 border-blue-700 shadow-xl shadow-blue-900/30'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-none'
          }`}>
            <p className={`text-xs sm:text-sm font-medium transition ${
              isDirty ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isDirty
                ? '⚠ You have unsaved changes - password required to save'
                : 'No pending changes'}
            </p>
            <button
              type="submit"
              disabled={saving || !isDirty}
              className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl font-semibold text-sm transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                isDirty
                  ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-sm'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              {saving
                ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Save className="w-4 h-4" /> Save Changes</>
              }
            </button>
          </div>
        </div>

      </form>
    </>
  );
};

export default ProfileTab;
