// File: src/components/HowItWorks.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Clock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const HowItWorks = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="how-it-works" className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How Dealcross Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Simple, secure, and transparent — for any type of deal
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Step 1 — Create Escrow */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg flex-shrink-0">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <div className="inline-block px-4 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold mb-4 self-start">
                Step 1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Create an Escrow
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
                Define the terms, set the amount, and invite the other party. Works for goods, services, digital assets, real estate deposits, and more.
              </p>
              <div className="space-y-2">
                {[
                  'Instant setup — takes under 2 minutes',
                  'Both parties receive notifications',
                  'Shareable deal link generated'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Step 2 — Fund */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
              <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg flex-shrink-0">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="inline-block px-4 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm font-semibold mb-4 self-start">
                Step 2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Funds Held Securely
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
                The buyer deposits funds. Dealcross holds them in a protected escrow account — the seller receives nothing until you confirm delivery.
              </p>
              <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">Escrow Balance</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-600 dark:text-green-400">Secured</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">$18,750</div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1">Protected until confirmation</div>
              </div>
            </div>
          </motion.div>

          {/* Step 3 — Release */}
          {/* ✅ FIXED: was bg-purple-600 icon + purple badge → blue-700 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
              <div className="w-20 h-20 bg-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg flex-shrink-0">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              {/* ✅ FIXED: was bg-purple-100 text-purple-600 */}
              <div className="inline-block px-4 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold mb-4 self-start">
                Step 3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Release Funds
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
                Once the buyer confirms they're satisfied, funds are released to the seller. If there's an issue, either party can open a dispute.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Hold Period Active</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Dispute window open</div>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">Funds Protected</span>
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA — ✅ FIXED: bare <button onClick={navigate}> → <Link> */}
        <div className="text-center mt-12">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 text-lg shadow-lg"
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
