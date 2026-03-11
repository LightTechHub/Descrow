// File: src/pages/ApiDocsPage.jsx
// ✅ FIXED: Removed fake phone number from support section
// ✅ FIXED: Mobile sizing and responsive layout
// ✅ NOTE: USD amounts kept intentionally — Dealcross is a universal escrow platform
import React, { useState } from 'react';
import { Code, Copy, CheckCircle, Book, Zap, Shield, Key, Globe, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

const ApiDocsPage = () => {
  const [openSection, setOpenSection] = useState('authentication');
  const [copiedCode, setCopiedCode] = useState(null);

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'introduction',    title: 'Introduction',    icon: Book },
    { id: 'authentication',  title: 'Authentication',  icon: Key },
    { id: 'errors',          title: 'Errors',          icon: Shield },
    { id: 'endpoints',       title: 'Endpoints',       icon: Globe },
    { id: 'webhooks',        title: 'Webhooks',        icon: Zap },
  ];

  const endpoints = [
    {
      method: 'POST', path: '/api/v1/escrow/create', title: 'Create Escrow',
      description: 'Create a new escrow transaction between a buyer and seller.',
      auth: true,
      request: `{
  "title": "MacBook Pro 2024",
  "description": "16-inch M3 Max, 64GB RAM",
  "amount": 2500.00,
  "currency": "USD",
  "category": "electronics",
  "buyerEmail": "buyer@example.com",
  "sellerEmail": "seller@example.com",
  "type": "physical_goods",
  "inspectionPeriod": 7,
  "metadata": { "orderId": "ORD-12345" }
}`,
      response: `{
  "success": true,
  "data": {
    "escrowId": "esc_abc123xyz",
    "status": "pending",
    "amount": 2500.00,
    "currency": "USD",
    "paymentUrl": "https://pay.dealcross.net/esc_abc123xyz",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}`
    },
    {
      method: 'GET', path: '/api/v1/escrow/:id', title: 'Get Escrow Details',
      description: 'Retrieve details of a specific escrow transaction.',
      auth: true, request: null,
      response: `{
  "success": true,
  "data": {
    "escrowId": "esc_abc123xyz",
    "title": "MacBook Pro 2024",
    "amount": 2500.00,
    "currency": "USD",
    "status": "funded",
    "buyer": { "email": "buyer@example.com", "name": "John Doe" },
    "seller": { "email": "seller@example.com", "name": "Tech Store" },
    "timeline": {
      "created": "2025-01-15T10:30:00Z",
      "funded": "2025-01-15T11:00:00Z",
      "delivered": null,
      "confirmed": null
    },
    "inspectionPeriod": { "enabled": true, "duration": 7, "expiresAt": null }
  }
}`
    },
    {
      method: 'PUT', path: '/api/v1/escrow/:id/deliver', title: 'Mark as Delivered',
      description: 'Seller marks the item/service as delivered.',
      auth: true,
      request: `{
  "trackingNumber": "FDX123456789",
  "shippingProvider": "FedEx",
  "notes": "Item shipped via overnight delivery",
  "proofOfShipment": "https://example.com/proof.pdf"
}`,
      response: `{
  "success": true,
  "data": {
    "escrowId": "esc_abc123xyz",
    "status": "delivered",
    "delivery": {
      "deliveredAt": "2025-01-16T14:30:00Z",
      "trackingNumber": "FDX123456789",
      "inspectionPeriod": {
        "startsAt": "2025-01-16T14:30:00Z",
        "expiresAt": "2025-01-23T14:30:00Z"
      }
    }
  }
}`
    },
    {
      method: 'PUT', path: '/api/v1/escrow/:id/confirm', title: 'Confirm Delivery',
      description: 'Buyer confirms receipt and releases funds to seller.',
      auth: true,
      request: `{
  "rating": 5,
  "review": "Great product, fast shipping!",
  "feedback": "positive"
}`,
      response: `{
  "success": true,
  "data": {
    "escrowId": "esc_abc123xyz",
    "status": "completed",
    "confirmedAt": "2025-01-17T10:00:00Z",
    "payout": {
      "amount": 2437.50,
      "currency": "USD",
      "recipient": "seller@example.com",
      "status": "processing",
      "estimatedArrival": "2025-01-18T10:00:00Z"
    }
  }
}`
    },
    {
      method: 'POST', path: '/api/v1/escrow/:id/dispute', title: 'Raise Dispute',
      description: 'Buyer raises a dispute about the transaction.',
      auth: true,
      request: `{
  "reason": "item_not_as_described",
  "description": "The laptop is damaged and not as described",
  "evidence": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ],
  "requestedResolution": "refund"
}`,
      response: `{
  "success": true,
  "data": {
    "disputeId": "dsp_xyz789",
    "escrowId": "esc_abc123xyz",
    "status": "under_review",
    "raisedBy": "buyer",
    "raisedAt": "2025-01-17T12:00:00Z",
    "deadline": "2025-01-24T12:00:00Z",
    "arbitratorAssigned": true
  }
}`
    },
    {
      method: 'GET', path: '/api/v1/escrows', title: 'List Escrows',
      description: 'Retrieve a paginated list of escrow transactions.',
      auth: true, request: null,
      response: `{
  "success": true,
  "data": [
    {
      "escrowId": "esc_abc123xyz",
      "title": "MacBook Pro 2024",
      "amount": 2500.00,
      "currency": "USD",
      "status": "completed",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}`
    }
  ];

  const CodeBlock = ({ code, id, label }) => (
    <div className="mb-5 sm:mb-6">
      {label && <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center justify-between">
        {label}
        <button onClick={() => copyCode(code, id)} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition">
          {copiedCode === id ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />}
        </button>
      </h4>}
      <pre className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 sm:p-6 text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 sm:py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <Terminal className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">API Documentation</h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-300">Complete guide to integrating Dealcross Escrow API</p>
          <p className="text-sm text-gray-500 mt-2">Base URL: <code className="text-blue-400">https://api.dealcross.net/v1</code></p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 flex flex-col lg:grid lg:grid-cols-4 gap-6 sm:gap-8">

        {/* Sidebar — horizontal scroll on mobile */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 hidden lg:block">Contents</h3>
            {/* On mobile: horizontal scrollable tab row */}
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-hide">
              {sections.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setOpenSection(s.id)}
                    className={`flex-shrink-0 lg:flex-shrink flex items-center gap-2 px-3 py-2 rounded-lg text-left transition text-xs sm:text-sm font-medium whitespace-nowrap lg:whitespace-normal ${
                      openSection === s.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{s.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6 sm:space-y-8">

          {openSection === 'introduction' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Introduction</h2>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-5 sm:mb-6 leading-relaxed">
                The Dealcross Escrow API is a RESTful API that allows you to integrate universal escrow services into your platform. Our API handles everything from creating escrow transactions to releasing payments, supporting fiat currencies and cryptocurrencies worldwide.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-6 mb-5 sm:mb-6">
                <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100 mb-2">Base URL</h3>
                <code className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">https://api.dealcross.net/v1</code>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Quick Start</h3>
              <ol className="space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                {[
                  'Sign up and upgrade to API tier from your dashboard',
                  'Generate your API keys from API Settings',
                  'Make your first API request using the examples below',
                  'Configure webhooks to receive real-time event notifications'
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-5 sm:mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Need API access? <a href="/upgrade" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Upgrade to API tier →</a>
                </p>
              </div>
            </div>
          )}

          {openSection === 'authentication' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Authentication</h2>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-5 sm:mb-6 leading-relaxed">
                The Dealcross API uses API keys to authenticate requests. Include your API key in the{' '}
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs sm:text-sm">X-API-Key</code> header of every request.
              </p>
              <CodeBlock
                id="auth-curl"
                label="Example Request (cURL)"
                code={`curl https://api.dealcross.net/v1/escrow/create \\
  -H "X-API-Key: dk_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Test Escrow","amount":100}'`}
              />
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 sm:p-6">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm sm:text-base mb-2">🔒 Keep Your API Keys Secure</h4>
                <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                  Never expose your API keys in client-side code or public repositories. Always store them as environment variables on your server.
                </p>
              </div>
            </div>
          )}

          {openSection === 'errors' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Error Handling</h2>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-5 sm:mb-6 leading-relaxed">
                The Dealcross API uses standard HTTP response codes to indicate success or failure.
              </p>
              <div className="space-y-2 sm:space-y-3">
                {[
                  { code: '200', label: 'OK',                     desc: 'Everything worked as expected.' },
                  { code: '400', label: 'Bad Request',            desc: 'The request was unacceptable, often due to a missing required parameter.' },
                  { code: '401', label: 'Unauthorized',           desc: 'No valid API key provided.' },
                  { code: '403', label: 'Forbidden',              desc: 'The API key doesn\'t have permissions to perform the request.' },
                  { code: '404', label: 'Not Found',              desc: 'The requested resource doesn\'t exist.' },
                  { code: '429', label: 'Too Many Requests',      desc: 'Rate limit exceeded. Slow down and retry after a moment.' },
                  { code: '500', label: 'Internal Server Error',  desc: 'Something went wrong on Dealcross\'s end.' },
                ].map(({ code, label, desc }) => (
                  <div key={code} className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        code.startsWith('2') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        code.startsWith('4') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>{code}</span>
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{label}</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 sm:mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 sm:p-6">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3">Error Response Format</h3>
                <pre className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">{`{
  "success": false,
  "error": "INVALID_API_KEY",
  "message": "The provided API key is invalid or revoked"
}`}</pre>
              </div>
            </div>
          )}

          {openSection === 'endpoints' && (
            <div className="space-y-5 sm:space-y-6">
              {endpoints.map((ep, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      ep.method === 'POST' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      ep.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    }`}>{ep.method}</span>
                    <code className="text-xs sm:text-sm font-mono text-gray-900 dark:text-white break-all">{ep.path}</code>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{ep.title}</h3>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 sm:mb-6">{ep.description}</p>
                  {ep.auth && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                      <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Requires authentication
                      </p>
                    </div>
                  )}
                  {ep.request && <CodeBlock id={`req-${i}`} label="Request Body" code={ep.request} />}
                  <CodeBlock id={`res-${i}`} label="Response" code={ep.response} />
                </div>
              ))}
            </div>
          )}

          {openSection === 'webhooks' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Webhooks</h2>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-5 sm:mb-6 leading-relaxed">
                Webhooks allow you to receive real-time notifications when events occur in your escrow transactions. Configure your webhook URL in your API Dashboard settings.
              </p>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Available Events</h3>
              <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                {[
                  { event: 'escrow.created',   desc: 'New escrow transaction created' },
                  { event: 'escrow.funded',     desc: 'Buyer has funded the escrow' },
                  { event: 'escrow.delivered',  desc: 'Seller marked as delivered' },
                  { event: 'escrow.confirmed',  desc: 'Buyer confirmed receipt — funds released' },
                  { event: 'escrow.cancelled',  desc: 'Escrow was cancelled by either party' },
                  { event: 'escrow.disputed',   desc: 'A dispute was raised on the transaction' },
                ].map((item, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 sm:p-4">
                    <code className="text-xs sm:text-sm font-mono text-blue-600 dark:text-blue-400">{item.event}</code>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Webhook Payload Example</h3>
              <CodeBlock id="webhook-payload" code={`{
  "event": "escrow.funded",
  "timestamp": "2025-01-15T11:00:00Z",
  "data": {
    "escrowId": "esc_abc123xyz",
    "status": "funded",
    "amount": 2500.00,
    "currency": "USD"
  }
}`} />
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 sm:p-6 mt-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm sm:text-base mb-2">Verify Webhook Signatures</h4>
                <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                  Always verify webhook signatures using the{' '}
                  <code className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">X-Dealcross-Signature</code>{' '}
                  header to confirm the request genuinely came from Dealcross.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 sm:p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Questions about the API? Contact us at{' '}
                  <a href="mailto:api@dealcross.net" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">api@dealcross.net</a>
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ApiDocsPage;
