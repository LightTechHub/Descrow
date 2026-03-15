// src/pages/APIPage.jsx
import React, { useEffect } from 'react';
import {
  Code, Zap, Shield, Globe, CheckCircle, ArrowRight,
  Book, Terminal, Lock, TrendingUp, Users
} from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { useNavigate, Link } from 'react-router-dom';

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
      title: 'Universal Escrow',
      description: 'Support any transaction type — goods, services, digital assets, or custom flows.'
    },
    {
      icon: Code,
      title: 'Developer-First',
      description: 'Clean REST API with detailed documentation, predictable responses, and simple integration.'
    }
  ];

  const endpoints = [
    { method: 'POST', path: '/api/v1/escrow/create', description: 'Create a new escrow transaction' },
    { method: 'GET',  path: '/api/v1/escrow/:id', description: 'Retrieve escrow details and status' },
    { method: 'PUT',  path: '/api/v1/escrow/:id/fund', description: 'Fund an escrow transaction' },
    { method: 'PUT',  path: '/api/v1/escrow/:id/deliver', description: 'Mark goods or service as delivered' },
    { method: 'PUT',  path: '/api/v1/escrow/:id/confirm', description: 'Confirm delivery and release funds to seller' }
  ];

  const codeExample = `// Initialize Dealcross API
const dealcross = require('dealcross-api');
const client = new dealcross.Client('YOUR_API_KEY');

// Create a universal escrow transaction
const escrow = await client.escrow.create({
  title: 'Website Development Project',
  amount: 1500.00,
  currency: 'USD',
  type: 'service',           // goods | service | digital | custom
  seller: 'dev@example.com',
  buyer: 'client@example.com',
  description: 'Full-stack web application build'
});

console.log('Escrow created:', escrow.escrowId);`;

  const pricingTiers = [
    { name: 'Starter', price: 'Free', requests: '100 req/day', desc: 'For testing and small integrations' },
    { name: 'Growth', price: '$49/mo', requests: '10K req/day', desc: 'For growing marketplaces' },
    { name: 'Enterprise', price: 'Custom', requests: 'Unlimited', desc: 'For large-scale platforms' }
  ];

  return (
    <>
      <SEOHead
        title="Dealcross Escrow API | Universal Escrow Integration"
        description="Integrate Dealcross universal escrow API into your marketplace, SaaS, or app. Protect any transaction type - goods, services, digital assets - with one API."
        keywords="escrow api, universal escrow api, payment protection api, dealcross api, marketplace escrow, transaction protection, rest api"
        canonical="https://dealcross.net/api"
      />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* HERO */}
        <section className="bg-gray-900 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Subtle grid bg */}
          <div className="absolute inset-0 opacity-5">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Blue accent glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600 rounded-full opacity-10 blur-3xl" />

          <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white mb-6">
                <Terminal className="w-4 h-4" />
                <span>API v1.0 · RESTful · Universal Escrow</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Dealcross<br />Escrow API
              </h1>

              <p className="text-xl text-gray-300 mb-8 max-w-lg">
                Add secure, universal escrow to any platform in minutes. Protect every transaction — goods, services, digital assets, and more.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-xl transition"
                >
                  Get API Access Free
                </button>
                <Link
                  to="/docs"
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg border border-white/20 backdrop-blur-sm transition flex items-center justify-center gap-2"
                >
                  <Book className="w-5 h-5" />
                  Documentation
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12">
                <div>
                  <p className="text-3xl font-bold text-blue-400">99.9%</p>
                  <p className="text-sm text-gray-400">Uptime SLA</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">&lt;100ms</p>
                  <p className="text-sm text-gray-400">Response Time</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">300+</p>
                  <p className="text-sm text-gray-400">Req/Minute</p>
                </div>
              </div>
            </div>

            {/* Right - Code Block */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="ml-auto text-xs text-gray-400 font-mono">escrow.js</span>
              </div>
              <pre className="text-sm text-gray-300 font-mono overflow-x-auto leading-relaxed">
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
            Enterprise-grade security, performance, and flexibility for any transaction type.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-800 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex justify-center items-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{f.description}</p>
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
              Simple, powerful endpoints for complete escrow lifecycle management
            </p>

            <div className="space-y-4 max-w-4xl mx-auto">
              {endpoints.map((endpoint, i) => (
                <div
                  key={i}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-600 transition"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold min-w-[52px] text-center ${
                      endpoint.method === 'POST' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      endpoint.method === 'GET'  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-gray-900 dark:text-white flex-1 break-all">
                      {endpoint.path}
                    </code>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-0 sm:ml-16">
                    {endpoint.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING TIERS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            API Pricing
          </h2>
          <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-12">
            Start free, scale as you grow
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <div
                key={i}
                className={`bg-white dark:bg-gray-900 rounded-xl p-6 border shadow-md text-center ${
                  i === 1
                    ? 'border-blue-500 dark:border-blue-600 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-950'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                {i === 1 && (
                  <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full mb-3">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tier.name}</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{tier.price}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{tier.requests}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{tier.desc}</p>
                <button
                  onClick={() => navigate('/signup')}
                  className={`w-full py-2 rounded-lg font-semibold transition ${
                    i === 1
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-blue-700 dark:bg-blue-800 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join developers building secure, universal escrow into their platforms
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-white hover:bg-gray-100 text-blue-700 rounded-xl font-bold text-lg shadow-xl transition"
              >
                Get API Access
              </button>
              {/* ✅ FIXED: was navigate('/api-dashboard') — correct internal route */}
              <Link
                to="/docs"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg border border-white/30 transition"
              >
                View Documentation
              </Link>
            </div>

            <p className="text-sm text-blue-200 mt-6">
              Start free · No credit card required · Upgrade anytime
            </p>
          </div>
        </section>

      </main>
    </>
  );
};

export default APIPage;
