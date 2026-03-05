// src/pages/Auth/CompleteProfilePage.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, User, Mail, Phone, Globe, Building2, CheckCircle,
  Loader, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft,
  FileText, Hash, Briefcase
} from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import { COUNTRIES, INDUSTRIES, COMPANY_TYPES, prepareUserPayload } from '../../constants';

// ── Helpers ────────────────────────────────────────────────────────────────────
const inputClass = (hasError) =>
  `w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
    hasError
      ? 'border-red-500 focus:ring-red-400'
      : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'
  } rounded-lg focus:ring-2 outline-none text-gray-900 dark:text-white transition`;

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </p>
  ) : null;

// ── Step Indicator ─────────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep, totalSteps, labels }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center gap-1">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
            i + 1 < currentStep
              ? 'bg-green-500 text-white'
              : i + 1 === currentStep
              ? 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}>
            {i + 1 < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${
            i + 1 === currentStep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
          }`}>
            {labels[i]}
          </span>
        </div>
        {i < totalSteps - 1 && (
          <div className={`flex-1 h-1 rounded max-w-[60px] transition-all ${
            i + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
          }`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const googleData = location.state?.googleData;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: googleData?.name || '',
    email: googleData?.email || '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    accountType: 'individual',
    // Business fields
    companyName: '',
    companyType: '',
    industry: '',
    registrationNumber: '',
    taxId: '',
    businessEmail: '',
    businessPhone: '',
    website: '',
    agreedToTerms: false
  });

  useEffect(() => {
    if (!googleData) navigate('/login');
  }, [googleData, navigate]);

  const isBusinessAccount = formData.accountType === 'business';
  const totalSteps = isBusinessAccount ? 3 : 2;
  const stepLabels = isBusinessAccount
    ? ['Personal Info', 'Business Info', 'Review & Submit']
    : ['Personal Info', 'Review & Submit'];

  // ── Validators ───────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};

    if (!formData.name.trim()) {
      e.name = 'Full name is required';
    } else if (formData.name.trim().length < 3) {
      e.name = 'Name must be at least 3 characters';
    } else if (!/^[a-zA-Z\s'\-]+$/.test(formData.name.trim())) {
      e.name = 'Name can only contain letters, spaces, hyphens and apostrophes';
    }

    if (!formData.password) {
      e.password = 'Password is required';
    } else if (formData.password.length < 8) {
      e.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      e.password = 'Must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      e.password = 'Must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      e.password = 'Must contain at least one number';
    }

    if (!formData.confirmPassword) {
      e.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }

    const phoneClean = formData.phone.replace(/[\s()\-]/g, '');
    if (!formData.phone) {
      e.phone = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{7,14}$/.test(phoneClean)) {
      e.phone = 'Invalid phone number (e.g. +2348012345678)';
    }

    if (!formData.country) {
      e.country = 'Country is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2Business = () => {
    const e = {};

    if (!formData.companyName.trim()) {
      e.companyName = 'Company name is required';
    } else if (formData.companyName.trim().length < 2) {
      e.companyName = 'Company name must be at least 2 characters';
    } else if (formData.companyName.trim().length > 100) {
      e.companyName = 'Company name must be under 100 characters';
    } else if (!/^[a-zA-Z0-9\s&.,'\-()]+$/.test(formData.companyName.trim())) {
      e.companyName = 'Company name contains invalid characters';
    }

    if (!formData.companyType) {
      e.companyType = 'Company type is required';
    }

    if (!formData.industry) {
      e.industry = 'Industry is required';
    }

    if (formData.registrationNumber) {
      if (!/^[a-zA-Z0-9\-\/]{3,30}$/.test(formData.registrationNumber.trim())) {
        e.registrationNumber = 'Invalid format — letters, numbers, hyphens only (3–30 chars)';
      }
    }

    if (formData.taxId) {
      if (!/^[a-zA-Z0-9\-]{5,20}$/.test(formData.taxId.trim())) {
        e.taxId = 'Invalid Tax ID format (5–20 alphanumeric characters)';
      }
    }

    if (formData.businessEmail) {
      if (!/^\S+@\S+\.\S+$/.test(formData.businessEmail)) {
        e.businessEmail = 'Invalid business email address';
      }
    }

    if (formData.businessPhone) {
      const phoneClean = formData.businessPhone.replace(/[\s()\-]/g, '');
      if (!/^\+?[1-9]\d{7,14}$/.test(phoneClean)) {
        e.businessPhone = 'Invalid business phone number';
      }
    }

    if (formData.website) {
      try {
        const url = formData.website.startsWith('http') ? formData.website : `https://${formData.website}`;
        new URL(url);
      } catch {
        e.website = 'Invalid URL (e.g. https://yourcompany.com)';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => { const copy = { ...prev }; delete copy[name]; return copy; });
  };

  const handleNext = () => {
    let valid = false;
    if (step === 1) valid = validateStep1();
    if (step === 2 && isBusinessAccount) valid = validateStep2Business();
    if (valid) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error('Please fix the errors before continuing');
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreedToTerms) {
      toast.error('Please accept the Terms and Conditions to continue');
      return;
    }
    try {
      setLoading(true);
      const payload = prepareUserPayload(formData, formData.accountType, {
        googleId: googleData.googleId,
        picture: googleData.picture,
        verified: true,
        authProvider: 'google'
      });
      const response = await authService.completeGoogleProfile(payload);
      if (response.success) {
        toast.success('Welcome to Dealcross! 🎉');
        setTimeout(() => { window.location.href = '/dashboard'; }, 500);
      }
    } catch (error) {
      console.error('Complete profile error:', error);
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!googleData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Complete Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Set your password and complete your profile details</p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img src={googleData.picture} alt={googleData.name}
              className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 shadow-lg" />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={totalSteps} labels={stepLabels} />

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">

          {/* ═══════════ STEP 1: Personal Info ═══════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-blue-600" /> Personal Information
              </h2>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  placeholder="Your full legal name"
                  className={inputClass(errors.name)} />
                <FieldError message={errors.name} />
              </div>

              {/* Email locked */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" /> Email * (Verified)
                </label>
                <input type="email" value={formData.email} disabled
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 cursor-not-allowed" />
                <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verified by Google
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" /> Create Password *
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    placeholder="Min. 8 chars, uppercase, lowercase, number"
                    className={inputClass(errors.password) + ' pr-12'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <FieldError message={errors.password} />
                {formData.password && !errors.password && (
                  <div className="mt-2 flex gap-1">
                    {[
                      formData.password.length >= 8,
                      /[A-Z]/.test(formData.password),
                      /[a-z]/.test(formData.password),
                      /[0-9]/.test(formData.password)
                    ].map((ok, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${ok ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" /> Confirm Password *
                </label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Repeat your password"
                    className={inputClass(errors.confirmPassword) + ' pr-12'} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <FieldError message={errors.confirmPassword} />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" /> Phone Number *
                </label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  placeholder="+2348012345678"
                  className={inputClass(errors.phone)} />
                <FieldError message={errors.phone} />
                <p className="mt-1 text-xs text-gray-500">Include country code (e.g. +234 for Nigeria)</p>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" /> Country *
                </label>
                <select name="country" value={formData.country} onChange={handleChange}
                  className={inputClass(errors.country)}>
                  <option value="">Select your country</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <FieldError message={errors.country} />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Account Type *</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { type: 'individual', Icon: User, label: 'Individual', desc: 'Personal use' },
                    { type: 'business', Icon: Building2, label: 'Business', desc: 'Company account' }
                  ].map(({ type, Icon, label, desc }) => (
                    <button key={type} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accountType: type }))}
                      className={`p-4 border-2 rounded-lg transition text-center ${
                        formData.accountType === type
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
                      }`}>
                      <Icon className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-500 mt-1">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={handleNext}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ═══════════ STEP 2: Business Info ═══════════ */}
          {step === 2 && isBusinessAccount && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Business Information
              </h2>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Please provide <strong>accurate</strong> business information. This is verified during KYC review. Providing false details may result in account suspension.
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" /> Company Name *
                </label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                  placeholder="Registered company name (must match documents)"
                  className={inputClass(errors.companyName)} />
                <FieldError message={errors.companyName} />
                <p className="mt-1 text-xs text-gray-500">Must match your official registration documents exactly</p>
              </div>

              {/* Company Type & Industry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Briefcase className="w-4 h-4 inline mr-1" /> Company Type *
                  </label>
                  <select name="companyType" value={formData.companyType} onChange={handleChange}
                    className={inputClass(errors.companyType)}>
                    <option value="">Select type</option>
                    {COMPANY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <FieldError message={errors.companyType} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" /> Industry *
                  </label>
                  <select name="industry" value={formData.industry} onChange={handleChange}
                    className={inputClass(errors.industry)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                  <FieldError message={errors.industry} />
                </div>
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Hash className="w-4 h-4 inline mr-1" /> Registration Number
                  <span className="ml-1 text-gray-400 font-normal text-xs">(Recommended)</span>
                </label>
                <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange}
                  placeholder="e.g. RC1234567 (CAC number for Nigeria)"
                  className={inputClass(errors.registrationNumber)} />
                <FieldError message={errors.registrationNumber} />
                <p className="mt-1 text-xs text-gray-500">Government-issued business registration number</p>
              </div>

              {/* Tax ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tax ID / TIN
                  <span className="ml-1 text-gray-400 font-normal text-xs">(Recommended)</span>
                </label>
                <input type="text" name="taxId" value={formData.taxId} onChange={handleChange}
                  placeholder="Tax identification number"
                  className={inputClass(errors.taxId)} />
                <FieldError message={errors.taxId} />
              </div>

              {/* Business Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" /> Business Email
                  <span className="ml-1 text-gray-400 font-normal text-xs">(Optional)</span>
                </label>
                <input type="email" name="businessEmail" value={formData.businessEmail} onChange={handleChange}
                  placeholder="contact@yourcompany.com"
                  className={inputClass(errors.businessEmail)} />
                <FieldError message={errors.businessEmail} />
              </div>

              {/* Business Phone & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" /> Business Phone
                    <span className="ml-1 text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleChange}
                    placeholder="+2348012345678"
                    className={inputClass(errors.businessPhone)} />
                  <FieldError message={errors.businessPhone} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Globe className="w-4 h-4 inline mr-1" /> Website
                    <span className="ml-1 text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input type="text" name="website" value={formData.website} onChange={handleChange}
                    placeholder="https://yourcompany.com"
                    className={inputClass(errors.website)} />
                  <FieldError message={errors.website} />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleBack}
                  className="flex-1 py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button type="button" onClick={handleNext}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ FINAL STEP: Review & Submit ═══════════ */}
          {((step === 2 && !isBusinessAccount) || (step === 3 && isBusinessAccount)) && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" /> Review Your Information
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Please confirm your details are correct before submitting.
              </p>

              {/* Personal Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wide">Personal Details</h3>
                  <button type="button" onClick={() => setStep(1)}
                    className="text-xs text-blue-600 dark:text-blue-400 underline">Edit</button>
                </div>
                {[
                  { label: 'Name', value: formData.name },
                  { label: 'Email', value: formData.email },
                  { label: 'Phone', value: formData.phone },
                  { label: 'Country', value: COUNTRIES.find(c => c.code === formData.country)?.name || formData.country },
                  { label: 'Account Type', value: isBusinessAccount ? 'Business Account' : 'Individual Account' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{value || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Business Summary */}
              {isBusinessAccount && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-3 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm uppercase tracking-wide">Business Details</h3>
                    <button type="button" onClick={() => setStep(2)}
                      className="text-xs text-blue-600 dark:text-blue-400 underline">Edit</button>
                  </div>
                  {[
                    { label: 'Company', value: formData.companyName },
                    { label: 'Type', value: COMPANY_TYPES.find(t => t.value === formData.companyType)?.label },
                    { label: 'Industry', value: INDUSTRIES.find(i => i.value === formData.industry)?.label },
                    { label: 'Reg. Number', value: formData.registrationNumber || 'Not provided' },
                    { label: 'Tax ID', value: formData.taxId || 'Not provided' },
                    { label: 'Business Email', value: formData.businessEmail || 'Not provided' },
                    { label: 'Website', value: formData.website || 'Not provided' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-blue-700 dark:text-blue-300">{label}</span>
                      <span className="text-blue-900 dark:text-blue-100 font-medium">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* KYC Notice */}
              {isBusinessAccount && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>⚠️ KYC Required:</strong> After registration you'll need to upload business documents for verification. Unverified accounts have limited access.
                  </p>
                </div>
              )}

              {/* Terms */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="agreedToTerms" checked={formData.agreedToTerms} onChange={handleChange}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    I confirm that all information provided is accurate and I agree to the{' '}
                    <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                    I understand that providing false information may result in account suspension.
                  </span>
                </label>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button type="button" onClick={handleBack}
                  className="flex-1 py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button type="submit" disabled={loading || !formData.agreedToTerms}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader className="w-5 h-5 animate-spin" /> Completing...</>
                    : <><CheckCircle className="w-5 h-5" /> Complete Profile</>
                  }
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;// src/pages/Auth/CompleteProfilePage.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, User, Mail, Phone, Globe, Building2, CheckCircle,
  Loader, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft,
  FileText, Hash, Briefcase
} from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import { COUNTRIES, INDUSTRIES, COMPANY_TYPES, prepareUserPayload } from '../../constants';

// ── Helpers ────────────────────────────────────────────────────────────────────
const inputClass = (hasError) =>
  `w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
    hasError
      ? 'border-red-500 focus:ring-red-400'
      : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'
  } rounded-lg focus:ring-2 outline-none text-gray-900 dark:text-white transition`;

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </p>
  ) : null;

// ── Step Indicator ─────────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep, totalSteps, labels }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center gap-1">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
            i + 1 < currentStep
              ? 'bg-green-500 text-white'
              : i + 1 === currentStep
              ? 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}>
            {i + 1 < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${
            i + 1 === currentStep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
          }`}>
            {labels[i]}
          </span>
        </div>
        {i < totalSteps - 1 && (
          <div className={`flex-1 h-1 rounded max-w-[60px] transition-all ${
            i + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
          }`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const googleData = location.state?.googleData;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: googleData?.name || '',
    email: googleData?.email || '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    accountType: 'individual',
    // Business fields
    companyName: '',
    companyType: '',
    industry: '',
    registrationNumber: '',
    taxId: '',
    businessEmail: '',
    businessPhone: '',
    website: '',
    agreedToTerms: false
  });

  useEffect(() => {
    if (!googleData) navigate('/login');
  }, [googleData, navigate]);

  const isBusinessAccount = formData.accountType === 'business';
  const totalSteps = isBusinessAccount ? 3 : 2;
  const stepLabels = isBusinessAccount
    ? ['Personal Info', 'Business Info', 'Review & Submit']
    : ['Personal Info', 'Review & Submit'];

  // ── Validators ───────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};

    if (!formData.name.trim()) {
      e.name = 'Full name is required';
    } else if (formData.name.trim().length < 3) {
      e.name = 'Name must be at least 3 characters';
    } else if (!/^[a-zA-Z\s'\-]+$/.test(formData.name.trim())) {
      e.name = 'Name can only contain letters, spaces, hyphens and apostrophes';
    }

    if (!formData.password) {
      e.password = 'Password is required';
    } else if (formData.password.length < 8) {
      e.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      e.password = 'Must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      e.password = 'Must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      e.password = 'Must contain at least one number';
    }

    if (!formData.confirmPassword) {
      e.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }

    const phoneClean = formData.phone.replace(/[\s()\-]/g, '');
    if (!formData.phone) {
      e.phone = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{7,14}$/.test(phoneClean)) {
      e.phone = 'Invalid phone number (e.g. +2348012345678)';
    }

    if (!formData.country) {
      e.country = 'Country is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2Business = () => {
    const e = {};

    if (!formData.companyName.trim()) {
      e.companyName = 'Company name is required';
    } else if (formData.companyName.trim().length < 2) {
      e.companyName = 'Company name must be at least 2 characters';
    } else if (formData.companyName.trim().length > 100) {
      e.companyName = 'Company name must be under 100 characters';
    } else if (!/^[a-zA-Z0-9\s&.,'\-()]+$/.test(formData.companyName.trim())) {
      e.companyName = 'Company name contains invalid characters';
    }

    if (!formData.companyType) {
      e.companyType = 'Company type is required';
    }

    if (!formData.industry) {
      e.industry = 'Industry is required';
    }

    if (formData.registrationNumber) {
      if (!/^[a-zA-Z0-9\-\/]{3,30}$/.test(formData.registrationNumber.trim())) {
        e.registrationNumber = 'Invalid format — letters, numbers, hyphens only (3–30 chars)';
      }
    }

    if (formData.taxId) {
      if (!/^[a-zA-Z0-9\-]{5,20}$/.test(formData.taxId.trim())) {
        e.taxId = 'Invalid Tax ID format (5–20 alphanumeric characters)';
      }
    }

    if (formData.businessEmail) {
      if (!/^\S+@\S+\.\S+$/.test(formData.businessEmail)) {
        e.businessEmail = 'Invalid business email address';
      }
    }

    if (formData.businessPhone) {
      const phoneClean = formData.businessPhone.replace(/[\s()\-]/g, '');
      if (!/^\+?[1-9]\d{7,14}$/.test(phoneClean)) {
        e.businessPhone = 'Invalid business phone number';
      }
    }

    if (formData.website) {
      try {
        const url = formData.website.startsWith('http') ? formData.website : `https://${formData.website}`;
        new URL(url);
      } catch {
        e.website = 'Invalid URL (e.g. https://yourcompany.com)';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => { const copy = { ...prev }; delete copy[name]; return copy; });
  };

  const handleNext = () => {
    let valid = false;
    if (step === 1) valid = validateStep1();
    if (step === 2 && isBusinessAccount) valid = validateStep2Business();
    if (valid) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error('Please fix the errors before continuing');
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreedToTerms) {
      toast.error('Please accept the Terms and Conditions to continue');
      return;
    }
    try {
      setLoading(true);
      const payload = prepareUserPayload(formData, formData.accountType, {
        googleId: googleData.googleId,
        picture: googleData.picture,
        verified: true,
        authProvider: 'google'
      });
      const response = await authService.completeGoogleProfile(payload);
      if (response.success) {
        toast.success('Welcome to Dealcross! 🎉');
        setTimeout(() => { window.location.href = '/dashboard'; }, 500);
      }
    } catch (error) {
      console.error('Complete profile error:', error);
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!googleData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Complete Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Set your password and complete your profile details</p>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img src={googleData.picture} alt={googleData.name}
              className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 shadow-lg" />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={totalSteps} labels={stepLabels} />

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">

          {/* ═══════════ STEP 1: Personal Info ═══════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-blue-600" /> Personal Information
              </h2>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  placeholder="Your full legal name"
                  className={inputClass(errors.name)} />
                <FieldError message={errors.name} />
              </div>

              {/* Email locked */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" /> Email * (Verified)
                </label>
                <input type="email" value={formData.email} disabled
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 cursor-not-allowed" />
                <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verified by Google
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" /> Create Password *
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    placeholder="Min. 8 chars, uppercase, lowercase, number"
                    className={inputClass(errors.password) + ' pr-12'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <FieldError message={errors.password} />
                {formData.password && !errors.password && (
                  <div className="mt-2 flex gap-1">
                    {[
                      formData.password.length >= 8,
                      /[A-Z]/.test(formData.password),
                      /[a-z]/.test(formData.password),
                      /[0-9]/.test(formData.password)
                    ].map((ok, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${ok ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" /> Confirm Password *
                </label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Repeat your password"
                    className={inputClass(errors.confirmPassword) + ' pr-12'} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <FieldError message={errors.confirmPassword} />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" /> Phone Number *
                </label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  placeholder="+2348012345678"
                  className={inputClass(errors.phone)} />
                <FieldError message={errors.phone} />
                <p className="mt-1 text-xs text-gray-500">Include country code (e.g. +234 for Nigeria)</p>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" /> Country *
                </label>
                <select name="country" value={formData.country} onChange={handleChange}
                  className={inputClass(errors.country)}>
                  <option value="">Select your country</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <FieldError message={errors.country} />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Account Type *</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { type: 'individual', Icon: User, label: 'Individual', desc: 'Personal use' },
                    { type: 'business', Icon: Building2, label: 'Business', desc: 'Company account' }
                  ].map(({ type, Icon, label, desc }) => (
                    <button key={type} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accountType: type }))}
                      className={`p-4 border-2 rounded-lg transition text-center ${
                        formData.accountType === type
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
                      }`}>
                      <Icon className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                      <p className="text-xs text-gray-500 mt-1">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={handleNext}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ═══════════ STEP 2: Business Info ═══════════ */}
          {step === 2 && isBusinessAccount && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Business Information
              </h2>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Please provide <strong>accurate</strong> business information. This is verified during KYC review. Providing false details may result in account suspension.
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" /> Company Name *
                </label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                  placeholder="Registered company name (must match documents)"
                  className={inputClass(errors.companyName)} />
                <FieldError message={errors.companyName} />
                <p className="mt-1 text-xs text-gray-500">Must match your official registration documents exactly</p>
              </div>

              {/* Company Type & Industry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Briefcase className="w-4 h-4 inline mr-1" /> Company Type *
                  </label>
                  <select name="companyType" value={formData.companyType} onChange={handleChange}
                    className={inputClass(errors.companyType)}>
                    <option value="">Select type</option>
                    {COMPANY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <FieldError message={errors.companyType} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" /> Industry *
                  </label>
                  <select name="industry" value={formData.industry} onChange={handleChange}
                    className={inputClass(errors.industry)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                  <FieldError message={errors.industry} />
                </div>
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Hash className="w-4 h-4 inline mr-1" /> Registration Number
                  <span className="ml-1 text-gray-400 font-normal text-xs">(Recommended)</span>
                </label>
                <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange}
                  placeholder="e.g. RC1234567 (CAC number for Nigeria)"
                  className={inputClass(errors.registrationNumber)} />
                <FieldError message={errors.registrationNumber} />
                <p className="mt-1 text-xs text-gray-500">Government-issued business registration number</p>
              </div>

              {/* Tax ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tax ID / TIN
                  <span className="ml-1 text-gray-400 font-normal text-xs">(Recommended)</span>
                </label>
                <input type="text" name="taxId" value={formData.taxId} onChange={handleChange}
                  placeholder="Tax identification number"
                  className={inputClass(errors.taxId)} />
                <FieldError message={errors.taxId} />
              </div>

              {/* Business Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" /> Business Email
                  <span className="ml-1 text-gray-400 font-normal text-xs">(Optional)</span>
                </label>
                <input type="email" name="businessEmail" value={formData.businessEmail} onChange={handleChange}
                  placeholder="contact@yourcompany.com"
                  className={inputClass(errors.businessEmail)} />
                <FieldError message={errors.businessEmail} />
              </div>

              {/* Business Phone & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" /> Business Phone
                    <span className="ml-1 text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleChange}
                    placeholder="+2348012345678"
                    className={inputClass(errors.businessPhone)} />
                  <FieldError message={errors.businessPhone} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Globe className="w-4 h-4 inline mr-1" /> Website
                    <span className="ml-1 text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input type="text" name="website" value={formData.website} onChange={handleChange}
                    placeholder="https://yourcompany.com"
                    className={inputClass(errors.website)} />
                  <FieldError message={errors.website} />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleBack}
                  className="flex-1 py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button type="button" onClick={handleNext}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ FINAL STEP: Review & Submit ═══════════ */}
          {((step === 2 && !isBusinessAccount) || (step === 3 && isBusinessAccount)) && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" /> Review Your Information
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Please confirm your details are correct before submitting.
              </p>

              {/* Personal Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wide">Personal Details</h3>
                  <button type="button" onClick={() => setStep(1)}
                    className="text-xs text-blue-600 dark:text-blue-400 underline">Edit</button>
                </div>
                {[
                  { label: 'Name', value: formData.name },
                  { label: 'Email', value: formData.email },
                  { label: 'Phone', value: formData.phone },
                  { label: 'Country', value: COUNTRIES.find(c => c.code === formData.country)?.name || formData.country },
                  { label: 'Account Type', value: isBusinessAccount ? 'Business Account' : 'Individual Account' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{value || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Business Summary */}
              {isBusinessAccount && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-3 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm uppercase tracking-wide">Business Details</h3>
                    <button type="button" onClick={() => setStep(2)}
                      className="text-xs text-blue-600 dark:text-blue-400 underline">Edit</button>
                  </div>
                  {[
                    { label: 'Company', value: formData.companyName },
                    { label: 'Type', value: COMPANY_TYPES.find(t => t.value === formData.companyType)?.label },
                    { label: 'Industry', value: INDUSTRIES.find(i => i.value === formData.industry)?.label },
                    { label: 'Reg. Number', value: formData.registrationNumber || 'Not provided' },
                    { label: 'Tax ID', value: formData.taxId || 'Not provided' },
                    { label: 'Business Email', value: formData.businessEmail || 'Not provided' },
                    { label: 'Website', value: formData.website || 'Not provided' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-blue-700 dark:text-blue-300">{label}</span>
                      <span className="text-blue-900 dark:text-blue-100 font-medium">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* KYC Notice */}
              {isBusinessAccount && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>⚠️ KYC Required:</strong> After registration you'll need to upload business documents for verification. Unverified accounts have limited access.
                  </p>
                </div>
              )}

              {/* Terms */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="agreedToTerms" checked={formData.agreedToTerms} onChange={handleChange}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    I confirm that all information provided is accurate and I agree to the{' '}
                    <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                    I understand that providing false information may result in account suspension.
                  </span>
                </label>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button type="button" onClick={handleBack}
                  className="flex-1 py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button type="submit" disabled={loading || !formData.agreedToTerms}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader className="w-5 h-5 animate-spin" /> Completing...</>
                    : <><CheckCircle className="w-5 h-5" /> Complete Profile</>
                  }
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
