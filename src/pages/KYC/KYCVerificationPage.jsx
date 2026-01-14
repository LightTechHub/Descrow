// src/pages/KYC/KYCVerificationPage.jsx - UPDATED FOR HYBRID SYSTEM
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, CheckCircle, AlertTriangle, Loader, 
  User, ArrowRight, RefreshCw, Building,
  Upload, FileText, Globe
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import BusinessKYCUpload from '../../components/BusinessKYCUpload'; // Import the upload component

const KYCVerificationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [kycData, setKycData] = useState(null);
  const [user, setUser] = useState(null);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState(null); // 'didit' or 'manual'

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // ✅ List of countries where DiDIT business verification works
  const DIDIT_SUPPORTED_COUNTRIES = [
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
    'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'AT', 'PT', 'LU'
  ];

  useEffect(() => {
    // ✅ Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Determine verification method based on user data
        determineVerificationMethod(parsedUser);
      } catch (error) {
        console.error('Failed to parse user:', error);
      }
    }
    
    fetchKYCStatus();
  }, []);

  // ✅ Determine verification method (DiDIT vs Manual)
  const determineVerificationMethod = (userData) => {
    const accountType = userData?.accountType || 'individual';
    const country = userData?.address?.country || userData?.businessInfo?.country;
    
    if (accountType === 'individual') {
      setVerificationMethod('didit'); // Always DiDIT for individuals
    } else if (accountType === 'business') {
      const countryCode = getCountryCode(country);
      if (countryCode && DIDIT_SUPPORTED_COUNTRIES.includes(countryCode)) {
        setVerificationMethod('didit'); // DiDIT for supported countries
      } else {
        setVerificationMethod('manual'); // Manual for unsupported countries
      }
    }
  };

  // ✅ Get country code from country name
  const getCountryCode = (countryName) => {
    const countryMap = {
      'United States': 'US',
      'USA': 'US',
      'United Kingdom': 'GB',
      'UK': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
      'Germany': 'DE',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Ireland': 'IE',
      'Austria': 'AT',
      'Portugal': 'PT',
      'Luxembourg': 'LU',
      'Nigeria': 'NG',
      'Ghana': 'GH',
      'Kenya': 'KE',
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
        
        // ✅ Check if manual verification already in progress
        if (data.verificationMethod === 'manual' && data.status === 'pending_documents') {
          setShowManualUpload(true);
        }
        
        // If already verified, redirect to dashboard
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
      
      console.log('🔄 Starting verification for account type:', user?.accountType);
      
      const response = await axios.post(
        `${API_URL}/kyc/initiate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const data = response.data.data;
        
        console.log('✅ Backend returned:', data);
        
        // ✅ FIXED: Handle different response types
        if (data.verificationType === 'manual') {
          // Show manual upload component
          toast.success('Please upload your business documents');
          setShowManualUpload(true);
          setKycData(prev => ({
            ...prev,
            status: 'pending_documents',
            verificationMethod: 'manual'
          }));
        } else {
          // Redirect to DiDIT verification
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

  const handleUploadSuccess = (responseData) => {
    toast.success('Documents uploaded successfully! Under review.');
    setShowManualUpload(false);
    
    // Update local KYC status
    setKycData(prev => ({
      ...prev,
      status: 'under_review',
      verificationMethod: 'manual',
      documents: responseData?.data?.documents || []
    }));
    
    // Refresh status after delay
    setTimeout(() => {
      fetchKYCStatus();
    }, 2000);
  };

  const handleCancelUpload = () => {
    setShowManualUpload(false);
  };

  // ✅ Get user's country
  const getUserCountry = () => {
    return user?.address?.country || user?.businessInfo?.country || 'Unknown';
  };

  // ✅ Check if user's country supports DiDIT business verification
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

  // ✅ Show manual upload component if needed
  if (showManualUpload || (kycData?.status === 'pending_documents' && kycData?.verificationMethod === 'manual')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-6xl mx-auto">
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

  // ✅ Determine if business account
  const isBusinessAccount = user?.accountType === 'business' || kycData?.accountType === 'business';
  const businessName = user?.businessInfo?.companyName;
  const userCountry = getUserCountry();
  const isDiDITSupported = isDiDITSupportedForBusiness();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header - DYNAMIC BASED ON ACCOUNT TYPE & METHOD */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-2xl shadow-lg ${
              isBusinessAccount 
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600' 
                : 'bg-gradient-to-br from-green-600 to-emerald-600'
            }`}>
              {isBusinessAccount ? (
                <Building className="w-10 h-10 text-white" />
              ) : (
                <Shield className="w-10 h-10 text-white" />
              )}
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
          
          {/* Country & Method Info */}
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
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Auto Verification Available</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Manual Document Upload Required</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Banners */}
        {kycData?.status === 'pending' && verificationMethod === 'didit' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Loader className="w-6 h-6 text-yellow-600 animate-spin flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                  {isBusinessAccount ? 'Business' : 'Identity'} Verification Pending
                </h3>
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
                    Continue Verification
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {kycData?.status === 'pending_documents' && verificationMethod === 'manual' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Upload className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                  Documents Required for Manual Review
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Please upload your business documents for manual verification.
                </p>
                <button
                  onClick={() => setShowManualUpload(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Documents Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing status banners (rejected, expired, in_progress) remain the same... */}
        {/* [Keep all your existing status banner code from lines 147-237] */}

        {/* Process Steps - DYNAMIC BASED ON VERIFICATION METHOD */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mt-6">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Verification Process
            </h3>
            
            {isBusinessAccount && !isDiDITSupported ? (
              // MANUAL BUSINESS VERIFICATION STEPS
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    1
                  </div>
                  <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Upload Documents</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Submit required business documents
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    2
                  </div>
                  <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Manual Review</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Expert review (1-3 business days)
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    3
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Get Verified</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Access business features & escrow services
                  </p>
                </div>
              </div>
            ) : (
              // DIET OR INDIVIDUAL VERIFICATION STEPS
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    1
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Start Verification</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {isBusinessAccount ? 'Begin business verification' : 'Begin identity verification'}
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    2
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    {isBusinessAccount ? 'Complete Checks' : 'Submit Documents'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {isBusinessAccount ? 'Automated business checks' : 'Secure document submission'}
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    3
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Get Verified</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {isBusinessAccount ? 'Access business features' : 'Access all platform features'}
                  </p>
                </div>
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
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Business Documents
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartVerification}
                    disabled={initiating}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {initiating ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Starting {isBusinessAccount ? 'Business' : 'Identity'} Verification...
                      </>
                    ) : (
                      <>
                        {isBusinessAccount ? <Building className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                        Start {isBusinessAccount ? 'Business' : 'Identity'} Verification
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {kycData?.status === 'unverified' ? 'Skip for Now' : 'Back to Dashboard'}
            </button>
          </div>

          {/* Estimated Time */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
            ⏱️ {isBusinessAccount 
              ? (isDiDITSupported 
                  ? 'Business verification usually takes 5-15 minutes' 
                  : 'Business verification usually takes 1-3 business days'
                )
              : 'Identity verification usually takes 5-10 minutes'
            }
          </p>
        </div>

        {/* Help Section */}
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