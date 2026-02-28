import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, Loader, AlertCircle,
  ExternalLink, RefreshCw, Shield, Award, Building,
  FileText, Upload, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import profileService from '../../services/profileService';
import toast from 'react-hot-toast';

const KYCTab = ({ user, onUpdate }) => {
  const [kycStatus, setKycStatus]   = useState(null);
  const [fetchingStatus, setFetchingStatus] = useState(true);

  // DiDIT section state
  const [startingDigit, setStartingDigit] = useState(false);
  const [resetting, setResetting]         = useState(false);
  const [digitOpen, setDigitOpen]         = useState(true);

  // Document upload section state
  const [uploading, setUploading]   = useState(false);
  const [uploadOpen, setUploadOpen] = useState(true);
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
      setFetchingStatus(true);
      const res = await profileService.checkKYCStatus();
      if (res.success) setKycStatus(res.data);
      else setKycStatus({ status: 'unverified' });
    } catch {
      setKycStatus({ status: 'unverified' });
    } finally {
      setFetchingStatus(false);
    }
  };

  // ── Start DiDIT ──────────────────────────────────────────────────────────────
  const startDigit = async () => {
    try {
      setStartingDigit(true);
      const res = await profileService.startKYCVerification();
      if (res.success) {
        if (res.data?.verificationUrl) {
          window.location.href = res.data.verificationUrl;
        } else {
          toast('Could not reach DiDIT right now. You can still upload your documents below.');
          fetchStatus();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start verification. Try again or upload documents below.');
    } finally {
      setStartingDigit(false);
    }
  };

  // ── Reset DiDIT session ──────────────────────────────────────────────────────
  const resetDigit = async () => {
    if (!window.confirm('Reset your DiDIT verification session and start over?')) return;
    try {
      setResetting(true);
      const res = await profileService.resetKYCVerification();
      if (res.success) {
        toast.success('Reset successfully. You can start a new session.');
        fetchStatus();
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
        toast.success('Documents submitted! Our team will review within 1-3 business days.');
        setDocs({ businessRegistration: null, directorId: null, proofOfAddress: null, taxDocument: null, additionalDoc: null });
        fetchStatus();
        onUpdate && onUpdate();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (fetchingStatus) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ─── Email not verified ───────────────────────────────────────────────────────
  if (!user?.verified) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6">
        <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Email Verification Required</h3>
        <p className="text-sm text-red-700 dark:text-red-300">Please verify your email before starting KYC.</p>
      </div>
    );
  }

  // ─── Fully approved ───────────────────────────────────────────────────────────
  if (kycStatus?.status === 'approved') {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <Award className="w-12 h-12 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">✅ Fully Verified!</h3>
            <p className="text-green-700 dark:text-green-300 text-sm">
              {isBusiness
                ? `${user.businessInfo?.companyName || 'Your business'} has been verified.`
                : 'Your identity has been verified successfully.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['Unlimited Transactions', 'Priority Support', isBusiness ? 'API Access' : 'Verified Badge'].map(b => (
            <div key={b} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> {b}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Individual account — single DiDIT flow ───────────────────────────────────
  if (!isBusiness) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-5 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
            <Shield className="w-14 h-14 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Identity Verification</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Quick automated check — takes about 5 minutes.</p>
        </div>

        <IndividualDigitStatus kycStatus={kycStatus} onReset={resetDigit} resetting={resetting} />

        {/* Show start/continue button only if not approved/under review */}
        {!['approved', 'under_review'].includes(kycStatus?.status) && (
          <button onClick={startDigit} disabled={startingDigit}
            className="w-full mt-6 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 transition flex items-center justify-center gap-3 disabled:opacity-50">
            {startingDigit
              ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting...</>
              : <><Shield className="w-5 h-5" />
                  {kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress'
                    ? 'Continue Verification'
                    : 'Start Identity Verification'}
                </>}
          </button>
        )}

        <SecurityNote />
      </div>
    );
  }

  // ─── BUSINESS ACCOUNT — parallel sections ────────────────────────────────────
  // Documents already submitted and under review
  const docsSubmitted = ['under_review'].includes(kycStatus?.status) ||
    (kycStatus?.documents && kycStatus.documents.length > 0);

  return (
    <div className="space-y-4">

      {/* Page header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <Building className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Business Verification — {user.businessInfo?.companyName || 'Your Company'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Complete both sections below. Our team reviews everything together.
              You do not need to wait for one to finish before doing the other.
            </p>
          </div>
        </div>

        {/* Overall status pill */}
        <div className="mt-4">
          <OverallStatusPill kycStatus={kycStatus} />
        </div>
      </div>

      {/* ── Section 1: DiDIT identity check ─────────────────────────────── */}
      <CollapsibleSection
        title="Section 1 — Automated Identity Check (DiDIT)"
        subtitle="Verify that you are a real person. Takes 3-5 minutes."
        isOpen={digitOpen}
        onToggle={() => setDigitOpen(v => !v)}
        statusBadge={<DiditBadge status={kycStatus?.status} />}
      >
        <div className="p-5 space-y-4">
          {/* Current DiDIT status */}
          <IndividualDigitStatus kycStatus={kycStatus} onReset={resetDigit} resetting={resetting} />

          {/* What you need */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">What you need:</p>
            <ul className="space-y-1">
              {[
                'Valid government-issued ID (passport, driver\'s licence, or national ID)',
                'Device with a working camera',
                '3-5 minutes'
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Action button */}
          {kycStatus?.status === 'approved' ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold">
              <CheckCircle className="w-5 h-5" /> Identity verified
            </div>
          ) : (
            <button onClick={startDigit} disabled={startingDigit}
              className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {startingDigit
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting...</>
                : <><ExternalLink className="w-4 h-4" />
                    {kycStatus?.status === 'pending' || kycStatus?.status === 'in_progress'
                      ? 'Continue DiDIT Verification'
                      : 'Start DiDIT Identity Check'}
                  </>}
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Section 2: Business document upload ─────────────────────────── */}
      <CollapsibleSection
        title="Section 2 — Business Document Upload"
        subtitle="Upload documents proving your business is real and registered."
        isOpen={uploadOpen}
        onToggle={() => setUploadOpen(v => !v)}
        statusBadge={<DocsBadge docsSubmitted={docsSubmitted} kycStatus={kycStatus} />}
      >
        <div className="p-5 space-y-4">
          {docsSubmitted ? (
            /* Docs already submitted */
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Documents submitted</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Our team is reviewing your documents.
                  {kycStatus?.reviewDeadline && ` Expected by ${new Date(kycStatus.reviewDeadline).toLocaleDateString()}.`}
                </p>
                {kycStatus?.documents?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {kycStatus.documents.map((d, i) => (
                      <li key={i} className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {d.originalName || d.type}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            /* Upload form — always available regardless of DiDIT status */
            <form onSubmit={submitDocs} className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                You can upload your documents now — you do not need to wait for the identity check above to complete first.
              </div>

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

              <div className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                JPEG, PNG, or PDF only · Max 10MB per file · All corners visible, text clearly legible
              </div>

              <button type="submit"
                disabled={uploading || !docs.businessRegistration || !docs.directorId || !docs.proofOfAddress}
                className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {uploading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
                  : <><Upload className="w-4 h-4" /> Submit Business Documents</>}
              </button>
            </form>
          )}
        </div>
      </CollapsibleSection>

      <SecurityNote />
    </div>
  );
};

// ── Status helpers ─────────────────────────────────────────────────────────────

// Shows the overall account verification status in plain English
const OverallStatusPill = ({ kycStatus }) => {
  const status = kycStatus?.status || 'unverified';
  const configs = {
    unverified:        { label: 'Not started',           cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
    pending:           { label: 'Identity check started', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    in_progress:       { label: 'Identity check in progress', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    pending_documents: { label: 'Awaiting documents',    cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
    under_review:      { label: 'Under review',          cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
    approved:          { label: 'Verified ✅',            cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    rejected:          { label: 'Rejected',              cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
    expired:           { label: 'Session expired',       cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  };
  const { label, cls } = configs[status] || configs.unverified;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

// Small badge shown on the DiDIT section header
const DiditBadge = ({ status }) => {
  if (!status || status === 'unverified') return <span className="text-xs text-gray-400">Not started</span>;
  if (status === 'pending' || status === 'in_progress') return <span className="text-xs font-semibold text-blue-500 flex items-center gap-1"><Clock className="w-3 h-3" /> In progress</span>;
  if (status === 'approved') return <span className="text-xs font-semibold text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete</span>;
  if (status === 'rejected') return <span className="text-xs font-semibold text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>;
  if (status === 'expired')  return <span className="text-xs font-semibold text-orange-500">Expired</span>;
  return null;
};

// Small badge shown on the documents section header
const DocsBadge = ({ docsSubmitted, kycStatus }) => {
  if (kycStatus?.status === 'under_review' || docsSubmitted)
    return <span className="text-xs font-semibold text-purple-500 flex items-center gap-1"><FileText className="w-3 h-3" /> Submitted</span>;
  return <span className="text-xs text-gray-400">Not submitted</span>;
};

// Displays DiDIT status inline — no fake "step complete" messages
const IndividualDigitStatus = ({ kycStatus, onReset, resetting }) => {
  const status = kycStatus?.status;

  if (!status || status === 'unverified' || status === 'pending_documents') return null;

  if (status === 'pending' || status === 'in_progress') {
    return (
      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Identity check in progress</p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Your DiDIT session is active. Continue or start over below.
          </p>
        </div>
        <button onClick={onReset} disabled={resetting}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition flex-shrink-0 disabled:opacity-50">
          {resetting ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Reset
        </button>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">Identity check failed</p>
          <p className="text-xs text-red-700 dark:text-red-300">{kycStatus.rejectionReason || 'Verification was not successful. You can try again.'}</p>
        </div>
        <button onClick={onReset} disabled={resetting}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition flex-shrink-0 disabled:opacity-50">
          {resetting ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Try again
        </button>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">Session expired</p>
          <p className="text-xs text-orange-700 dark:text-orange-300">Your previous DiDIT session expired. Start a new one below.</p>
        </div>
        <button onClick={onReset} disabled={resetting}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition flex-shrink-0 disabled:opacity-50">
          {resetting ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Reset
        </button>
      </div>
    );
  }

  if (status === 'under_review') {
    return (
      <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 text-sm text-purple-800 dark:text-purple-300">
        <Clock className="w-4 h-4 flex-shrink-0" />
        Your submission is being reviewed by our team.
      </div>
    );
  }

  return null;
};

// ── Small reusable components ──────────────────────────────────────────────────

const CollapsibleSection = ({ title, subtitle, isOpen, onToggle, statusBadge, children }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
          {statusBadge}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {isOpen
        ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
        : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
    </button>
    {isOpen && <div className="border-t border-gray-200 dark:border-gray-800">{children}</div>}
  </div>
);

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

const SecurityNote = () => (
  <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
    <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
    <p className="text-sm text-gray-600 dark:text-gray-400">
      <span className="font-semibold">Your data is secure.</span> Bank-level encryption. Never shared without your consent.
    </p>
  </div>
);

export default KYCTab;
