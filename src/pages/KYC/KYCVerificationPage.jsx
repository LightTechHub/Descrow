// src/pages/KYC/KYCVerificationPage.jsx - UPDATED
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, CheckCircle, AlertTriangle, Loader, 
  User, ArrowRight, RefreshCw 
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const KYCVerificationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [kycData, setKycData] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setKycData(response.data.data);
        
        // If already verified, redirect to dashboard
        if (response.data.data.isKYCVerified) {
          toast.success('KYC already verified!');
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      }
    } catch (error) {
      console.error('Fetch KYC status error:', error);
      toast.error('Failed to fetch KYC status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = async () => {
    try {
      setInitiating(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/kyc/initiate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const { verificationUrl } = response.data.data;
        
        toast.success('Redirecting to verification...');
        
        // Redirect to DiDIT verification page
        window.location.href = verificationUrl;
      }

    } catch (error) {
      console.error('Initiate KYC error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to start verification';
      toast.error(errorMsg);
      
      // If email not verified, redirect
      if (error.response?.data?.action === 'verify_email') {
        setTimeout(() => navigate('/verify-email'), 2000);
      }
    } finally {
      setInitiating(false);
    }
  };

  const handleRetry = async () => {
    try {
      setInitiating(true);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/kyc/retry`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('KYC reset. Starting new verification...');
      await handleStartVerification();

    } catch (error) {
      console.error('Retry KYC error:', error);
      toast.error('Failed to retry KYC');
    } finally {
      setInitiating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Identity Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verify your identity to access all platform features
          </p>
        </div>

        {/* Status Banners */}
        {kycData?.status === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Loader className="w-6 h-6 text-yellow-600 animate-spin flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                  Verification Pending
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  Your verification is being processed. This usually takes a few minutes.
                </p>
                {kycData.verificationUrl && (
                  
                    href={kycData.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition"
                  >
                    Continue Verification
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {kycData?.status === 'in_progress' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Loader className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                  Verification In Progress
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  We're reviewing your documents. This usually takes 1-3 business days.
                </p>
              </div>
            </div>
          </div>
        )}

        {kycData?.status === 'rejected' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 dark:text-red-100 mb-2">
                  Verification Failed
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  {kycData.rejectionReason || 'Your verification could not be completed.'}
                </p>
                <button
                  onClick={handleRetry}
                  disabled={initiating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {initiating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {kycData?.status === 'expired' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 dark:text-orange-100 mb-2">
                  Session Expired
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  Your verification session has expired. Please start a new verification.
                </p>
                <button
                  onClick={handleRetry}
                  disabled={initiating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {initiating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Start New Verification
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          
          {/* What You'll Need */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              What You'll Need
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Government-Issued ID</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Passport, driver's license, or national ID card</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Selfie for Liveness Check</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Take a photo of yourself for identity verification</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Proof of Address</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recent utility bill or bank statement (last 3 months)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Process Steps */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Verification Process
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  1
                </div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">Upload Documents</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Securely submit your documents</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  2
                </div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">AI Verification</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Automated checks within minutes</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  3
                </div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">Get Verified</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Access all platform features</p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
