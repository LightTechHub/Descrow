// File: src/pages/AboutPage.jsx
import React, { useEffect } from 'react';
import { Shield, Users, Zap, Award, CheckCircle, Globe, Lock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

const AboutPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const values = [
    {
      icon: Shield,
      title: 'Security First',
      description: 'Every transaction is protected with bank-level encryption, multi-layer security protocols, and real-time fraud detection.'
    },
    {
      icon: Users,
      title: 'Buyer & Seller Focused',
      description: 'We protect both sides of every deal — buyers get guaranteed delivery, sellers get guaranteed payment.'
    },
    {
      icon: Globe,
      title: 'Universal Coverage',
      description: 'From physical goods to digital services, freelance work to real estate - our escrow works for any transaction type, any currency, anywhere.'
    },
    {
      icon: Award,
      title: 'Trusted Platform',
      description: 'Thousands of successful escrow transactions completed with zero fraud incidents since launch.'
    }
  ];

  const stats = [
    { number: '50K+', label: 'Active Users' },
    { number: '100K+', label: 'Escrow Transactions' },
    { number: '$10M+', label: 'Funds Secured' },
    { number: '99.9%', label: 'Uptime' }
  ];

  const useCases = [
    'Physical goods & e-commerce',
    'Freelance & service contracts',
    'Digital assets & downloads',
    'Real estate & property deals',
    'Domain & website sales',
    'Vehicle & equipment purchases',
    'Business acquisitions',
    'Cross-border transactions'
  ];

  return (
    <>
      <SEOHead
        title="About Dealcross | Universal Escrow Platform"
        description="Dealcross is a universal escrow platform protecting buyers and sellers across every transaction type - goods, services, digital assets, and more. Learn about our mission."
        keywords="about dealcross, universal escrow platform, secure transactions, buyer seller protection, escrow service"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* Hero */}
        <div className="bg-blue-700 dark:bg-blue-900 py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-800 rounded-full text-sm text-blue-100 mb-6">
              <Shield className="w-4 h-4" />
              <span>Universal Escrow — Any Deal, Any Currency</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              About Dealcross
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              We built the world's most flexible escrow platform — so every buyer and seller, anywhere, can transact with complete confidence.
            </p>
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Our Mission
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed text-center max-w-4xl mx-auto">
              At Dealcross, we believe that anyone should be able to transact online without fear.
              Whether you're a buyer purchasing goods from a stranger, a freelancer awaiting payment for your work,
              or a business closing a major deal - our universal escrow platform holds funds securely until
              both parties are satisfied. No more fraud. No more disputes left unresolved. Just safe, transparent,
              and fair transactions for everyone.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-medium text-sm md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="bg-white dark:bg-gray-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              Our Core Values
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              The principles that guide how we build, operate, and support every user on the platform.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <div key={index} className="text-center px-2">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                      {value.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Universal Use Cases */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 md:p-12 border border-blue-200 dark:border-blue-800">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                One Platform. Every Transaction Type.
              </h2>
              <p className="text-center text-gray-500 dark:text-gray-400 mb-10">
                Dealcross is built to protect deals across every industry and category.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {useCases.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-white dark:bg-gray-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              Why Choose Dealcross?
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
              Built for the modern economy — secure, flexible, and transparent.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {[
                'Bank-level encryption for all transactions',
                'Real-time tracking and status notifications',
                '24/7 customer support',
                'Dispute resolution within 48 hours',
                'Multi-currency support - NGN, USD, crypto & more',
                'No hidden fees - transparent pricing',
                'KYC-verified users for maximum safety',
                'Mobile-friendly on every screen size'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 transition">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 font-medium text-sm md:text-base">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ⚠️ COMPANY INFO NEEDED: Replace placeholder team section or remove if not ready */}
        {/* Team section omitted until real team photos/bios are available */}

        {/* CTA */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-blue-700 dark:bg-blue-800 rounded-2xl p-8 md:p-12 text-center">
            <TrendingUp className="w-12 h-12 text-blue-200 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transact Securely?
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of buyers and sellers who trust Dealcross to protect every deal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-block px-8 py-4 bg-white text-blue-700 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
              >
                Create Free Account
              </Link>
              <Link
                to="/contact"
                className="inline-block px-8 py-4 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-500 transition border border-blue-500"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default AboutPage;
