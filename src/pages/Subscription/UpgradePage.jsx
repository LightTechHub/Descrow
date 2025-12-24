// src/pages/Subscription/UpgradePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, Check, Loader, ArrowRight, Zap, Shield, 
  TrendingUp, Code, AlertCircle, X 
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const UpgradePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState('free');
  const [selectedTier, setSelectedTier] = useState(null);
  const [upgradeCost, setUpgradeCost] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/subscription/tiers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTiers(response.data.data.tiers);
        setCurrentTier(response.data.data.currentTier);
      }
    } catch (error) {
      console.error('Fetch tiers error:', error);
      toast.error('Failed to load tiers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTier = async (tier) => {
    if (tier.id === currentTier) {
      toast.error('You are already on this tier');
      return;
    }

    const tierOrder = ['free', 'starter', 'growth', 'enterprise', 'api'];
    if (tierOrder.indexOf(tier.id) <= tierOrder.indexOf(currentTier)) {
      toast.error('Cannot downgrade tiers');
      return;
    }

    setSelectedTier(tier);

    // Calculate cost
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/subscription/calculate-upgrade`,
        { targetTier: tier.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setUpgradeCost(response.data.data.cost);
      }
    } catch (error) {
      console.error('Calculate cost error:', error);
      toast.error('Failed to calculate upgrade cost');
    }
  };

  const handleUpgrade = async () => {
    if (!selectedTier) {
      toast.error('Please select a tier');
      return;
    }

    try {
      setUpgrading(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/subscription/upgrade`,
        { 
          targetTier: selectedTier.id,
          paymentMethod: 'paystack'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const { paymentUrl, paymentReference } = response.data.data;

        if (paymentUrl) {
          // Redirect to payment page
          toast.success('Redirecting to payment...');
          window.location.href = paymentUrl;
        } else {
          // Free upgrade completed
          toast.success(response.data.message);
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to initiate upgrade';
      toast.error(errorMsg);

      // Handle KYC requirement
      if (error.response?.data?.action === 'complete_kyc') {
        setTimeout(() => navigate('/kyc-verification'), 2000);
      }
    } finally {
      setUpgrading(false);
    }
  };

  const getTierIcon = (tierName) => {
    switch (tierName.toLowerCase()) {
      case 'free': return Shield;
      case 'starter': return Zap;
      case 'growth': return TrendingUp;
      case 'enterprise': return Crown;
      case 'api': return Code;
      default: return Shield;
    }
  };

  const getTierColor = (tierName) => {
    switch (tierName.toLowerCase()) {
      case 'free': return 'gray';
      case 'starter': return 'blue';
      case 'growth': return 'green';
      case 'enterprise': return 'purple';
      case 'api': return 'indigo';
      default: return 'gray';
    }
  };

  const getTierColorClasses = (color, isSelected = false) => {
    const colorMap = {
      gray: {
        border: isSelected ? 'border-gray-500' : 'hover:border-gray-300',
        bg: 'bg-gradient-to-br from-gray-500 to-gray-600',
        text: 'text-gray-600',
        check: 'text-gray-600'
      },
      blue: {
        border: isSelected ? 'border-blue-500' : 'hover:border-blue-300',
        bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
        text: 'text-blue-600',
        check: 'text-blue-600'
      },
      green: {
        border: isSelected ? 'border-green-500' : 'hover:border-green-300',
        bg: 'bg-gradient-to-br from-green-500 to-green-600',
        text: 'text-green-600',
        check: 'text-green-600'
      },
      purple: {
        border: isSelected ? 'border-purple-500' : 'hover:border-purple-300',
        bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
        text: 'text-purple-600',
        check: 'text-purple-600'
      },
      indigo: {
        border: isSelected ? 'border-indigo-500' : 'hover:border-indigo-300',
        bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
        text: 'text-indigo-600',
        check: 'text-indigo-600'
      }
    };
    return colorMap[color] || colorMap.gray;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Upgrade Your Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose the plan that's right for you
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Current tier: <span className="font-semibold capitalize">{currentTier}</span>
          </p>
        </div>

        {/* Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {tiers.map((tier) => {
            const Icon = getTierIcon(tier.name);
            const color = getTierColor(tier.name);
            const colorClasses = getTierColorClasses(color, selectedTier?.id === tier.id);
            const isCurrentTier = tier.id === currentTier;
            const isSelected = selectedTier?.id === tier.id;

            return (
              <div
                key={tier.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border-2 transition-all cursor-pointer ${
                  isSelected
                    ? `${colorClasses.border} shadow-xl scale-105`
                    : isCurrentTier
                    ? 'border-gray-400 dark:border-gray-600'
                    : `border-gray-200 dark:border-gray-800 ${colorClasses.border}`
                }`}
                onClick={() => handleSelectTier(tier)}
              >
                {/* Icon */}
                <div className={`w-12 h-12 ${colorClasses.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Tier Name */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>

                {/* Price */}
                <div className="mb-4">
                  {tier.monthlyCost === 0 ? (
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Free
                    </p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {tier.monthlyCostFormatted}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        per month
                      </p>
                      {tier.setupFee > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          + {tier.setupFeeFormatted} setup fee
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 ${colorClasses.check} flex-shrink-0 mt-0.5`} />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Status Badge */}
                {isCurrentTier && (
                  <div className="text-center py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Current Plan
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Tier Details */}
        {selectedTier && upgradeCost && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border-2 border-blue-500 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedTier(null);
                setUpgradeCost(null);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Upgrade Summary
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Tier:</span>
                <span className="font-semibold capitalize text-gray-900 dark:text-white">
                  {currentTier}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Upgrading to:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedTier.name}
                </span>
              </div>

              {upgradeCost.setupFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Setup Fee:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {upgradeCost.setupFeeFormatted}
                  </span>
                </div>
              )}

              {upgradeCost.monthlyCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Monthly Cost:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {upgradeCost.monthlyCostFormatted}
                  </span>
                </div>
              )}

              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 flex justify-between">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  Total Due Now:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {upgradeCost.totalDueFormatted}
                </span>
              </div>
            </div>

            {/* KYC Warning */}
            {(selectedTier.id === 'growth' || selectedTier.id === 'enterprise' || selectedTier.id === 'api') && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-900 dark:text-yellow-100 font-medium">
                      KYC Verification Required
                    </p>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                      This tier requires identity verification. You'll be redirected if not completed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedTier(null);
                  setUpgradeCost(null);
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {upgrading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {upgradeCost.totalDue === 0 ? 'Upgrade Now' : 'Proceed to Payment'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help choosing?{' '}
            <a href="mailto:support@dealcross.net" className="text-blue-600 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
