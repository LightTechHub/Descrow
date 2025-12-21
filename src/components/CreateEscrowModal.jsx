// File: src/components/CreateEscrowModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle, Shield, CheckCircle, Upload, DollarSign, User, FileText, Package } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import escrowService from '../services/escrowService';
import toast from 'react-hot-toast';

const CreateEscrowModal = ({ user, onClose, onSuccess }) => {
  const navigate = useNavigate();
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
  const [currentStep, setCurrentStep] = useState(1);

  const currencySymbols = {
    USD: '$', NGN: '₦', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$',
    KES: 'KSh', GHS: 'GH₵', ZAR: 'R', XOF: 'CFA', XAF: 'FCFA'
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
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' }
  ];

  const amount = watch('amount');
  const currency = watch('currency');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0) {
        fetchFeeBreakdown();
      } else {
        setFeeBreakdown(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [amount, currency]);

  const fetchFeeBreakdown = async () => {
    try {
      setFeeLoading(true);
      const response = await escrowService.calculateFees(amount, currency);
      if (response.success) {
        setFeeBreakdown(response.data.feeBreakdown);
      }
    } catch (err) {
      console.error('Failed to calculate fees:', err);
    } finally {
      setFeeLoading(false);
    }
  };

  const handleFilesChange = (e, onChange) => {
    const files = Array.from(e.target.files);
    
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error('Some files exceed 5MB limit');
      return;
    }

    onChange(files);
    setFilePreviews(files.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type
    })));
  };

  const onSubmit = async (data) => {
    if (data.sellerEmail.toLowerCase() === user?.email?.toLowerCase()) {
      setError('sellerEmail', { 
        type: 'manual', 
        message: 'Cannot create escrow with yourself' 
      });
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', data.title.trim());
      formData.append('description', data.description.trim());
      formData.append('amount', parseFloat(data.amount));
      formData.append('currency', data.currency);
      formData.append('sellerEmail', data.sellerEmail.toLowerCase().trim());
      formData.append('category', data.category);
      formData.append('deliveryMethod', data.deliveryMethod);
      
      if (data.attachments?.length > 0) {
        data.attachments.forEach(file => formData.append('attachments', file));
      }

      const response = await escrowService.createEscrow(formData);

      if (response.success) {
        const escrowId = response.data.escrow?.escrowId || response.data.escrowId;
        
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>Escrow created! Redirecting to payment...</span>
          </div>,
          { duration: 3000 }
        );

        onSuccess?.();

        setTimeout(() => {
          onClose();
          navigate(`/escrow/${escrowId}`);
        }, 1000);

      } else {
        toast.error(response.message || 'Failed to create escrow');
      }

    } catch (err) {
      console.error('❌ Create escrow error:', err);
      
      const status = err.response?.status;
      const errorData = err.response?.data;

      if (status === 403) {
        if (errorData?.verificationType === 'email') {
          toast.error(
            <div>
              <p className="font-semibold">Email Verification Required</p>
              <p className="text-sm">Please verify your email to create escrows</p>
            </div>,
            { duration: 5000 }
          );
        } else if (errorData?.verificationType === 'kyc') {
          toast.error(
            <div>
              <p className="font-semibold">KYC Verification Required</p>
              <p className="text-sm">Redirecting to verification page...</p>
            </div>,
            { duration: 3000 }
          );
          setTimeout(() => {
            onClose();
            navigate('/profile?tab=kyc');
          }, 2000);
        }
      } else {
        toast.error(errorData?.message || 'Failed to create escrow');
      }

    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', icon: FileText },
    { number: 2, title: 'Amount', icon: DollarSign },
    { number: 3, title: 'Seller Info', icon: User },
    { number: 4, title: 'Review', icon: CheckCircle }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-6 py-5 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Create New Escrow</h2>
              <p className="text-blue-100 text-sm mt-0.5">Secure your transaction</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="p-2 hover:bg-white/20 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-blue-600 text-white scale-110 shadow-lg' 
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${
                      currentStep > step.number ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Title *
                </label>
                <input
                  type="text"
                  {...register('title', { 
                    required: 'Title is required',
                    minLength: { value: 3, message: 'Title must be at least 3 characters' }
                  })}
                  placeholder="e.g., iPhone 15 Pro Max Purchase"
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white ${
                    errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  {...register('description', { 
                    required: 'Description is required',
                    minLength: { value: 10, message: 'Description must be at least 10 characters' }
                  })}
                  placeholder="Describe what you're purchasing..."
                  rows={4}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    {...register('category')}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
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

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Delivery Method
                  </label>
                  <select
                    {...register('deliveryMethod')}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="physical">Physical Shipping</option>
                    <option value="digital">Digital Delivery</option>
                    <option value="service">Service/In-Person</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Amount */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Transaction Amount *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-2 items-center pointer-events-none">
                      <span className="font-bold text-2xl text-gray-500 dark:text-gray-300">
                        {currencySymbols[currency]}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {currency}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount', {
                        required: 'Amount is required',
                        min: { value: 1, message: 'Amount must be at least 1' },
                        max: { value: 1000000, message: 'Amount too large' }
                      })}
                      placeholder="0.00"
                      className={`w-full pl-24 pr-4 py-4 text-2xl font-bold bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white ${
                        errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    {...register('currency')}
                    className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-semibold"
                  >
                    {currencies.map(curr => (
                      <option key={curr.code} value={curr.code}>{curr.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fee Breakdown */}
              {feeBreakdown && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-md font-bold text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Fee Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-blue-200 dark:border-blue-700">
                      <span className="text-gray-700 dark:text-gray-300">Transaction Amount:</span>
                      <span className="font-bold text-xl text-gray-900 dark:text-white">
                        {currencySymbols[currency]}{feeBreakdown.amount?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Your Fee ({feeBreakdown.buyerFeePercentage}%)
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 font-semibold">
                        +{currencySymbols[currency]}{feeBreakdown.buyerFee?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Seller Fee ({feeBreakdown.sellerFeePercentage}%)
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 font-semibold">
                        {currencySymbols[currency]}{feeBreakdown.sellerFee?.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-3 border-t-2 border-blue-300 dark:border-blue-600">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-blue-900 dark:text-blue-200 text-lg">You Will Pay:</span>
                        <span className="font-bold text-3xl text-blue-600 dark:text-blue-400">
                          {currencySymbols[currency]}{feeBreakdown.buyerPays?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Seller Will Receive:</span>
                        <span className="font-semibold">{currencySymbols[currency]}{feeBreakdown.sellerReceives?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Seller Info */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Seller Email Address *
                </label>
                <input
                  type="email"
                  {...register('sellerEmail', {
                    required: 'Seller email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Invalid email format'
                    }
                  })}
                  placeholder="seller@example.com"
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 dark:text-white ${
                    errors.sellerEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                {errors.sellerEmail && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.sellerEmail.message}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  📧 The seller will receive a notification to accept this escrow
                </p>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Attachments (Optional)
                </label>
                <Controller
                  control={control}
                  name="attachments"
                  render={({ field: { onChange } }) => (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={(e) => handleFilesChange(e, onChange)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Click to upload
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Images, PDF, Word documents (Max 5MB each)
                      </p>
                    </div>
                  )}
                />
                {filePreviews.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filePreviews.map((file, idx) => (
                      <div key={idx} className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg text-xs text-green-700 dark:text-green-300 flex items-center gap-2 border border-green-200 dark:border-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Review Your Escrow</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Title:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{watch('title')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {currencySymbols[watch('currency')]}{watch('amount')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Seller:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{watch('sellerEmail')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">{watch('category').replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-200">
                    <p className="font-semibold mb-2">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
                      <li>Seller reviews and accepts</li>
                      <li>You pay and funds are held securely</li>
                      <li>Seller delivers the item/service</li>
                      <li>You confirm receipt</li>
                      <li>Payment is released to seller</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={loading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
              >
                Back
              </button>
            )}
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || feeLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Create Escrow
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEscrowModal;