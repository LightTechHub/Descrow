import React, { useState } from 'react';
import { 
  Check, 
  CreditCard, 
  Package, 
  AlertCircle, 
  X, 
  Loader 
} from 'lucide-react';
import { getNextAction } from 'utils/escrowHelpers';

const ActionButtons = ({ escrow, userRole, onAction, hideFundButton }) => {
  const [loading, setLoading] = useState(false);
  const nextAction = getNextAction(escrow, userRole);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await onAction(action);
    } finally {
      setLoading(false);
    }
  };

  const getActionButton = () => {
    const { status } = escrow;

    if (userRole === 'buyer') {
      switch (status) {
        case 'pending':
          return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="font-medium">Waiting for seller to accept...</span>
              </div>
            </div>
          );

        case 'accepted':
          if (hideFundButton) return null;
          return (
            <button
              onClick={() => handleAction('fund')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : (
                <><CreditCard className="w-5 h-5" />Pay Now</>
              )}
            </button>
          );

        case 'funded':
          return (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="font-medium">Waiting for seller to deliver...</span>
              </div>
            </div>
          );

        case 'delivered':
          return (
            <button
              onClick={() => handleAction('confirm')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : (
                <><Check className="w-5 h-5" />Confirm Receipt</>
              )}
            </button>
          );

        case 'completed':
        case 'paid_out':
          return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Check className="w-5 h-5" />
                <span className="font-medium">Transaction completed successfully!</span>
              </div>
            </div>
          );

        default:
          return null;
      }
    }

    if (userRole === 'seller') {
      switch (status) {
        case 'pending':
          return (
            <div className="space-y-3">
              <button
                onClick={() => handleAction('accept')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : (
                  <><Check className="w-5 h-5" />Accept Deal</>
                )}
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5" />
                Decline
              </button>
            </div>
          );

        case 'accepted':
          return (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="font-medium">Waiting for buyer payment...</span>
              </div>
            </div>
          );

        case 'funded':
          return (
            <button
              onClick={() => handleAction('deliver')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : (
                <><Package className="w-5 h-5" />Mark as Delivered</>
              )}
            </button>
          );

        case 'delivered':
          return (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="font-medium">Waiting for buyer confirmation...</span>
              </div>
            </div>
          );

        case 'completed':
          return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Check className="w-5 h-5" />
                <span className="font-medium">Funds added to your wallet!</span>
              </div>
              <a
                href="/wallet"
                className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition text-sm"
              >
                View Wallet & Withdraw
              </a>
            </div>
          );

        case 'paid_out':
          return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Check className="w-5 h-5" />
                <span className="font-medium">Payment received!</span>
              </div>
            </div>
          );

        default:
          return null;
      }
    }

    return null;
  };

  const canCancel = ['pending', 'accepted'].includes(escrow.status);
  const canDispute = ['funded', 'delivered'].includes(escrow.status);

  return (
    <div className="space-y-4">
      {getActionButton()}
      <div className="flex gap-3">
        {canCancel && (
          <button
            onClick={() => handleAction('cancel')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
        {canDispute && !escrow.dispute?.isDisputed && (
          <button
            onClick={() => handleAction('dispute')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
          >
            <AlertCircle className="w-4 h-4" />
            Raise Dispute
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionButtons;
