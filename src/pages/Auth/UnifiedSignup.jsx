// src/pages/Auth/UnifiedSignup.jsx - COMPLETE & FIXED
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, User, Building2, Eye, EyeOff,
  CheckCircle, Loader, ArrowRight, AlertCircle
} from 'lucide-react';
import { authService } from '../../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const UnifiedSignup = () => {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('individual');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    agreedToTerms: false,
    companyName: '',
    companyType: '',
    industry: '',
    registrationNumber: '',
    taxId: ''
  });

  const industries = [
    { label: 'E-commerce/Marketplace', value: 'ecommerce' },
    { label: 'Real Estate', value: 'real_estate' },
    { label: 'Freelance Platform', value: 'freelance' },
    { label: 'SaaS/Software', value: 'saas' },
    { label: 'Professional Services', value: 'professional_services' },
    { label: 'Government Contracts', value: 'government' },
    { label: 'Technology', value: 'technology' },
    { label: 'Finance', value: 'finance' },
    { label: 'Healthcare', value: 'healthcare' },
    { label: 'Education', value: 'education' },
    { label: 'Manufacturing', value: 'manufacturing' },
    { label: 'Retail', value: 'retail' },
    { label: 'Fashion', value: 'fashion' },
    { label: 'Automotive', value: 'automotive' },
    { label: 'Logistics', value: 'logistics' },
    { label: 'Services', value: 'services' },
    { label: 'Other', value: 'other' }
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

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'name':
        if (!value.trim()) newErrors.name = 'Name is required';
        else if (value.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';
        else delete newErrors.name;
        break;

      case 'email':
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!value) newErrors.email = 'Email is required';
        else if (!emailRegex.test(value)) newErrors.email = 'Please enter a valid email';
        else delete newErrors.email;
        break;

      case 'password':
        if (!value) newErrors.password = 'Password is required';
        else if (value.length < 8) newErrors.password = 'Password must be at least 8 characters';
        else if (!/[A-Z]/.test(value)) newErrors.password = 'Must contain uppercase letter';
        else if (!/[a-z]/.test(value)) newErrors.password = 'Must contain lowercase letter';
        else if (!/[0-9]/.test(value)) newErrors.password = 'Must contain number';
        else delete newErrors.password;

        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;

      case 'confirmPassword':
        if (!value) newErrors.confirmPassword = 'Please confirm password';
        else if (value !== formData.password) newErrors.confirmPassword = 'Passwords do not match';
        else delete newErrors.confirmPassword;
        break;

      case 'phone':
        const phoneRegex = /^\+?[1-9]\d{7,14}$/;
        if (!value) newErrors.phone = 'Phone number is required';
        else if (!phoneRegex.test(value.replace(/[\s()-]/g, ''))) newErrors.phone = 'Invalid phone number';
        else delete newErrors.phone;
        break;

      case 'country':
        if (!value) newErrors.country = 'Country is required';
        else delete newErrors.country;
        break;

      case 'companyName':
        if (accountType === 'business') {
          if (!value.trim()) newErrors.companyName = 'Company name is required';
          else if (value.trim().length < 2) newErrors.companyName = 'Company name too short';
          else delete newErrors.companyName;
        }
        break;

      case 'industry':
        if (accountType === 'business' && !value) newErrors.industry = 'Industry is required';
        else delete newErrors.industry;
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));

    if (type !== 'checkbox') {
      validateField(name, newValue);
    }
  };

  // ✅ FIXED: Decode Google JWT and extract user info
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      
      // ✅ Decode the JWT token to get user info
      const decoded = jwtDecode(credentialResponse.credential);
      
      console.log('🔵 Decoded Google user:', decoded);
      
      // ✅ Send correct format to backend
      const response = await authService.googleAuth({
        googleId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture
      });
      
      if (response.success) {
        if (response.requiresProfileCompletion) {
          navigate('/complete-profile', {
            state: { googleData: response.googleData }
          });
          return;
        }
        
        toast.success('Login successful!');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      }
    } catch (error) {
      console.error('❌ Google signup error:', error);
      toast.error(error.message || 'Google signup failed');
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
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
      if (!formData.agreedToTerms) {
        toast.error('Please accept terms and conditions');
        return false;
      }
      if (Object.keys(errors).length > 0) {
        toast.error('Please fix all errors');
        return false;
      }
      return true;
    } else {
      if (step === 1) {
        if (!formData.companyName || !formData.industry) {
          toast.error('Company name and industry required');
          return false;
        }
        if (errors.companyName || errors.industry) {
          toast.error('Please fix errors');
          return false;
        }
      } else if (step === 2) {
        if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.country) {
          toast.error('Please fill all required fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return false;
        }
        if (Object.keys(errors).length > 0) {
          toast.error('Please fix all errors');
          return false;
        }
      } else if (step === 3) {
        if (!formData.agreedToTerms) {
          toast.error('Please accept terms and conditions');
          return false;
        }
      }
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep()) return;

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
        toast.success('Account created! Check your email for verification.');
        
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: '✅ Account created! Please verify your email.',
              email: formData.email
            }
          });
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Signup error:', error);
      toast.error(error.message || 'Registration failed');
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

        {/* Main Form */}
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
                setErrors({});
              }}
              disabled={loading}
              className={`p-4 border-2 rounded-xl transition ${
                accountType === 'individual'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
              } disabled:opacity-50`}
            >
              <User className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold text-gray-900 dark:text-white">Individual</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Personal</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('business');
                setStep(1);
                setErrors({});
              }}
              disabled={loading}
              className={`p-4 border-2 rounded-xl transition ${
                accountType === 'business'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
              } disabled:opacity-50`}
            >
              <Building2 className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold text-gray-900 dark:text-white">Business</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Company</p>
            </button>
          </div>

          {/* Progress Bar (Business Only) */}
          {accountType === 'business' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {step > s ? <CheckCircle className="w-6 h-6" /> : s}
                    </div>
                    {s < 3 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
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

          {/* Form Steps */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* BUSINESS STEP 1: Company Info */}
            {accountType === 'business' && step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Acme Corp"
                    required
                    disabled={loading}
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.companyName ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
                  />
                  {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Industry *
                  </label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.industry ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
                  >
                    <option value="">Select Industry</option>
                    {industries.map(ind => (
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                  </select>
                  {errors.industry && <p className="mt-1 text-sm text-red-600">{errors.industry}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Type
                    </label>
                    <select
                      name="companyType"
                      value={formData.companyType}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                    >
                      <option value="">Select</option>
                      <option value="LLC">LLC</option>
                      <option value="Corporation">Corporation</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      placeholder="Optional"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="Optional"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {/* INDIVIDUAL OR BUSINESS STEP 2: Personal Info */}
            {(accountType === 'individual' || (accountType === 'business' && step === 2)) && (
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
                    disabled={loading}
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
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
                    disabled={loading}
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
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
                      placeholder="+1234567890"
                      required
                      disabled={loading}
                      className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                        errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
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
                      disabled={loading}
                      className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                        errors.country ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
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
                      disabled={loading}
                      className={`w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border ${
                        errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    required
                    disabled={loading}
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white`}
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>
              </>
            )}

            {/* STEP 3 or INDIVIDUAL: Terms & Submit */}
            {(accountType === 'individual' || (accountType === 'business' && step === 3)) && (
              <>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="agreedToTerms"
                    id="terms"
                    checked={formData.agreedToTerms}
                    onChange={handleChange}
                    disabled={loading}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms & Conditions</Link> and <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !formData.agreedToTerms}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </>
            )}

            {/* Business Navigation Buttons */}
            {accountType === 'business' && step < 3 && (
              <div className="flex gap-4">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(prev => prev - 1)}
                    disabled={loading}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account? <Link to="/login" className="text-blue-600 hover:underline font-medium">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSignup;
