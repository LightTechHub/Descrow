// File: src/pages/EscrowDetailsPage.jsx - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Package,
  DollarSign,
  Calendar,
  Loader,
  ExternalLink,
  Copy,
  CheckCircle,
  CreditCard,
  Clock,
  AlertTriangle,
  ShieldCheck,
  MessageCircle,
  FileText,
  TrendingUp,
  RefreshCw,
  Star,
  Award,
  Truck,
  XCircle,
  Info,
  Flag,
  MapPin,
  Zap
} from 'lucide-react';
import StatusStepper from '../components/Escrow/StatusStepper';
import ActionButtons from '../components/Escrow/ActionButtons';
import DeliveryModal from '../components/Escrow/DeliveryModal';
import DisputeModal from '../components/Escrow/DisputeModal';
import ChatBox from '../components/Escrow/ChatBox';
import escrowService from '../services/escrowService';
import { authService } from '../services/authService';
import { getStatusInfo, formatCurrency, formatDate } from '../utils/escrowHelpers';
import toast from 'react-hot-toast';

const EscrowDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [escrow, setEscrow] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    fetchEscrowDetails();
  }, [id, navigate]);

  const fetchEscrowDetails = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const response = await escrowService.getEscrowById(id);

      if (response.success) {
        setEscrow(response.data.escrow);
        setUserRole(response.data.userRole);
      } else {
        throw new Error(response.message || 'Escrow not found');
      }
    } catch (error) {
      console.error('Failed to fetch escrow:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load escrow details';
      setError(errorMessage);
      toast.error(errorMessage);
      
      if (!escrow) {
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchEscrowDetails(true);
    toast.success('Refreshed successfully');
  };

  const handleAction = async (action) => {
    try {
      switch (action) {
        case 'accept':
          await handleAccept();
          break;
        case 'fund':
          navigate(`/payment/${escrow._id}`);
          break;
        case 'deliver':
          setShowDeliveryModal(true);
          break;
        case 'confirm':
          await handleConfirm();
          break;
        case 'dispute':
          setShowDisputeModal(true);
          break;
        case 'cancel':
          await handleCancel();
          break;
        case 'reject':
          await handleReject();
          break;
        default:
          toast.error('Unknown action');
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error(error.message || 'Action failed');
    }
  };

  const handleAccept = async () => {
    if (!window.confirm('Are you sure you want to accept this deal? The buyer will be notified to make payment.')) {
      return;
    }

    try {
      const response = await escrowService.acceptEscrow(id);
      if (response.success) {
        toast.success('✅ Deal accepted! Buyer can now make payment.');
        await fetchEscrowDetails(true);
      } else {
        throw new Error(response.message || 'Failed to accept deal');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to accept deal');
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm('⚠️ IMPORTANT: Are you sure you want to confirm delivery?\n\nThis will:\n• Release payment to the seller\n• Complete the transaction\n• Cannot be undone\n\nOnly confirm if you have received and inspected the item.')) {
      return;
    }

    try {
      const response = await escrowService.confirmDelivery(id);
      if (response.success) {
        toast.success('✅ Delivery confirmed! Payment is being released to seller.');
        await fetchEscrowDetails(true);
      } else {
        throw new Error(response.message || 'Failed to confirm delivery');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to confirm delivery');
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Please provide a reason for cancellation (required):');
    if (!reason || reason.trim().length < 10) {
      toast.error('Cancellation reason must be at least 10 characters');
      return;
    }

    if (!window.confirm(`Are you sure you want to cancel this escrow?\n\nReason: ${reason}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await escrowService.cancelEscrow(id, reason);
      if (response.success) {
        toast.success('Escrow cancelled successfully');
        await fetchEscrowDetails(true);
      } else {
        throw new Error(response.message || 'Failed to cancel escrow');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to cancel escrow');
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Please provide a reason for declining this deal (required):');
    if (!reason || reason.trim().length < 10) {
      toast.error('Decline reason must be at least 10 characters');
      return;
    }

    if (!window.confirm(`Are you sure you want to decline this deal?\n\nReason: ${reason}\n\nThe buyer will be notified.`)) {
      return;
    }

    try {
      const response = await escrowService.cancelEscrow(id, `Seller declined: ${reason}`);
      if (response.success) {
        toast.success('Deal declined');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        throw new Error(response.message || 'Failed to decline deal');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to decline deal');
    }
  };

  const handleCopyId = () => {
    const textToCopy = escrow.escrowId || escrow._id;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      toast.success('Escrow ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const handleModalSuccess = () => {
    setShowDeliveryModal(false);
    setShowDisputeModal(false);
    fetchEscrowDetails(true);
  };

  const shouldShowPaymentBanner = () => {
    if (!escrow || !currentUser || !userRole) return false;

    return (
      userRole === 'buyer' && 
      ['pending', 'accepted'].includes(escrow.status) &&
      !escrow.payment?.paidAt
    );
  };

  const getFinancialBreakdown = () => {
    if (!escrow) return null;

    const amount = parseFloat(escrow.amount?.toString() || 0);
    const buyerFee = parseFloat(escrow.payment?.buyerFee?.toString() || (amount * 0.02));
    const sellerFee = parseFloat(escrow.payment?.sellerFee?.toString() || (amount * 0.01));
    const platformFee = parseFloat(escrow.payment?.platformFee?.toString() || (buyerFee + sellerFee));
    const buyerPays = parseFloat(escrow.payment?.buyerPays?.toString() || (amount + buyerFee));
    const sellerReceives = parseFloat(escrow.payment?.sellerReceives?.toString() || (amount - sellerFee));

    return {
      amount,
      buyerFee,
      sellerFee,
      platformFee,
      buyerPays,
      sellerReceives
    };
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading escrow details…</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !escrow) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Escrow Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!escrow || !currentUser) {
    return null;
  }

  const statusInfo = getStatusInfo(escrow.status);
  const otherParty = userRole === 'buyer' ? escrow.seller : escrow.buyer;
  const financial = getFinancialBreakdown();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
      {/* ✅ ENHANCED Header with Modern Gradient */}
      <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="group flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Back to Dashboard</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition shadow-sm disabled:opacity-50"
              title="Refresh escrow details"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>

          {/* ✅ ENHANCED Title Section with Cards */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Title and Status */}
            <div className="lg:col-span-2 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {escrow.title}
              </h1>
              
              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-lg transition text-sm font-mono shadow-sm"
                  title="Click to copy"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    #{escrow.escrowId || escrow._id.slice(-8).toUpperCase()}
                  </span>
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm ${statusInfo.color}`}>
                  <span className="text-base">{statusInfo.icon}</span>
                  <span>{statusInfo.text}</span>
                </span>
                
                {userRole && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-semibold border border-blue-200 dark:border-blue-800 shadow-sm">
                    You: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </span>
                )}

                <span className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium border border-purple-200 dark:border-purple-800 shadow-sm capitalize">
                  {escrow.category?.replace('_', ' ') || 'General'}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Created {formatDate(escrow.createdAt)}</span>
                </div>
                {escrow.payment?.paidAt && (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Paid {formatDate(escrow.payment.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ ENHANCED Right: Amount Card with Gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 border-2 border-blue-400 shadow-2xl">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-blue-200" />
                  <p className="text-sm font-medium text-blue-100">Transaction Amount</p>
                </div>
                <p className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                  {formatCurrency(financial.amount, escrow.currency)}
                </p>
                
                {userRole === 'buyer' && (
                  <div className="space-y-2 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex justify-between text-sm text-blue-100">
                      <span>Buyer fee (2%)</span>
                      <span className="font-semibold text-white">
                        +{formatCurrency(financial.buyerFee, escrow.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/20">
                      <span className="font-bold text-white">You pay</span>
                      <span className="font-bold text-2xl text-white">
                        {formatCurrency(financial.buyerPays, escrow.currency)}
                      </span>
                    </div>
                  </div>
                )}

                {userRole === 'seller' && (
                  <div className="space-y-2 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex justify-between text-sm text-blue-100">
                      <span>Platform fee (1%)</span>
                      <span className="font-semibold text-white">
                        -{formatCurrency(financial.sellerFee, escrow.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/20">
                      <span className="font-bold text-white">You receive</span>
                      <span className="font-bold text-2xl text-white">
                        {formatCurrency(financial.sellerReceives, escrow.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ✅ ENHANCED Ultra-Prominent Payment Banner */}
        {shouldShowPaymentBanner() && (
          <div className="mb-8 relative overflow-hidden rounded-2xl shadow-2xl">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient-x"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptLTEyIDB2Nmg2di02aC02em0yNCAwdjZoNnYtNmgtNnptLTM2IDB2Nmg2di02SDZ6bTEyLTEydjZoNnYtNmgtNnptMTIgMHY2aDZ2LTZoLTZ6bTEyIDB2Nmg2di02aC02em0tMzYgMHY2aDZ2LTZINnptMTItMTJ2Nmg2di02aC02em0xMiAwdjZoNnYtNmgtNnptMTIgMHY2aDZ2LTZoLTZ6bS0zNiAwdjZoNnYtNkg2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
            
            <div className="relative p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Left Content */}
                <div className="flex-1 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <Zap className="w-10 h-10 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold">Payment Required</h2>
                      <p className="text-blue-100">Secure this transaction now</p>
                    </div>
                  </div>
                  
                  <p className="text-blue-50 mb-6 text-lg leading-relaxed">
                    Complete your payment to activate escrow protection. Your funds will be held securely until you confirm delivery.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm">
                      <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">100% Protected</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm">
                      <Clock className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">Instant Confirm</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm">
                      <TrendingUp className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">3 Methods</span>
                    </div>
                  </div>
                </div>

                {/* Right CTA */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => navigate(`/payment/${escrow._id}`)}
                    className="group relative px-10 py-5 bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-bold text-xl transition shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 hover:-translate-y-1"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-7 h-7" />
                        <span>Pay Now</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-700">
                        {formatCurrency(financial.buyerPays, escrow.currency)}
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition"></div>
                  </button>
                  <p className="text-center text-white/80 text-xs mt-3">
                    Multiple payment methods available
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ ENHANCED Tabs Navigation */}
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-1.5 shadow-sm">
          <div className="flex gap-1">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'chat', label: 'Chat', icon: MessageCircle, badge: escrow.chatUnlocked }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-sm rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.badge && !escrow.chatUnlocked && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      Locked
                    </span>
                  )}
                  {tab.badge && escrow.chatUnlocked && (
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area - Continue with existing implementation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <>
                {/* Status Progress */}
                <StatusStepper 
                  currentStatus={escrow.status} 
                  timeline={escrow.timeline}
                />

                {/* Description Card */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Transaction Description
                    </h3>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {escrow.description || 'No description provided'}
                    </p>
                  </div>
                </div>

                {/* Delivery Information - Keep existing implementation */}
                {escrow.delivery?.proof && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Delivery Information
                    </h3>

                    <div className="space-y-4">
                      {/* Keep existing delivery info implementation */}
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Method</label>
                        <p className="font-semibold text-gray-900 dark:text-white capitalize">
                          {escrow.delivery.proof.method}
                        </p>
                      </div>

                      {/* Continue with rest of delivery info... */}
                    </div>
                  </div>
                )}

                {/* Payment Confirmation - Keep existing implementation */}
                {escrow.payment?.paidAt && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50​​​​​​​​​​​​​​​​dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-sm”>
          {/* Keep existing payment confirmation implementation */}
          </div>
       )}
      </>
   )}
  {/* Timeline Tab - Keep existing implementation */}
        {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            {/* Keep existing timeline implementation */}
          </div>
        )}

        {/* Chat Tab - Keep existing implementation */}
        {activeTab === 'chat' && (
          <>
            {escrow.chatUnlocked ? (
              <ChatBox escrowId={escrow._id} currentUser={currentUser} />
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 shadow-sm text-center">
                {/* Keep existing chat locked implementation */}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar - Keep existing implementation with enhanced styling */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <ActionButtons
            escrow={escrow}
            userRole={userRole}
            onAction={handleAction}
            hideFundButton={shouldShowPaymentBanner()}
          />
        </div>

        {/* Other Party Information - Keep existing */}
        {/* Financial Summary - Keep existing */}
        {/* Escrow Protection Badge - Keep existing */}
        {/* Help & Support - Keep existing */}
      </div>
    </div>
  </div>

  {/* Modals */}
  {showDeliveryModal && (
    <DeliveryModal
      escrow={escrow}
      onClose={() => setShowDeliveryModal(false)}
      onSuccess={handleModalSuccess}
    />
  )}

  {showDisputeModal && (
    <DisputeModal
      escrow={escrow}
      onClose={() => setShowDisputeModal(false)}
      onSuccess={handleModalSuccess}
    />
  )}
</div>
);
};
export default EscrowDetailsPage;