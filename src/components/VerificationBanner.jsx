// File: src/components/VerificationBanner.jsx
import React from 'react';
import { AlertTriangle, Mail, Phone, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const VerificationBanner = ({ verificationStatus }) => {
  if (!verificationStatus) return null;

  const { email, phone, kyc } = verificationStatus;

  // All verified — show nothing
  if (email && phone && kyc) return null;

  const completedCount = [email, phone, kyc].filter(Boolean).length;
  const progressPct = (completedCount / 3) * 100;

  return (
    // ✅ FIXED: Replaced yellow-to-orange gradient bg with flat yellow (warning context kept — appropriate)
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 mb-6 shadow-md">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl flex-shrink-0">
          <AlertTriangle className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-100 mb-1">
            Complete Your Verification
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-5">
            Unlock all features and higher transaction limits by completing each verification step.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Email Verification */}
            {!email ? (
              <Link
                to="/verify-email"
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Email</p>
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Required</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Tap to verify</span>
                  <ArrowRight className="w-4 h-4 text-red-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-green-200 dark:border-green-800 opacity-70">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Email</p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Verified ✓</p>
                  </div>
                </div>
              </div>
            )}

            {/* Phone Verification */}
            {!phone ? (
              <Link
                to="/verify-phone"
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Phone className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Phone</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">For deals above $100</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Tap to verify</span>
                  <ArrowRight className="w-4 h-4 text-yellow-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-green-200 dark:border-green-800 opacity-70">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Phone</p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Verified ✓</p>
                  </div>
                </div>
              </div>
            )}

            {/* KYC Verification */}
            {!kyc ? (
              <Link
                to="/verify-kyc"
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">KYC</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">For deals above $1,000</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Start verification</span>
                  <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-green-200 dark:border-green-800 opacity-70">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">KYC</p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Verified ✓</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-yellow-700 dark:text-yellow-300 mb-2">
              <span className="font-medium">Verification Progress</span>
              <span className="font-bold">{completedCount}/3 Complete</span>
            </div>
            <div className="w-full bg-yellow-200 dark:bg-yellow-900/40 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationBanner;
