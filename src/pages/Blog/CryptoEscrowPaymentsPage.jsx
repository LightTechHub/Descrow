// File: src/pages/Blog/CryptoEscrowPaymentsPage.jsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, ArrowRight, Shield } from 'lucide-react';

const CryptoEscrowPaymentsPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1419] transition-colors duration-300">

      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=500&fit=crop" alt="Accepting Crypto Payments via Escrow" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-4xl mx-auto">
          <span className="text-xs font-semibold px-3 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#10b981'}}>Crypto</span>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">Accepting Crypto Payments via Escrow</h1>
        </div>
      </div>

      {/* Meta bar */}
      <div className="bg-gray-50 dark:bg-[#1e2936] border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>Dealcross Team</span></div>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>February 10, 2026</span></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>6 min read</span></div>
          <Link to="/blog" className="ml-auto flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium">
            <ArrowLeft className="w-4 h-4" />Back to Blog
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8 font-medium border-l-4 border-blue-500 pl-5">Cryptocurrency transactions are fast, borderless, and irreversible - which makes them both powerful and risky for commerce. Escrow solves the trust problem in crypto deals, protecting both buyer and seller without relying on chargebacks.</p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">The Problem with Raw Crypto Payments</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Unlike credit cards, crypto transactions cannot be reversed. If you send Bitcoin to a scammer, it is gone. This irreversibility is great for sellers who fear chargebacks - but terrible for buyers who have no recourse if the seller disappears.</p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-xl p-5 my-6">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Pro Tip</p>
          <p className="text-blue-800 dark:text-blue-300 text-sm">Dealcross supports BTC, ETH, USDT, USDC and more via NowPayments integration - giving you the flexibility to transact in your preferred cryptocurrency.</p>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">How Crypto Escrow Works on Dealcross</h2>
        <ul className="space-y-3 mb-6 text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Buyer selects cryptocurrency as the payment method when creating an escrow</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Dealcross generates a payment address via NowPayments</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Buyer sends crypto to the escrow address</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Funds are held until delivery is confirmed</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>On confirmation, crypto is released to the seller</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Dispute resolution applies the same as fiat transactions</span></li>
        </ul>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">Best Practices for Crypto Deals</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Cryptocurrency prices can be volatile. To avoid disputes caused by price changes during the escrow period, consider using a stablecoin like USDT or USDC for your deals. These maintain a 1:1 peg to the US Dollar, so the value does not change between funding and release.</p>
        <ul className="space-y-3 mb-6 text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Use USDT or USDC for stable value throughout the escrow period</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Agree on the currency and amount before creating the escrow</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Factor in network fees when calculating the total to send</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Confirm the payment address carefully before sending</span></li>
        </ul>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">Who Uses Crypto Escrow?</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Crypto escrow is particularly popular for international transactions where traditional banking is slow or expensive. NFT buyers and sellers, domain traders, and cross-border freelancers all benefit from escrow-protected crypto payments.</p>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">With Dealcross, you get the speed and borderless nature of crypto combined with the protection of escrow. It is the best of both worlds for modern digital commerce.</p>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-br from-[#1e3a5f] to-[#2d4a7c] rounded-2xl p-8 text-center text-white">
          <Shield className="w-12 h-12 mx-auto mb-4 text-blue-300" />
          <h3 className="text-2xl font-bold mb-3">Ready to Transact Safely?</h3>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">Join thousands of users who trust Dealcross for secure escrow transactions worldwide.</p>
          <Link to="/signup" className="inline-block px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition shadow-lg">
            Get Started Free
          </Link>
        </div>

        {/* Related */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/blog/safe-escrow-transactions" className="group block bg-white dark:bg-[#1e2936] rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300">
            <span className="text-xs font-semibold px-2 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#10b981'}}>Security</span>
            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">5 Tips for Safe Escrow Transactions</h3>
            <div className="flex items-center gap-2 mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              <span>Read More</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link to="/blog/understanding-escrow" className="group block bg-white dark:bg-[#1e2936] rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300">
            <span className="text-xs font-semibold px-2 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#10b981'}}>Education</span>
            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Understanding Escrow Services</h3>
            <div className="flex items-center gap-2 mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              <span>Read More</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoEscrowPaymentsPage;
