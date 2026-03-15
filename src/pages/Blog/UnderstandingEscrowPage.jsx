// File: src/pages/Blog/UnderstandingEscrowPage.jsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, ArrowRight, Shield } from 'lucide-react';

const UnderstandingEscrowPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1419] transition-colors duration-300">

      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&h=500&fit=crop" alt="Understanding Escrow Services" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-4xl mx-auto">
          <span className="text-xs font-semibold px-3 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#2d4a7c'}}>Education</span>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">Understanding Escrow Services</h1>
        </div>
      </div>

      {/* Meta bar */}
      <div className="bg-gray-50 dark:bg-[#1e2936] border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>Dealcross Team</span></div>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>February 20, 2026</span></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>8 min read</span></div>
          <Link to="/blog" className="ml-auto flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium">
            <ArrowLeft className="w-4 h-4" />Back to Blog
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8 font-medium border-l-4 border-blue-500 pl-5">Escrow is one of the oldest financial instruments in existence - and one of the most powerful tools for safe online commerce. This guide explains exactly how it works and why every online buyer and seller should use it.</p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">What Is Escrow?</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Escrow is a financial arrangement where a neutral third party holds funds on behalf of two parties in a transaction. The funds are only released when both parties fulfill their agreed obligations. Think of it as a trusted middleman who holds the money until the deal is done correctly.</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">How Dealcross Escrow Works</h2>
        <ul className="space-y-3 mb-6 text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Buyer and seller agree on deal terms and create an escrow</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Buyer deposits funds - Dealcross holds them securely</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Seller delivers the goods or service</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Buyer inspects and confirms delivery</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Dealcross releases funds to the seller</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>If there is a dispute, Dealcross reviews evidence and decides fairly</span></li>
        </ul>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">What Can Be Escrowed?</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Unlike traditional escrow services that only handle real estate, Dealcross is a universal escrow platform. You can protect virtually any type of transaction.</p>
        <ul className="space-y-3 mb-6 text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Physical goods - electronics, vehicles, luxury items</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Freelance services - design, development, writing, consulting</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Digital assets - domain names, websites, software licenses</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Real estate deposits and property transactions</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Business acquisitions and asset transfers</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Cryptocurrency trades and NFT transactions</span></li>
        </ul>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">Why Escrow Beats Direct Payment</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">When you pay directly via bank transfer or card, you have very little protection if the seller does not deliver. Chargebacks can take months and are not always successful. Escrow holds the funds in a neutral account until delivery is confirmed - giving both parties protection and peace of mind.</p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-xl p-5 my-6">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Pro Tip</p>
          <p className="text-blue-800 dark:text-blue-300 text-sm">Escrow protects the seller too. Once funds are in escrow, the buyer cannot simply cancel the payment - the seller knows the money is there waiting.</p>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">Fees and Plans</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Dealcross charges a small escrow fee per transaction, which varies by your subscription plan. The free tier supports up to 3 transactions per month. Paid plans offer lower fees, higher limits, and additional features like milestone payments and API access.</p>

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
            <span className="text-xs font-semibold px-2 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#2d4a7c'}}>Security</span>
            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">5 Tips for Safe Escrow Transactions</h3>
            <div className="flex items-center gap-2 mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              <span>Read More</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link to="/blog/crypto-escrow-payments" className="group block bg-white dark:bg-[#1e2936] rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300">
            <span className="text-xs font-semibold px-2 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#2d4a7c'}}>Crypto</span>
            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Accepting Crypto Payments via Escrow</h3>
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

export default UnderstandingEscrowPage;
