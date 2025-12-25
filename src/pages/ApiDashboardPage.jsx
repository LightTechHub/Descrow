// src/pages/API/ApiDashboardPage.jsx - REFINED & COMPLETE
import React, { useState, useEffect } from 'react';
import {
  Key, Copy, RefreshCw, AlertTriangle, CheckCircle, Loader,
  Code, BookOpen, TrendingUp, Lock, Shield, Globe, Save, TestTube
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ApiDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [password, setPassword] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  
  // Webhook config
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const availableEvents = [
    { value: 'escrow.created', label: 'Escrow Created' },
    { value: 'escrow.funded', label: 'Escrow Funded' },
    { value: 'escrow.delivered', label: 'Item Delivered' },
    { value: 'escrow.confirmed', label: 'Delivery Confirmed' },
    { value: 'escrow.cancelled', label: 'Escrow Cancelled' },
    { value: 'escrow.disputed', label: 'Escrow Disputed' }
  ];

  useEffect(() => {
    fetchApiUsage();
  }, []);

  const fetchApiUsage = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api-keys/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setApiData(response.data.data);
        setWebhookUrl(response.data.data.webhookUrl || '');
        setWebhookEvents(response.data.data.webhookEvents || []);
      }
    } catch (error) {
      console.error('Fetch API usage error:', error);
      if (error.response?.status === 403) {
        toast.error('API tier subscription required. Please upgrade!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateKeys = async () => {
    if (!password) {
      toast.error('Password required');
      return;
    }

    try {
      setRegenerating(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api-keys/regenerate`,
        { confirmPassword: password },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setNewCredentials(response.data.data);
        setShowRegenerateModal(false);
        setPassword('');
        toast.success('API keys regenerated! Old keys are now invalid.');
        setTimeout(() => fetchApiUsage(), 2000);
      }
    } catch (error) {
      console.error('Regenerate keys error:', error);
      toast.error(error.response?.data?.message || 'Failed to regenerate keys');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      setSavingWebhook(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/api-keys/webhook`,
        { webhookUrl, webhookEvents },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Webhook configuration saved!');
        fetchApiUsage();
      }
    } catch (error) {
      console.error('Save webhook error:', error);
      toast.error(error.response?.data?.message || 'Failed to save webhook');
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setTestingWebhook(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/api-keys/webhook/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Test webhook sent successfully!');
      }
    } catch (error) {
      console.error('Test webhook error:', error);
      toast.error(error.response?.data?.message || 'Webhook test failed');
    } finally {
      setTestingWebhook(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const toggleEvent = (eventValue) => {
    setWebhookEvents(prev => 
      prev.includes(eventValue)
        ? prev.filter(e => e !== eventValue)
        : [...prev, eventValue]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                API Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your API credentials and integration
              </p>
            </div>
          </div>
        </div>

        {/* New Credentials Alert */}
        {newCredentials && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 dark:text-red-100 mb-2">
                  ⚠️ SAVE THESE CREDENTIALS NOW!
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                  This is the ONLY time you'll see your API secret and webhook secret!
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                  API KEY
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded font-mono text-sm text-gray-900 dark:text-white break-all">
                    {newCredentials.apiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newCredentials.apiKey, 'API Key')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                  API SECRET
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded font-mono text-sm text-gray-900 dark:text-white break-all">
                    {newCredentials.apiSecret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newCredentials.apiSecret, 'API Secret')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {newCredentials.webhookSecret && (
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                    WEBHOOK SECRET
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded font-mono text-sm text-gray-900 dark:text-white break-all">
                      {newCredentials.webhookSecret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newCredentials.webhookSecret, 'Webhook Secret')}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setNewCredentials(null)}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
            >
              I've Saved My Credentials Securely
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* API Credentials */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Key className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    API Credentials
                  </h2>
                </div>
                {apiData?.apiKey && (
                  <button
                    onClick={() => setShowRegenerateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                )}
              </div>

              {apiData?.apiKey ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                      API KEY
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg font-mono text-sm text-gray-900 dark:text-white break-all">
                        {apiData.apiKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(apiData.apiKey, 'API Key')}
                        className="p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                      API SECRET
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
                        {'•'.repeat(48)}
                      </code><span className="text-xs text-gray-500 dark:text-gray-400">
                        (Hidden for security)
                      </span>
                    </div>
                  </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-900 dark:text-yellow-100 flex items-start gap-2">
                  <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    Your API secret is only shown once during generation. If lost, regenerate new credentials.
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No API Keys
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                API keys are auto-generated when you upgrade to API tier
              </p>
            </div>
          )}
        </div>

        {/* Webhook Configuration */}
        {apiData?.apiKey && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Webhook Configuration
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/webhook"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">
                  Events to Subscribe
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableEvents.map(event => (
                    <label
                      key={event.value}
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {event.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveWebhook}
                  disabled={savingWebhook || !webhookUrl}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingWebhook ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save
                    </>
                  )}
                </button>

                <button
                  onClick={handleTestWebhook}
                  disabled={testingWebhook || !webhookUrl}
                  className="px-4 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {testingWebhook ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-5 h-5" />
                      Test
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Documentation */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              API Documentation
            </h3>
          </div>
          <p className="text-blue-800 dark:text-blue-200 mb-4">
            Learn how to integrate Dealcross escrow services
          </p>
          <a
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            <Code className="w-5 h-5" />
            View API Docs
          </a>
        </div>
      </div>

      {/* Right Column - Stats */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              API Usage
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {apiData?.usage?.totalRequests?.toLocaleString() || 0}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Today</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {apiData?.usage?.requestsToday?.toLocaleString() || 0}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rate Limit</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {apiData?.rateLimit?.requestsPerMinute || 60} req/min
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {apiData?.rateLimit?.requestsPerDay === -1 
                  ? 'Unlimited' 
                  : `${apiData?.rateLimit?.requestsPerDay?.toLocaleString() || '0'} req/day`}
              </p>
            </div>

            {apiData?.usage?.lastUsedAt && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Used</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(apiData.usage.lastUsedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className={`border-2 rounded-xl p-6 ${
          apiData?.status === 'active'
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
            : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-3">
            {apiData?.status === 'active' ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    API Active
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Your API access is enabled
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-gray-600" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    No API Access
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    Upgrade to API tier
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Regenerate Modal */}
    {showRegenerateModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Regenerate API Keys
          </h3>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-900 dark:text-red-100">
              ⚠️ This will invalidate your current API keys immediately. Applications using old keys will stop working.
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowRegenerateModal(false);
                setPassword('');
              }}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRegenerateKeys}
              disabled={regenerating || !password}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>