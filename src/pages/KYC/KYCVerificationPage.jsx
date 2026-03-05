// src/pages/KYC/KYCVerificationPage.jsx - UPDATED FOR HYBRID SYSTEM
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, CheckCircle, AlertTriangle, Loader, 
  User, ArrowRight, RefreshCw, Building,
  Upload, FileText, Globe, XCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import BusinessKYCUpload from '../../components/BusinessKYCUpload';

const KYCVerificationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [kycData, setKycData] = useState(null);
  const [user, setUser] = useState(null);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const DIDIT_SUPPORTED_COUNTRIES = [
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
    'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'AT', 'PT', 'LU'
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        determineVerificationMethod(parsedUser);
      } catch (error) {
        console.error('Failed to parse user:', error);
      }
    }
    fetchKYCStatus();
  }, []);

  const determineVerificationMethod = (userData) => {
    const accountType = userData?.accountType || 'individual';
    const country = userData?.address?.country || userData?.businessInfo?.country;

    if (accountType === 'individual') {
      setVerificationMethod('didit');
    } else if (accountType === 'business') {
      const countryCode = getCountryCode(country);
      if (countryCode && DIDIT_SUPPORTED_COUNTRIES.includes(countryCode)) {
        setVerificationMethod('didit');
      } else {
        setVerificationMethod('manual');
      }
    }
  };

  const getCountryCode = (countryName) => {
    const countryMap = {
      'United States': 'US', 'USA': 'US',
      'United Kingdom': 'GB', 'UK': 'GB',
      'Canada': 'CA', 'Australia': 'AU',
      'Germany': 'DE', 'France': 'FR',
      'Italy': 'IT', 'Spain': 'ES',
      'Netherlands': 'NL', 'Belgium': 'BE',
      'Switzerland': 'CH', 'Sweden': 'SE',
      'Norway': 'NO', 'Denmark': 'DK',
      'Finland': 'FI', 'Ireland': 'IE',
      'Austria': 'AT', 'Portugal': 'PT',
      'Luxembourg': 'LU', 'Nigeria': 'NG',
      'Ghana': 'GH', 'Kenya': 'KE',
      'South Africa': 'ZA'
    };
    return countryMap[countryName] || null;
  };

  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const data = response.data.data;
        setKycData(data);

        if (data.verificationMethod === 'manual' && data.status === 'pending_documents') {
          setShowManualUpload(true);
        }

        if (data.isKYCVerified) {
          toast.success(`${data.accountType === 'business' ? 'Business' : 'Identity'} verification complete!`);
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
        const data = response.data.data;

        if (data.verificationType === 'manual') {
          toast.success('Please upload your business documents');
          setShowManualUpload(true);
          setKycData(prev => ({
            ...prev,
            status: 'pending_documents',
            verificationMethod: 'manual'
          }));
        } else {
          if (data.verificationUrl) {
            toast.success(`Redirecting to ${data.accountType === 'business' ? 'business' : 'identity'} verification...`);
            window.location.href = data.verificationUrl;
          } else {
            toast.error('No verification URL received');
          }
        }
      }
    } catch (error) {
      console.error('Initiate KYC error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to start verification';
      toast.error(errorMsg);
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
      setKycData(prev => ({ ...prev, status: 'unverified' }));
      setShowManualUpload(false);
      await handleStartVerification();
    } catch (error) {
      console.error('Retry KYC error:', error);
      toast.error('Failed to retry KYC');
    } finally {
      setInitiating(false);
    }
  };

  const handleUploadSuccess = (responseData) => {
    toast.success('Documents uploaded successfully! Under review.');
    setShowManualUpload(false);
    setKycData(prev => ({
      ...prev,
      status: 'under_review',
      verificationMethod: 'manual',
      documents: responseData?.data?.documents || []
    }));
    setTimeout(() => fetchKYCStatus(), 2000);
  };

  const handleCancelUpload = () => {
    setShowManualUpload(false);
  };

  const getUserCountry = () => {
    return user?.address?.country || user?.businessInfo?.country || 'Unknown';
  };

  const isDiDITSupportedForBusiness = () => {
    if (!user || user.accountType !== 'business') return false;
    const country = getUserCountry();
    const countryCode = getCountryCode(country);
    return countryCode && DIDIT_SUPPORTED_COUNTRIES.includes(countryCode);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const isBusinessAccount = user?.accountType === 'business' || kycData?.accountType === 'business';
  const businessName = user?.businessInfo?.companyName;
  const userCountry = getUserCountry();
  const isDiDITSupported = isDiDITSupportedForBusiness();

  // ── Show upload form for: pending_documents, rejected, or manually triggered ──
  if (showManualUpload || kycData?.status === 'pending_documents' || kycData?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Rejection notice */}
          {kycData?.status === 'rejected' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100">KYC Rejected — Please Re-upload</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {kycData?.rejectionReason || 'Your documents were rejected. Please upload correct documents below.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={handleCancelUpload}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Verification
            </button>
          </div>

          <BusinessKYCUpload
            user={user}
            onSuccess={handleUploadSuccess}
            onCancel={handleCancelUpload}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-2xl shadow-lg ${
              isBusinessAccount
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                : 'bg-gradient-to-br from-green-600 to-emerald-600'
            }`}>
              {isBusinessAccount
                ? <Building className="w-10 h-10 text-white" />
                : <Shield className="w-10 h-10 text-white" />
              }
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isBusinessAccount ? 'Business Verification' : 'Identity Verification'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            {isBusinessAccount
              ? `Verify ${businessName || 'your business'} to access business features`
              : 'Verify your identity to access all platform features'
            }
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Globe className="w-4 h-4" />
              <span>Country: {userCountry}</span>
            </div>

            {isBusinessAccount && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${
                isDiDITSupported
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {isDiDITSupported ? (
                  <><CheckCircle className="w-4 h-4" /><span>Auto Verification Available</span></>
                ) : (
                  <><Upload className="w-4 h-4" /><span>Manual Document Upload Required</span></>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Status Banners ── */}

        {/* Approved */}
        {kycData?.status === 'approved' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-green-900 dark:text-green-100 mb-1">Verification Approved ✓</h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your {isBusinessAccount ? 'business' : 'identity'} has been verified. You have full access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Under Review */}
        {kycData?.status === 'under_review' && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Loader className="w-6 h-6 text-purple-600 animate-spin flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-2">Under Review</h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-1">
                  Your documents are being reviewed by our team. This usually takes 1-3 business days.
                </p>
                {kycData?.reviewDeadline && (
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Expected by: {new Date(kycData.reviewDeadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending DiDIT */}
        {kycData?.status === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Loader className="w-6 h-6 text-yellow-600 animate-spin flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-2">Verification Pending</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  Please complete the verification process with our partner.
                </p>
                {kycData.verificationUrl && (
                  <a
                    href={kycData.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition"
                  >
                    Continue Verification <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* In Progress */}
        {kycData?.status === 'in_progress' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Loader className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Verification In Progress</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Your verification is being processed. We'll notify you when complete.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expired */}
        {kycData?.status === 'expired' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-orange-900 dark:text-orange-100 mb-2">Session Expired</h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  Your verification session has expired. Please start again.
                </p>
                <button
                  onClick={handleRetry}
                  disabled={initiating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restart Verification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mt-6">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Verification Process
            </h3>

            {isBusinessAccount && !isDiDITSupported ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { n: 1, icon: <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />, title: 'Upload Documents', desc: 'Submit required business documents' },
                  { n: 2, icon: <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />, title: 'Manual Review', desc: 'Expert review (1-3 business days)' },
                  { n: 3, icon: <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />, title: 'Get Verified', desc: 'Access business features & escrow services' },
                ].map(({ n, icon, title, desc }) => (
                  <div key={n} className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">{n}</div>
                    {icon}
                    <p className="font-medium text-gray-900 dark:text-white mb-1">{title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { n: 1, title: 'Start Verification', desc: isBusinessAccount ? 'Begin business verification' : 'Begin identity verification' },
                  { n: 2, title: isBusinessAccount ? 'Complete Checks' : 'Submit Documents', desc: isBusinessAccount ? 'Automated business checks' : 'Secure document submission' },
                  { n: 3, title: 'Get Verified', desc: isBusinessAccount ? 'Access business features' : 'Access all platform features' },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">{n}</div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">{title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {(kycData?.status === 'unverified' || !kycData?.status || kycData?.status === 'pending_documents') && (
              <>
                {isBusinessAccount && !isDiDITSupported ? (
                  <button
                    onClick={() => setShowManualUpload(true)}
                    disabled={initiating}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Business Documents
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartVerification}
                    disabled={initiating}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {initiating ? (
                      <><Loader className="w-5 h-5 animate-spin" /> Starting Verification...</>
                    ) : (
                      <>{isBusinessAccount ? <Building className="w-5 h-5" /> : <Shield className="w-5 h-5" />} Start {isBusinessAccount ? 'Business' : 'Identity'} Verification <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                )}
              </>
            )}

            {/* Retry button for expired */}
            {kycData?.status === 'expired' && (
              <button
                onClick={handleRetry}
                disabled={initiating}
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Restart Verification
              </button>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {kycData?.status === 'unverified' ? 'Skip for Now' : 'Back to Dashboard'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
            ⏱️ {isBusinessAccount
              ? (isDiDITSupported
                  ? 'Business verification usually takes 5-15 minutes'
                  : 'Business verification usually takes 1-3 business days')
              : 'Identity verification usually takes 5-10 minutes'
            }
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help?{' '}
            <a href="mailto:support@dealcross.net" className="text-blue-600 hover:underline dark:text-blue-400">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default KYCVerificationPage;
