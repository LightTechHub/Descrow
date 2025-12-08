import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Upload, 
  FileText,
  AlertCircle,
  Loader,
  Award,
  Mail,
  Shield,
  Building,
  User,
  MapPin,
  Info,
  ExternalLink
} from 'lucide-react';
import profileService from 'services/profileService';
import toast from 'react-hot-toast';
import { verifyService } from 'services/verifyService';

const KYCTab = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [selectedTier, setSelectedTier] = useState('basic');
  const [formErrors, setFormErrors] = useState({});
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  
  const [formData, setFormData] = useState({
    personalInfo: {
      dateOfBirth: '',
      nationality: '',
      idNumber: '',
      idType: 'passport',
      idExpiryDate: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      }
    },
    businessInfo: {
      companyName: '',
      registrationNumber: '',
      taxId: '',
      businessType: 'sole_proprietorship',
      businessAddress: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      }
    }
  });

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const response = await profileService.getKYCStatus();
      if (response.success) {
        setKycStatus(response.data);
        
        if (response.data.personalInfo) {
          setFormData(prev => ({
            ...prev,
            personalInfo: {
              ...prev.personalInfo,
              ...response.data.personalInfo,
              address: {
                ...prev.personalInfo.address,
                ...(response.data.personalInfo.address || {})
              }
            },
            businessInfo: {
              ...prev.businessInfo,
              ...response.data.businessInfo,
              businessAddress: {
                ...prev.businessInfo.businessAddress,
                ...(response.data.businessInfo?.businessAddress || {})
              }
            }
          }));
        }
        
        if (response.data.tier) {
          setSelectedTier(response.data.tier);
        }
        
        if (response.data.businessInfo?.companyName) {
          setShowBusinessInfo(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
      setKycStatus({
        status: 'unverified',
        tier: 'basic'
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
    
    if (name.includes('.')) {
      const keys = name.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const today = new Date();
    const minAgeDate = new Date();
    minAgeDate.setFullYear(today.getFullYear() - 18);

    // Personal Info Validation
    if (!formData.personalInfo.dateOfBirth) {
      errors['personalInfo.dateOfBirth'] = 'Date of birth is required';
    } else if (new Date(formData.personalInfo.dateOfBirth) > minAgeDate) {
      errors['personalInfo.dateOfBirth'] = 'You must be at least 18 years old';
    }

    if (!formData.personalInfo.nationality) {
      errors['personalInfo.nationality'] = 'Nationality is required';
    }

    if (!formData.personalInfo.idNumber) {
      errors['personalInfo.idNumber'] = 'ID number is required';
    }

    // Address Validation
    if (!formData.personalInfo.address.street) {
      errors['personalInfo.address.street'] = 'Street address is required';
    }
    if (!formData.personalInfo.address.city) {
      errors['personalInfo.address.city'] = 'City is required';
    }
    if (!formData.personalInfo.address.country) {
      errors['personalInfo.address.country'] = 'Country is required';
    }

    // Business Info Validation for advanced/premium tiers
    if (showBusinessInfo) {
      if (!formData.businessInfo.companyName) {
        errors['businessInfo.companyName'] = 'Company name is required';
      }
      if (!formData.businessInfo.registrationNumber) {
        errors['businessInfo.registrationNumber'] = 'Registration number is required';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check email verification first
    if (!user?.verified) {
      toast.error('Please verify your email before submitting KYC');
      return;
    }

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);
      
      const kycData = {
        personalInfo: formData.personalInfo,
        tier: selectedTier
      };

      // Include business info only if provided
      if (showBusinessInfo) {
        kycData.businessInfo = formData.businessInfo;
      }

      const response = await profileService.submitKYC(kycData);

      if (response.success) {
        toast.success('KYC submitted successfully! We will review within 24-48 hours.', {
          duration: 5000,
          icon: '✅'
        });
        fetchKYCStatus();
        onUpdate && onUpdate();
        
        // Analytics event
        window.gtag?.('event', 'kyc_submitted', {
          event_category: 'KYC',
          event_label: selectedTier,
          tier: selectedTier
        });
      }
    } catch (error) {
      console.error('Submit KYC error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        if (error.response.data?.requiresEmailVerification) {
          toast.error('Please verify your email before submitting KYC');
        } else {
          toast.error(error.response.data?.message || 'Please check your information and try again');
        }
      } else {
        toast.error('Failed to submit KYC. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResending(true);
      const response = await verifyService.resendVerificationEmail(user.email);
      
      if (response.success) {
        toast.success('Verification email sent! Check your inbox.', {
          duration: 5000,
          icon: '📧'
        });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Failed to send verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      unverified: {
        icon: XCircle,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        text: 'Unverified',
        description: 'Complete verification to unlock all features'
      },
      pending: {
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        text: 'Pending Review',
        description: 'We\'re reviewing your documents'
      },
      under_review: {
        icon: Clock,
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
        text: 'Under Review',
        description: 'Additional verification in progress'
      },
      approved: {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        text: 'Approved',
        description: 'Your account is fully verified'
      },
      rejected: {
        icon: XCircle,
        color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        text: 'Rejected',
        description: 'Verification rejected - please resubmit'
      }
    };

    const badge = badges[status] || badges.unverified;
    const Icon = badge.icon;

    return (
      <div className="flex flex-col gap-1">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${badge.color}`}>
          <Icon className="w-4 h-4" />
          {badge.text}
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {badge.description}
        </p>
      </div>
    );
  };

  const getTierBenefits = (tier) => {
    const benefits = {
      basic: {
        maxAmount: 1000,
        monthlyTransactions: 10,
        support: 'Email support',
        features: ['Basic ID verification']
      },
      advanced: {
        maxAmount: 10000,
        monthlyTransactions: 50,
        support: 'Priority support',
        features: ['Full KYC verification', 'Business verification available', 'Faster processing']
      },
      premium: {
        maxAmount: 'Unlimited',
        monthlyTransactions: 'Unlimited',
        support: 'Dedicated account manager',
        features: ['Full KYC & business verification', 'Custom features', '24/7 phone support']
      }
    };
    
    return benefits[tier] || benefits.basic;
  };

  const tiers = [
    {
      id: 'basic',
      name: 'Basic Verification',
      price: 'Free',
      badge: 'Recommended for individuals',
      description: 'Perfect for personal use and small transactions',
      ...getTierBenefits('basic')
    },
    {
      id: 'advanced',
      name: 'Advanced Verification',
      price: '$15/month',
      badge: 'Popular for businesses',
      popular: true,
      description: 'Ideal for businesses and frequent traders',
      ...getTierBenefits('advanced')
    },
    {
      id: 'premium',
      name: 'Premium Verification',
      price: '$50/month',
      badge: 'Enterprise solution',
      description: 'For high-volume traders and enterprise users',
      ...getTierBenefits('premium')
    }
  ];

  // Email verification check (highest priority)
  if (!user?.verified) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-2xl font-bold text-red-900 dark:text-red-200">
                  Email Verification Required
                </h3>
              </div>
              <p className="text-red-700 dark:text-red-300 text-lg mb-2">
                You must verify your email address before you can submit KYC documents.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                This helps us ensure your account security and prevent fraud.
              </p>
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-red-300 dark:border-red-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Info className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Check your inbox
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We sent a verification email to: <strong className="text-red-600 dark:text-red-400">{user.email}</strong>
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {resending ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Resend Verification Email
                  </>
                )}
              </button>
              <a
                href={`mailto:support@dealcross.net?subject=Verification%20Help&body=My%20email%20is%3A%20${user.email}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <ExternalLink className="w-5 h-5" />
                Contact Support
              </a>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">
                  Why email verification is required
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <li className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    Prevents unauthorized account creation
                  </li>
                  <li className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    Required for password recovery
                  </li>
                  <li className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    First step in our security process
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If already approved
  if (kycStatus?.status === 'approved') {
    const tierBenefits = getTierBenefits(kycStatus.tier);
    
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Success Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">
                  Verification Complete!
                </h3>
              </div>
              <p className="text-green-700 dark:text-green-300 text-lg">
                Your account is fully verified with {kycStatus.tier} tier benefits
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-4 min-w-[200px]">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Approved On</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {kycStatus.reviewedAt 
                    ? new Date(kycStatus.reviewedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Recently'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Max Transaction</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {tierBenefits.maxAmount === 'Unlimited' ? '∞' : `$${tierBenefits.maxAmount.toLocaleString()}`}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Transactions</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {tierBenefits.monthlyTransactions === 'Unlimited' ? '∞' : tierBenefits.monthlyTransactions}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Support Level</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{tierBenefits.support}</p>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Verification Tier</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                {kycStatus.tier || 'basic'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl">
              <ExternalLink className="w-5 h-5" />
              View Your Verification Certificate
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <Building className="w-5 h-5" />
              Upgrade Tier
            </button>
          </div>
        </div>

        {/* Features Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Your Verification Benefits
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Transaction Benefits</h4>
              <ul className="space-y-2">
                {tierBenefits.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Security Features</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Verified account badge
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Trust score increase
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Priority dispute resolution
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If pending or under review
  if (kycStatus?.status === 'pending' || kycStatus?.status === 'under_review') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
              <Clock className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Loader className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  Verification In Progress
                </h3>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-lg mb-3">
                We're reviewing your documents. This usually takes 24-48 hours.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg">
                  <span className="text-gray-500 dark:text-gray-400">Status: </span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">
                    {(kycStatus.status || 'pending').replace('_', ' ')}
                  </span>
                </span>
                <span className="px-3 py-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg">
                  <span className="text-gray-500 dark:text-gray-400">Tier: </span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">
                    {kycStatus.tier || 'basic'}
                  </span>
                </span>
                <span className="px-3 py-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg">
                  <span className="text-gray-500 dark:text-gray-400">Submitted: </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {kycStatus.submittedAt 
                      ? new Date(kycStatus.submittedAt).toLocaleDateString()
                      : 'Recently'
                    }
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Verification Progress</span>
              <span>50%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"
                style={{ width: '50%' }}
              ></div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-blue-200 dark:border-blue-700 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              What happens next?
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Document Review</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Our team is reviewing your submitted documents for accuracy and validity.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Background Check</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automated and manual checks to verify your information.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Approval & Notification</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You'll receive an email once your verification is complete.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If rejected
  if (kycStatus?.status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
            <div className="p-4 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl shadow-lg">
              <XCircle className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-2xl font-bold text-red-900 dark:text-red-200">
                  Verification Rejected
                </h3>
              </div>
              <p className="text-red-700 dark:text-red-300 text-lg">
                Your KYC submission requires corrections
              </p>
            </div>
          </div>

          {kycStatus.rejectionReason && (
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-red-200 dark:border-red-700 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-2">
                    Reason for Rejection
                  </p>
                  <p className="text-red-700 dark:text-red-300">
                    {kycStatus.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(kycStatus.resubmissionAllowed !== false) && (
            <div className="text-center">
              <button
                onClick={() => {
                  setKycStatus({ ...kycStatus, status: 'unverified' });
                  // Scroll to form
                  setTimeout(() => {
                    document.getElementById('kyc-form')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition shadow-lg hover:shadow-xl text-lg"
              >
                Resubmit Verification
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Please correct the issues mentioned above and resubmit your verification.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ KYC Form (for unverified users)
  return (
    <div className="max-w-4xl mx-auto space-y-8" id="kyc-form">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-sm font-semibold mb-3">
          <Shield className="w-4 h-4" />
          Account Verification
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Verify Your Identity
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Complete KYC verification to increase transaction limits, enhance security, 
          and unlock premium features on Dealcross.
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Verification Status
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your current verification level and benefits
            </p>
          </div>
          {getStatusBadge(kycStatus?.status || 'unverified')}
        </div>
      </div>

      {/* Tier Selection */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Select Verification Tier
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative border-2 rounded-2xl p-6 transition-all duration-300 ${
                selectedTier === tier.id
                  ? 'border-blue-600 shadow-lg shadow-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg'
              } ${tier.popular ? 'scale-[1.02]' : ''}`}
              onClick={() => setSelectedTier(tier.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedTier(tier.id)}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full mb-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {tier.badge}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      {tier.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {tier.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tier.price}
                    </p>
                    {tier.price !== 'Free' && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">per month</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Max Transaction</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {tier.maxAmount === 'Unlimited' ? '∞' : `$${tier.maxAmount.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Limit</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {tier.monthlyTransactions === 'Unlimited' ? '∞' : `${tier.monthlyTransactions} transactions`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Support</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{tier.support}</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      selectedTier === tier.id ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                    }`} />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => document.getElementById('personal-info-form').scrollIntoView({ behavior: 'smooth' })}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
          >
            Continue with {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Tier
          </button>
        </div>
      </div>

      {/* Personal Information Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 space-y-8" id="personal-info-form">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Personal Information
          </h3>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date of Birth *
            </label>
            <input
              type="date"
              name="personalInfo.dateOfBirth"
              value={formData.personalInfo.dateOfBirth}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                formErrors['personalInfo.dateOfBirth'] 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {formErrors['personalInfo.dateOfBirth'] && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors['personalInfo.dateOfBirth']}
              </p>
            )}
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nationality *
            </label>
            <input
              type="text"
              name="personalInfo.nationality"
              value={formData.personalInfo.nationality}
              onChange={handleChange}
              required
              placeholder="e.g., American, Canadian"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                formErrors['personalInfo.nationality'] 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {formErrors['personalInfo.nationality'] && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors['personalInfo.nationality']}
              </p>
            )}
          </div>

          {/* ID Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ID Type *
            </label>
            <select
              name="personalInfo.idType"
              value={formData.personalInfo.idType}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            >
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's License</option>
              <option value="national_id">National ID</option>
              <option value="residence_permit">Residence Permit</option>
            </select>
          </div>

          {/* ID Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ID Number *
            </label>
            <input
              type="text"
              name="personalInfo.idNumber"
              value={formData.personalInfo.idNumber}
              onChange={handleChange}
              required
              placeholder="Enter your ID number"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                formErrors['personalInfo.idNumber'] 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {formErrors['personalInfo.idNumber'] && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {formErrors['personalInfo.idNumber']}
              </p>
            )}
          </div>

          {/* ID Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ID Expiry Date
            </label>
            <input
              type="date"
              name="personalInfo.idExpiryDate"
              value={formData.personalInfo.idExpiryDate}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Address Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Residential Address *
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                name="personalInfo.address.street"
                value={formData.personalInfo.address.street}
                onChange={handleChange}
                required
                placeholder="Street Address"
                className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                  formErrors['personalInfo.address.street'] 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {formErrors['personalInfo.address.street'] && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {formErrors['personalInfo.address.street']}
                </p>
              )}
            </div>
            
            <input
              type="text"
              name="personalInfo.address.city"
              value={formData.personalInfo.address.city}
              onChange={handleChange}
              required
              placeholder="City"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                formErrors['personalInfo.address.city'] 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            
            <input
              type="text"
              name="personalInfo.address.state"
              value={formData.personalInfo.address.state}
              onChange={handleChange}
              required
              placeholder="State/Province"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                formErrors['personalInfo.address.state'] 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            
            <input
              type="text"
              name="personalInfo.address.country"
              value={formData.personalInfo.address.country}
              onChange={handleChange}
              required
              placeholder="Country"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                formErrors['personalInfo.address.country'] 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            
            <input
              type="text"
              name="personalInfo.address.postalCode"
              value={formData.personalInfo.address.postalCode}
              onChange={handleChange}
              required
              placeholder="Postal Code"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                formErrors['personalInfo.address.postalCode'] 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
          </div>
        </div>

        {/* Business Info Toggle */}
        {(selectedTier === 'advanced' || selectedTier === 'premium') && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Business Information
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBusinessInfo(!showBusinessInfo)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {showBusinessInfo ? 'Remove Business Info' : 'Add Business Info'}
              </button>
            </div>

            {showBusinessInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="businessInfo.companyName"
                    value={formData.businessInfo.companyName}
                    onChange={handleChange}
                    required={showBusinessInfo}
                    placeholder="Your company name"
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                      formErrors['businessInfo.companyName'] 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                  />
                  {formErrors['businessInfo.companyName'] && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors['businessInfo.companyName']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    name="businessInfo.registrationNumber"
                    value={formData.businessInfo.registrationNumber}
                    onChange={handleChange}
                    required={showBusinessInfo}
                    placeholder="Business registration number"
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                      formErrors['businessInfo.registrationNumber'] 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                  />
                  {formErrors['businessInfo.registrationNumber'] && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors['businessInfo.registrationNumber']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    name="businessInfo.taxId"
                    value={formData.businessInfo.taxId}
                    onChange={handleChange}
                    placeholder="Tax identification number"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business Type
                  </label>
                  <select
                    name="businessInfo.businessType"
                    value={formData.businessInfo.businessType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white"
                  >
                    <option value="sole_proprietorship">Sole Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="llc">LLC</option>
                    <option value="corporation">Corporation</option>
                    <option value="non_profit">Non-Profit</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your information is encrypted and stored securely. We never share your data with third parties.
                </p>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Submit for Verification
                </span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default KYCTab;