// src/pages/Auth/UnifiedSignup.jsx - ONE FILE FOR ALL SIGNUPS
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, User, Building2, Mail, Lock, Eye, EyeOff,
  Phone, Globe, CheckCircle, Loader, ArrowRight
} from 'lucide-react';
import { authService } from '../../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

const UnifiedSignup = () => {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('individual');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    agreedToTerms: false,
    
    // Business fields
    companyName: '',
    companyType: '',
    industry: '',
    registrationNumber: '',
    taxId: ''
  });

  const industries = [
    'E-commerce/Marketplace', 'Real Estate', 'Freelance Platform',
    'SaaS/Software', 'Professional Services', 'Government Contracts', 'Other'
  ];

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'GH', name: 'Ghana' },
    { code: 'KE', name: 'Kenya' },
    { code: 'ZA', name: 'South Africa' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const response = await authService.googleAuth({
        credential: credentialResponse.credential
      });
      
      if (response.success) {
        if (response.requiresProfileCompletion) {
          navigate('/complete-profile', {
            state: { googleData: response.googleData }
          });
          return;
        }
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Google signup failed');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    if (accountType === 'individual') {
      if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.country) {
        toast.error('Please fill all required fields');
        return false;
      }
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
      if (!formData.agreedToTerms) {
        toast.error('Please accept the terms');
        return false;
      }
      return true;
    } else {
      // Business multi-step
      if (step === 1) {
        if (!formData.companyName || !formData.industry) {
          toast.error('Please fill business information');
          return false;
        }
      } else if (step === 2) {
        if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.country) {
          toast.error('Please fill contact information');
          return false;
        }
        if (formData.password.length < 8) {
          toast.error('Password must be at least 8 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return false;
        }
      } else if (step === 3) {
        if (!formData.agreedToTerms) {
          toast.error('Please accept the terms');
          return false;
        }
      }
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep()) return;

    // For business, move to next step
    if (accountType === 'business' && step < 3) {
      setStep(prev => prev + 1);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        country: formData.country,
        accountType,
        agreedToTerms: true
      };

      if (accountType === 'business') {
        payload.businessInfo = {
          companyName: formData.companyName,
          companyType: formData.companyType,
          industry: formData.industry,
          registrationNumber: formData.registrationNumber,
          taxId: formData.taxId
        };
      }

      const response = await authService.register(payload);

      if (response.success) {
        toast.success('Account created! 📧 Check your email for verification.');
        
        navigate('/login', {
          state: {
            message: '✅ Account created! Please verify your email to continue.',
            email: formData.email,
            accountType
          }
        });
      }

    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700">
            <Shield className="w-6 h-6" />
            <span className="text-xl font-bold">Dealcross</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {accountType === 'individual' ? 'Join thousands of secure traders' : 'Get started with business escrow'}
          </p>
        </div>

        {/* Main Form Container */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          
          {/* Account Type Selector */}
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Account Type
          </label>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => {
                setAccountType('individual');
                setStep(1);
              }}
              className={`p-4 border-2 rounded-xl transition ${
                accountType === 'individual'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <User className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold text-gray-900 dark:text-white">Individual</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Personal account</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('business');
                setStep(1);
              }}
              className={`p-4 border-2 rounded-xl transition ${
                accountType === 'business'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <Building2 className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold text-gray-900 dark:text-white">Business</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Company account</p>
            </button>
          </div>

          {/* Progress bar for business */}
          {accountType === 'business' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                      step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {step > s ? <CheckCircle className="w-6 h-6" /> : s}
                    </div>
                    {s < 3 && <div className={`flex-1 h-1 mx-2 transition ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Business</span>
                <span>Contact</span>
                <span>Complete</span>
              </div>
            </div>
          )}

          {/* Google Signup */}
          <div className="mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google signup failed')}
              useOneTap
              text="signup_with"
              size="large"
              width="100%"
            />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-700" />
            <span className="text-sm text-gray-500">OR</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-700" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* INDIVIDUAL FORM */}
            {accountType === 'individual' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 234 567 8900"
                      required
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country *
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                    >
                      <option value="">Select</option>
                      {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      required
                      className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-
