// File: src/pages/EscrowDetailsPage.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Loader,
  Copy,
  CheckCircle,
  CreditCard,
  Clock,
  ShieldCheck,
  MessageCircle,
  FileText,
  RefreshCw,
  Truck,
  XCircle,
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

  // ✅ FIX: Memoize fetchEscrowDetails with useCallback
  const fetchEscrowDetails = useCallback(async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError(null);

      const res = await escrowService.getEscrowById(id);

      if (!res?.success) throw new Error(res?.message || 'Escrow not found');

      setEscrow(res.data.escrow);
      setUserRole(res.data.userRole);
    } catch (err) {
      console.error('Fetch escrow error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load escrow';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Only navigate away if escrow is null (first load failure)
      if (!escrow) {
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, navigate, escrow]); // ✅ FIX: Proper dependencies

  // ✅ FIX: Separate useEffect for initial auth check
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  // ✅ FIX: Separate useEffect for fetching escrow data
  useEffect(() => {
    if (currentUser) {
      fetchEscrowDetails();
    }
  }, [id, currentUser]); // ✅ Only refetch when ID or user changes

  const handleCopyId = () => {
    const textToCopy = escrow?.escrowId || escrow?._id;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Escrow ID copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = (action) => {
    if (action === 'deliver') setShowDeliveryModal(true);
    if (action === 'dispute') setShowDisputeModal(true);
    if (action === 'fund') navigate(`/payment/${escrow._id}`);
  };

  const handleModalSuccess = () => {
    setShowDeliveryModal(false);
    setShowDisputeModal(false);
    fetchEscrowDetails(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading escrow details...</p>
        </div>
      </div>
    );
  }

  if (error && !escrow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg text-center max-w-md border border-gray-200 dark:border-gray-800">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Escrow Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!escrow) {
    return null;
  }

  const statusInfo = getStatusInfo(escrow.status);
  const financial = {
    amount: parseFloat(escrow.amount || 0),
    buyerFee: parseFloat(escrow.payment?.buyerFee || escrow.amount * 0.02),
    sellerFee: parseFloat(escrow.payment?.sellerFee || escrow.amount * 0.01),
    buyerPays: parseFloat(escrow.payment?.buyerPays || (escrow.amount * 1.02)),
    sellerReceives: parseFloat(escrow.payment?.sellerReceives || (escrow.amount * 0.99))
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Back to Dashboard</span>
            </button>

            <button
              onClick={() => fetchEscrowDetails(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Title Card */}
            <div className="lg:col-span-2 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {escrow.title}
              </h1>
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition text-sm font-mono"
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
                
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${statusInfo.color}`}>
                  <span>{statusInfo.icon}</span>
                  <span>{statusInfo.text}</span>
                </span>

                {userRole && (
                  <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-semibold">
                    You: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Amount Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-blue-100 mb-2">Transaction Amount</p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(financial.amount, escrow.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-1.5 shadow-sm">
          <div className="flex gap-1">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'chat', label: 'Chat', icon: MessageCircle }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'details' && (
              <>
                <StatusStepper 
                  currentStatus={escrow.status} 
                  timeline={escrow.timeline}
                />

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Transaction Description
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {escrow.description || 'No description provided'}
                  </p>
                </div>
              </>
            )}

            {activeTab === 'chat' && (
              <>
                {escrow.chatUnlocked ? (
                  <ChatBox escrowId={escrow._id} currentUser={currentUser} />
                ) : (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 shadow-sm text-center">
                    <div className="max-w-md mx-auto">
                      <ShieldCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Chat Locked
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Chat will be available once payment is completed
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <ActionButtons
                escrow={escrow}
                userRole={userRole}
                onAction={handleAction}
              />
            </div>
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