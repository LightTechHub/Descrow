import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Key, 
  Smartphone, 
  Laptop, 
  Loader,
  CheckCircle,
  XCircle,
  Copy,
  Download,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import securityService from 'services/securityService';
import profileService from 'services/profileService';
import toast from 'react-hot-toast';

const SecurityTab = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [twoFAStatus, setTwoFAStatus] = useState({ enabled: false });
  const [sessions, setSessions] = useState([]);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // ✅ Prevent duplicate fetches
  const hasFetchedSecurity = useRef(false);

  useEffect(() => {
    if (!hasFetchedSecurity.current) {
      hasFetchedSecurity.current = true;
      fetch2FAStatus();
      fetchSessions();
    }
  }, []);

  const fetch2FAStatus = async () => {
    try {
      const response = await securityService.get2FAStatus();
      if (response.success) {
        setTwoFAStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await securityService.getSessions();
      if (response.success) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setLoading(true);
      const response = await securityService.setup2FA();

      if (response.success) {
        setTwoFAData(response.data);
        setShow2FASetup(true);
      }
    } catch (error) {
      console.error('Setup 2FA error:', error);
      toast.error('Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      const response = await securityService.verify2FA(verificationCode);

      if (response.success) {
        toast.success('2FA enabled successfully!');
        setShow2FASetup(false);
        setTwoFAData(null);
        setVerificationCode('');
        hasFetchedSecurity.current = false; // ✅ Allow refetch
        fetch2FAStatus();
      }
    } catch (error) {
      console.error('Verify 2FA error:', error);
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter your 6-digit 2FA code:');
    if (!code) return;

    const password = prompt('Enter your password to confirm:');
    if (!password) return;

    try {
      setLoading(true);
      const response = await securityService.disable2FA(code, password);

      if (response.success) {
        toast.success('2FA disabled successfully');
        hasFetchedSecurity.current = false; // ✅ Allow refetch
        fetch2FAStatus();
      }
    } catch (error) {
      console.error('Disable 2FA error:', error);
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to revoke this session?')) {
      return;
    }

    try {
      const response = await securityService.revokeSession(sessionId);
      if (response.success) {
        toast.success('Session revoked');
        hasFetchedSecurity.current = false; // ✅ Allow refetch
        fetchSessions();
      }
    } catch (error) {
      console.error('Revoke session error:', error);
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('This will log you out from all other devices. Continue?')) {
      return;
    }

    try {
      const response = await securityService.revokeAllSessions();
      if (response.success) {
        toast.success('All sessions revoked');
        hasFetchedSecurity.current = false; // ✅ Allow refetch
        fetchSessions();
      }
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      toast.error('Failed to revoke sessions');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await profileService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        toast.success('Password changed successfully!');
        setShowChangePassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadBackupCodes = () => {
    const text = twoFAData.backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dealcross-2fa-backup-codes.txt';
    a.click();
    toast.success('Backup codes downloaded');
  };

  return (
    <div className="space-y-6">
      {/* 2FA Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Two-Factor Authentication (2FA)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>

          {twoFAStatus.enabled ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded-full text-sm font-medium">
              <XCircle className="w-4 h-4" />
              Disabled
            </span>
          )}
        </div>

        {!twoFAStatus.enabled && !show2FASetup && (
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Protect your account with an authenticator app like Google Authenticator or Authy.
            </p>
            <button
              onClick={handleSetup2FA}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {twoFAStatus.enabled && (
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Two-factor authentication is active on your account.
            </p>
            {twoFAStatus.lastVerified && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Last verified: {new Date(twoFAStatus.lastVerified).toLocaleString()}
              </p>
            )}
            <button
              onClick={handleDisable2FA}
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
            >
              Disable 2FA
            </button>
          </div>
        )}

        {/* 2FA Setup Modal */}
        {show2FASetup && twoFAData && (
          <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Setup Two-Factor Authentication
            </h4>

            {/* Step 1: Scan QR Code */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Step 1: Scan this QR code with your authenticator app
              </p>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg inline-block">
                <img src={twoFAData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            </div>

            {/* Step 2: Manual Entry */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-mono text-sm">
                  {twoFAData.manualEntry}
                </code>
                <button
                  onClick={() => copyToClipboard(twoFAData.manualEntry)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                >
                  <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Step 3: Backup Codes */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Step 2: Save your backup codes (in case you lose your device)
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium text-sm">Keep these codes safe!</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {twoFAData.backupCodes.map((code, idx) => (
                    <code key={idx} className="text-sm text-yellow-900 dark:text-yellow-200 font-mono">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
              <button
                onClick={downloadBackupCodes}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <Download className="w-4 h-4" />
                Download Backup Codes
              </button>
            </div>

            {/* Step 4: Verify */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Step 3: Enter the 6-digit code from your app to verify
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest"
                />
                <button
                  onClick={handleVerify2FA}
                  disabled={loading || verificationCode.length !== 6}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setShow2FASetup(false);
                setTwoFAData(null);
                setVerificationCode('');
              }}
              className="mt-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel Setup
            </button>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Password
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update your password regularly for better security
            </p>
          </div>
        </div>

        {!showChangePassword ? (
          <button
            onClick={() => setShowChangePassword(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 outline-none transition text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 outline-none transition text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 outline-none transition text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Laptop className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Sessions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage devices where you're currently logged in
              </p>
            </div>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllSessions}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition"
            >
              Revoke All
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No active sessions found
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session._id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {session.deviceInfo?.device === 'mobile' ? (
                      <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Laptop className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {session.deviceInfo?.browser || 'Unknown Browser'} on {session.deviceInfo?.os || 'Unknown OS'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {session.location?.city}, {session.location?.country} • Last active: {new Date(session.lastActivity).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeSession(session._id)}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityTab;