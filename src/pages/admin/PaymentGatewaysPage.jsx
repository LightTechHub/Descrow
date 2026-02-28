// src/pages/admin/PaymentGatewaysPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, DollarSign, Bitcoin,
  CheckCircle, Loader, AlertCircle, TrendingUp, Activity, RefreshCw
} from 'lucide-react';
import { adminService } from '../../services/adminService';

const PaymentGatewaysPage = ({ admin }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchPaymentStats();
  }, []);

  // FIX: replaced mock setTimeout with real API call
  const fetchPaymentStats = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPlatformStats();
      const data = response.data || response;
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch payment stats:', error);
      // Fallback to zeros on error rather than fake data
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Pull payment method breakdown from analytics if available
  const getGatewayCount = (gatewayName) => {
    if (!stats?.paymentMethods) return 0;
    const found = stats.paymentMethods.find(
      m => (m.method || m._id || '').toLowerCase() === gatewayName.toLowerCase()
    );
    return found?.count || 0;
  };

  const paymentMethods = [
    {
      id: 'paystack',
      icon: CreditCard,
      name: 'Paystack',
      status: 'Active',
      color: 'blue',
      colorClasses: 'bg-blue-500/20 text-blue-400',
      features: ['Card Payments', 'Bank Transfer', 'USSD', 'Mobile Money'],
      transactions: getGatewayCount('paystack'),
      webhookPath: '/api/payments/webhook/paystack'
    },
    {
      id: 'flutterwave',
      icon: DollarSign,
      name: 'Flutterwave',
      status: 'Active',
      color: 'purple',
      colorClasses: 'bg-purple-500/20 text-purple-400',
      features: ['Multi-currency', 'Mobile Money', 'M-Pesa', 'Bank Transfer'],
      transactions: getGatewayCount('flutterwave'),
      webhookPath: '/api/payments/webhook/flutterwave'
    },
    {
      id: 'nowpayments',
      icon: Bitcoin,
      name: 'Nowpayments',
      status: 'Active',
      color: 'yellow',
      colorClasses: 'bg-yellow-500/20 text-yellow-400',
      features: ['Bitcoin (BTC)', 'Ethereum (ETH)', 'USDT', '100+ Cryptocurrencies'],
      transactions: getGatewayCount('nowpayments'),
      webhookPath: '/api/payments/webhook/nowpayments'
    }
  ];

  const totalTransactions = paymentMethods.reduce((sum, m) => sum + m.transactions, 0);
  const totalVolume = stats?.transactionStats?.totalVolume || stats?.escrowStats?.totalVolume || 0;
  const baseUrl = process.env.REACT_APP_API_URL || 'https://your-backend.com';

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* FIX: use navigate() instead of window.history.back() */}
            <button onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Payment Gateway Management</h1>
              <p className="text-sm text-gray-400">All payment methods are fully automated</p>
            </div>
          </div>
          <button onClick={fetchPaymentStats} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Volume', value: `₦${totalVolume.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
            { label: 'Paystack', value: loading ? '—' : paymentMethods[0].transactions, icon: Activity, color: 'text-blue-400', sub: 'transactions' },
            { label: 'Flutterwave', value: loading ? '—' : paymentMethods[1].transactions, icon: Activity, color: 'text-purple-400', sub: 'transactions' },
            { label: 'Crypto', value: loading ? '—' : paymentMethods[2].transactions, icon: Activity, color: 'text-yellow-400', sub: 'transactions' }
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-gray-800 rounded-lg border border-gray-700 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin text-gray-500 mt-2" />
                ) : (
                  <>
                    <p className="text-2xl font-bold text-white">{card.value}</p>
                    {card.sub && <p className="text-xs text-gray-500 mt-1">{card.sub}</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Automation Notice */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-green-300 font-semibold mb-1">All Payments Fully Automated</p>
            <p className="text-xs text-green-400">
              Paystack, Flutterwave, and Nowpayments are configured with webhooks for instant automatic
              confirmation. No manual verification needed.
            </p>
          </div>
        </div>

        {/* Gateway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <div key={method.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${method.colorClasses}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{method.name}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs text-green-400">Active</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  {method.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Transactions</span>
                  {loading
                    ? <Loader className="w-4 h-4 animate-spin text-gray-500" />
                    : <span className="text-xl font-bold text-white">{method.transactions}</span>
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* Webhook Config */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Webhook Configuration</h2>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <p className={`text-sm font-semibold mb-2 ${method.colorClasses.split(' ')[1]}`}>
                  {method.name} Webhook URL
                </p>
                <code className="text-xs text-gray-300 font-mono break-all">
                  {baseUrl}{method.webhookPath}
                </code>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-300 font-semibold mb-2">Required Environment Variables</p>
              <ul className="text-xs text-yellow-400 space-y-1 font-mono">
                <li>PAYSTACK_SECRET_KEY</li>
                <li>FLUTTERWAVE_SECRET_KEY</li>
                <li>FLUTTERWAVE_WEBHOOK_SECRET</li>
                <li>NOWPAYMENTS_API_KEY</li>
                <li>NOWPAYMENTS_IPN_SECRET</li>
              </ul>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default PaymentGatewaysPage;
