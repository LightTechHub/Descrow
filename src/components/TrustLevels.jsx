// File: src/components/TrustLevels.jsx
import React from 'react';
import { Shield, CheckCircle, Users, Lock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';

const TrustLevels = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
            Universal Escrow You Can Trust
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Built for every transaction type - goods, services, digital assets, and more.
            Dealcross protects both sides of every deal.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Featured Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800 h-full">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Trustworthy, Secure & Universal
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                    Your money is protected from the moment a deal is created until both parties are satisfied.
                    Dealcross uses bank-level encryption and strict verification for every transaction.
                  </p>

                  {/* Feature List — ✅ FIXED: all icon bg colors now blue variants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Funds Held Securely</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Released only on confirmation</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Identity Verification</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">KYC-verified users only</div>
                      </div>
                    </div>

                    {/* ✅ FIXED: was purple-500 → blue-500 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Dispute Resolution</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">24/7 support team</div>
                      </div>
                    </div>

                    {/* ✅ FIXED: was indigo-500 → blue-700 */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Bank-Level Security</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">256-bit encryption</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Side Cards */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Trusted & Verified</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Secure for any deal</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Instant status notifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Works across borders & currencies</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="bg-blue-700 dark:bg-blue-800 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Active Now</div>
                    <div className="text-xs opacity-80">Live transactions</div>
                  </div>
                </div>
                <div className="text-sm opacity-90">
                  Thousands of escrow deals in progress right now - goods, services, digital assets & more.
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-4xl">
              <h3 className="text-3xl font-bold mb-4">Start Your First Escrow Today</h3>
              <p className="text-blue-100 text-lg mb-6">
                Protect any deal — physical goods, freelance work, digital assets, property deposits and more.
              </p>
              {/* ✅ FIXED: was bare <button> with no navigation — now uses Link */}
              <Link
                to="/signup"
                className="inline-block px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg"
              >
                Create Your First Escrow
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default TrustLevels;
