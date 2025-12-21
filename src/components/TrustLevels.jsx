// File: src/components/TrustLevels.jsx
import React from 'react';
import { Shield, CheckCircle, Users, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const TrustLevels = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const features = [
    {
      icon: Shield,
      iconColor: 'from-blue-500 to-blue-600',
      title: 'Trustworthy and Secure',
      description: 'Your money is safe. Dealcross uses state-of-the-art security and encryption to ensure all transactions are protected.',
      highlight: true
    },
    {
      icon: CheckCircle,
      iconColor: 'from-green-500 to-green-600',
      title: 'Identity Verification',
      description: 'Dispute Resolutions.',
      highlight: false
    },
    {
      icon: Users,
      iconColor: 'from-purple-500 to-purple-600',
      title: 'Dispute Resolution',
      description: 'Timely solving conflicts/disagreement.',
      highlight: false
    }
  ];

  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
            Trusted Escrow Services Built for You
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 transition-colors duration-300">
            Join thousands of users who trust Dealcross for secure escrow payments.
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
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800 h-full">
              <div className="flex items-start gap-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${features[0].iconColor} rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0`}>
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {features[0].title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                    {features[0].description}
                  </p>

                  {/* Feature List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Funds Held Securely</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Selacare Note curce transactions.</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Identity Verification</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Dispute Resolutions.</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Dispute Resolution</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Timely solving conflicts/disagreement.</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Bank-Level Security</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">256-bit encryption protection.</div>
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
                  <div className={`w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg`}>
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Trust and Simed</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">An trust equip utilities</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">Unbiased Notifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">Send link Request and Alerts</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">In Progress</div>
                    <div className="text-xs opacity-80">Mettase Mods</div>
                  </div>
                </div>
                <div className="text-sm opacity-90">Current active escrow transactions</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Section with Mock Escrow Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 max-w-4xl">
              <h3 className="text-3xl font-bold mb-4">Get Started Today</h3>
              <p className="text-blue-100 text-lg mb-6">
                Join thousands of users who trust Dealcross for secure escrow payments.
              </p>
              <button className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg">
                Create Your First Escrow
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLevels;