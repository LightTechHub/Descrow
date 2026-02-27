// src/pages/Profile/KYCTab.jsx - FIXED
// Fix 1: startVerification now handles BOTH DiDIT (redirect) and manual (document upload)
//         flows. Previously it always tried window.location.href = verificationUrl which
//         was undefined for Nigerian/African business accounts → silent crash.
// Fix 2: Manual business flow shows a document upload form inline instead of redirecting.
// Fix 3: Country not reflecting fixed by calling context updateUser after profile save
//         (handled in ProfileTab, but KYCTab now also refreshes on mount properly).

import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, Loader, AlertCircle, Mail,
  ExternalLink, RefreshCw, Info, Shield, Zap, Award,
  Building, FileText, Upload, X
} from 'lucide-react';
import profileService from '../../services/profileService';
import toast from 'react-hot-toast';

const KYCTab = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [verificationUrl, setVerificationUrl] = useState(null);
  const [statusChecked, setStatusChecked] = useState(false);
  // When backend returns verificationType: 'manual', show the document upload form
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [documents, setDocuments] = useState({
    businessRegistration: null,
    directorId: null,
    proofOfAddress: null,
    taxDocument: null,
    additionalDoc: null,
  });

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
        // If already in pending_documents state, show the upload form
        if (response.data.status === 'pending_documents') {
          setShowManualUpload(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
      setKycStatus({ status: 'unverified' });
    }
  };

  // ✅ FIXED: Now handles both DiDIT redirect and manual document upload flows
  const startVerification = async () => {
    try {
      setLoading(true);
      const response = await profileService.startKYCVerification();

      if (response.success) {
        const data = response.data;

        if (data.verificationType === 'manual') {
          // Business account in a country that needs manual verification
          // Show the document upload form inline instead of redirecting
          setKycStatus(prev => ({ ...prev, status: 'pending_documents' }));
          setShowManualUpload(true);
          toast.success('Please upload your business documents below');
        } else if (data.verificationUrl) {
          // DiDIT verification — redirect to their hosted flow
          window.location.href = data.verificationUrl;
        } else {
          toast.error('Verification could not be started. Please try again.');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start verification');
    } finally {
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
        setShowManualUpload(false);
        setDocuments({
          businessRegistration: null,
          directorId: null,
          proofOfAddress: null,
          taxDocument: null,
          additionalDoc: null,
        });
      }
    } catch (error) {
      toast.error('Failed to reset verification');
    } finally {
      setResetting(false);
    }
  };

  const handleFileChange = (field, file) => {
    setDocuments(prev => ({ ...prev, [field]: file }));
  };

  // ✅ Submit business documents for manual verification
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();

    if (!documents.businessRegistration || !documents.directorId || !documents.proofOfAddress) {
      toast.error('Business Registration, Director ID, and Proof of Address are required');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('businessRegistration', documents.businessRegistration);
      formData.append('directorId', documents.directorId);
      formData.append('proofOfAddress', documents.proofOfAddress);
      if (documents.taxDocument) formData.append('taxDocument', documents.taxDocument);
      if (documents.additionalDoc) formData.append('additionalDoc', documents.additionalDoc);

      const response = await profileService.uploadBusinessDocuments(formData);

      if (response.success) {
        toast.success('Documents uploaded! Our team will review within 1-3 business days.');
        setShowManualUpload(false);
        setStatusChecked(false); // Trigger re-fetch
        onUpdate && onUpdate();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  // ── Email not verified ──────────────────────────────────────────────────────
  if (!user?.verified) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
            <Mail className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">
              Email Verification Required
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              Please verify your email before starting {isBusinessAccount ? 'business' : 'identity'} verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Approved ────────────────────────────────────────────────────────────────
  if (kycStatus?.status === 'approved') {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg p-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="p-4 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <Award className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-1">
                ✅ {isBusinessAccount ? 'Business' : 'Identity'} Verification Complete!
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-1">
                {isBusinessAccount
                  ? `${user.businessInfo?.companyName || 'Your business'} has been verified successfully`
                  : 'Your identity has been verified successfully'}
              </p>
              {kycStatus.verifiedAt && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Verified on {new Date(kycStatus.verifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, label: 'Unlimited Transactions', sub: 'No transaction limits' },
              { icon: Zap,    label: 'Priority Support',       sub: '24/7 dedicated help' },
              { icon: isBusinessAccount ? Building : Award,
                label: isBusinessAccount ? 'API Access' : 'Verified Badge',
                sub:   isBusinessAccount ? 'Full platform integration' : 'Increased trust' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{label}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Under review (manual docs submitted) ────────────────────────────────────
  if (kycStatus?.status === 'under_review') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-6">
        <div className="flex items-center gap-6 mb-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mb-1">
              Documents Under Review
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              Your business documents have been submitted and are being reviewed by our team.
            </p>
            {kycStatus.reviewDeadline && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Expected completion: {new Date(kycStatus.reviewDeadline).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={resetVerification}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium disabled:opacity-50"
        >
          {resetting ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Start Over
        </button>
      </div>
    );
  }

  // ── In Progress (DiDIT session active) ──────────────────────────────────────
  if (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mb-1">
              {isBusinessAccount ? 'Business' : 'Identity'} Verification In Progress
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              Your {isBusinessAccount ? 'business documents are' : 'verification is'} being reviewed
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300 mb-2">
            <span className="font-medium">Estimated time remaining</span>
            <span className="font-bold">{isBusinessAccount ? '2-3 business days' : '24-48 hours'}</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
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

  // ── Rejected / Expired ──────────────────────────────────────────────────────
  if (kycStatus?.status === 'rejected' || kycStatus?.status === 'expired') {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-1">Verification Failed</h3>
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

  // ── Manual document upload form (business accounts in manual-verification countries) ──
  if (showManualUpload || kycStatus?.status === 'pending_documents') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Business Documents</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload your business documents for manual review. Our team will verify within 1-3 business days.
              </p>
            </div>
          </div>

          <form onSubmit={handleDocumentSubmit} className="space-y-4">
            <DocUploadField
              label="Business Registration Certificate *"
              field="businessRegistration"
              file={documents.businessRegistration}
              onChange={handleFileChange}
              hint="CAC Certificate, Articles of Incorporation, or equivalent"
            />
            <DocUploadField
              label="Director / Owner ID *"
              field="directorId"
              file={documents.directorId}
              onChange={handleFileChange}
              hint="Valid government-issued ID (passport, driver's license, NIN slip)"
            />
            <DocUploadField
              label="Proof of Business Address *"
              field="proofOfAddress"
              file={documents.proofOfAddress}
              onChange={handleFileChange}
              hint="Recent utility bill, bank statement, or tenancy agreement (within 3 months)"
            />
            <DocUploadField
              label="Tax Document (optional)"
              field="taxDocument"
              file={documents.taxDocument}
              onChange={handleFileChange}
              hint="TIN certificate, VAT registration, or tax clearance"
            />
            <DocUploadField
              label="Additional Document (optional)"
              field="additionalDoc"
              file={documents.additionalDoc}
              onChange={handleFileChange}
              hint="Any other supporting document"
            />

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-300">
              <p className="font-semibold mb-1">📋 Requirements:</p>
              <p>Files must be JPEG, PNG, or PDF format and under 10MB each. Ensure documents are clear and all corners are visible.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={resetVerification}
                disabled={uploading || resetting}
                className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !documents.businessRegistration || !documents.directorId || !documents.proofOfAddress}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Submit Documents
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Unverified — Start screen ────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
      <div className="text-center mb-8">
        <div className="inline-flex p-6 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-6">
          {isBusinessAccount
            ? <Building className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            : <Shield  className="w-16 h-16 text-blue-600 dark:text-blue-400" />
          }
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isBusinessAccount ? 'Verify Your Business' : 'Verify Your Identity'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {isBusinessAccount
            ? `Complete business verification for ${user.businessInfo?.companyName || 'your company'}`
            : 'Complete identity verification in minutes'}
        </p>
      </div>

      {/* What you'll need */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 border border-blue-200 dark:border-blue-800">
        <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5" />
          What you'll need:
        </h4>
        <ul className="space-y-3">
          {isBusinessAccount ? (
            <>
              <RequirementItem title="Business registration documents" sub="Certificate of incorporation or business license" />
              <RequirementItem title="Director/Owner ID verification" sub="Valid government-issued ID of business representative" />
              <RequirementItem title="Proof of business address" sub="Recent utility bill or bank statement" />
              <RequirementItem title="10-15 minutes" sub="Complete business verification process" />
            </>
          ) : (
            <>
              <RequirementItem title="Valid government-issued ID" sub="Passport, driver's license, or national ID card" />
              <RequirementItem title="Device with camera" sub="For document and selfie verification" />
              <RequirementItem title="5-10 minutes" sub="Quick and easy process" />
            </>
          )}
        </ul>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { emoji: '🔓', label: 'Unlimited Transactions' },
          { emoji: '⚡', label: 'Priority Support' },
          { emoji: isBusinessAccount ? '🔌' : '✅', label: isBusinessAccount ? 'API Access' : 'Verified Badge' },
        ].map(({ emoji, label }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-2">{emoji}</div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={startVerification}
        disabled={loading}
        className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
            Starting...
          </>
        ) : (
          <>
            {isBusinessAccount ? <Building className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            Start {isBusinessAccount ? 'Business' : 'Identity'} Verification
          </>
        )}
      </button>

      <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-1">
            {isBusinessAccount ? 'Your business data is protected' : 'Your privacy is protected'}
          </p>
          <p>We use bank-level encryption. Your data is securely stored and never shared without consent.</p>
        </div>
      </div>
    </div>
  );
};

// ── Small helper components ────────────────────────────────────────────────────
const RequirementItem = ({ title, sub }) => (
  <li className="flex items-start gap-3">
    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-semibold text-blue-900 dark:text-blue-200">{title}</p>
      <p className="text-sm text-blue-700 dark:text-blue-300">{sub}</p>
    </div>
  </li>
);

const DocUploadField = ({ label, field, file, onChange, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <div className="flex items-center gap-3">
      <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
        <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {file ? file.name : 'Click to upload file'}
        </span>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => onChange(field, e.target.files?.[0] || null)}
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={() => onChange(field, null)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
    {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
  </div>
);

export default KYCTab;
