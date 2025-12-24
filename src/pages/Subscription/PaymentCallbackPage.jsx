// src/pages/Subscription/PaymentCallbackPage.jsx - PAYMENT VERIFICATION
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const PaymentCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('Verifying your payment...');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const reference = searchParams.get('reference');

      if (!reference) {
        setStatus('failed');
        setMessage('Payment reference not found');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/subscription/verify/${reference}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        toast.success('Upgrade successful!');

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        setStatus('failed');
        setMessage('Payment verification failed');
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(error.response?.data?.message || 'Payment verification failed');
      toast.error('Payment verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
        
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          {status === 'verifying' && (
            <Loader className="w-16 h-16 text-blue-600 animate-spin" />
          )}
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

        {/* Message */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {status === 'verifying' && 'Verifying Payment'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'failed' && 'Payment Failed'}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>

        {/* Actions */}
        {status === 'success' && (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Redirecting to dashboard in 3 seconds...
          </p>
        )}

        {status === 'failed' && (
          <button
            onClick={() => navigate('/upgrade')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentCallbackPage
