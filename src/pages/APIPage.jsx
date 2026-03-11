// File: src/pages/DocsPage.jsx
import React, { useEffect, useState } from 'react';
// ✅ FIXED: Removed unused 'FileText' import
import { Book, Search, Shield, Zap, CreditCard, Users, HelpCircle, ChevronRight, Globe, Lock } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { Link } from 'react-router-dom';

const DocsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const categories = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: Zap,
      color: 'blue',
      articles: [
        { title: 'Creating Your First Escrow', slug: 'creating-first-escrow', time: '5 min read' },
        { title: 'How to Verify Your Account (KYC)', slug: 'verify-account', time: '3 min read' },
        { title: 'Understanding the Escrow Process', slug: 'escrow-process', time: '7 min read' },
        { title: 'Supported Transaction Types', slug: 'transaction-types', time: '4 min read' }
      ]
    },
    {
      id: 'buyers-guide',
      name: "Buyer's Guide",
      icon: Users,
      color: 'blue',
      articles: [
        { title: 'How to Buy Safely with Escrow', slug: 'buy-safely', time: '6 min read' },
        { title: 'Making a Payment', slug: 'making-payment', time: '4 min read' },
        { title: 'Confirming Receipt & Releasing Funds', slug: 'confirm-receipt', time: '3 min read' },
        { title: 'Opening a Dispute', slug: 'open-dispute', time: '5 min read' }
      ]
    },
    {
      id: 'sellers-guide',
      name: "Seller's Guide",
      icon: Shield,
      color: 'blue',
      articles: [
        { title: 'How to Sell Safely with Escrow', slug: 'sell-safely', time: '6 min read' },
        { title: 'Accepting Escrow Invitations', slug: 'accept-payments', time: '4 min read' },
        { title: 'Delivery & Proof of Service', slug: 'delivery-proof', time: '5 min read' },
        { title: 'Receiving Your Funds to Wallet', slug: 'receive-funds', time: '3 min read' }
      ]
    },
    {
      id: 'payments',
      name: 'Payments & Fees',
      icon: CreditCard,
      color: 'blue',
      articles: [
        { title: 'Supported Payment Methods', slug: 'payment-methods-supported', time: '4 min read' },
        { title: 'Understanding Fees', slug: 'understanding-fees', time: '5 min read' },
        { title: 'Wallet & Withdrawal Process', slug: 'withdrawal-process', time: '4 min read' },
        { title: 'Refund & Dispute Policy', slug: 'refund-policy', time: '3 min read' }
      ]
    },
    {
      id: 'universal-escrow',
      name: 'Universal Escrow',
      icon: Globe,
      color: 'blue',
      articles: [
        { title: 'Escrow for Physical Goods', slug: 'physical-goods', time: '5 min read' },
        { title: 'Escrow for Freelance Services', slug: 'freelance-services', time: '4 min read' },
        { title: 'Escrow for Digital Assets', slug: 'digital-assets', time: '4 min read' },
        { title: 'Cross-Border Transactions', slug: 'cross-border', time: '6 min read' }
      ]
    },
    {
      id: 'security',
      name: 'Security & Trust',
      icon: Lock,
      color: 'blue',
      articles: [
        { title: 'How We Protect Your Money', slug: 'protect-money', time: '6 min read' },
        { title: 'Two-Factor Authentication', slug: '2fa', time: '4 min read' },
        { title: 'Recognizing Scams', slug: 'recognize-scams', time: '7 min read' },
        { title: 'Identity Verification (KYC)', slug: 'identity-verification', time: '5 min read' }
      ]
    },
    {
      id: 'troubleshooting',
      name: 'Troubleshooting',
      icon: HelpCircle,
      color: 'blue',
      articles: [
        { title: 'Common Issues & Solutions', slug: 'common-issues', time: '8 min read' },
        { title: 'Account Access Problems', slug: 'account-access', time: '5 min read' },
        { title: 'Payment Failed', slug: 'payment-failed', time: '4 min read' },
        { title: 'Contact Support', slug: 'contact-support', time: '2 min read' }
      ]
    }
  ];

  // All categories use blue — consistent mature blue theme
  const cardClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';

  const filteredCategories = categories.filter(cat =>
    activeCategory === 'all' || cat.id === activeCategory
  ).filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.articles.some(a => a.title.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <SEOHead
        title="Documentation — Dealcross | Universal Escrow Help Center"
        description="Complete documentation and guides for Dealcross universal escrow platform. Learn how to buy, sell, manage transactions, and protect every deal securely."
        keywords="dealcross documentation, escrow help, universal escrow guide, buyer guide, seller guide, escrow process, how it works"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* Header */}
        <div className="bg-blue-700 dark:bg-blue-900 py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Book className="w-14 h-14 text-white mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Documentation
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Everything you need to use Dealcross — from your first escrow to advanced integrations
            </p>

            {/* Search */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documentation..."
                  className="w-full pl-12 pr-4 py-4 rounded-lg border-0 focus:ring-2 focus:ring-blue-400 text-gray-900 dark:bg-gray-800 dark:text-white text-base"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm ${
                  activeCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All Topics
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm ${
                    activeCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Docs Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {filteredCategories.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No results found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try a different search term.</p>
            </div>
          )}

          <div className="space-y-8">
            {filteredCategories.map((category) => {
              const Icon = category.icon;
              const articles = searchQuery.trim()
                ? category.articles.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
                : category.articles;

              if (articles.length === 0) return null;

              return (
                <div key={category.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 sm:p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${cardClass}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {category.name}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {articles.map((article, idx) => (
                      <Link
                        key={idx}
                        to={`/docs/${category.id}/${article.slug}`}
                        className="group p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition mb-1 text-sm sm:text-base">
                              {article.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{article.time}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex-shrink-0 mt-0.5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Still Need Help */}
          <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Still Need Help?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Can't find what you're looking for? Our support team is available 24/7 for escrow-related issues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Contact Support
              </Link>
              {/* ✅ FIXED: was href="/#faq" which breaks on separate pages */}
              <Link
                to="/docs/troubleshooting/common-issues"
                className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition font-semibold border border-gray-300 dark:border-gray-700"
              >
                Common Issues
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocsPage;
