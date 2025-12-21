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
    <section className="py-20 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 dark:from-gray-900 dark:via-blue-950 dark:to-black text-white relative overflow-hidden transition-colors duration-300">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
      >
        <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Ready to Secure Your<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Transactions?
          </span>
        </h2>
        <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
          Join thousands of users who trust Dealcross for secure escrow payments.
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
          >
            <Shield className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Bank-Level Security</h3>
            <p className="text-sm text-blue-200">256-bit encryption & 2FA</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
          >
            <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Instant Processing</h3>
            <p className="text-sm text-blue-200">Real-time transactions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
          >
            <Users className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">24/7 Support</h3>
            <p className="text-sm text-blue-200">We're here to help</p>
          </motion.div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => navigate('/signup')}
            className="group px-10 py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-2xl shadow-blue-500/50 flex items-center justify-center gap-3"
          >
            Start for Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-5 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-200"
          >
            Login to Dashboard
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-blue-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Free tier available forever</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Setup in 2 minutes</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default StartTradingCTA;