import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Loader, AlertCircle, Mail, ExternalLink, RefreshCw, Info } from 'lucide-react';
import profileService from '../../services/profileService';
import toast from 'react-hot-toast';

const KYCTab = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [verificationUrl, setVerificationUrl] = useState(null);
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    if (!statusChecked) {
      fetchKYCStatus();
      setStatusChecked(true);
    }
  }, [statusChecked]);

  const fetchKYCStatus = async () => {
    try {
      const response = await profileService.checkKYCStatus();
      if (response.success) {
        setKycStatus(response.data);
        if (response.data.verificationUrl) {
          setVerificationUrl(response.data.verificationUrl);
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
      setKycStatus({ status: 'unverified' });
    }
  };

  const startVerification = async () => {
    try {
      setLoading(true);
      const response = await profileService.startKYCVerification();
      
      if (response.success) {
        window.location.href = response.data.verificationUrl;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start verification');
      setLoading(false);
    }
  };

  const resetVerification = async () => {
    if (!window.confirm('Reset KYC verification and start over?')) return;

    try {
      setResetting(true);
      const response = await profileService.resetKYCVerification();
      
      if (response.success) {
        toast.success('Verification reset! You can start fresh now.');
        setStatusChecked(false);
        setVerificationUrl(null);
      }
    } catch (error) {
      toast.error('Failed to reset verification');
    } finally {
      setResetting(false);
    }
  };

  // Email not verified
  if (!user?.verified) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <Mail className="w-8 h-8 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Email Verification Required
            </h3>
            <p className="text-red-700 dark:text-red-300">
              Please verify your email before starting KYC verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Approved
  if (kycStatus?.status === 'approved') {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-xl font-semibold text-green-900 dark:text-green-200">
              ✅ Verification Complete!
            </h3>
            <p className="text-green-700 dark:text-green-300">
              Your identity has been verified successfully
            </p>
            {kycStatus.verifiedAt && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Verified on {new Date(kycStatus.verifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // In Progress
  if (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
              Verification In Progress
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              Your verification is being reviewed
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {verificationUrl && (
            <button
              onClick={() => window.location.href = verificationUrl}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ExternalLink className="w-5 h-5" />
              Continue
            </button>
          )}
          
          <button
            onClick={resetVerification}
            disabled={resetting}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {resetting ? <Loader className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // Rejected
  if (kycStatus?.status === 'rejected' || kycStatus?.status === 'expired') {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
                Verification Failed
              </h3>
              <p className="text-red-700 dark:text-red-300">
                {kycStatus.rejectionReason || 'Could not complete verification'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={startVerification}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {loading ? 'Starting...' : 'Try Again'}
        </button>
      </div>
    );
  }

  // Unverified - Start
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
      <AlertCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Verify Your Identity
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Complete identity verification in minutes
      </p>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6 text-left">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
          What you'll need:
        </h4>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            Valid government-issued ID
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            Device with camera
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            5-10 minutes
          </li>
        </ul>
      </div>

      <button
        onClick={startVerification}
        disabled={loading}
        className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 mx-auto"
      >
        {loading ? (
          <>
            <Loader className="w-6 h-6 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <CheckCircle className="w-6 h-6" />
            Start Verification
          </>
        )}
      </button>
    </div>
  );
};

export default KYCTab;