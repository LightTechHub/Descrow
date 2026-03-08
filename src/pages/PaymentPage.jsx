// src/pages/PaymentPage.jsx - PRODUCTION READY WITH CURRENCY FILTERING
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, DollarSign, Bitcoin, Loader, ArrowLeft, Shield, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const PaymentPage = () => {
  const { escrowId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [escrow, setEscrow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchEscrowDetails();
  }, [escrowId]);

  // Auto-select best payment method based on currency
  useEffect(() => {
    if (escrow) {
      const method = searchParams.get('method');

      if (method && ['paystack', 'flutterwave', 'crypto'].includes(method)) {
        // Check if method is valid for this currency
        const gateway = allGateways.find(g => g.id === method);
        if (gateway && isGatewayAvailable(gateway, escrow.currency)) {
          setSelectedGateway(method);
          return;
        }
      }

      // Auto-select based on currency
      if (escrow.currency === 'NGN') {
        setSelectedGateway('paystack'); // Best for Nigeria
      } else {
        setSelectedGateway('flutterwave'); // Best for international
      }
    }
  }, [escrow, searchParams]);

  const fetchEscrowDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/escrow/${escrowId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const escrowData = response.data.data.escrow;
        setEscrow(escrowData);

        // Check if already paid
        if (escrowData.status === 'funded' || escrowData.payment?.paidAt) {
          toast.success('This escrow has already been paid!');
          setTimeout(() => navigate(`/escrow/${escrowId}`), 2000);
          return; // FIX: stop processing, page is redirecting
        }

        // Check if user can pay (must be buyer and status must be pending/accepted)
        if (!['pending', 'accepted'].includes(escrowData.status)) {
          toast.error('This escrow is not ready for payment');
          setTimeout(() => navigate(`/escrow/${escrowId}`), 2000);
          return; // FIX: stop processing, page is redirecting
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching escrow:', error);
      toast.error(error.response?.data?.message || 'Failed to load payment details');
      setLoading(false);
      setTimeout(() => navigate('/dashboard'), 2000);
    }
  };

  const handlePayment = async () => {
    if (!selectedGateway) {
      toast.error('Please select a payment method');
      return;
    }

    setProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/payments/initialize`,
        {
          escrowId: escrow.escrowId || escrow._id, // fallback to MongoDB _id
          paymentMethod: selectedGateway
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const paymentData = response.data.paymentData;

        // Store payment reference for verification
        localStorage.setItem('pendingPaymentReference', response.data.reference);
        localStorage.setItem('pendingPaymentEscrowId', escrow._id);

        // Redirect to payment gateway
        if (paymentData.authorization_url) {
          window.location.href = paymentData.authorization_url;
        } else if (paymentData.link) {
          window.location.href = paymentData.link;
        } else if (paymentData.invoice_url) {
          window.location.href = paymentData.invoice_url;
        } else {
          toast.error('Payment URL not received');
          setProcessing(false);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment initialization failed');
      setProcessing(false);
    }
  };

  // Define all gateways with currency support
  const allGateways = [
    {
      id: 'paystack',
      name: 'Paystack',
      description: 'Card, Bank Transfer, USSD (Nigeria Only - NGN)',
      icon: CreditCard,
      color: 'blue',
      supportedCurrencies: ['NGN'],
      features: ['Instant confirmation', 'Nigerian banks', 'USSD & Transfer', 'Mobile money']
    },
    {
      id: 'flutterwave',
      name: 'Flutterwave',
      description: 'Multi-currency, Cards, Bank Transfer, Mobile Money',
      icon: DollarSign,
      color: 'purple',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD', 'XOF', 'XAF'],
      features: ['Multi-currency support', 'International cards', 'Mobile money', 'Bank transfer']
    },
    {
      id: 'crypto',
      name: 'Cryptocurrency',
      description: 'Pay with Bitcoin, Ethereum, USDT & 100+ Coins',
      icon: Bitcoin,
      color: 'yellow',
      supportedCurrencies: ['all'],
      features: ['100+ cryptocurrencies', 'No borders', 'Fast settlement', 'Low fees']
    }
  ];

  // Helper function to check if gateway is available for currency
  const isGatewayAvailable = (gateway, currency) => {
    if (gateway.supportedCurrencies.includes('all')) return true;
    return gateway.supportedCurrencies.includes(currency);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Escrow not found</p>
        </div>
      </div>
    );
  }

  // Filter gateways based on escrow currency and sort by priority
  const availableGateways = allGateways
    .filter(gateway => isGatewayAvailable(gateway, escrow.currency))
    .sort((a, b) => {
      // For NGN: Paystack first
      if (escrow.currency === 'NGN') {
        if (a.id === 'paystack') return -1;
        if (b.id === 'paystack') return 1;
      } else {
        // For non-NGN: Flutterwave first
        if (a.id === 'flutterwave') return -1;
        if (b.id === 'flutterwave') return 1;
      }
      return 0;
    })
    .map(gateway => ({
      ...gateway,
      recommended: (escrow.currency === 'NGN' && gateway.id === 'paystack') || 
                   (escrow.currency !== 'NGN' && gateway.id === 'flutterwave')
    }));

  // Show error if no payment methods available
  if (availableGateways.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md bg-white dark:bg-gray-900 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-800">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Payment Methods Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Currency {escrow.currency} is not supported by our payment gateways.
          </p>
          <button
            onClick={() => navigate(`/escrow/${escrow._id}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const amount = parseFloat(escrow.payment?.amount?.toString() || escrow.amount.toString());
  const buyerFee = parseFloat(escrow.payment?.buyerFee?.toString() || (amount * 0.02).toFixed(2));
  const totalAmount = parseFloat(escrow.payment?.buyerPays?.toString() || (amount + buyerFee).toFixed(2));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/escrow/${escrow._id}`)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Escrow Details</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Complete Payment</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Escrow ID: <span className="font-mono font-semibold">#{escrow.escrowId}</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Select Payment Method</h2>

              {/* Currency Info Banner */}
              {escrow.currency !== 'NGN' && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Payment Currency: {escrow.currency}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Paystack is not available for {escrow.currency}. Use Flutterwave or Crypto for international payments.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {availableGateways.map((gateway) => {
                  const Icon = gateway.icon;
                  const isSelected = selectedGateway === gateway.id;

                  return (
                    <button
                      key={gateway.id}
                      onClick={() => setSelectedGateway(gateway.id)}
                      disabled={processing}
                      className={`w-full p-5 rounded-xl border-2 transition text-left relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {gateway.recommended && (
                        <div className="absolute -top-3 right-4">
                          <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                            <Zap className="w-3 h-3" />
                            RECOMMENDED
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <Icon className={`w-7 h-7 ${isSelected ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-lg text-gray-900 dark:text-white">{gateway.name}</p>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{gateway.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {gateway.features.map((feature, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handlePayment}
                disabled={processing || !selectedGateway}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Redirecting to payment gateway...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Proceed to Secure Payment</span>
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                🔒 Your payment is secured with 256-bit SSL encryption
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-800 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Summary</h3>

              <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Item</span>
                  <span className="text-gray-900 dark:text-white font-medium text-right max-w-[60%]">{escrow.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Seller</span>
                  <span className="text-gray-900 dark:text-white">{escrow.seller?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Currency</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{escrow.currency}</span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Item Amount</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {escrow.currency} {amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Buyer Fee (2%)
                    <span className="block text-xs text-gray-500">Covers escrow protection</span>
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {escrow.currency} {buyerFee.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 dark:text-white">Total to Pay</span>
                  <span className="font-bold text-2xl text-blue-600">
                    {escrow.currency} {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100">Escrow Protection</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Funds held securely until you confirm delivery. Full refund if seller doesn't deliver.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Secure Escrow</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your money is held safely until delivery is confirmed
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Instant Verification</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatic payment confirmation via webhooks
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-purple-600" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Dispute Protection</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Issue resolution support if anything goes wrong
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;