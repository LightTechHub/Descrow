// src/pages/admin/FeeManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, Loader, History, RefreshCw,
  Settings, Edit2, CheckCircle, Layers, BarChart3, X
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const FeeManagementPage = ({ admin }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeSettings, setFeeSettings] = useState(null);
  const [selectedTier, setSelectedTier] = useState('starter');
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [feeHistory, setFeeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchFeeSettings();
    fetchFeeHistory();
  }, []);

  const fetchFeeSettings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getFeeSettings();
      const data = response.data || response;
      if (data) setFeeSettings(data);
    } catch (error) {
      console.error('Failed to fetch fee settings:', error);
      toast.error('Failed to load fee settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeHistory = async () => {
    try {
      const response = await adminService.getFeeHistory();
      const data = response.data || response;
      setFeeHistory(data.history || data || []);
    } catch (error) {
      console.error('Failed to fetch fee history:', error);
    }
  };

  const handleStartEdit = (field, currentValue) => {
    setEditingField(field);
    setTempValue(String(currentValue));
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleSaveField = async (feeType, field = null) => {
    try {
      setSaving(true);
      const payload = {
        tier: selectedTier,
        feeType,
        value: parseFloat(tempValue)
      };
      if (feeType === 'fees') {
        payload.currency = selectedCurrency;
        payload.field = field;
      } else if (['monthlyCost', 'setupFee', 'maxTransactionAmount'].includes(feeType)) {
        payload.currency = selectedCurrency;
      }

      const response = await adminService.updateFeeSettings(payload);
      const data = response.data || response;
      if (response.success || data.success) {
        toast.success('Fee updated successfully!');
        setFeeSettings(data.feeSettings || data);
        setEditingField(null);
        setTempValue('');
        fetchFeeHistory();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update fee');
    } finally {
      setSaving(false);
    }
  };

  const handleResetFees = async () => {
    if (!window.confirm(`Reset ${selectedTier} tier to default values? This cannot be undone.`)) return;
    try {
      setSaving(true);
      const response = await adminService.resetFeesToDefault(selectedTier);
      if (response.success || response.data?.success) {
        toast.success('Fees reset to defaults');
        fetchFeeSettings();
        fetchFeeHistory();
      }
    } catch (error) {
      toast.error('Failed to reset fees');
    } finally {
      setSaving(false);
    }
  };

  // FIX: proper operator precedence — was: buyer + seller * 100
  const getTotalFee = () => {
    const buyer = currentTier?.fees?.[selectedCurrency]?.buyer || 0;
    const seller = currentTier?.fees?.[selectedCurrency]?.seller || 0;
    return ((buyer + seller) * 100).toFixed(2);
  };

  const calculateProfitPreview = () => {
    if (!feeSettings || !currentTier) return null;
    const fees = currentTier.fees?.[selectedCurrency];
    const gatewayCost = feeSettings.gatewayCosts?.flutterwave?.[selectedCurrency];
    if (!fees || !gatewayCost) return null;

    const testAmount = 10000;
    const buyerFee = testAmount * (fees.buyer || 0);
    const sellerFee = testAmount * (fees.seller || 0);
    const totalPlatformFee = buyerFee + sellerFee;
    const gatewayIncoming = testAmount * (gatewayCost.percentage || 0);
    const platformProfit = totalPlatformFee - gatewayIncoming;

    return {
      testAmount,
      buyerFee: buyerFee.toFixed(2),
      sellerFee: sellerFee.toFixed(2),
      totalPlatformFee: totalPlatformFee.toFixed(2),
      gatewayIncoming: gatewayIncoming.toFixed(2),
      platformProfit: platformProfit.toFixed(2),
      profitPercentage: ((platformProfit / testAmount) * 100).toFixed(2)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  const currentTier = feeSettings?.tiers?.[selectedTier];
  const profitPreview = calculateProfitPreview();
  const currencySymbol = selectedCurrency === 'NGN' ? '₦' : selectedCurrency === 'USD' ? '$' : '₿';

  // Inline editable field component
  const EditableField = ({ label, fieldKey, feeType, subField, value, format, description }) => {
    const isEditing = editingField === fieldKey;
    const displayValue = format ? format(value) : value;

    return (
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-gray-300">{label}</label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={feeType === 'fees' ? '0.001' : '1'}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="w-28 px-3 py-1.5 border border-gray-600 rounded-lg bg-gray-800 text-white text-sm focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              <button onClick={() => handleSaveField(feeType, subField)} disabled={saving}
                className="p-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-white disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
              </button>
              <button onClick={handleCancelEdit}
                className="p-1.5 bg-gray-600 hover:bg-gray-700 rounded-lg text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => handleStartEdit(fieldKey, value)}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
              <span className="text-xl font-bold">{displayValue}</span>
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Fee Management</h1>
              <p className="text-sm text-gray-400">Configure tier-based transaction fees and gateway costs</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition text-sm">
              <History className="w-4 h-4" /> History
            </button>
            <button onClick={handleResetFees} disabled={saving}
              className="flex items-center gap-2 px-3 py-2 border border-red-700 text-red-400 rounded-lg hover:bg-red-900/20 transition text-sm">
              <RefreshCw className="w-4 h-4" /> Reset Tier
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Tier Selector */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Select Tier</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['starter', 'growth', 'enterprise', 'api'].map((tier) => {
              const tierData = feeSettings?.tiers?.[tier];
              const cost = tierData?.monthlyCost?.[selectedCurrency === 'NGN' ? 'NGN' : 'USD'] || 0;
              return (
                <button key={tier} onClick={() => setSelectedTier(tier)}
                  className={`p-4 rounded-lg border-2 transition text-left ${
                    selectedTier === tier
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}>
                  <p className="font-semibold text-white capitalize">{tier}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {cost === 0 ? 'Free' : `${currencySymbol}${cost.toLocaleString()}/mo`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency Selector */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex gap-3">
            {['NGN', 'USD', 'crypto'].map((currency) => (
              <button key={currency} onClick={() => setSelectedCurrency(currency)}
                className={`px-5 py-2.5 rounded-lg font-semibold transition text-sm ${
                  selectedCurrency === currency
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-900 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}>
                {currency === 'NGN' ? '₦ NGN' : currency === 'USD' ? '$ USD' : '₿ Crypto'}
              </button>
            ))}
          </div>
        </div>

        {/* Fee Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Fees */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Transaction Fees ({selectedCurrency})</h3>
            </div>
            <div className="space-y-3">
              <EditableField
                label="Buyer Fee"
                fieldKey={`buyer-${selectedCurrency}`}
                feeType="fees"
                subField="buyer"
                value={currentTier?.fees?.[selectedCurrency]?.buyer || 0}
                format={(v) => `${(v * 100).toFixed(2)}%`}
                description="Fee charged to buyers on each transaction"
              />
              <EditableField
                label="Seller Fee"
                fieldKey={`seller-${selectedCurrency}`}
                feeType="fees"
                subField="seller"
                value={currentTier?.fees?.[selectedCurrency]?.seller || 0}
                format={(v) => `${(v * 100).toFixed(2)}%`}
                description="Fee charged to sellers on each transaction"
              />
              {/* FIX: correct total fee calculation */}
              <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-300">Total Platform Fee</span>
                <span className="text-2xl font-bold text-blue-400">{getTotalFee()}%</span>
              </div>
            </div>
          </div>

          {/* Tier Limits */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Tier Limits & Costs</h3>
            </div>
            <div className="space-y-3">
              <EditableField
                label={`Monthly Cost (${currencySymbol})`}
                fieldKey={`monthlyCost-${selectedCurrency}`}
                feeType="monthlyCost"
                value={currentTier?.monthlyCost?.[selectedCurrency === 'NGN' ? 'NGN' : 'USD'] || 0}
                format={(v) => v.toLocaleString()}
              />
              <EditableField
                label={`Max Transaction (${currencySymbol})`}
                fieldKey={`maxAmount-${selectedCurrency}`}
                feeType="maxTransactionAmount"
                value={currentTier?.maxTransactionAmount?.[selectedCurrency === 'NGN' ? 'NGN' : 'USD'] || 0}
                format={(v) => v === -1 ? 'Unlimited' : v.toLocaleString()}
                description="-1 for unlimited"
              />
              <EditableField
                label="Monthly Transaction Limit"
                fieldKey="maxTransactions"
                feeType="maxTransactionsPerMonth"
                value={currentTier?.maxTransactionsPerMonth || 0}
                format={(v) => v === -1 ? 'Unlimited' : v.toLocaleString()}
                description="-1 for unlimited"
              />
            </div>
          </div>
        </div>

        {/* Profit Preview */}
        {profitPreview && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-green-300">
                Profit Preview — Example {currencySymbol}{profitPreview.testAmount.toLocaleString()} transaction
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Platform Collects', value: profitPreview.totalPlatformFee, color: 'text-white' },
                { label: 'Gateway Cost', value: `-${profitPreview.gatewayIncoming}`, color: 'text-red-400' },
                { label: 'Net Profit', value: profitPreview.platformProfit, color: 'text-green-400' },
                { label: 'Profit %', value: `${profitPreview.profitPercentage}%`, color: 'text-green-400' }
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-sm text-gray-400 mb-1">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Fee History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Fee Change History</h3>
              <button onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {feeHistory.length > 0 ? (
                <div className="space-y-3">
                  {feeHistory.map((h, i) => (
                    <div key={h._id || i} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-semibold text-sm">Version {h.version || i + 1}</span>
                        <span className="text-gray-400 text-xs">{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Updated by: {h.lastUpdatedBy?.name || h.updatedBy?.name || 'System'}
                      </p>
                      {h.changes && (
                        <p className="text-gray-500 text-xs mt-1">{JSON.stringify(h.changes)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No history available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeManagementPage;
