// File: src/pages/ProfileTab.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Lock, User, Phone, Globe, MapPin, FileText, Save, Loader,
  CheckCircle, Twitter, Linkedin, Link as LinkIcon,
  ShieldCheck, Eye, EyeOff, KeyRound, AlertCircle, X, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Human-readable label for a businessType value
const BUSINESS_TYPE_LABELS = {
  sole_proprietor: 'Sole Proprietor',
  partnership:     'Partnership',
  llc:             'LLC / Limited Liability Company',
  corporation:     'Corporation',
  ngo:             'NGO / Non-Profit',
  ecommerce:       'E-commerce',
  freelance:       'Freelance / Consulting',
  technology:      'Technology / Software',
  logistics:       'Logistics / Delivery',
  real_estate:     'Real Estate',
  finance:         'Finance / Fintech',
  education:       'Education',
  healthcare:      'Healthcare',
  retail:          'Retail',
  other:           'Other',
};

const formatBusinessType = (val) =>
  BUSINESS_TYPE_LABELS[val] || (val ? val.replace(/_/g, ' ') : '');

const buildInitialForm = (user) => ({
  name:   user?.name   || '',
  phone:  user?.phone  || '',
  bio:    user?.bio    || '',
  avatar: user?.avatar || user?.profilePicture || '',
  address: {
    street:  user?.address?.street  || '',
    city:    user?.address?.city    || '',
    state:   user?.address?.state   || '',
    country: user?.address?.country || user?.country || '',
  },
  socialLinks: {
    twitter:  user?.socialLinks?.twitter  || '',
    linkedin: user?.socialLinks?.linkedin || '',
    website:  user?.socialLinks?.website  || '',
  },
  businessInfo: {
    companyName:    user?.businessInfo?.companyName    || '',
    // businessType comes from registration — never editable in profile
    businessType:   user?.businessInfo?.businessType   || '',
    website:        user?.businessInfo?.website        || '',
    registrationNo: user?.businessInfo?.registrationNo || user?.businessInfo?.registrationNumber || '',
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
          <button type="button" onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            For your security, all profile changes require your current password.
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
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <button type="button" onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition">
              Cancel
            </button>
            <button type="submit" disabled={loading || !password.trim()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader className="w-4 h-4 animate-spin" /> Verifying...</> : 'Confirm & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Field Components
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({ label, children, hint, required: req }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{req && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[10px] text-gray-400 italic">{hint}</span>}
    </div>
    {children}
  </div>
);

// Locked field — dashed border with lock icon and tooltip
const FrozenField = ({ label, value, reason, badge }) => (
  <div className="group relative">
    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {badge || (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800">
          <ShieldCheck className="w-2.5 h-2.5" /> KYC VERIFIED
        </span>
      )}
    </div>
    <div className="relative flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 cursor-not-allowed select-none gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate block">
          {value || <span className="text-gray-400 font-normal italic">Not set</span>}
        </span>
      </div>
      <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
    </div>
    {reason && (
      <div className="absolute bottom-full left-0 mb-2 z-20 hidden group-hover:block pointer-events-none w-72">
        <div className="bg-gray-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-2xl leading-relaxed">
          <p className="font-semibold mb-1 text-green-300">🔒 Locked after KYC verification</p>
          <p className="text-gray-300">{reason}</p>
          <p className="mt-1.5 text-gray-400">To change this, contact <span className="text-blue-300 font-medium">support@dealcross.net</span></p>
          <div className="absolute top-full left-5 border-[5px] border-transparent border-t-gray-900" />
        </div>
      </div>
    )}
  </div>
);

// Read-only display field — for registration-sourced data, no KYC badge needed
const ReadOnlyField = ({ label, value, note }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {note && <span className="text-[10px] text-gray-400 italic">{note}</span>}
    </div>
    <div className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 gap-3">
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 font-medium">
        {value || <span className="text-gray-400 font-normal italic">Not set during registration</span>}
      </span>
      <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
    </div>
  </div>
);

const inputBase =
  'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition';

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

  // Sync form when user prop changes
  useEffect(() => {
    setForm(buildInitialForm(user));
  }, [user]);

  const isDirty = useMemo(() => !deepEqual(form, initial), [form, initial]);

  const set = useCallback((path, value) => {
    const keys = path.split('.');
    setForm(f => {
      if (keys.length === 1) return { ...f, [keys[0]]: value };
      return { ...f, [keys[0]]: { ...f[keys[0]], [keys[1]]: value } };
    });
  }, []);

  const handleSaveRequest = (e) => {
    e.preventDefault();
    if (!isDirty) return;
    setShowPasswordModal(true);
  };

  const handleConfirmedSave = async () => {
    setShowPasswordModal(false);
    setSaving(true);
    try {
      const payload = {
        bio:         form.bio,
        avatar:      form.avatar,
        socialLinks: form.socialLinks,
      };

      if (!kycApproved) {
        payload.name    = form.name;
        payload.phone   = form.phone;
        payload.address = form.address;
        // businessType comes from registration — never sent in profile updates
        payload.businessInfo = {
          companyName:    form.businessInfo.companyName,
          website:        form.businessInfo.website,
          registrationNo: form.businessInfo.registrationNo,
        };
      } else {
        // After KYC: only unlock empty fields
        const biz = { website: form.businessInfo.website };
        if (!initial.businessInfo.registrationNo) biz.registrationNo = form.businessInfo.registrationNo;
        if (!initial.businessInfo.companyName)    biz.companyName    = form.businessInfo.companyName;
        // businessType is NEVER sent — it's set at registration and read-only
        payload.businessInfo = biz;
      }

      const res = await API.put('/users/profile', payload);

      if (res.data.success) {
        toast.success('Profile updated successfully');

        // Re-fetch fresh profile so form reflects persisted values
        try {
          const freshRes = await API.get('/profile');
          let freshUser = freshRes.data?.data?.user || freshRes.data?.data || freshRes.data?.user;
          if (freshUser && onUpdate) {
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            const merged = {
              ...stored,
              ...freshUser,
              address:      { ...(stored.address      || {}), ...(freshUser.address      || {}) },
              businessInfo: { ...(stored.businessInfo || {}), ...(freshUser.businessInfo || {}) },
            };
            localStorage.setItem('user', JSON.stringify(merged));
            onUpdate(merged);
          }
        } catch {
          // Fallback: use save response
          const savedUser = res.data.data?.user || res.data.data || {};
          const fallback  = {
            ...user,
            ...savedUser,
            address:      { ...(user?.address      || {}), ...(savedUser.address      || {}) },
            businessInfo: { ...(user?.businessInfo || {}), ...(savedUser.businessInfo || {}) },
          };
          if (onUpdate) onUpdate(fallback);
        }
      } else {
        toast.error(res.data.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const lockReasons = {
    name:           'Your legal name was verified against your government ID during KYC.',
    phone:          'Your phone number was registered and verified during KYC.',
    address:        'Your address was verified as part of your identity documents.',
    companyName:    'Your business name was verified against your CAC registration documents.',
    registrationNo: 'Your CAC / registration number is a legal identifier.',
  };

  return (
    <>
      {showPasswordModal && (
        <PasswordConfirmModal
          onConfirm={handleConfirmedSave}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}

      <form onSubmit={handleSaveRequest} className="space-y-5 sm:space-y-6">

        {/* ── KYC Status Banner ─────────────────────────────────────────── */}
        {kycApproved ? (
          <div className="flex items-start gap-3.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl px-4 sm:px-5 py-4">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-800 dark:text-green-300 mb-1">
                ✓ Identity Verified — Your account is fully trusted
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                Core identity fields are permanently locked to protect you against fraud.
                To change a locked field, email{' '}
                <a href="mailto:support@dealcross.net" className="underline font-semibold">
                  support@dealcross.net
                </a>{' '}
                with legal documentation.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 sm:px-5 py-4">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-0.5">Identity Not Yet Verified</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                All fields are editable now. After KYC verification, identity fields will be locked permanently.
              </p>
            </div>
          </div>
        )}

        {/* ── Personal Information ───────────────────────────────────────── */}
        <SectionCard
          icon={User}
          title="Personal Information"
          badge={kycApproved ? <VerifiedBadge /> : null}
          accent={kycApproved}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

            {kycApproved ? (
              <FrozenField
                label={isBusinessAccount ? 'Owner / Director Name' : 'Full Name'}
                value={form.name}
                reason={lockReasons.name}
              />
            ) : (
              <Field label={isBusinessAccount ? 'Owner / Director Name' : 'Full Name'} required>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  className={inputBase} placeholder="Your full legal name" required />
              </Field>
            )}

            {kycApproved ? (
              <FrozenField label="Phone Number" value={form.phone} reason={lockReasons.phone} />
            ) : (
              <Field label="Phone Number">
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  className={inputBase} placeholder="+234 800 000 0000" />
              </Field>
            )}

            <div className="sm:col-span-2">
              <Field label="Bio / Description" hint={`${form.bio.length}/300 — always editable`}>
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                  rows={3} maxLength={300} className={inputBase + ' resize-none'}
                  placeholder="A brief description about yourself or your business..." />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── Address ───────────────────────────────────────────────────── */}
        <SectionCard
          icon={MapPin}
          title="Address"
          subtitle={kycApproved ? 'Locked after KYC verification' : 'Will be locked after KYC'}
          badge={kycApproved ? <VerifiedBadge /> : null}
          accent={kycApproved}
        >
          {kycApproved ? (
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

        {/* ── Social Links ─────────────────────────────────────────────── */}
        <SectionCard icon={LinkIcon} title="Social Links" subtitle="Always editable">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <Field label="Twitter / X">
              <input type="url" value={form.socialLinks.twitter}
                onChange={e => set('socialLinks.twitter', e.target.value)}
                className={inputBase} placeholder="https://twitter.com/yourhandle" />
            </Field>
            <Field label="LinkedIn">
              <input type="url" value={form.socialLinks.linkedin}
                onChange={e => set('socialLinks.linkedin', e.target.value)}
                className={inputBase} placeholder="https://linkedin.com/in/yourname" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Personal Website">
                <input type="url" value={form.socialLinks.website}
                  onChange={e => set('socialLinks.website', e.target.value)}
                  className={inputBase} placeholder="https://yourwebsite.com" />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── Business Information (business accounts only) ─────────────── */}
        {isBusinessAccount && (
          <SectionCard
            icon={Globe}
            title="Business Information"
            subtitle={kycApproved ? 'Registration fields locked — website still editable' : 'Some fields from registration'}
            badge={kycApproved ? <VerifiedBadge /> : null}
            accent={kycApproved}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

              {/* Business Name */}
              {kycApproved && initial.businessInfo.companyName ? (
                <FrozenField label="Business / Company Name" value={form.businessInfo.companyName} reason={lockReasons.companyName} />
              ) : (
                <Field label="Business / Company Name"
                  hint={kycApproved && !initial.businessInfo.companyName ? 'Set once — locked after saving' : ''}>
                  <input type="text" value={form.businessInfo.companyName}
                    onChange={e => set('businessInfo.companyName', e.target.value)}
                    className={inputBase} placeholder="Acme Ltd" />
                </Field>
              )}

              {/* Business Type — READ ONLY, sourced from registration, NEVER a dropdown here */}
              <ReadOnlyField
                label="Business Type"
                value={formatBusinessType(form.businessInfo.businessType)}
                note="Set during registration"
              />

              {/* Registration Number */}
              {kycApproved && initial.businessInfo.registrationNo ? (
                <FrozenField label="CAC / Registration Number" value={form.businessInfo.registrationNo} reason={lockReasons.registrationNo} />
              ) : (
                <Field label="CAC / Registration Number"
                  hint={kycApproved && !initial.businessInfo.registrationNo ? 'Set once — locked after saving' : ''}>
                  <input type="text" value={form.businessInfo.registrationNo}
                    onChange={e => set('businessInfo.registrationNo', e.target.value)}
                    className={inputBase} placeholder="RC 1234567" />
                </Field>
              )}

              {/* Business Website — always editable */}
              <Field label="Business Website" hint="Always editable">
                <input type="url" value={form.businessInfo.website}
                  onChange={e => set('businessInfo.website', e.target.value)}
                  className={inputBase} placeholder="https://yourbusiness.com" />
              </Field>
            </div>

            <div className="mt-5 flex items-start gap-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Business type is set during account registration and cannot be changed here.
                {kycApproved && ' Business name and registration number are locked after KYC verification.'}
                {' '}Your website URL is always editable.
              </p>
            </div>
          </SectionCard>
        )}

        {/* ── Save Bar ─────────────────────────────────────────────────── */}
        <div className="sticky bottom-0 -mx-1 sm:-mx-0">
          <div className={`flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 rounded-2xl border transition-all ${
            isDirty
              ? 'bg-blue-600 border-blue-700 shadow-xl shadow-blue-900/30'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
          }`}>
            <p className={`text-xs sm:text-sm font-medium transition ${
              isDirty ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isDirty ? '⚠ Unsaved changes — password required to save' : 'No pending changes'}
            </p>
            <button type="submit" disabled={saving || !isDirty}
              className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl font-semibold text-sm transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                isDirty
                  ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-sm'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}>
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
