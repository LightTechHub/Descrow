// File: src/pages/Profile/KYCTab.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Loader, AlertCircle, Mail, ExternalLink, RefreshCw, Info, Shield, Zap, Award } from 'lucide-react';
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
      <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-2xl">
            <Mail className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
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
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-green-100 dark:bg-green-900/40 rounded-2xl">
            <Award className="w-16 h-16 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-green-900 dark:text-green-200 mb-2">
              ✅ Verification Complete!
            </h3>
            <p className="text-green-700 dark:text-green-300 text-lg mb-2">
              Your identity has been verified successfully
            </p>
            {kycStatus.verifiedAt && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Verified on {new Date(kycStatus.verifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Unlimited Transactions</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">No transaction limits</p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Priority Support</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">24/7 dedicated help</p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Verified Badge</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Increased trust</p>
          </div>
        </div>
      </div>
    );
  }

  // In Progress
  if (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-6 mb-6">
          <div className="p-5 bg-blue-100 dark:bg-blue-900/40 rounded-2xl">
            <Clock className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-200 mb-2">
              Verification In Progress
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-lg">
              Your verification is being reviewed
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300 mb-2">
            <span className="font-medium">Estimated time remaining</span>
            <span className="font-bold">24-48 hours</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
        
        <div className="flex gap-3">
          {verificationUrl && (
            <button
              onClick={() => window.location.href = verificationUrl}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold"
            >
              <ExternalLink className="w-5 h-5" />
              Continue Verification
            </button>
          )}
          
          <button
            onClick={resetVerification}
            disabled={resetting}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition font-semibold disabled:opacity-50"
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
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-red-100 dark:bg-red-900/40 rounded-2xl">
              <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-red-900 dark:text-red-200 mb-2">
                Verification Failed
              </h3>
              <p className="text-red-700 dark:text-red-300 text-lg">
                {kycStatus.rejectionReason || 'Could not complete verification'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={startVerification}
          disabled={loading}
          className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
        >
          {loading ? 'Starting...' : 'Try Again'}
        </button>
      </div>
    );
  }

  // Unverified - Start
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="inline-flex p-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl mb-6">
          <Shield className="w-20 h-20 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Verify Your Identity
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Complete identity verification in minutes
        </p>
      </div>
      
      {/* What you'll need */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 mb-8 border border-blue-200 dark:border-blue-800">
        <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-4 text-lg flex items-center gap-2">
          <Info className="w-5 h-5" />
          What you'll need:
        </h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">Valid government-issued ID</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Passport, driver's license, or national ID card</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">Device with camera</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">For document and selfie verification</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">5-10 minutes</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Quick and easy process</p>
            </div>
          </li>
        </ul>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-2">🔓</div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Unlimited Transactions</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-2">⚡</div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Priority Support</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Verified Badge</p>
        </div>
      </div>

      <button
        onClick={startVerification}
        disabled={loading}
        className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-lg flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <Loader className="w-6 h-6 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Shield className="w-6 h-6" />
            Start Verification
          </>
        )}
      </button>

      {/* Security Note */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-1">Your privacy is protected</p>
          <p>We use bank-level encryption to protect your personal information. Your data is securely stored and never shared without your consent.</p>
        </div>
      </div>
    </div>
  );
};

export default KYCTab;