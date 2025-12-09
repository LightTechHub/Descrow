import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Globe, 
  Moon, 
  Sun, 
  DollarSign,
  Trash2,
  Save,
  Loader,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import notificationService from 'services/notificationService';
import profileService from 'services/profileService';
import toast from 'react-hot-toast';

const SettingsTab = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [notificationSettings, setNotificationSettings] = useState({
    email: {
      escrowUpdates: true,
      messages: true,
      disputes: true,
      payments: true,
      marketing: false
    },
    push: {
      escrowUpdates: true,
      messages: true,
      disputes: true,
      payments: true
    }
  });
  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD'
  });
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    password: '',
    reason: '',
    confirmText: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Prevent duplicate fetches
  const hasFetchedSettings = useRef(false);

  useEffect(() => {
    if (!hasFetchedSettings.current) {
      hasFetchedSettings.current = true;
      fetchNotificationSettings();
    }
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      const response = await notificationService.getSettings();
      if (response.success) {
        setNotificationSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
      // ✅ Set default if error
      setNotificationSettings({
        email: {
          escrowUpdates: true,
          messages: true,
          disputes: true,
          payments: true,
          marketing: false
        },
        push: {
          escrowUpdates: true,
          messages: true,
          disputes: true,
          payments: true
        }
      });
    }
  };

  const handleDarkModeToggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    toast.success(`${newMode ? 'Dark' : 'Light'} mode enabled`);
  };

  const handleNotificationChange = (category, type, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: value
      }
    }));
  };

  const handleSaveNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.updateSettings(notificationSettings);

      if (response.success) {
        toast.success('Notification settings updated!');
      }
    } catch (error) {
      console.error('Update notifications error:', error);
      toast.error('Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();

    if (deleteConfirmation.confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    if (!deleteConfirmation.password) {
      toast.error('Password is required');
      return;
    }

    try {
      setLoading(true);
      const response = await profileService.deleteAccount(
        deleteConfirmation.password,
        deleteConfirmation.reason
      );

      if (response.success) {
        toast.success('Account deleted successfully');
        localStorage.clear();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            {darkMode ? (
              <Moon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            ) : (
              <Sun className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            )}
          </div>
          <div>
            <h​​​​​​​​​​​​​​​​<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Appearance
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Customize how Dealcross looks on your device
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use dark theme across the application
            </p>
          </div>
          <button
            onClick={handleDarkModeToggle}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              darkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notification Preferences
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose how you want to be notified
            </p>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
            Email Notifications
          </h4>
          <div className="space-y-3">
            {Object.entries({
              escrowUpdates: 'Escrow Updates',
              messages: 'New Messages',
              disputes: 'Dispute Alerts',
              payments: 'Payment Confirmations',
              marketing: 'Marketing & Promotions'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-900 dark:text-white">{label}</span>
                <button
                  onClick={() => handleNotificationChange('email', key, !notificationSettings.email[key])}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    notificationSettings.email[key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      notificationSettings.email[key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
            Push Notifications
          </h4>
          <div className="space-y-3">
            {Object.entries({
              escrowUpdates: 'Escrow Updates',
              messages: 'New Messages',
              disputes: 'Dispute Alerts',
              payments: 'Payment Confirmations'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-900 dark:text-white">{label}</span>
                <button
                  onClick={() => handleNotificationChange('push', key, !notificationSettings.push[key])}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    notificationSettings.push[key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      notificationSettings.push[key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSaveNotifications}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Preferences
            </>
          )}
        </button>
      </div>

      {/* Regional Settings */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Globe className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Regional Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set your language, timezone, and currency preferences
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 outline-none transition text-gray-900 dark:text-white"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 outline-none transition text-gray-900 dark:text-white"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Africa/Lagos">Lagos (WAT)</option>
              <option value="Asia/Dubai">Dubai (GST)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferred Currency
            </label>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 outline-none transition text-gray-900 dark:text-white"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="AED">AED - UAE Dirham</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Danger Zone
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              Permanently delete your account and all associated data
            </p>
          </div>
        </div>

        {!showDeleteAccount ? (
          <div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  <p className="font-medium mb-1">Warning: This action is irreversible</p>
                  <ul className="space-y-1 text-red-700 dark:text-red-300">
                    <li>• All your escrows will be closed</li>
                    <li>• Your profile and data will be permanently deleted</li>
                    <li>• You will lose access to all messages and history</li>
                    <li>• Any pending transactions will be cancelled</li>
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Delete My Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for leaving (optional)
              </label>
              <textarea
                value={deleteConfirmation.reason}
                onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, reason: e.target.value })}
                rows={3}
                placeholder="Help us improve by telling us why you're leaving..."
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 outline-none transition text-gray-900 dark:text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your password to confirm
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={deleteConfirmation.password}
                  onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, password: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 outline-none transition text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation.confirmText}
                onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, confirmText: e.target.value })}
                required
                placeholder="DELETE"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 outline-none transition text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAccount(false);
                  setDeleteConfirmation({
                    password: '',
                    reason: '',
                    confirmText: ''
                  });
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || deleteConfirmation.confirmText !== 'DELETE'}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin inline mr-2" />
                    Deleting Account...
                  </>
                ) : (
                  'Delete Account Permanently'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SettingsTab;