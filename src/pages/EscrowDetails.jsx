// File: src/pages/EscrowDetailsPage.jsx - SIMPLIFIED & FIXED
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  Copy,
  CheckCircle,
  ShieldCheck,
  MessageCircle,
  FileText,
  RefreshCw,
  XCircle,
  Clock
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
  const hasFetched = useRef(false);

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

    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchEscrowDetails();
    }
  }, [id, navigate]);

  const fetchEscrowDetails = async (silent = false) => {
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
      
      if (!silent && !escrow) {
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
    buyerPays: parseFloat(escrow.payment?.buyerPays || (escrow.amount * 1.02)),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>

            <button
              onClick={() => fetchEscrowDetails(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Title */}
            <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {escrow.title}
              </h1>
              
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-700 rounded text-sm"
                >
                  #{escrow.escrowId || escrow._id.slice(-8)}
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                
                <span className={`px-3 py-1 rounded text-sm ${statusInfo.color}`}>
                  {statusInfo.text}
                </span>

                {userRole && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm">
                    You: {userRole}
                  </span>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl p-6">
              <p className="text-sm opacity-80 mb-1">Amount</p>
              <p className="text-3xl font-bold">
                {formatCurrency(financial.amount, escrow.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl p-1 flex gap-1">
          {['details', 'timeline', 'chat'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'details' && (
              <>
                <StatusStepper currentStatus={escrow.status} timeline={escrow.timeline} />

                <div className="bg-white dark:bg-gray-900 rounded-xl p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Description
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {escrow.description || 'No description'}
                  </p>
                </div>
              </>
            )}

            {activeTab === 'chat' && (
              escrow.chatUnlocked ? (
                <ChatBox escrowId={escrow._id} currentUser={currentUser} />
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center">
                  <ShieldCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Chat locked until payment</p>
                </div>
              )
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
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