// src/components/CreateEscrowModal.jsx
// FIX: Attachments now accumulate across multiple file selections instead of
// replacing previous files. Added individual remove button per file.
import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Loader, AlertCircle, Shield, CheckCircle, Upload,
  DollarSign, FileText, Package, Users, Target, Trash2
} from 'lucide-react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import escrowService from '../services/escrowService';
import toast from 'react-hot-toast';

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', NGN: '₦', CAD: 'C$', AUD: 'A$',
  KES: 'KSh', GHS: 'GH₵', ZAR: 'R', INR: '₹', CNY: '¥', JPY: '¥',
  BTC: '₿', ETH: 'Ξ', USDT: '₮', USDC: '$', BNB: 'BNB', MATIC: 'MATIC'
};

const CURRENCIES = {
  fiat: [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
  ],
  crypto: [
    { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
    { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
    { code: 'USDT', name: 'Tether', symbol: '₮' },
    { code: 'USDC', name: 'USD Coin', symbol: '$' },
    { code: 'BNB', name: 'Binance Coin', symbol: 'BNB' },
    { code: 'MATIC', name: 'Polygon', symbol: 'MATIC' }
  ]
};

const CRYPTO_CODES = new Set(['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'MATIC']);

const TRANSACTION_TYPES = [
  { value: 'custom',                label: 'Custom Transaction',  icon: '📦' },
  { value: 'physical_goods',        label: 'Physical Goods',      icon: '📦' },
  { value: 'digital_goods',         label: 'Digital Products',    icon: '💾' },
  { value: 'services',              label: 'Services',            icon: '🛠️' },
  { value: 'freelance',             label: 'Freelance Work',      icon: '💼' },
  { value: 'real_estate',           label: 'Real Estate',         icon: '🏠' },
  { value: 'vehicle',               label: 'Vehicle Purchase',    icon: '🚗' },
  { value: 'domain_transfer',       label: 'Domain Transfer',     icon: '🌐' },
  { value: 'business_sale',         label: 'Business Sale',       icon: '🏢' },
  { value: 'milestone_based',       label: 'Milestone Project',   icon: '🎯' },
  { value: 'cryptocurrency',        label: 'Crypto Transaction',  icon: '₿' },
  { value: 'intellectual_property', label: 'IP Transfer',         icon: '©️' }
];

const STEP_FIELDS = {
  1: ['title', 'description'],
  2: ['amount'],
  3: ['sellerEmail']
};

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CreateEscrowModal = ({ user, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const {
    register, handleSubmit, watch, control, trigger,
    setError, setValue, getValues,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: '', description: '', amount: '', currency: 'USD',
      currencyType: 'fiat', transactionType: 'custom', sellerEmail: '',
      category: 'other', deliveryMethod: 'physical', attachments: [],
      agentEmail: '', inspectorEmail: '', arbitratorEmail: '',
      customTerms: '', inspectionPeriodDays: 3, autoReleaseDays: 7,
      tags: [], milestones: [],
      shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' }
    }
  });

  const { fields: milestoneFields, append: appendMilestone, remove: removeMilestone } = useFieldArray({ control, name: 'milestones' });

  const [loading, setLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showShippingAddress, setShowShippingAddress] = useState(false);

  // FIX: accumulate files across multiple picker opens
  // Each entry: { file: File, previewUrl: string, id: string }
  const [attachedFiles, setAttachedFiles] = useState([]);

  const amount        = watch('amount');
  const currency      = watch('currency');
  const currencyType  = watch('currencyType');
  const transactionType  = watch('transactionType');
  const deliveryMethod   = watch('deliveryMethod');
  const isMilestoneBased = transactionType === 'milestone_based';

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => attachedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setValue('currencyType', CRYPTO_CODES.has(currency) ? 'crypto' : 'fiat');
  }, [currency, setValue]);

  useEffect(() => {
    setShowShippingAddress(deliveryMethod === 'physical' || transactionType === 'physical_goods');
  }, [deliveryMethod, transactionType]);

  const feeRequestRef = React.useRef(0);

  const fetchFeeBreakdown = useCallback(async (currentAmount, currentCurrency) => {
    const parsedAmt = parseFloat(currentAmount);
    if (!currentAmount || isNaN(parsedAmt) || parsedAmt <= 0) { setFeeBreakdown(null); return; }
    const type = getValues('transactionType') || 'custom';
    const requestId = ++feeRequestRef.current;
    setFeeLoading(true);
    try {
      const response = await escrowService.calculateFees(parsedAmt, currentCurrency || 'USD', type);
      if (requestId !== feeRequestRef.current) return;
      if (response.success && response.data?.feeBreakdown) {
        setFeeBreakdown(response.data.feeBreakdown);
      } else {
        setFeeBreakdown({ amount: parsedAmt, buyerFee: 0, sellerFee: 0, buyerPays: parsedAmt, sellerReceives: parsedAmt, buyerFeePercentage: 0, sellerFeePercentage: 0 });
      }
    } catch {
      if (requestId !== feeRequestRef.current) return;
      setFeeBreakdown({ amount: parsedAmt, buyerFee: 0, sellerFee: 0, buyerPays: parsedAmt, sellerReceives: parsedAmt, buyerFeePercentage: 0, sellerFeePercentage: 0 });
    } finally {
      if (requestId === feeRequestRef.current) setFeeLoading(false);
    }
  }, [getValues]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0) fetchFeeBreakdown(amount, currency);
      else setFeeBreakdown(null);
    }, 600);
    return () => clearTimeout(timer);
  }, [amount, currency, fetchFeeBreakdown]);

  const handleNextStep = async () => {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    if (fieldsToValidate) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }
    if (currentStep + 1 === 2) fetchFeeBreakdown(getValues('amount'), getValues('currency'));
    setCurrentStep(s => s + 1);
  };

  // FIX: accumulate new files on top of existing ones instead of replacing
  const handleFilesChange = (e, onChange) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;

    // Validate size
    const oversized = newFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed the 5MB limit and were skipped`);
    }
    const validNew = newFiles.filter(f => f.size <= MAX_FILE_SIZE);

    // Check total limit
    const totalAfter = attachedFiles.length + validNew.length;
    if (totalAfter > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} attachments allowed`);
      const allowedCount = MAX_FILES - attachedFiles.length;
      if (allowedCount <= 0) return;
      validNew.splice(allowedCount);
    }

    // Deduplicate by name+size
    const existingKeys = new Set(attachedFiles.map(f => `${f.file.name}-${f.file.size}`));
    const deduplicated = validNew.filter(f => !existingKeys.has(`${f.name}-${f.size}`));
    if (deduplicated.length < validNew.length) {
      toast(`${validNew.length - deduplicated.length} duplicate file(s) skipped`, { icon: 'ℹ️' });
    }

    if (!deduplicated.length) return;

    const newEntries = deduplicated.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`
    }));

    const updated = [...attachedFiles, ...newEntries];
    setAttachedFiles(updated);
    onChange(updated.map(e => e.file)); // sync with react-hook-form

    // Reset input so same file can be re-selected after removal
    e.target.value = '';
  };

  // Remove a single file by id
  const handleRemoveFile = (id, onChange) => {
    const entry = attachedFiles.find(f => f.id === id);
    if (entry) URL.revokeObjectURL(entry.previewUrl);
    const updated = attachedFiles.filter(f => f.id !== id);
    setAttachedFiles(updated);
    onChange(updated.map(e => e.file));
  };

  const handleAddMilestone = () => {
    const currentAmount = parseFloat(amount || 0);
    const existingTotal = getValues('milestones').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
    const remaining = currentAmount - existingTotal;
    if (remaining <= 0) { toast.error('Total milestone amounts cannot exceed transaction amount'); return; }
    appendMilestone({ title: '', description: '', amount: remaining.toFixed(2), deliverables: '', dueDate: '' });
  };

  const onSubmit = async (data) => {
    if (data.sellerEmail.toLowerCase() === user?.email?.toLowerCase()) {
      setError('sellerEmail', { type: 'manual', message: 'Cannot create escrow with yourself' });
      return;
    }
    if (isMilestoneBased && data.milestones.length === 0) {
      toast.error('Please add at least one milestone for milestone-based projects');
      return;
    }
    if (data.milestones.length > 0) {
      const totalMilestoneAmount = data.milestones.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
      const transactionAmount = parseFloat(data.amount);
      if (Math.abs(totalMilestoneAmount - transactionAmount) > 0.01) {
        toast.error(`Milestone total must equal transaction amount`);
        return;
      }
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', data.title.trim());
      formData.append('description', data.description.trim());
      formData.append('amount', parseFloat(data.amount));
      formData.append('currency', data.currency);
      formData.append('currencyType', data.currencyType);
      formData.append('transactionType', data.transactionType);
      formData.append('sellerEmail', data.sellerEmail.toLowerCase().trim());
      formData.append('category', data.category);
      formData.append('deliveryMethod', data.deliveryMethod);
      if (data.agentEmail?.trim())      formData.append('agentEmail', data.agentEmail.trim());
      if (data.inspectorEmail?.trim())  formData.append('inspectorEmail', data.inspectorEmail.trim());
      if (data.arbitratorEmail?.trim()) formData.append('arbitratorEmail', data.arbitratorEmail.trim());
      if (data.customTerms?.trim())     formData.append('customTerms', data.customTerms.trim());
      formData.append('inspectionPeriodDays', data.inspectionPeriodDays || 3);
      formData.append('autoReleaseDays', data.autoReleaseDays || 7);
      if (showShippingAddress && data.shippingAddress?.street) formData.append('shippingAddress', JSON.stringify(data.shippingAddress));
      if (data.milestones.length > 0) {
        formData.append('milestones', JSON.stringify(data.milestones.map(m => ({
          title: m.title, description: m.description, amount: parseFloat(m.amount),
          deliverables: m.deliverables ? m.deliverables.split(',').map(d => d.trim()) : [],
          dueDate: m.dueDate || undefined
        }))));
      }
      if (data.tags?.length > 0) formData.append('tags', JSON.stringify(data.tags));

      // FIX: use attachedFiles state — supports multiple accumulated files
      attachedFiles.forEach(entry => formData.append('attachments', entry.file));

      const response = await escrowService.createEscrow(formData);

      if (response.success) {
        const mongoId = response.data.escrow?._id || response.data._id || response.data.escrow?.escrowId || response.data.escrowId;
        toast.success(<div className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /><span>Escrow created! Redirecting...</span></div>, { duration: 3000 });
        setTimeout(() => { onClose(); navigate(`/escrow/${mongoId}`); }, 1000);
      } else {
        toast.error(response.message || 'Failed to create escrow');
      }
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data;
      if (status === 403) {
        if (errorData?.verificationType === 'email') {
          toast.error(<div><p className="font-semibold">Email Verification Required</p><p className="text-sm">Please verify your email to create escrows</p></div>, { duration: 5000 });
        } else if (errorData?.verificationType === 'kyc' || errorData?.verificationType === 'bank_account') {
          toast.error(<div><p className="font-semibold">Verification Required</p><p className="text-sm">{errorData.message}</p></div>, { duration: 3000 });
          setTimeout(() => { onClose(); navigate('/profile?tab=kyc'); }, 2000);
        } else if (errorData?.upgradeRequired) {
          toast.error(<div><p className="font-semibold">Upgrade Required</p><p className="text-sm">{errorData.message}</p></div>, { duration: 5000 });
        }
      } else {
        toast.error(errorData?.message || 'Failed to create escrow');
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info',   icon: FileText },
    { number: 2, title: 'Amount',       icon: DollarSign },
    { number: 3, title: 'Participants', icon: Users },
    { number: 4, title: 'Review',       icon: CheckCircle }
  ];

  const sym = CURRENCY_SYMBOLS[currency] || currency;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl my-8">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl"><Shield className="w-7 h-7 text-white" /></div>
            <div>
              <h2 className="text-2xl font-bold text-white">Create Universal Escrow</h2>
              <p className="text-blue-100 text-sm mt-0.5">Secure any type of transaction</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-white/20 rounded-lg transition disabled:opacity-50">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-blue-600 text-white scale-110 shadow-lg' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${currentStep > step.number ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[calc(90vh-280px)] overflow-y-auto">

          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Transaction Type *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {TRANSACTION_TYPES.map(type => (
                    <label key={type.value} className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition ${transactionType === type.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'}`}>
                      <input type="radio" value={type.value} {...register('transactionType')} className="sr-only" />
                      <span className="text-2xl mb-1">{type.icon}</span>
                      <span className="text-xs text-center font-medium text-gray-700 dark:text-gray-300">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transaction Title *</label>
                <input type="text" {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'Title must be at least 3 characters' } })}
                  placeholder="e.g., iPhone 15 Pro Max Purchase"
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} />
                {errors.title && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <textarea {...register('description', { required: 'Description is required', minLength: { value: 10, message: 'Description must be at least 10 characters' } })}
                  placeholder="Describe what you're transacting..." rows={4}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} />
                {errors.description && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select {...register('category')} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white">
                    <option value="goods">Goods</option><option value="services">Services</option><option value="digital">Digital</option>
                    <option value="real_estate">Real Estate</option><option value="vehicle">Vehicle</option><option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Delivery Method</label>
                  <select {...register('deliveryMethod')} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white">
                    <option value="physical">Physical Shipping</option><option value="digital">Digital Delivery</option>
                    <option value="service">Service/In-Person</option><option value="crypto">Crypto Transfer</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Amount *</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-2 items-center pointer-events-none">
                      <span className="font-bold text-2xl text-gray-500 dark:text-gray-300">{sym}</span>
                      <span className="text-xs text-gray-400">{currency}</span>
                    </div>
                    <input type="number" step="0.01"
                      {...register('amount', { required: 'Amount is required', min: { value: 1, message: 'Amount must be at least 1' }, max: { value: 10000000, message: 'Amount too large' } })}
                      placeholder="0.00"
                      className={`w-full pl-24 pr-4 py-4 text-2xl font-bold bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white ${errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} />
                  </div>
                  {errors.amount && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.amount.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                  <select {...register('currencyType')} className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-semibold">
                    <option value="fiat">Fiat</option><option value="crypto">Crypto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                <select {...register('currency')} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white">
                  {CURRENCIES[currencyType]?.map(curr => <option key={curr.code} value={curr.code}>{curr.symbol} {curr.name} ({curr.code})</option>)}
                </select>
              </div>

              {isMilestoneBased && (
                <div className="border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2"><Target className="w-5 h-5" />Project Milestones</h3>
                    <button type="button" onClick={handleAddMilestone} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">+ Add Milestone</button>
                  </div>
                  {milestoneFields.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No milestones added yet. Click "Add Milestone" to break down your project.</p>
                  ) : (
                    <div className="space-y-3">
                      {milestoneFields.map((field, index) => (
                        <div key={field.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-sm">Milestone {index + 1}</span>
                            <button type="button" onClick={() => removeMilestone(index)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input {...register(`milestones.${index}.title`, { required: 'Title required' })} placeholder="Milestone title" className="col-span-2 px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700" />
                            <input type="number" step="0.01" {...register(`milestones.${index}.amount`, { required: 'Amount required' })} placeholder="Amount" className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700" />
                            <input type="date" {...register(`milestones.${index}.dueDate`)} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700" />
                            <textarea {...register(`milestones.${index}.description`)} placeholder="Description (optional)" rows={2} className="col-span-2 px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700 resize-none" />
                            <input {...register(`milestones.${index}.deliverables`)} placeholder="Deliverables (comma separated)" className="col-span-2 px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {feeLoading && <div className="flex items-center gap-2 text-blue-600 text-sm"><Loader className="w-4 h-4 animate-spin" /> Calculating fees...</div>}
              {feeBreakdown && !feeLoading && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-md font-bold text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2"><Shield className="w-5 h-5" />Fee Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-blue-200 dark:border-blue-700">
                      <span className="text-gray-700 dark:text-gray-300">Transaction Amount:</span>
                      <span className="font-bold text-xl text-gray-900 dark:text-white">{sym}{feeBreakdown.amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2">
                      <span className="text-gray-600 dark:text-gray-400">Your Fee ({feeBreakdown.buyerFeePercentage}%)</span>
                      <span className="font-semibold">+{sym}{feeBreakdown.buyerFee?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2">
                      <span className="text-gray-600 dark:text-gray-400">Seller Fee ({feeBreakdown.sellerFeePercentage}%)</span>
                      <span className="font-semibold">{sym}{feeBreakdown.sellerFee?.toFixed(2)}</span>
                    </div>
                    <div className="pt-3 border-t-2 border-blue-300 dark:border-blue-600">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-blue-900 dark:text-blue-200 text-lg">You Will Pay:</span>
                        <span className="font-bold text-3xl text-blue-600">{sym}{feeBreakdown.buyerPays?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Seller Will Receive:</span>
                        <span className="font-semibold">{sym}{feeBreakdown.sellerReceives?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Seller Email Address *</label>
                <input type="email" {...register('sellerEmail', { required: 'Seller email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' } })}
                  placeholder="seller@example.com"
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white ${errors.sellerEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} />
                {errors.sellerEmail && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.sellerEmail.message}</p>}
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Users className="w-5 h-5" />Additional Participants (Optional)</h3>
                <div className="space-y-3">
                  {[
                    { field: 'agentEmail', label: 'Agent Email', placeholder: 'agent@example.com (optional)' },
                    { field: 'inspectorEmail', label: 'Inspector Email', placeholder: 'inspector@example.com (optional)' },
                    { field: 'arbitratorEmail', label: 'Arbitrator Email', placeholder: 'arbitrator@example.com (optional)' }
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                      <input type="email" {...register(field)} placeholder={placeholder} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" />
                    </div>
                  ))}
                </div>
              </div>

              {showShippingAddress && (
                <div className="border-2 border-gray-300 dark:border-gray-700 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Shipping Address</h3>
                  <div className="space-y-3">
                    <input {...register('shippingAddress.street')} placeholder="Street Address" className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" />
                    <div className="grid grid-cols-2 gap-3">
                      <input {...register('shippingAddress.city')} placeholder="City" className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" />
                      <input {...register('shippingAddress.state')} placeholder="State/Province" className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input {...register('shippingAddress.country')} placeholder="Country" className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" />
                      <input {...register('shippingAddress.zipCode')} placeholder="Zip/Postal Code" className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Custom Terms & Conditions (Optional)</label>
                <textarea {...register('customTerms')} placeholder="Add any specific terms for this transaction..." rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none text-sm" />
              </div>

              {/* FIX: Attachments — accumulate multiple files across selections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Attachments (Optional)
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {attachedFiles.length}/{MAX_FILES} files
                  </span>
                </div>

                <Controller control={control} name="attachments"
                  render={({ field: { onChange } }) => (
                    <div className="space-y-3">
                      {/* Drop zone / picker */}
                      {attachedFiles.length < MAX_FILES && (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <input type="file" multiple accept="image/*,.pdf,.doc,.docx"
                            onChange={(e) => handleFilesChange(e, onChange)}
                            className="hidden" id="file-upload" />
                          <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                            Click to upload files
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Images, PDF, Word documents · Max 5MB each · Up to {MAX_FILES} files
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            You can open the picker multiple times to add more files
                          </p>
                        </div>
                      )}

                      {/* File list with remove buttons */}
                      {attachedFiles.length > 0 && (
                        <div className="space-y-2">
                          {attachedFiles.map(entry => (
                            <div key={entry.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                              {/* Thumbnail for images */}
                              {entry.file.type.startsWith('image/') ? (
                                <img src={entry.previewUrl} alt={entry.file.name}
                                  className="w-10 h-10 rounded object-cover flex-shrink-0 border border-gray-200 dark:border-gray-600" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.file.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{(entry.file.size / 1024).toFixed(0)} KB</p>
                              </div>
                              <button type="button"
                                onClick={() => handleRemoveFile(entry.id, onChange)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex-shrink-0"
                                title="Remove file">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 4 */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-3">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Review Your Escrow</h3>
                {[
                  { label: 'Type',   value: TRANSACTION_TYPES.find(t => t.value === transactionType)?.label },
                  { label: 'Title',  value: watch('title') },
                  { label: 'Amount', value: `${sym}${watch('amount')} ${currency}` },
                  { label: 'Seller', value: watch('sellerEmail') }
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{label}:</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right max-w-xs truncate">{value}</span>
                  </div>
                ))}
                {attachedFiles.length > 0 && (
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Attachments:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{attachedFiles.length} file(s)</span>
                  </div>
                )}
                {milestoneFields.length > 0 && (
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Milestones:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{milestoneFields.length}</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-200">
                    <p className="font-semibold mb-2">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
                      <li>Seller reviews and accepts the escrow</li>
                      <li>You pay — funds are held securely</li>
                      <li>Seller delivers the item/service</li>
                      {isMilestoneBased && <li>You approve each milestone as work completes</li>}
                      <li>You confirm receipt</li>
                      <li>Payment is released to seller</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            {currentStep > 1 && (
              <button type="button" onClick={() => setCurrentStep(s => s - 1)} disabled={loading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
                Back
              </button>
            )}
            {currentStep < 4 ? (
              <button type="button" onClick={handleNextStep}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg">
                Continue
              </button>
            ) : (
              <button type="submit" disabled={loading || feeLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                {loading ? <><Loader className="w-5 h-5 animate-spin" />Creating Escrow...</> : <><Shield className="w-5 h-5" />Create Escrow</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEscrowModal;
