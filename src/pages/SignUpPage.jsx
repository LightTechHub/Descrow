import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { authService } from '../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const SignUpPage = ({ setUser }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    setError('');

    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const decoded = jwtDecode(credentialResponse.credential);

      const response = await authService.googleAuth({
        email: decoded.email,
        name: decoded.name,
        googleId: decoded.sub,
        picture: decoded.picture
      });

      if (response.success) {
        setUser(response.user);
        toast.success(`Welcome, ${response.user.name}!`);
        navigate('/dashboard', { replace: true });
      } else {
        setError(response.message || 'Google signup failed');
      }
    } catch (err) {
      console.error(err);
      setError('Google signup failed. Please try again.');
      toast.error('Google signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      if (response.success) {
        toast.success('Account created! Check your email to verify.', { duration: 4000 });
        setTimeout(() => {
          navigate('/login', {
            state: {
              email: formData.email,
              message: 'Please verify your email before logging in.'
            },
            replace: true
          });
        }, 2000);
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <span className="text-4xl font-bold text-white">Dealcross</span>
          </div>

          <h1 className="text-2xl font-bold text-white flex justify-center gap-2">
            <Zap className="text-yellow-400" /> Create Your Account <Zap className="text-yellow-400" />
          </h1>
          <p className="text-blue-200 mt-1">Start trading securely with escrow protection</p>
        </div>

        <div className="bg-white/95 dark:bg-gray-900/95 rounded-3xl shadow-2xl p-8 border border-white/20">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4 flex gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" />
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google signup failed')}
            text="signup_with"
            width="100%"
          />

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t" />
            <span className="px-3 text-sm text-gray-500">OR</span>
            <div className="flex-1 border-t" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {['name', 'email'].map((field, i) => (
              <div key={field}>
                <label className="block text-sm font-semibold mb-2">
                  {field === 'name' ? 'Full Name' : 'Email Address'}
                </label>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  name={field}
                  value={formData[field]}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-semibold mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold flex justify-center gap-2"
            >
              {loading ? <Loader className="animate-spin" /> : <Sparkles />}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-purple-600">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;