import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Loader, Mail, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const status = searchParams.get('status');
  const reason = searchParams.get('reason');

  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Validate token exists and is not "undefined" string
    if (token && token !== 'undefined' && token.trim() !== '') {
      console.log('Valid token found, verifying:', token.substring(0, 20) + '...');
      verifyEmail(token);
      return;
    }

    // Handle GET redirect from backend (when user clicks email link)
    if (status) {
      handleBackendRedirect(status, reason);
      return;
    }

    // Better error handling for missing/invalid token
    console.log('No valid token found. Token value:', token);
    setVerificationStatus('error');
    setMessage('No verification token provided. Please check your email for the verification link or request a new one below.');
  }, [token, status, reason]);

  const handleBackendRedirect = (status, reason) => {
    if (status === 'success') {
      setVerificationStatus('success');
      setMessage('Email verified successfully! You can now log in.');
      setTimeout(() => navigate('/login'), 3000);
    } else if (status === 'already-verified') {
      setVerificationStatus('already-verified');
      setMessage('Your email is already verified. You can log in now.');
      setTimeout(() => navigate('/login'), 3000);
    } else if (status === 'error') {
      setVerificationStatus('error');
      const errorMessages = {
        'invalid-token': 'Invalid or expired verification link. Please request a new one.',
        'user-not-found': 'User not found. Please register again.',
        'server-error': 'Server error occurred. Please try again later.'
      };
      setMessage(errorMessages[reason] || 'Verification failed. Please try again.');
    }
  };

  const verifyEmail = async (verificationToken) => {
    // Additional validation before sending request
    if (!verificationToken || verificationToken === 'undefined' || verificationToken.trim() === '') {
      console.error('Invalid token, cannot verify:', verificationToken);
      setVerificationStatus('error');
      setMessage('Invalid verification token. Please request a new verification email.');
      return;
    }

    try {
      setVerificationStatus('verifying');
      setMessage('Verifying your email address...');

      console.log('Sending verification request with token...');
      const response = await authService.verifyEmail(verificationToken);
      
      console.log('Verification successful:', response);
      setVerificationStatus('success');
      setMessage(response.message || 'Email verified successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationStatus('error');
      setMessage(
        error.message || 
        'Email verification failed. The link may be invalid or expired.'
      );
    }
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();
    
    if (!resendEmail || !resendEmail.trim()) {
      return;
    }

    try {
      setResending(true);
      await authService.resendVerification(resendEmail.trim());
      setResendEmail('');
      setMessage('Verification email resent successfully! Please check your inbox.');
      
      // Show success state temporarily
      const currentStatus = verificationStatus;
      setVerificationStatus('success');
      setTimeout(() => {
        if (currentStatus === 'error') {
          setVerificationStatus('error');
          setMessage('Check your email for the new verification link.');
        }
      }, 3000);
    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage(error.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-12 h-12 text-blue-400" />
            <span className="text-3xl font-bold text-white">Dealcross</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Email Verification</h1>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
          
          {/* VERIFYING STATE */}
          {verificationStatus === 'verifying' && (
            <div className="text-center">
              <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Verifying your email...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {message || 'Please wait while we verify your email address.'}
              </p>
            </div>
          )}

          {/* SUCCESS STATE */}
          {verificationStatus === 'success' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Email Verified!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                {message}
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  Your account is now active!
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Redirecting to login in 3 seconds...
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center"
              >
                Go to Login Now
              </Link>
            </div>
          )}

          {/* ALREADY VERIFIED STATE */}
          {verificationStatus === 'already-verified' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Already Verified
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  Your email was verified previously. You can log in to your account.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center"
              >
                Go to Login
              </Link>
            </div>
          )}

          {/* ERROR STATE */}
          {verificationStatus === 'error' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Verification Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>

              {/* Resend Verification Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                        Need a New Verification Link?
                      </h3>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Enter your email address below and we will send you a fresh verification link.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleResendVerification} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resending}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resending ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Resend Verification Email
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Alternative Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Already verified your email?
                </p>
                <Link
                  to="/login"
                  className="inline-block px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Try Logging In
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link 
            to="/" 
            className="text-sm text-blue-200 hover:text-white transition inline-flex items-center gap-2"
          >
            <span>←</span> Back to Home
          </Link>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-blue-100">
          <h4 className="font-semibold mb-2 text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Need Help?
          </h4>
          <p className="text-sm">
            If you are having trouble verifying your email, please contact our support team at{' '}
            <a 
              href="mailto:support@dealcross.net" 
              className="text-blue-300 hover:text-white underline font-medium"
            >
              support@dealcross.net
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;