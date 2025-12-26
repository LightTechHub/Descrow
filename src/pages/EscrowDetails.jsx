// File: src/pages/EscrowDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, Loader, Copy, CheckCircle, Clock, ShieldCheck,
  MessageCircle, FileText, RefreshCw, XCircle, Users, Target, Calendar,
  Package, AlertTriangle, CheckCircle2, TrendingUp, Award
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

  const getMilestoneStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock },
      in_progress: { text: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
      submitted: { text: 'Submitted', color: 'bg-purple-100 text-purple-700', icon: FileText },
      approved: { text: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      rejected: { text: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
      paid: { text: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: Award }
    };
    return badges[status] || badges.pending;
  };

  const getParticipantRoleBadge = (role) => {
    const roles = {
      buyer: { text: 'Buyer', color: 'bg-blue-100 text-blue-700' },
      seller: { text: 'Seller', color: 'bg-green-100 text-green-700' },
      agent: { text: 'Agent', color: 'bg-purple-100 text-purple-700' },
      arbitrator: { text: 'Arbitrator', color: 'bg-orange-100 text-orange-700' },
      inspector: { text: 'Inspector', color: 'bg-indigo-100 text-indigo-700' },
      shipper: { text: 'Shipper', color: 'bg-pink-100 text-pink-700' }
    };
    return roles[role] || { text: role, color: 'bg-gray-100 text-gray-700' };
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
  const hasMilestones = escrow.milestones && escrow.milestones.length > 0;
  const hasMultipleParticipants = escrow.participants && escrow.participants.length > 2;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </button>

          <button
            onClick={() => fetchEscrowDetails(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Status Card */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{escrow.title}</h1>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleCopyId}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition text-sm"
                  >
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      #{escrow.escrowId || escrow._id.slice(-6)}
                    </span>
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${statusInfo.color}`}>
                    {statusInfo.icon && <statusInfo.icon className="w-4 h-4 inline mr-1" />}
                    {statusInfo.text}
                  </span>

                  {escrow.transactionType && (
                    <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                      {escrow.transactionType.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <StatusStepper currentStatus={escrow.status} timeline={escrow.timeline} />
          </div>

          {/* Milestones Card */}
          {hasMilestones && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Project Milestones ({escrow.completedMilestones || 0}/{escrow.milestones.length})
              </h2>

              <div className="space-y-4">
                {escrow.milestones.map((milestone, index) => {
                  const statusBadge = getMilestoneStatusBadge(milestone.status);
                  const StatusIcon = statusBadge.icon;
                  const isCompleted = ['approved', 'paid'].includes(milestone.status);
                  const isCurrent = index === escrow.currentMilestone;

                  return (
                    <div
                      key={milestone.id || index}
                      className={`border-2 rounded-xl p-5 transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : isCompleted
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            isCompleted ? 'bg-green-600 text-white' : 
                            isCurrent ? 'bg-blue-600 text-white' : 
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                              {milestone.title}
                            </h3>
                            {milestone.dueDate && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Due: {formatDate(milestone.dueDate)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1 ${statusBadge.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusBadge.text}
                          </span>
                          <span className="font-bold text-lg text-gray-900 dark:text-white">
                            {formatCurrency(milestone.amount, escrow.currency)}
                          </span>
                        </div>
                      </div>

                      {milestone.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-3">{milestone.description}</p>
                      )}

                      {milestone.deliverables && milestone.deliverables.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Deliverables:</p>
                          <ul className="space-y-1">
                            {milestone.deliverables.map((deliverable, idx) => (
                              <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                                {deliverable}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {milestone.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Rejection Reason:</p>
                          <p className="text-sm text-red-600 dark:text-red-400">{milestone.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Participants Card */}
          {hasMultipleParticipants && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                Participants ({escrow.participants.length})
              </h2>

              <div className="space-y-3">
                {escrow.participants.map((participant, index) => {
                  const roleBadge = getParticipantRoleBadge(participant.role);
                  const user = participant.user;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {user?.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{user?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${roleBadge.color}`}>
                          {roleBadge.text}
                        </span>
                        
                        {participant.status === 'accepted' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : participant.status === 'invited' ? (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              {['details', 'timeline', 'attachments', 'chat'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 px-6 font-semibold capitalize transition ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {escrow.description || 'No description provided'}
                    </p>
                  </div>

                  {escrow.metadata && Object.keys(escrow.metadata).length > 0 && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Transaction Details</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(escrow.metadata).map(([key, value]) => (
                          <div key={key} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{key.replace('_', ' ')}:</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {escrow.terms?.customTerms && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Custom Terms</h3>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {escrow.terms.customTerms}
                      </p>
                    </div>
                  )}

                  {escrow.delivery?.shippingAddress && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Shipping Address
                      </h3>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300">
                          {escrow.delivery.shippingAddress.street}<br />
                          {escrow.delivery.shippingAddress.city}, {escrow.delivery.shippingAddress.state} {escrow.delivery.shippingAddress.zipCode}<br />
                          {escrow.delivery.shippingAddress.country}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-3">
                  {escrow.timeline && escrow.timeline.length > 0 ? (
                    escrow.timeline.map((event, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                          </div>
                          {index < escrow.timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <p className="font-semibold text-gray-900 dark:text-white capitalize">
                            {event.status.replace('_', ' ')}
                          </p>
                          {event.note && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.note}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatDate(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No timeline events yet</p>
                  )}
                </div>
              )}

              {activeTab === 'attachments' && (
                <div>
                  {escrow.attachments && escrow.attachments.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {escrow.attachments.map((file, index) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{file.originalName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{formatDate(file.uploadedAt)}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No attachments</p>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                escrow.chatUnlocked ? (
                  <ChatBox escrowId={escrow._id} currentUser={currentUser} />
                ) : (
                  <div className="text-center py-12">
                    <ShieldCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Chat will unlock after payment is made</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Amount Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
            <p className="text-blue-100 text-sm mb-2">Transaction Amount</p>
            <p className="text-4xl font-bold mb-4">
              {formatCurrency(escrow.amount, escrow.currency)}
            </p>
            
            {escrow.currencyType && (
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium">
                {escrow.currencyType === 'crypto' ? '₿ Cryptocurrency' : '💵 Fiat Currency'}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
            <ActionButtons
              escrow={escrow}
              userRole={userRole}
              onAction={handleAction}
              onRefresh={() => fetchEscrowDetails(true)}
            />
          </div>

          {/* Participants Summary */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Buyer:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {escrow.buyer?.name || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Seller:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {escrow.seller?.name || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(escrow.createdAt)}
                </span>
              </div>
              {hasMilestones && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Milestones:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {escrow.completedMilestones}/{escrow.milestones.length}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Warning/Info Box */}
          {escrow.dispute?.isDisputed && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-200">Dispute Active</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    This escrow is currently under dispute resolution
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showDeliveryModal && (
        <DeliveryModal
          escrow={escrow}
          onClose={() => setShowDeliveryModal(false)}
          onSuccess={() => {
            setShowDeliveryModal(false);
            fetchEscrowDetails(true);
          }}
        />
      )}

      {showDisputeModal && (
        <DisputeModal
          escrow={escrow}
          onClose={() => setShowDisputeModal(false)}
          onSuccess={() => {
            setShowDisputeModal(false);
            fetchEscrowDetails(true);
          }}
        />
      )}
    </div>
  );
};

export default EscrowDetailsPage;