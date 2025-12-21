// File: src/components/VerificationBanner.jsx
import React from 'react';
import { AlertTriangle, Mail, Phone, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const VerificationBanner = ({ verificationStatus }) => {
  if (!verificationStatus) return null;

  const { email, phone, kyc } = verificationStatus;

  // All verified - show nothing
  if (email && phone && kyc) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 mb-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl">
          <AlertTriangle className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
            Complete Your Verification
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-6">
            Unlock all features and increase your transaction limits by completing verification
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Email Verification */}
            {!email && (
              <Link
                to="/verify-email"
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      Email Verification
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      Required for all transactions
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Click to verify
                  </span>
                  <ArrowRight className="w-4 h-4 text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {/* Phone Verification */}
            {email && !phone && (
              <Link
                to="/verify-phone"
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600 transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Phone className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      Phone Verification
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                      For transactions above $100
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Click to verify
                  </span>
                  <ArrowRight className="w-4 h-4 text-yellow-600 dark:text-yellow-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {/* KYC Verification */}
            {email && phone && !kyc && (
              <Link
                to="/verify-kyc"
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      KYC Verification
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      For transactions above $1,000
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Start verification
                  </span>
                  <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-yellow-700 dark:text-yellow-300 mb-2">
              <span className="font-medium">Verification Progress</span>
              <span className="font-bold">
                {[email, phone, kyc].filter(Boolean).length}/3 Complete
              </span>
            </div>
            <div className="w-full bg-yellow-200 dark:bg-yellow-900/40 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${([email, phone, kyc].filter(Boolean).length / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationBanner;