import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle, DollarSign, Mail, FileCheck, Shield } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import escrowService from '../services/escrowService';
import toast from 'react-hot-toast';
import { verifyService } from '../services/verifyService';

const CreateEscrowModal = ({ user, onClose, onSuccess }) => {
  // 1. ALL HOOKS CALLS AT THE TOP - No conditions allowed
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
  const [resending, setResending] = useState(false); // State for resending verification

  // ✅ Check verification status
  const isEmailVerified = user?.verified;
  const isKYCVerified = user?.isKYCVerified;
  const canCreateEscrow = isEmailVerified && isKYCVerified;
  
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

  // Calculate fees when amount changes
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
      if (response.success) setFeeBreakdown(response.data);
    } catch (err) {
      console.error('Failed to calculate fees:', err);
    } finally {
      setFeeLoading(false);
    }
  };

  // Handle file selection and preview
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
    if (data.sellerEmail === user.email) {
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
      
      // Attach files
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

  // ✅ Handle resend verification - This must be defined BEFORE any conditional returns
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

  // 2. CONDITIONAL RENDER LOGIC - AFTER ALL HOOKS
  if (!canCreateEscrow) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
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

          {/* Content */}
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
                  This helps protect your account and prevents fraud.
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Verification email sent to:
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white break-all">
                    {user.email}
                  </p>
                </div>
                
                <div className="space-y-3">
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
                  
                  <a
                    href={`mailto:support@dealcross.net?subject=Email%20Verification%20Help&body=My%20email%20is%3A%20${user.email}`}
                    className="block w-full px-6 py-3.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition text-center"
                  >
                    Contact Support
                  </a>
                </div>
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
                
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Complete KYC verification to create escrows and access higher transaction limits.
                  This is required for secure trading and compliance with financial regulations.
                </p>
                
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                        Without KYC Verification:
                      </p>
                      <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                        <li className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                          Cannot create escrow transactions
                        </li>
                        <li className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                          Limited to basic account features
                        </li>
                        <li className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                          Lower transaction limits
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      onClose();
                      // Navigate to KYC tab in profile
                      window.location.href = '/profile?tab=kyc';
                    }}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <FileCheck className="w-5 h-5" />
                      Complete KYC Verification
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

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Secure verification process • Your data is protected</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ REST OF YOUR COMPONENT (for verified users)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Escrow</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Start a secure transaction with a seller</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Verification Status Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-b border-green-200 dark:border-green-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                ✓ Fully Verified Account
              </span>
            </div>
            <span className="text-xs text-green-700 dark:text-green-400">
              {user.kycStatus?.tier ? `Tier: ${user.kycStatus.tier}` : 'Ready to transact'}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              placeholder="e.g., iPhone 15 Pro Max Purchase"
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              placeholder="Describe what you're purchasing..."
              rows={4}
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>}
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount *</label>
              <div className="relative">
                {/* Dynamic Currency Symbol */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1 items-center pointer-events-none">
                  <span className="font-bold text-lg text-gray-500 dark:text-gray-300">
                    {currencySymbols[currency]}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {currency}
                  </span>
                </div>
                <input
                  type="number"
                  {...register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Amount must be > 0' } })}
                  placeholder="0.00"
                  className={`w-full pl-20 pr-4 py-2.5 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                    errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
              </div>
              {errors.amount && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
              <select 
                {...register('currency')} 
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-gray-900 dark:text-white"
              >
                {currencies.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} — {curr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fee Breakdown */}
          {feeBreakdown && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">Fee Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Transaction Amount:</span>
                  <span className="font-medium">{currencySymbols[currency]}{feeBreakdown.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Your Fee ({feeBreakdown.buyerFeePercentage}%):</span>
                  <span className="font-medium">{currencySymbols[currency]}{feeBreakdown.buyerFee?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Seller Fee ({feeBreakdown.sellerFeePercentage}%):</span>
                  <span className="font-medium">{currencySymbols[currency]}{feeBreakdown.sellerFee?.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <div className="flex justify-between font-semibold text-blue-900 dark:text-blue-200">
                    <span>You Will Pay:</span>
                    <span>{currencySymbols[currency]}{feeBreakdown.buyerPays?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs mt-1">
                    <span>Seller Will Receive:</span>
                    <span>{currencySymbols[currency]}{feeBreakdown.sellerReceives?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Seller Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seller Email *</label>
            <input
              type="email"
              {...register('sellerEmail', {
                required: 'Seller email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
              })}
              placeholder="seller@example.com"
              className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white ${
                errors.sellerEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.sellerEmail && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sellerEmail.message}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">The seller will receive a notification to accept this escrow</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select 
              {...register('category')} 
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-gray-900 dark:text-white"
            >
              <option value="electronics">Electronics</option>
              <option value="services">Services</option>
              <option value="digital_goods">Digital Goods</option>
              <option value="fashion">Fashion</option>
              <option value="automotive">Automotive</option>
              <option value="real_estate">Real Estate</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Delivery Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Method</label>
            <select 
              {...register('deliveryMethod')} 
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-gray-900 dark:text-white"
            >
              <option value="physical">Physical Shipping</option>
              <option value="digital">Digital Delivery</option>
              <option value="service">Service/In-Person</option>
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</label>
            <Controller
              control={control}
              name="attachments"
              render={({ field: { onChange } }) => (
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFilesChange(e, onChange)}
                  className="w-full text-gray-700 dark:text-gray-300"
                />
              )}
            />
            {filePreviews.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {filePreviews.map((file, idx) => (
                  <div key={idx} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg text-xs">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  <li>You create the escrow request</li>
                  <li>Seller reviews and accepts</li>
                  <li>You pay and funds are held securely</li>
                  <li>Seller delivers the item/service</li>
                  <li>You confirm receipt</li>
                  <li>Payment is released to seller</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed">
              Cancel
            </button>
            <button type="submit" disabled={loading || feeLoading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><Loader className="w-5 h-5 animate-spin" /> Creating...</> : 'Create Escrow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEscrowModal;