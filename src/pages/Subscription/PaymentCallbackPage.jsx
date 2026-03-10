// src/pages/Subscription/PaymentCallbackPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Copy, AlertTriangle, Key, Shield } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PaymentCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus]           = useState('verifying');
  const [message, setMessage]         = useState('Verifying your payment...');
  const [tierUpgraded, setTierUpgraded] = useState(null);
  const [apiCredentials, setApiCredentials] = useState(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { verifyPayment(); }, []);

  const verifyPayment = async () => {
    try {
      const reference = searchParams.get('reference') || searchParams.get('trxref');
      if (!reference) {
        setStatus('failed');
        setMessage('Payment reference not found. Please contact support.');
        return;
      }

      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/subscription/verify/${reference}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setStatus('success');
        setMessage(res.data.message || 'Your plan has been upgraded successfully!');
        setTierUpgraded(res.data.data?.tier);

        // Update cached user
        try {
          const userRes = await axios.get(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (userRes.data.success) {
            localStorage.setItem('user', JSON.stringify(userRes.data.data.user));
          }
        } catch { /* non-critical */ }

        // Show API credentials if generated
        if (res.data.data?.apiCredentials) {
          setApiCredentials(res.data.data.apiCredentials);
        } else {
          // Auto-redirect only if no credentials to save
          setTimeout(() => navigate('/dashboard'), 4000);
        }

        toast.success('Payment verified!');
      } else {
        setStatus('failed');
        setMessage('Payment could not be verified. Please contact support if you were charged.');
      }
    } catch (err) {
      setStatus('failed');
      setMessage(err.response?.data?.message || 'Payment verification failed. Contact support if you were charged.');
      toast.error('Verification failed');
    }
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">

        {/* Status card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center mb-6">
          <div className="mb-5 flex justify-center">
            {status === 'verifying' && <Loader className="w-16 h-16 text-blue-600 animate-spin" />}
            {status === 'success' && (
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            )}
            {status === 'failed' && (
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {status === 'verifying' && 'Verifying Payment'}
            {status === 'success'   && 'Payment Successful!'}
            {status === 'failed'    && 'Payment Failed'}
          </h2>

          {tierUpgraded && status === 'success' && (
            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full uppercase mb-3">
              Upgraded to {tierUpgraded} tier
            </span>
          )}

          <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>

          {status === 'success' && !apiCredentials && (
            <p className="text-xs text-gray-400 mt-3">Redirecting to dashboard in a few seconds...</p>
          )}

          {status === 'failed' && (
            <div className="mt-5 flex gap-3 justify-center">
              <button onClick={() => navigate('/upgrade')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition">
                Try Again
              </button>
              <a href="mailto:support@dealcross.net"
                className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Contact Support
              </a>
            </div>
          )}
        </div>

        {/* ── API Credentials — shown only once ── */}
        {apiCredentials && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border-2 border-red-300 dark:border-red-700 p-6 mb-6">
            {/* Warning banner */}
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-5">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900 dark:text-red-100 text-sm">⚠️ Save These Credentials NOW</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  This is the ONLY time your API secret will be shown. It cannot be recovered — only regenerated.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: 'API Key',        value: apiCredentials.apiKey,       icon: Key },
                { label: 'API Secret',     value: apiCredentials.apiSecret,    icon: Shield },
                ...(apiCredentials.webhookSecret
                  ? [{ label: 'Webhook Secret', value: apiCredentials.webhookSecret, icon: Shield }]
                  : [])
              ].map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </p>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
                    <code className="flex-1 text-xs font-mono text-gray-800 dark:text-gray-200 break-all">{value}</code>
                    <button onClick={() => copy(value, label)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition flex-shrink-0">
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {apiCredentials.rateLimits && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 mb-4 text-xs text-indigo-700 dark:text-indigo-300">
                Rate limits: <strong>{apiCredentials.rateLimits.requestsPerMinute} req/min</strong> · <strong>{apiCredentials.rateLimits.requestsPerDay?.toLocaleString()} req/day</strong>
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={credentialsSaved}
                  onChange={e => setCredentialsSaved(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">I have saved my credentials securely</span>
              </label>
            </div>

            <button
              onClick={() => navigate('/dashboard?tab=api')}
              disabled={!credentialsSaved}
              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition"
            >
              Go to API Dashboard
            </button>
          </div>
        )}

        {status === 'success' && !apiCredentials && (
          <div className="text-center">
            <button onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition">
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
