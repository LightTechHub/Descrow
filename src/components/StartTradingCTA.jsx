// File: src/components/StartTradingCTA.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const StartTradingCTA = () => {
  const navigate = useNavigate();
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="py-20 bg-[#1e3a5f] dark:bg-[#0f1419] text-white relative overflow-hidden transition-colors duration-300">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#2d4a7c] rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#10b981] rounded-full blur-3xl"></div>
      </div>

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
      >
        <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
          Ready to Secure Your<br />
          <span className="text-[#10b981]">
            Transactions?
          </span>
        </h2>
        <p className="text-xl md:text-2xl text-gray-200 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
          Join thousands of users who trust Dealcross for secure escrow payments.
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-white/10 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-[#2d4a7c] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white">Bank-Level Security</h3>
            <p className="text-sm text-gray-200 dark:text-gray-300">256-bit encryption & 2FA</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-white/10 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-[#f59e0b] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white">Instant Processing</h3>
            <p className="text-sm text-gray-200 dark:text-gray-300">Real-time transactions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-white/10 hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-[#10b981] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white">24/7 Support</h3>
            <p className="text-sm text-gray-200 dark:text-gray-300">We're here to help</p>
          </motion.div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => navigate('/signup')}
            className="group px-10 py-5 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-2xl flex items-center justify-center gap-3"
          >
            Start for Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-5 bg-white/10 dark:bg-white/5 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200"
          >
            Login to Dashboard
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-200 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
            <span>Free tier available forever</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
            <span>Setup in 2 minutes</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default StartTradingCTA;