// src/pages/ApiDocsPage.jsx - COMPLETE API DOCUMENTATION
import React, { useState } from 'react';
import { 
  Code, Copy, CheckCircle, ChevronDown, ChevronRight,
  Book, Zap, Shield, Key, Globe, Terminal
} from 'lucide-react';
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
    { id: 'introduction', title: 'Introduction', icon: Book },
    { id: 'authentication', title: 'Authentication', icon: Key },
    { id: 'errors', title: 'Errors', icon: Shield },
    { id: 'endpoints', title: 'Endpoints', icon: Globe },
    { id: 'webhooks', title: 'Webhooks', icon: Zap }
  ];

  const endpoints = [
    {
      method: 'POST',
      path: '/api/v1/escrow/create',
      title: 'Create Escrow',
      description: 'Create a new escrow transaction',
      auth: true,
      request: `{
  "title": "MacBook Pro 2023",
  "description": "16-inch M3 Max, 64GB RAM",
  "amount": 2500.00,
  "currency": "USD",
  "category": "electronics",
  "buyerEmail": "buyer@example.com",
  "sellerEmail": "seller@example.com",
  "type": "physical_goods",
  "inspectionPeriod": 7,
  "metadata": {
    "orderId": "ORD-12345"
  }
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
      method: 'GET',
      path: '/api/v1/escrow/:id',
      title: 'Get Escrow Details',
      description: 'Retrieve details of a specific escrow transaction',
      auth: true,
      request: null,
      response: `{
  "success": true,
  "data": {
    "escrowId": "esc_abc123xyz",
    "title": "MacBook Pro 2023",
    "amount": 2500.00,
    "currency": "USD",
    "status": "funded",
    "buyer": {
      "email": "buyer@example.com",
      "name": "John Doe"
    },
    "seller": {
      "email": "seller@example.com",
      "name": "Tech Store"
    },
    "timeline": {
      "created": "2025-01-15T10:30:00Z",
      "funded": "2025-01-15T11:00:00Z",
      "delivered": null,
      "confirmed": null
    },
    "inspectionPeriod": {
      "enabled": true,
      "duration": 7,
      "expiresAt": null
    }
  }
}`
    },
    {
      method: 'PUT',
      path: '/api/v1/escrow/:id/deliver',
      title: 'Mark as Delivered',
      description: 'Seller marks the item as delivered',
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
      method: 'PUT',
      path: '/api/v1/escrow/:id/confirm',
      title: 'Confirm Delivery',
      description: 'Buyer confirms receipt and releases funds',
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
      method: 'POST',
      path: '/api/v1/escrow/:id/dispute',
      title: 'Raise Dispute',
      description: 'Buyer raises a dispute about the transaction',
      auth: true,
      request: `{
  "reason": "item_not_as_described",
  "description": "The laptop is damaged and not as described in listing",
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
      method: 'GET',
      path: '/api/v1/escrows',
      title: 'List Escrows',
      description: 'Retrieve a list of escrow transactions',
      auth: true,
      request: null,
      response: `{
  "success": true,
  "data": [
    {
      "escrowId": "esc_abc123xyz",
      "title": "MacBook Pro 2023",
      "amount": 2500.00,
      "currency": "USD",
      "status": "completed",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">
              API Documentation
            </h1>
          </div>
          <p className="text-xl text-gray-300">
            Complete guide to integrating Dealcross Escrow API
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Contents
            </h3>
            <nav className="space-y-2">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setOpenSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition ${
                      openSection === section.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">

          {/* Introduction */}
          {openSection === 'introduction' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Introduction
              </h2>
              
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                The Dealcross Escrow API is a RESTful API that allows you to integrate secure escrow services into your platform. Our API handles everything from creating escrow transactions to releasing payments.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Base URL
                </h3>
                <code className="text-sm text-blue-700 dark:text-blue-300">
                  https://api.dealcross.net/v1
                </code>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Quick Start
              </h3>

              <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-gray-300">
                <li>Sign up and upgrade to API tier</li>
                <li>Generate your API keys from the dashboard</li>
                <li>Make your first API request</li>
                <li>Configure webhooks to receive event notifications</li>
              </ol>
            </div>
          )}

          {/* Authentication */}
          {openSection === 'authentication' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Authentication
              </h2>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                The Dealcross API uses API keys to authenticate requests. Include your API key in the <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">X-API-Key</code> header of every request.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Example Request
                  </h3>
                  <button
                    onClick={() => copyCode(`curl https://api.dealcross.net/v1/escrow/create \\
  -H "X-API-Key: dk_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Test Escrow","amount":100}'`, 'auth-curl')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                  >
                    {copiedCode === 'auth-curl' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
                <pre className="text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">
{`curl https://api.dealcross.net/v1/escrow/create \\
  -H "X-API-Key: dk_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Test Escrow","amount":100}'`}
                </pre>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  🔒 Keep Your API Keys Secure
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Never expose your API keys in client-side code or public repositories. Always store them securely on your server.
                </p>
              </div>
            </div>
          )}

          {/* Errors */}
          {openSection === 'errors' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Error Handling
              </h2>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                The Dealcross API uses conventional HTTP response codes to indicate the success or failure of an API request.
              </p>

              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    200 - OK
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Everything worked as expected.
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    400 - Bad Request
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The request was unacceptable, often due to missing a required parameter.
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    401 - Unauthorized
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No valid API key provided.
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    403 - Forbidden
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The API key doesn't have permissions to perform the request.
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    404 - Not Found
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The requested resource doesn't exist.
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    429 - Too Many Requests
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Too many requests hit the API too quickly. Rate limit exceeded.
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    500 - Internal Server Error
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Something went wrong on Dealcross's end.
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Error Response Format
                </h3>
                <pre className="text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">
{`{
  "success": false,
  "error": "INVALID_API_KEY",
  "message": "The provided API key is invalid or revoked"
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Endpoints */}
          {openSection === 'endpoints' && (
            <div className="space-y-6">
              {endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      endpoint.method === 'POST' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      endpoint.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-gray-900 dark:text-white">
                      {endpoint.path}
                    </code>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {endpoint.title}
                  </h3>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    {endpoint.description}
                  </p>

                  {endpoint.auth && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Requires authentication
                      </p>
                    </div>
                  )}

                  {endpoint.request && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Request Body
                        </h4>
                        <button
                          onClick={() => copyCode(endpoint.request, `req-${index}`)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                        >
                          {copiedCode === `req-${index}` ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                      <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">
                        {endpoint.request}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Response
                      </h4>
                      <button
                        onClick={() => copyCode(endpoint.response, `res-${index}`)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                      >
                        {copiedCode === `res-${index}` ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                    <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">
                      {endpoint.response}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Webhooks */}
          {openSection === 'webhooks' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Webhooks
              </h2>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Webhooks allow you to receive real-time notifications when events occur in your escrow transactions. Configure your webhook URL in the API Dashboard.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Available Events
              </h3>

              <div className="space-y-3 mb-6">
                {[
                  { event: 'escrow.created', desc: 'New escrow transaction created' },
                  { event: 'escrow.funded', desc: 'Buyer has funded the escrow' },
                  { event: 'escrow.delivered', desc: 'Seller marked as delivered' },
                  { event: 'escrow.confirmed', desc: 'Buyer confirmed receipt' },
                  { event: 'escrow.cancelled', desc: 'Escrow was cancelled' },
                  { event: 'escrow.disputed', desc: 'Dispute was raised' }
                ].map((item, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                      {item.event}
                    </code>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1”>
{item.desc}
</p>
</div>
))}
</div>
 <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Webhook Payload Example
          </h3>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <pre className="text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">
{{ "event": "escrow.funded", "timestamp": "2025-01-15T11:00:00Z", "data": { "escrowId": "esc_abc123xyz", "status": "funded", "amount": 2500.00, "currency": "USD" } }}
</pre>
</div>
<div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Verify Webhook Signatures
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Always verify webhook signatures using the <code className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded">X-Dealcross-Signature</code> header to ensure the request is from Dealcross.
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
