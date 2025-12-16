import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Clock, Loader, AlertCircle, Mail, ExternalLink, RefreshCw } from 'lucide-react';
import profileService from '../../services/profileService';
import toast from 'react-hot-toast';

const KYCTab = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [verificationUrl, setVerificationUrl] = useState(null);
  
  const hasFetchedKYC = useRef(false);

  useEffect(() => {
    if (!hasFetchedKYC.current) {
      hasFetchedKYC.current = true;
      fetchKYCStatus();
    }
  }, []);

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

  const handleForceSync = async () => {
    try {
      setSyncing(true);
      const response = await profileService.forceSyncKYC();
      
      if (response.success) {
        toast.success('KYC status synced successfully!');
        // Refresh the page to get updated user data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error('Failed to sync KYC status');
      }
    } catch (error) {
      console.error('Force sync error:', error);
      toast.error('Failed to sync KYC status');
    } finally {
      setSyncing(false);
    }
  };

  const startVerification = async () => {
    try {
      setLoading(true);
      const response = await profileService.startKYCVerification();
      
      if (response.success) {
        const url = response.data.verificationUrl;
        setVerificationUrl(url);
        
        if (response.data.isExisting) {
          toast.success('Continuing existing verification...');
        } else {
          toast.success('Verification session created! Redirecting...');
        }
        
        // Redirect immediately
        window.location.href = url;
        
        // Start polling (in case user comes back)
        startStatusPolling();
      }
    } catch (error) {
      console.error('Start verification error:', error);
      toast.error(error.response?.data?.message || 'Failed to start verification');
    } finally {
      setLoading(false);
    }
  };

  const resetVerification = async () => {
    if (!window.confirm('Are you sure you want to reset your KYC verification and start over?')) {
      return;
    }

    try {
      setResetting(true);
      const response = await profileService.resetKYCVerification();
      
      if (response.success) {
        toast.success('Verification reset! You can start fresh now.');
        hasFetchedKYC.current = false;
        fetchKYCStatus();
        setVerificationUrl(null);
      }
    } catch (error) {
      console.error('Reset verification error:', error);
      toast.error(error.response?.data?.message || 'Failed to reset verification');
    } finally {
      setResetting(false);
    }
  };

  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      try {
        const response = await profileService.checkKYCStatus();
        if (response.success) {
          if (response.data.status === 'approved') {
            clearInterval(interval);
            toast.success('KYC Verification completed!');
            hasFetchedKYC.current = false;
            fetchKYCStatus();
            onUpdate && onUpdate();
          } else if (response.data.status === 'rejected') {
            clearInterval(interval);
            toast.error('KYC Verification failed');
            hasFetchedKYC.current = false;
            fetchKYCStatus();
          } else if (response.data.status === 'unverified') {
            clearInterval(interval);
            hasFetchedKYC.current = false;
            fetchKYCStatus();
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 5000);

    setTimeout(() => clearInterval(interval), 600000);
  };

  // Email verification check
  if (!user?.verified) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
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

  return (
    <div className="space-y-6">
      {/* DEBUG & FORCE SYNC SECTION */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-purple-900 dark:text-purple-200">
              KYC Status Debug
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              DB Status: {kycStatus?.status} | isKYCVerified: {user?.isKYCVerified ? 'true' : 'false'}
            </p>
          </div>
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            {syncing ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Force Sync
          </button>
        </div>
      </div>

      {/* Approved */}
      {kycStatus?.status === 'approved' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="text-xl font-semibold text-green-900 dark:text-green-200">
                ✅ Verification Complete!
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Your identity has been verified successfully via Didit
              </p>
              {kycStatus.verifiedAt && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Verified on {new Date(kycStatus.verifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending/In Progress */}
      {(kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress') && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                Verification In Progress
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                Complete your verification with Didit to unlock all features
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {verificationUrl && (
              <button
                onClick={() => window.location.href = verificationUrl}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <ExternalLink className="w-5 h-5" />
                Continue Verification
              </button>
            )}
            
            <button
              onClick={resetVerification}
              disabled={resetting}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
            >
              {resetting ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Rejected */}
      {(kycStatus?.status === 'rejected' || kycStatus?.status === 'expired') && (
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
                  {kycStatus.status === 'expired' ? 'Verification Expired' : 'Verification Failed'}
                </h3>
                <p className="text-red-700 dark:text-red-300">
                  {kycStatus.rejectionReason || 'Your verification could not be completed'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={startVerification}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Starting...' : 'Try Again'}
          </button>
        </div>
      )}

      {/* Unverified - Start verification */}
      {(!kycStatus?.status || kycStatus?.status === 'unverified') && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Your Identity
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Complete automatic identity verification in minutes using Didit
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6 text-left">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
              What you'll need:
            </h4>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                Valid government-issued ID (Passport, Driver's License, or National ID)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                A device with a camera for liveness check
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                5-10 minutes of your time
              </li>
            </ul>
          </div>

          <button
            onClick={startVerification}
            disabled={loading}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Starting Verification...
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                Start Verification
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Powered by Didit • Secure & Encrypted
          </p>
        </div>
      )}
    </div>
  );
};

export default KYCTab;