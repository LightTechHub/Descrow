// File: src/pages/EscrowDetailsPage.jsx
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    fetchEscrowDetails();
  }, [id]);

  const fetchEscrowDetails = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const res = await escrowService.getEscrowById(id);

      if (!res?.success) throw new Error(res?.message || 'Escrow not found');

      setEscrow(res.data.escrow);
      setUserRole(res.data.userRole);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(escrow?.escrowId || escrow?._id);
    setCopied(true);
    toast.success('Escrow ID copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = (action) => {
    if (action === 'deliver') setShowDeliveryModal(true);
    if (action === 'dispute') setShowDisputeModal(true);
    if (action === 'fund') navigate(`/payment/${escrow._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !escrow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow text-center">
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(escrow.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          <button
            onClick={() => fetchEscrowDetails(true)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
            <h1 className="text-2xl font-bold mb-3">{escrow.title}</h1>

            <div className="flex gap-3 flex-wrap mb-4">
              <button
                onClick={handleCopyId}
                className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded"
              >
                #{escrow.escrowId || escrow._id.slice(-6)}
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>

              <span className={`px-3 py-1 rounded text-sm ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>

            <StatusStepper currentStatus={escrow.status} timeline={escrow.timeline} />
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-2 flex gap-2">
            {['details', 'timeline', 'chat'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'details' && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {escrow.description || 'No description provided'}
              </p>
            </div>
          )}

          {activeTab === 'chat' && (
            escrow.chatUnlocked ? (
              <ChatBox escrowId={escrow._id} currentUser={currentUser} />
            ) : (
              <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow text-center">
                <ShieldCheck className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">Chat unlocks after payment</p>
              </div>
            )
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow">
            <p className="text-sm mb-1">Amount</p>
            <p className="text-3xl font-bold">
              {formatCurrency(escrow.amount, escrow.currency)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
            <ActionButtons
              escrow={escrow}
              userRole={userRole}
              onAction={handleAction}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDeliveryModal && (
        <DeliveryModal
          escrow={escrow}
          onClose={() => setShowDeliveryModal(false)}
          onSuccess={() => fetchEscrowDetails(true)}
        />
      )}

      {showDisputeModal && (
        <DisputeModal
          escrow={escrow}
          onClose={() => setShowDisputeModal(false)}
          onSuccess={() => fetchEscrowDetails(true)}
        />
      )}
    </div>
  );
};

export default EscrowDetailsPage;