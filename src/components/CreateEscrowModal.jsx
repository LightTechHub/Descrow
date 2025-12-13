import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle, DollarSign, Mail, FileCheck, Shield, RefreshCw } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import escrowService from '../services/escrowService';
import profileService from '../services/profileService';
import toast from 'react-hot-toast';
import { verifyService } from '../services/verifyService';

const CreateEscrowModal = ({ user: initialUser, onClose, onSuccess }) => {
  const [user, setUser] = useState(initialUser);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [verificationError, setVerificationError] = useState(false);

  const { 
    register, 
    handleSubmit, 
    watch, 
    control, 
    setError, 
    formState: { errors } 
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      amount: '',
      currency: 'USD',
      sellerEmail: '',
      category: 'other',
      deliveryMethod: 'physical',
      attachments: []
    }
  });

  const [loading, setLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [filePreviews, setFilePreviews] = useState([]);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  // ✅ Enhanced verification check - checks BOTH profile AND KYC status
  const checkVerificationStatus = async () => {
    try {
      setCheckingVerification(true);
      setVerificationError(false);

      // Check both profile and KYC status in parallel
      const [profileResponse, kycResponse] = await Promise.all([
        profileService.getProfile().catch(err => {
          console.error('Profile fetch error:', err);
          return null;
        }),
        profileService.checkKYCStatus().catch(err => {
          console.error('KYC status fetch error:', err);
          return null;
        })
      ]);

      console.log('📊 Verification Check Results:');
      console.log('Profile Response:', profileResponse);
      console.log('KYC Response:', kycResponse);

      let updatedUser = { ...initialUser };

      // Update from profile response
      if (profileResponse?.success && profileResponse.data?.user) {
        updatedUser = {
          ...updatedUser,
          ...profileResponse.data.user
        };
        console.log('✅ Profile data updated');
      }

      // Update from KYC response (takes precedence)
      if (kycResponse?.success && kycResponse.data) {
        updatedUser = {
          ...updatedUser,
          isKYCVerified: kycResponse.data.isVerified || kycResponse.data.status === 'approved',
          kycStatus: {
            ...updatedUser.kycStatus,
            status: kycResponse.data.status,
            verifiedAt: kycResponse.data.verifiedAt,
            rejectionReason: kycResponse.data.rejectionReason
          }
        };
        console.log('✅ KYC data updated:', {
          status: kycResponse.data.status,
          isVerified: kycResponse.data.isVerified
        });
      }

      setUser(updatedUser);

      console.log('🎯 Final Verification Status:', {
        emailVerified: updatedUser.verified,
        kycVerified: updatedUser.isKYCVerified,
        kycStatus: updatedUser.kycStatus?.status,
        canCreateEscrow: updatedUser.verified && updatedUser.isKYCVerified
      });

    } catch (error) {
      console.error('❌ Verification check failed:', error);
      setVerificationError(true);
      setUser(initialUser);
    } finally {
      setCheckingVerification(false);
    }
  };

  // Safe verification checks with fallbacks
  const isEmailVerified = user?.verified || false;
  const isKYCVerified = user?.isKYCVerified || user?.kycStatus?.status === 'approved';
  const canCreateEscrow = isEmailVerified && isKYCVerified;

  console.log('🔍 Current Verification State:', {
    isEmailVerified,
    isKYCVerified,
    canCreateEscrow,
    kycStatus: user?.kycStatus?.status
  });
  
  // Currency symbols mapping
  const currencySymbols = {
    USD: '$',
    NGN: '₦',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    KES: 'KSh',
    GHS: 'GH₵',
    ZAR: 'R',
    XOF: 'CFA',
    XAF: 'FCFA'
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'XOF', name: 'West African CFA', symbol: 'CFA' },
    { code: 'XAF', name: 'Central African CFA', symbol: 'FCFA' }
  ];

  const amount = watch('amount');
  const currency = watch('currency');

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (amount && parseFloat(amount) > 0) {
        fetchFeeBreakdown();
      } else {
        setFeeBreakdown(null);
      }
    }, 500);
    return () => clearTimeout(debounce);
  }, [amount, currency]);

  const fetchFeeBreakdown = async () => {
    try {
      setFeeLoading(true);
      const response = await escrowService.calculateFees(amount, currency);
      if (response.success) {
        setFeeBreakdown(response.data);
      }
    } catch (err) {
      console.error('Failed to calculate fees:', err);
    } finally {
      setFeeLoading(false);
    }
  };

  const handleFilesChange = (e, onChange) => {
    const files = Array.from(e.target.files);
    onChange(files);
    const previews = files.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type
    }));
    setFilePreviews(previews);
  };

  const onSubmit = async (data) => {
    if (data.sellerEmail === user?.email) {
      setError('sellerEmail', { type: 'manual', message: 'Cannot create escrow with yourself' });
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('amount', parseFloat(data.amount));
      formData.append('currency', data.currency);
      formData.append('sellerEmail', data.sellerEmail);
      formData.append('category', data.category);
      formData.append('deliveryMethod', data.deliveryMethod);
      
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach(file => formData.append('attachments', file));
      }

      const response = await escrowService.createEscrow(formData);

      if (response.success) {
        toast.success('Escrow created successfully!');
        onSuccess && onSuccess();
        onClose();
      } else {
        toast.error(response.message || 'Failed to create escrow');
      }
    } catch (err) {
      console.error('Create escrow error:', err);
      toast.error(err.response?.data?.message || 'Failed to create escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResending(true);
      const response = await verifyService.resendVerificationEmail(user?.email);
      
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

  // Show loading while checking verification
  if (checkingVerification) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300">Checking verification status...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This will only take a moment</p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (verificationError) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Connection Error
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Failed to check verification status. Please try again.
          </p>
          <div className="flex gap-3">
            <button
              onClick={checkVerificationStatus}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verification required screen
  if (!canCreateEscrow) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Required</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {!isEmailVerified ? (
              <div className="text-center">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Email Verification Required
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Please verify your email address to create secure escrow transactions.
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Verification email sent to:
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white break-all">
                    {user?.email || 'your email'}
                  </p>
                </div>
                
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {resending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Mail className="w-5 h-5" />
                      Resend Verification Email
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center mb-6">
                  <FileCheck className="w-10 h-10 text-white" />
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                    Email Verified ✓
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  KYC Verification Required
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Complete KYC verification to create escrows and access all features.
                </p>

                {/* Debug Info - Remove in production */}
                <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 mb-4 text-left">
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    <strong>Debug Info:</strong><br/>
                    KYC Status: {user?.kycStatus?.status || 'unknown'}<br/>
                    isKYCVerified: {String(user?.isKYCVerified)}<br/>
                    Email Verified: {String(user?.verified)}
                  </p>
                </div>

                {user?.kycStatus?.status && user.kycStatus.status !== 'unverified' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Current KYC Status:</strong> {user.kycStatus.status.replace('_', ' ').toUpperCase()}
                    </p>
                    {user.kycStatus.status === 'in_progress' && (
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        Your verification is being reviewed. This usually takes a few minutes.
                      </p>
                    )}
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      toast.promise(
                        checkVerificationStatus(),
                        {
                          loading: 'Refreshing status...',
                          success: 'Status updated!',
                          error: 'Failed to refresh'
                        }
                      );
                    }}
                    disabled={checkingVerification}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className={`w-5 h-5 ${checkingVerification ? 'animate-spin' : ''}`} />
                      Refresh Verification Status
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      window.location.href = '/profile?tab=kyc';
                    }}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <FileCheck className="w-5 h-5" />
                      {user?.kycStatus?.status === 'unverified' ? 'Start KYC Verification' : 'View KYC Status'}
                    </span>
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="w-full px-6 py-3.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Secure verification • Your data is protected</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main escrow form (keep your existing form code here - same as before)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Keep all your existing form JSX from the previous version */}
        {/* ... (Header, form fields, buttons - exact same as before) ... */}
      </div>
    </div>
  );
};

export default CreateEscrowModal;