// src/pages/API/ApiDashboardPage.jsx - COMPLETE API DASHBOARD
import React, { useState, useEffect } from 'react';
import {
  Key, Copy, Eye, EyeOff, RefreshCw, AlertTriangle, CheckCircle,
  Loader, Code, BookOpen, TrendingUp, Lock, Zap, Shield,
  Globe, Save, TestTube
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ApiDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [password, setPassword] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  
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

  const handleRegenerate = async () => {
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