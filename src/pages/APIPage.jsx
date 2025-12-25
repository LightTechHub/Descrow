// src/pages/APIPage.jsx - MARKETING PAGE FOR API
import React, { useEffect } from 'react';
import { 
  Code, Zap, Shield, Globe, CheckCircle, ArrowRight, 
  Book, Terminal, Lock, TrendingUp, Users 
} from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { useNavigate } from 'react-router-dom';

const APIPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Sub-100ms response time and 99.9% uptime for mission-critical applications.'
    },
    {
      icon: Shield,
      title: 'Secure by Default',
      description: 'Bank-grade encryption, API key authentication, and advanced rate limiting.'
    },
    {
      icon: Globe,
      title: 'Global Infrastructure',
      description: 'Worldwide edge routing ensuring low-latency escrow API requests.'
    },
    {
      icon: Code,
      title: 'Developer-First',
      description: 'REST API with detailed documentation, SDKs, and simple integration.'
    }
  ];

  const endpoints = [
    { method: 'POST', path: '/api/v1/escrow/create', description: 'Create a new escrow transaction' },
    { method: 'GET', path: '/api/v1/escrow/:id', description: 'Retrieve escrow details' },
    { method: 'PUT', path: '/api/v1/escrow/:id/fund', description: 'Fund an escrow transaction' },
    { method: 'PUT', path: '/api/v1/escrow/:id/deliver', description: 'Mark items as delivered' },
    { method: 'PUT', path: '/api/v1/escrow/:id/confirm', description: 'Confirm delivery and release funds' }
  ];

  const codeExample = `// Initialize Dealcross API
const dealcross = require('dealcross-api');
const client = new dealcross.Client('YOUR_API_KEY');

// Create an escrow transaction
const escrow = await client.escrow.create({
  title: 'MacBook Pro 2023',
  amount: 2500.00,
  currency: 'USD',
  seller: 'seller@example.com',
  buyer: 'buyer@example.com',
  description: '16" M3 Max, 64GB RAM'
});

console.log('Escrow created:', escrow.id);`;

  return (
    <>
      <SEOHead
        title="Dealcross Escrow API | Fast, Secure, Developer-Friendly API Integration"
        description="Integrate the Dealcross escrow API into your platform. Fast response time, secure global infrastructure, and developer-friendly REST API with complete documentation."
        keywords="escrow api, payment api, secure api, dealcross api, transaction protection, developer api, rest api, escrow integration"
        canonical="https://dealcross.net/api"
      />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* HERO SECTION */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-grid-pattern"></div>
          </div>

          <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* LEFT CONTENT */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white mb-6">
                <Terminal className="w-4 h-4" />
                <span>API Version 1.0 • RESTful</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Dealcross Escrow API
              </h1>

              <p className="text-xl text-gray-300 mb-8 max-w-lg">
                Integrate secure escrow payments into your marketplace, SaaS product, or mobile app in minutes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-xl transition"
                >
                  Get Started Free
                </button>

                <button
                  onClick={() => navigate('/api-dashboard')}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg border border-white/20 backdrop-blur-sm transition flex items-center justify-center gap-2"
                >
                  <Book className="w-5 h-5" />
                  View Documentation
                </button>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-3 gap-6 mt-12">
                <div>
                  <p className="text-3xl font-bold text-blue-400">99.9%</p>
                  <p className="text-sm text-gray-300">Uptime SLA</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">&lt;100ms</p>
                  <p className="text-sm text-gray-300">Response Time</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">300+</p>
                  <p className="text-sm text-gray-300">Req/Minute</p>
                </div>
              </div>
            </div>

            {/* RIGHT CODE BLOCK */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="ml-auto text-xs text-gray-400 font-mono">escrow.js</span>
              </div>

              <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
                <code>{codeExample}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Why Developers Choose Our API
          </h2>

          <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-12">
            Enterprise-grade security, performance, and reliability.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-800 hover:shadow-xl transition"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex justify-center items-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* API ENDPOINTS */}
        <section className="bg-white dark:bg-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
              Core API Endpoints
            </h2>

            <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-12">
              Simple, powerful endpoints for complete escrow management
            </p>

            <div className="space-y-4 max-w-4xl mx-auto">
              {endpoints.map((endpoint, i) => (
                <div
                  key={i}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      endpoint.method === 'POST' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      endpoint.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-gray-900 dark:text-white flex-1">
                      {endpoint.path}
                    </code>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {endpoint.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join hundreds of developers building secure escrow solutions
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 rounded-xl font-bold text-lg shadow-xl transition"
              >
                Get API Access
              </button>

              <button
                onClick={() => navigate('/api-dashboard')}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg border border-white/20 backdrop-blur-sm transition"
              >
                View Documentation
              </button>
            </div>

            <p className="text-sm text-blue-100 mt-6">
              Start free • No credit card required • Upgrade anytime
            </p>
          </div>
        </section>

      </main>
    </>
  );
};

export default APIPage;
