// File: src/pages/SignUpPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, User, Eye, EyeOff, Loader, AlertCircle, CheckCircle, Sparkles, Zap } from 'lucide-react';
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
    setFormData({
      ...formData,
      [name]: value
    });
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
    } catch (error) {
      console.error('Google signup error:', error);
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
        toast.success('Account created! 📧 Check your email to verify.', {
          duration: 4000,
          icon: '✅'
        });
        
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              email: formData.email,
              message: '✅ Account created! Please verify your email before logging in.'
            },
            replace: true
          });
        }, 2000);
      } else {
        setError(response.message || 'Registration failed. Please try again.');
      }

    } catch (err) {
      console.error('Registration error:', err);
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
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <span className="text-4xl font-bold text-white drop-shadow-lg">Dealcross</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-blue-200">Start trading securely with escrow protection</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Google Sign Up Button */}
          <div className="mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setError('Google signup failed');
                toast.error('Google signup failed');
              }}
              useOneTap
              text="signup_with"
              size="large"
              width="100%"
            />
          </div>

          {/* Divider */}
          <div className="mb-6 flex items-center">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
            <span className="px-4 text-sm font-medium text-gray-500 dark:text-gray-400">OR</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="John Doe"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="Minimum 8 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-semibold ${
                      passwordStrength <= 1 ? 'text-red-600' : passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover​​​​​​​​​​​​​​​​:text-gray-600 dark:hover:text-gray-300 transition”

{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
</button>
</div>
{formData.confirmPassword && formData.password === formData.confirmPassword && (
<div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
<CheckCircle className="w-4 h-4" />
<span className="text-xs font-semibold">Passwords match</span>
</div>
)}
</div>
{/* Terms & Conditions */}
        <div className="flex items-start">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-1"
            required
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            I agree to the{' '}
            <Link to="/terms" className="text-purple-600 hover:text-purple-500 font-semibold transition">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-purple-600 hover:text-purple-500 font-semibold transition">
              Privacy Policy
            </Link>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Create Account
            </>
          )}
        </button>
      </form>

      {/* Login Link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-500 transition">
          Login here
        </Link>
      </p>
    </div>

    {/* Benefits */}
    <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white border border-white/20">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5" />
        Why choose Dealcross?
      </h3>
      <ul className="space-y-3 text-sm text-blue-100">
        <li className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span>Secure escrow protection for all transactions</span>
        </li>
        <li className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span>Real-time chat with buyers and sellers</span>
        </li>
        <li className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span>GPS tracking and delivery proof</span>
        </li>
        <li className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span>24/7 dispute resolution support</span>
        </li>
      </ul>
    </div>

    {/* Back to Home */}
    <div className="text-center mt-6">
      <Link to="/" className="text-sm text-blue-200 hover:text-white transition flex items-center justify-center gap-2">
        ← Back to Home
      </Link>
    </div>
  </div>
</div>
);
};
export default SignUpPage;