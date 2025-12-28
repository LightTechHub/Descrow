// src/pages/Profile/KYCTab.jsx
// =============================================================================

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Clock, Loader, AlertCircle, Mail, 
  ExternalLink, RefreshCw, Info, Shield, Zap, Award, Building2 
} from 'lucide-react';
import profileService from '../../services/profileService';
import toast from 'react-hot-toast';

const KYCTab = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [verificationUrl, setVerificationUrl] = useState(null);
  const [statusChecked, setStatusChecked] = useState(false);

  // ✅ Determine if business account
  const isBusinessAccount = user?.accountType === 'business';

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
        toast.success(
          isBusinessAccount 
            ? 'Starting business verification...' 
            : 'Starting identity verification...'
        );
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
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
            <Mail className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">
              Email Verification Required
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
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
      <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-6 mb-6">
          <div className="p-4 bg-green-100 dark:bg-green-900/40 rounded-lg">
            {isBusinessAccount ? (
              <Building2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            ) : (
              <Award className="w-12 h-12 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-1">
              ✅ {isBusinessAccount ? 'Business' : 'Identity'} Verified!
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-1">
              {isBusinessAccount 
                ? 'Your business has been verified successfully'
                : 'Your identity has been verified successfully'
              }
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                {isBusinessAccount ? 'Business Transactions' : 'Unlimited Transactions'}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isBusinessAccount ? 'Process business payments' : 'No transaction limits'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Priority Support</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">24/7 dedicated help</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              {isBusinessAccount ? (
                <Building2 className="w-5 h-5 text-green-600" />
              ) : (
                <Award className="w-5 h-5 text-green-600" />
              )}
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Verified Badge</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Increased trust</p>
          </div>
        </div>

        {/* ✅ Show business info if business account */}
        {isBusinessAccount && user.businessInfo && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Verified Business Information
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {user.businessInfo.companyName && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Company:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {user.businessInfo.companyName}
                  </span>
                </div>
              )}
              {user.businessInfo.industry && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Industry:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {user.businessInfo.industry}
                  </span>
                </div>
              )}
              {user.businessInfo.registrationNumber && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Registration:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {user.businessInfo.registrationNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // In Progress
  if (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-6 mb-6">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mb-1">
              {isBusinessAccount ? 'Business Verification' : 'Verification'} In Progress
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              Your {isBusinessAccount ? 'business' : 'identity'} verification is being reviewed
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300 mb-2">
            <span className="font-medium">Estimated time remaining</span>
            <span className="font-bold">24-48 hours</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
        
        <div className="flex gap-3">
          {verificationUrl && (
            <button
              onClick={() => window.location.href = verificationUrl}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              <ExternalLink className="w-5 h-5" />
              Continue Verification
            </button>
          )}
          
          <button
            onClick={resetVerification}
            disabled={resetting}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold disabled:opacity-50"
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
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-1">
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
          className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-lg"
        >
          {loading ? 'Starting...' : 'Try Again'}
        </button>
      </div>
    );
  }

  // Unverified - Start
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 shadow-sm">
      <div className="text-center mb-8">
        <div className="inline-flex p-6 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-6">
          {isBusinessAccount ? (
            <Building2 className="w-16 h-16 text-blue-600 dark:text-blue-400" />
          ) : (
            <Shield className="w-16 h-16 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isBusinessAccount ? 'Verify Your Business' : 'Verify Your Identity'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {isBusinessAccount 
            ? 'Complete business verification to unlock full escrow features'
            : 'Complete identity verification in minutes'
          }
        </p>

        {/* ✅ Account type indicator */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
          {isBusinessAccount ? (
            <>
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Business Account Verification
              </span>
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Individual Account Verification
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* What you'll need */}
      <div className={`${
        isBusinessAccount 
          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' 
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      } rounded-lg p-6 mb-8 border`}>
        <h4 className={`font-bold mb-4 flex items-center gap-2 ${
          isBusinessAccount 
            ? 'text-purple-900 dark:text-purple-200' 
            : 'text-blue-900 dark:text-blue-200'
        }`}>
          <Info className="w-5 h-5" />
          What you'll need:
        </h4>
        <ul className="space-y-3">
          {isBusinessAccount ? (
            // Business requirements
            <>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-900 dark:text-purple-200">Business Registration Documents</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Certificate of incorporation or business license</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-900 dark:text-purple-200">Business Owner ID</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Government-issued ID of business owner/director</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-900 dark:text-purple-200">Business Proof of Address</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Utility bill or bank statement for business address</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-900 dark:text-purple-200">10-15 minutes</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Business verification process</p>
                </div>
              </li>
            </>
          ) : (
            // Individual requirements
            <>
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
            </>
          )}
        </ul>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-2">🔓</div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {isBusinessAccount ? 'Business Escrow' : 'Unlimited Transactions'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-2">⚡</div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Priority Support</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-2">{isBusinessAccount ? '🏢' : '✅'}</div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {isBusinessAccount ? 'Business Badge' : 'Verified Badge'}
          </p>
        </div>
      </div>

      <button
        onClick={startVerification}
        disabled={loading}
        className={`w-full px-8 py-4 ${
          isBusinessAccount 
            ? 'bg-purple-600 hover:bg-purple-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white rounded-lg font-bold text-lg transition shadow-lg flex items-center justify-center gap-3`}
      >
        {loading ? (
          <>
            <Loader className="w-6 h-6 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            {isBusinessAccount ? (
              <Building2 className="w-6 h-6" />
            ) : (
              <Shield className="w-6 h-6" />
            )}
            Start {isBusinessAccount ? 'Business' : 'Identity'} Verification
          </>
        )}
      </button>

      {/* Security Note */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-1">Your privacy is protected</p>
          <p>
            We use bank-level encryption to protect your {isBusinessAccount ? 'business' : 'personal'} information. 
            Your data is securely stored and never shared without your consent.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KYCTab;