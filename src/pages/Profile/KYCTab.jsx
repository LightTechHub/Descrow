import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, Loader, AlertCircle,
  ExternalLink, RefreshCw, Shield, Award, Building,
  FileText, Upload, X,
} from 'lucide-react';
import profileService from '../../services/profileService';
import toast from 'react-hot-toast';

const KYCTab = ({ user, onUpdate }) => {
  const [loading, setLoading]     = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [savedUrl, setSavedUrl]   = useState(null);
  // Controls which view to show: 'start' | 'upload'
  const [view, setView] = useState('start');
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

  // ── Start DiDIT verification ─────────────────────────────────────────────
  const startDigit = async () => {
    try {
      setLoading(true);
      const res = await profileService.startKYCVerification();
      if (res.success) {
        if (res.data?.verificationUrl) {
          // Redirect to DiDIT hosted flow
          window.location.href = res.data.verificationUrl;
        } else {
          // Backend returned manual — show upload form
          toast('Please upload your business documents below.');
          setView('upload');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start verification. Please try document upload.');
      if (isBusiness) setView('upload');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = async () => {
    if (!window.confirm('Reset verification and start over?')) return;
    try {
      setResetting(true);
      const res = await profileService.resetKYCVerification();
      if (res.success) {
        toast.success('Reset! You can start fresh.');
        setKycStatus({ status: 'unverified' });
        setSavedUrl(null);
        setView('start');
        setDocs({ businessRegistration: null, directorId: null, proofOfAddress: null, taxDocument: null, additionalDoc: null });
      }
    } catch { toast.error('Reset failed'); }
    finally { setResetting(false); }
  };

  // ── Submit documents ─────────────────────────────────────────────────────
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
      if (docs.taxDocument)  fd.append('taxDocument',  docs.taxDocument);
      if (docs.additionalDoc) fd.append('additionalDoc', docs.additionalDoc);

      const res = await profileService.uploadBusinessDocuments(fd);
      if (res.success) {
        toast.success('Documents submitted! We\'ll review within 1-3 business days.');
        setView('start');
        fetchStatus();
        onUpdate && onUpdate();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ─── EMAIL NOT VERIFIED ──────────────────────────────────────────────────
  if (!user?.verified) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6">
        <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Email Verification Required</h3>
        <p className="text-sm text-red-700 dark:text-red-300">Verify your email first before starting KYC.</p>
      </div>
    );
  }

  // ─── APPROVED ────────────────────────────────────────────────────────────
  if (kycStatus?.status === 'approved') {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <Award className="w-12 h-12 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">✅ Verification Complete!</h3>
            <p className="text-green-700 dark:text-green-300">
              {isBusiness
                ? `${user.businessInfo?.companyName || 'Your business'} has been verified.`
                : 'Your identity has been verified.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['Unlimited Transactions', 'Priority Support', isBusiness ? 'API Access' : 'Verified Badge'].map(b => (
            <div key={b} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> {b}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── UNDER REVIEW ────────────────────────────────────────────────────────
  if (kycStatus?.status === 'under_review') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">Documents Under Review</h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm">Our team will complete review within 1-3 business days.</p>
          </div>
        </div>
        <button onClick={reset} disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm disabled:opacity-50">
          {resetting ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Start Over
        </button>
      </div>
    );
  }

  // ─── IN PROGRESS (DiDIT session active) ──────────────────────────────────
  if (kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">Verification In Progress</h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm">Usually takes 24-48 hours.</p>
          </div>
        </div>
        <div className="flex gap-3">
          {savedUrl && (
            <button onClick={() => window.location.href = savedUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
              <ExternalLink className="w-4 h-4" /> Continue Verification
            </button>
          )}
          <button onClick={reset} disabled={resetting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium disabled:opacity-50">
            {resetting ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Start Over
          </button>
        </div>
      </div>
    );
  }

  // ─── REJECTED / EXPIRED ──────────────────────────────────────────────────
  if (kycStatus?.status === 'rejected' || kycStatus?.status === 'expired') {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6 flex items-center gap-4">
          <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
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

  // ─── DOCUMENT UPLOAD FORM ────────────────────────────────────────────────
  if (view === 'upload') {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Business Documents</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reviewed within 1-3 business days</p>
            </div>
          </div>
          <button type="button" onClick={() => setView('start')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submitDocs} className="space-y-4">
          <DocField label="Business Registration Certificate *" field="businessRegistration"
            file={docs.businessRegistration} setDocs={setDocs}
            hint="CAC Certificate, Articles of Incorporation, or equivalent" />
          <DocField label="Director / Owner ID *" field="directorId"
            file={docs.directorId} setDocs={setDocs}
            hint="Passport, driver's license, or national ID" />
          <DocField label="Proof of Business Address *" field="proofOfAddress"
            file={docs.proofOfAddress} setDocs={setDocs}
            hint="Utility bill or bank statement (within 3 months)" />
          <DocField label="Tax Document (optional)" field="taxDocument"
            file={docs.taxDocument} setDocs={setDocs}
            hint="TIN certificate or tax clearance" />
          <DocField label="Additional Document (optional)" field="additionalDoc"
            file={docs.additionalDoc} setDocs={setDocs}
            hint="Any other supporting document" />

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300">
            JPEG, PNG, or PDF only. Max 10MB per file.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setView('start')} disabled={uploading}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
              Back
            </button>
            <button type="submit" disabled={uploading || !docs.businessRegistration || !docs.directorId || !docs.proofOfAddress}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {uploading
                ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                : <><Upload className="w-5 h-5" /> Submit Documents</>}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── START SCREEN ────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
      <div className="text-center mb-8">
        <div className="inline-flex p-6 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
          {isBusiness
            ? <Building className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            : <Shield   className="w-16 h-16 text-blue-600 dark:text-blue-400" />}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isBusiness ? 'Verify Your Business' : 'Verify Your Identity'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {isBusiness
            ? `Complete verification for ${user.businessInfo?.companyName || 'your company'}`
            : 'Quick identity check — takes about 5 minutes'}
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {['Unlimited Transactions', 'Priority Support', isBusiness ? 'API Access' : 'Verified Badge'].map(b => (
          <div key={b} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs font-semibold text-gray-900 dark:text-white">{b}</p>
          </div>
        ))}
      </div>

      {isBusiness ? (
        /* Business: TWO options */
        <div className="space-y-3">
          {/* Option 1: DiDIT */}
          <button onClick={startDigit} disabled={loading}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 transition shadow flex items-center justify-center gap-3 disabled:opacity-50">
            {loading
              ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting...</>
              : <><ExternalLink className="w-5 h-5" /> Verify with DiDIT (Automated)</>}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
          </div>

          {/* Option 2: Upload */}
          <button onClick={() => setView('upload')}
            className="w-full px-6 py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400 rounded-xl font-bold text-base hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center justify-center gap-3">
            <Upload className="w-5 h-5" /> Upload Documents (Manual Review)
          </button>

          <p className="text-xs text-center text-gray-400 mt-1">
            DiDIT is instant. Manual review takes 1-3 business days. Both are accepted.
          </p>
        </div>
      ) : (
        /* Individual: single DiDIT button */
        <button onClick={startDigit} disabled={loading}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-3 disabled:opacity-50">
          {loading
            ? <><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting...</>
            : <><Shield className="w-6 h-6" /> Start Identity Verification</>}
        </button>
      )}

      <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold">Your data is secure.</span> Bank-level encryption. Never shared without your consent.
        </p>
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
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
    {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
  </div>
);

export default KYCTab;
