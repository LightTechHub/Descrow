// File: src/pages/Blog/SafeEscrowTransactionsPage.jsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, ArrowRight, Shield } from 'lucide-react';

const SafeEscrowTransactionsPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1419] transition-colors duration-300">

      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=500&fit=crop" alt="5 Tips for Safe Escrow Transactions" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-4xl mx-auto">
          <span className="text-xs font-semibold px-3 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#1e3a5f'}}>Security</span>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">5 Tips for Safe Escrow Transactions</h1>
        </div>
      </div>

      {/* Meta bar */}
      <div className="bg-gray-50 dark:bg-[#1e2936] border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>Dealcross Team</span></div>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>March 1, 2026</span></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>5 min read</span></div>
          <Link to="/blog" className="ml-auto flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium">
            <ArrowLeft className="w-4 h-4" />Back to Blog
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8 font-medium border-l-4 border-blue-500 pl-5">Online fraud costs billions every year. Escrow dramatically reduces your risk - but only if you use it correctly. Here are five essential practices every buyer and seller should follow.</p>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">1. Always Verify the Other Party Before Funding</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Before placing any funds into escrow, take time to verify who you are dealing with. Check their profile, reviews, and KYC verification status on Dealcross. A verified badge means the user has passed identity verification.</p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-xl p-5 my-6">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Pro Tip</p>
          <p className="text-blue-800 dark:text-blue-300 text-sm">On Dealcross, look for the green "Identity Verified" badge on any user profile before agreeing to a deal.</p>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">2. Write Clear, Specific Deal Terms</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Vague terms are the number one cause of disputes. Before funding escrow, agree on exactly what will be delivered, by when, and in what condition. Use the custom terms field in your escrow to spell everything out.</p>
        <ul className="space-y-3 mb-6 text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Exact item description, model, and condition</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Delivery method and expected timeline</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>Acceptance criteria - what counts as satisfactory delivery</span></li>
          <li className="flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></span><span>What happens if the item is damaged or not as described</span></li>
        </ul>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">3. Never Release Funds Before Inspecting</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">The escrow release window exists for a reason. Once the seller marks an item as delivered, you have a window to inspect before funds are released. Do not click "Confirm Delivery" until you have physically inspected the item or tested the service.</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">4. Use the Dispute System if Something Goes Wrong</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">If you are not satisfied with a delivery, open a dispute immediately - do not just walk away. Dealcross dispute resolution reviews evidence from both sides and makes a fair decision within 24 to 48 hours.</p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-xl p-5 my-6">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Pro Tip</p>
          <p className="text-blue-800 dark:text-blue-300 text-sm">Gather evidence before opening a dispute: photos, screenshots of conversations, delivery records, and any relevant documents.</p>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">5. Enable Two-Factor Authentication</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Your account security is critical when real money is involved. Enable 2FA in your security settings to protect your account from unauthorized access. Dealcross supports Google Authenticator and any TOTP app.</p>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Following these five practices will protect you in the vast majority of online transactions. Escrow is your safety net - use it properly and you will transact with total confidence.</p>

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
          <Link to="/blog/understanding-escrow" className="group block bg-white dark:bg-[#1e2936] rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300">
            <span className="text-xs font-semibold px-2 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#1e3a5f'}}>Education</span>
            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Understanding Escrow Services</h3>
            <div className="flex items-center gap-2 mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              <span>Read More</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link to="/blog/crypto-escrow-payments" className="group block bg-white dark:bg-[#1e2936] rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300">
            <span className="text-xs font-semibold px-2 py-1 rounded-lg text-white mb-3 inline-block" style={{backgroundColor: '#1e3a5f'}}>Crypto</span>
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

export default SafeEscrowTransactionsPage;
