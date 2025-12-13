ort React, { useState, useEffect } from 'react';
import { X, Loader, Mail, FileCheck, Shield, AlertCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import escrowService from '../services/escrowService';
import toast from 'react-hot-toast';

const CreateEscrowModal = ({ user, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [filePreviews, setFilePreviews] = useState([]);

  const { register, handleSubmit, watch, control, setError, formState: { errors } } = useForm({
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

  // ✅ SIMPLE verification check - no API calls
  const isEmailVerified = user?.verified === true;
  const isKYCVerified = user?.isKYCVerified === true || user?.kycStatus?.status === 'approved';
  const canCreateEscrow = isEmailVerified && isKYCVerified;

  console.log('🔍 Verification Check:', {
    email: user?.email,
    emailVerified: isEmailVerified,
    kycVerified: isKYCVerified,
    kycStatus: user?.kycStatus?.status,
    canCreate: canCreateEscrow
  });

  const currencySymbols = {
    USD: '$', NGN: '₦', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$',
    KES: 'KSh', GHS: 'GH₵', ZAR: 'R', XOF: 'CFA', XAF: 'FCFA'
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'NGN', name: 'Nigerian Naira' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' }
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
      if (response.success) setFeeBreakdown(response.data);
    } catch (err) {
      console.error('Failed to calculate fees:', err);
    } finally {
      setFeeLoading(false);
    }
  };

  const handleFilesChange = (e, onChange) => {
    const files = Array.from(e.target.files);
    onChange(files);
    setFilePreviews(files.map(f => ({ name: f.name })));
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
      
      if (data.attachments?.length > 0) {
        data.attachments.forEach(file => formData.append('attachments', file));
      }

      const response = await escrowService.createEscrow(formData);

      if (response.success) {
        toast.success('Escrow created successfully!');
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.message || 'Failed to create escrow');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create escrow');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verification required screen
  if (!canCreateEscrow) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="border-b border-gray-200 dark:border-gray-800 p-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Required</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 text-center">
            {!isEmailVerified ? (
              <>
                <Mail className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Email Verification Required</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Verify your email to continue</p>
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Go to Profile
                </button>
              </>
            ) : (
              <>
                <FileCheck className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">KYC Verification Required</h3>
                
                {/* Debug Info */}
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 text-left text-xs">
                  <strong>Debug:</strong><br/>
                  Status: {user?.kycStatus?.status || 'unknown'}<br/>
                  isKYCVerified: {String(user?.isKYCVerified)}<br/>
                  Email: {user?.email}
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-4">Complete KYC to create escrows</p>
                <button
                  onClick={() => window.location.href = '/profile?tab=kyc'}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Complete KYC Verification
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ✅ Main form
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-500" />
            <h2 className="text-2xl font-bold">Create Escrow</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              {...register('title', { required: 'Title required' })}
              className="w-full px-4 py-2.5 border rounded-lg"
              placeholder="e.g., iPhone 15 Purchase"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <textarea
              {...register('description', { required: 'Description required' })}
              rows={4}
              className="w-full px-4 py-2.5 border rounded-lg"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>

          {/* Amount */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Amount *</label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { required: 'Amount required', min: 0.01 })}
                className="w-full px-4 py-2.5 border rounded-lg"
              />
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Currency</label>
              <select {...register('currency')} className="w-full px-4 py-2.5 border rounded-lg">
                {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          </div>

          {/* Fee Breakdown */}
          {feeBreakdown && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Fee Breakdown</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>{currencySymbols[currency]}{feeBreakdown.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your Fee:</span>
                  <span>{currencySymbols[currency]}{feeBreakdown.buyerFee?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>You Pay:</span>
                  <span>{currencySymbols[currency]}{feeBreakdown.buyerPays?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Seller Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Seller Email *</label>
            <input
              type="email"
              {...register('sellerEmail', { required: 'Email required', pattern: /^\S+@\S+\.\S+$/ })}
              className="w-full px-4 py-2.5 border rounded-lg"
            />
            {errors.sellerEmail && <p className="mt-1 text-sm text-red-600">{errors.sellerEmail.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select {...register('category')} className="w-full px-4 py-2.5 border rounded-lg">
              <option value="electronics">Electronics</option>
              <option value="services">Services</option>
              <option value="digital_goods">Digital Goods</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Escrow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEscrowModal;