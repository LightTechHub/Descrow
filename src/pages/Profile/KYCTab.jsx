import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, Loader, AlertCircle,
  ExternalLink, RefreshCw, Shield, Award, Building,
  FileText, Upload, X, ArrowRight, User,
} from 'lucide-react';
import profileService from '../../services/profileService';
import toast from 'react-hot-toast';

// ─── Step indicator shown at top for business accounts ───────────────────────
const StepBar = ({ currentStep }) => (
  <div className="flex items-center gap-3 mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
    {/* Step 1 */}
    <div className="flex items-center gap-2 flex-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        currentStep > 1
          ? 'bg-green-500 text-white'
          : currentStep === 1
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
      }`}>
        {currentStep > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${currentStep >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          Identity Check
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">DiDIT automated</p>
      </div>
    </div>

    {/* Connector */}
    <div className={`h-0.5 w-8 flex-shrink-0 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

    {/* Step 2 */}
    <div className="flex items-center gap-2 flex-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        currentStep > 2
          ? 'bg-green-500 text-white'
          : currentStep === 2
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
      }`}>
        {currentStep > 2 ? <CheckCircle className="w-4 h-4" /> : '2'}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${currentStep >= 2 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          Business Documents
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Manual review</p>
      </div>
    </div>

    {/* Connector */}
    <div className={`h-0.5 w-8 flex-shrink-0 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

    {/* Step 3 */}
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        currentStep === 3
          ? 'bg-green-500 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
      }`}>
        {currentStep === 3 ? <CheckCircle className="w-4 h-4" /> : '3'}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${currentStep === 3 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          Fully Verified
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Complete</p>
      </div>
    </div>
  </div>
);

const KYCTab = ({ user, onUpdate }) => {
  const [loading, setLoading]       = useState(false);
  const [resetting, setResetting]   = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [kycStatus, setKycStatus]   = useState(null);
  const [savedUrl, setSavedUrl]     = useState(null);
  const [docs, setDocs] = useState({
    businessRegistration: null,
    directorId:           null,
    proofOfAddress:       null,
    taxDocument:          null,
    additionalDoc:        null,
  });

  const isBusiness = user?.accountType === 'business';

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try {
      const res = await profileService.checkKYCStatus();
      if (res.success) {
        setKycStatus(res.data);
        if (res.data?.verificationUrl) setSavedUrl(res.data.verificationUrl);
      }
    } catch {
      setKycStatus({ status: 'unverified' });
    }
  };

  // Work out which step the business user is on
  const getBusinessStep = () => {
    if (!isBusiness) return null;
    const status = kycStatus?.status;
    // Step 3 — fully done
    if (status === 'approved') return 3;
    // Step 2 — DiDIT done, now need documents OR documents already submitted
    if (status === 'pending_documents' || status === 'under_review') return 2;
    // Step 1 — not started or DiDIT in progress
    return 1;
  };

  const businessStep = getBusinessStep();

  // ── Start DiDIT ─────────────────────────────────────────────────────────────
  const startDigit = async () => {
    try {
      setLoading(true);
      const res = await profileService.startKYCVerification();
      if (res.success) {
        if (res.data?.verificationUrl) {
          window.location.href = res.data.verificationUrl;
        } else if (res.data?.verificationType === 'manual' || res.data?.status === 'pending_documents') {
          // DiDIT not available — skip straight to step 2 for business
          setKycStatus(prev => ({ ...prev, status: 'pending_documents' }));
          toast('DiDIT unavailable. Please upload your documents to complete verification.');
        } else {
          toast.error('Could not start verification. Please try again.');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = async () => {
    if (!window.confirm('Reset verification and start over?')) return;
    try {
      setResetting(true);
      const res = await profileService.resetKYCVerification();
      if (res.success) {
        toast.success('Reset. You can start fresh.');
        setKycStatus({ status: 'unverified' });
        setSavedUrl(null);
        setDocs({ businessRegistration: null, directorId: null, proofOfAddress: null, taxDocument: null, additionalDoc: null });
      }
    } catch { toast.error('Reset failed'); }
    finally { setResetting(false); }
  };

  // ── Submit documents ─────────────────────────────────────────────────────────
  const submitDocs = async (e) => {
    e.preventDefault();
    if (!docs.businessRegistration || !docs.directorId || !docs.proofOfAddress) {
      toast.error('Business Registration, Director ID, and Proof of Address are required');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('businessRegistration', docs.businessRegistration);
      fd.append('directorId',           docs.directorId);
      fd.append('proofOfAddress',       docs.proofOfAddress);
      if (docs.taxDocument)   fd.append('taxDocument',   docs.taxDocument);
      if (docs.additionalDoc) fd.append('additionalDoc', docs.additionalDoc);

      const res = await profileService.uploadBusinessDocuments(fd);
      if (res.success) {
        toast.success('Documents submitted! We\'ll review within 1-3 business days.');
        fetchStatus();
        onUpdate && onUpdate();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ─── EMAIL NOT VERIFIED ──────────────────────────────────────────────────────
  if (!user?.verified) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6">
        <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Email Verification Required</h3>
        <p className="text-sm text-red-700 dark:text-red-300">Please verify your email before starting KYC.</p>
      </div>
    );
  }

  // ─── FULLY APPROVED ──────────────────────────────────────────────────────────
  if (kycStatus?.status === 'approved') {
    return (
      <div className="space-y-6">
        {isBusiness && <StepBar currentStep={3} />}
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <Award className="w-12 h-12 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">✅ Fully Verified!</h3>
              <p className="text-green-700 dark:text-green-300">
                {isBusiness
                  ? `${user.businessInfo?.companyName || 'Your business'} identity and documents have been verified.`
                  : 'Your identity has been verified successfully.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {['Unlimited Transactions', 'Priority Support', isBusiness ? 'API Access' : 'Verified Badge'].map(b => (
              <div key={b} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> {b}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── BUSINESS STEP 2: DOCUMENTS UNDER REVIEW ─────────────────────────────────
  if (isBusiness && kycStatus?.status === 'under_review') {
    return (
      <div className="space-y-6">
        <StepBar currentStep={2} />
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">Business Documents Under Review</h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Step 2 complete. Our team will finish review within 1-3 business days.
                You'll be notified once approved.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Clock className="w-4 h-4" />
            {kycStatus.reviewDeadline
              ? `Expected by ${new Date(kycStatus.reviewDeadline).toLocaleDateString()}`
              : 'Expected within 1-3 business days'}
          </div>
        </div>
        <button onClick={reset} disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
          {resetting ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Start Over
        </button>
      </div>
    );
  }

  // ─── BUSINESS STEP 2: UPLOAD DOCUMENTS FORM ──────────────────────────────────
  if (isBusiness && kycStatus?.status === 'pending_documents') {
    return (
      <div className="space-y-6">
        <StepBar currentStep={2} />

        {/* Step 1 complete banner */}
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Step 1 Complete — Identity Verified</p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Your identity has been confirmed via DiDIT. Now upload your business documents to finish.
            </p>
          </div>
        </div>

        {/* Upload form */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Step 2 — Upload Business Documents</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We need to verify your business exists and you are authorised to represent it.
              </p>
            </div>
          </div>

          <form onSubmit={submitDocs} className="space-y-4">
            <DocField label="Business Registration Certificate *" field="businessRegistration"
              file={docs.businessRegistration} setDocs={setDocs}
              hint="CAC Certificate, Articles of Incorporation, or equivalent" />
            <DocField label="Director / Owner ID *" field="directorId"
              file={docs.directorId} setDocs={setDocs}
              hint="Valid government-issued ID of business representative" />
            <DocField label="Proof of Business Address *" field="proofOfAddress"
              file={docs.proofOfAddress} setDocs={setDocs}
              hint="Utility bill or bank statement within the last 3 months" />
            <DocField label="Tax Document (optional)" field="taxDocument"
              file={docs.taxDocument} setDocs={setDocs}
              hint="TIN certificate or tax clearance" />
            <DocField label="Additional Document (optional)" field="additionalDoc"
              file={docs.additionalDoc} setDocs={setDocs}
              hint="Any other supporting document" />

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300">
              JPEG, PNG, or PDF only · Max 10MB per file · All corners visible, text legible
            </div>

            <button type="submit"
              disabled={uploading || !docs.businessRegistration || !docs.directorId || !docs.proofOfAddress}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-base">
              {uploading
                ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                : <><Upload className="w-5 h-5" /> Submit Business Documents</>}
            </button>
          </form>
        </div>

        <button onClick={reset} disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
          {resetting ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Start Over
        </button>
      </div>
    );
  }

  // ─── DIDIT IN PROGRESS (session active, waiting) ─────────────────────────────
  if (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress') {
    return (
      <div className="space-y-6">
        {isBusiness && <StepBar currentStep={1} />}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">
                {isBusiness ? 'Step 1 — Identity Check In Progress' : 'Verification In Progress'}
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {isBusiness
                  ? 'Complete the DiDIT check. Once done, return here to upload your business documents.'
                  : 'Your verification is being reviewed. Usually takes 24-48 hours.'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {savedUrl && (
              <button onClick={() => window.location.href = savedUrl}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm">
                <ExternalLink className="w-4 h-4" /> Continue DiDIT Verification
              </button>
            )}
            <button onClick={reset} disabled={resetting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm disabled:opacity-50">
              {resetting ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── REJECTED / EXPIRED ──────────────────────────────────────────────────────
  if (kycStatus?.status === 'rejected' || kycStatus?.status === 'expired') {
    return (
      <div className="space-y-4">
        {isBusiness && <StepBar currentStep={1} />}
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6 flex items-center gap-4">
          <XCircle className="w-10 h-10 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-red-900 dark:text-red-200">Verification Failed</h3>
            <p className="text-red-700 dark:text-red-300 text-sm">{kycStatus.rejectionReason || 'Could not complete verification'}</p>
          </div>
        </div>
        <button onClick={() => setKycStatus({ status: 'unverified' })}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">
          Try Again
        </button>
      </div>
    );
  }

  // ─── START SCREEN ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {isBusiness && <StepBar currentStep={1} />}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-6 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
            {isBusiness
              ? <Building className="w-16 h-16 text-blue-600 dark:text-blue-400" />
              : <Shield   className="w-16 h-16 text-blue-600 dark:text-blue-400" />}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isBusiness ? 'Business Verification' : 'Identity Verification'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
            {isBusiness
              ? `Verify ${user.businessInfo?.companyName || 'your company'} in 2 steps — automated identity check followed by business document upload.`
              : 'Quick identity check — takes about 5 minutes.'}
          </p>
        </div>

        {/* What to expect — business gets the 2-step explanation, individual gets simple list */}
        {isBusiness ? (
          <div className="space-y-3 mb-8">
            {/* Step 1 */}
            <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Identity Check via DiDIT</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quick automated verification — confirm you are who you say you are. Takes 3-5 minutes.
                  You'll need a valid government-issued ID and camera access.
                </p>
              </div>
            </div>
            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
            </div>
            {/* Step 2 */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Business Document Upload</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  After DiDIT, return here to upload your business registration, director ID, and proof of address.
                  Our team reviews within 1-3 business days.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Registration cert', 'Director ID', 'Proof of address'].map(d => (
                    <span key={d} className="text-xs px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-gray-600 dark:text-gray-300">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 mb-8 border border-blue-200 dark:border-blue-800">
            <p className="font-semibold text-blue-900 dark:text-blue-200 mb-3 text-sm">What you'll need:</p>
            <ul className="space-y-2">
              {[
                ['Valid government ID', 'Passport, driver\'s licence, or national ID'],
                ['Device with camera',  'For document photo and selfie'],
                ['5-10 minutes',        'Quick, guided process'],
              ].map(([title, sub]) => (
                <li key={title} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-blue-800 dark:text-blue-200"><strong>{title}</strong> — {sub}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {['Unlimited Transactions', 'Priority Support', isBusiness ? 'API Access' : 'Verified Badge'].map(b => (
            <div key={b} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700">
              <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-900 dark:text-white">{b}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={startDigit} disabled={loading}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 transition shadow flex items-center justify-center gap-3 disabled:opacity-50">
          {loading
            ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting...</>
            : isBusiness
            ? <><ExternalLink className="w-5 h-5" /> Start Step 1 — Identity Check</>
            : <><Shield className="w-5 h-5" /> Start Identity Verification</>}
        </button>

        {isBusiness && (
          <p className="text-xs text-center text-gray-400 mt-3">
            After completing Step 1 you will be brought back here to upload your business documents.
          </p>
        )}

        <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">Your data is secure.</span> Bank-level encryption. Never shared without your consent.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const DocField = ({ label, field, file, setDocs, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition">
        <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {file ? file.name : 'Click to choose file'}
        </span>
        <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
          onChange={(e) => setDocs(prev => ({ ...prev, [field]: e.target.files?.[0] || null }))} />
      </label>
      {file && (
        <button type="button" onClick={() => setDocs(prev => ({ ...prev, [field]: null }))}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
    {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

export default KYCTab;
