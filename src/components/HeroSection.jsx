// File: src/components/HeroSection.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 dark:from-gray-900 dark:via-blue-950 dark:to-black py-24 overflow-hidden transition-colors duration-300">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {t('welcome_to_dealcross') || 'Secure Escrow Payments'}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                {t('subtitle') || 'for Your Transactions'}
              </span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl">
              {t('your_trusted_escrow') || 'Trustworthy and easy-to-use escrow platform designed to protect buyers and sellers in financial transactions'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 text-lg flex items-center justify-center gap-2 shadow-xl shadow-green-500/30"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 text-lg"
              >
                Learn More
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 bg-blue-400 rounded-full border-2 border-white"></div>
                <div className="w-10 h-10 bg-purple-400 rounded-full border-2 border-white"></div>
                <div className="w-10 h-10 bg-pink-400 rounded-full border-2 border-white"></div>
              </div>
              <div className="text-blue-100">
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm">Trusted by thousands of users</p>
              </div>
            </div>
          </motion.div>

          {/* Right Content - 3D Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Floating Elements */}
            <div className="absolute -top-10 -left-10 z-20">
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-blue-500/20 backdrop-blur-sm rounded-2xl border border-blue-400/30 flex items-center justify-center shadow-xl"
              >
                <span className="text-3xl">🔒</span>
              </motion.div>
            </div>

            <div className="absolute -bottom-10 -right-10 z-20">
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="w-24 h-24 bg-green-500/20 backdrop-blur-sm rounded-2xl border border-green-400/30 flex items-center justify-center shadow-xl"
              >
                <span className="text-4xl">💰</span>
              </motion.div>
            </div>

            {/* Phone Mockup */}
            <div className="relative mx-auto max-w-sm">
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] p-3 shadow-2xl border-8 border-gray-900">
                <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] overflow-hidden">
                  {/* Status Bar */}
                  <div className="bg-blue-900 dark:bg-gray-900 px-6 py-3 flex items-center justify-between text-white text-xs">
                    <span>9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 border border-white rounded-sm"></div>
                      <div className="w-4 h-4 border border-white rounded-sm"></div>
                      <div className="w-4 h-4 border border-white rounded-sm"></div>
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="p-4 bg-white dark:bg-gray-950">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Dashboard</div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-blue-600 rounded-xl p-3 text-white">
                        <div className="text-xs opacity-80">Pending</div>
                        <div className="text-2xl font-bold">$1,200</div>
                      </div>
                      <div className="bg-green-600 rounded-xl p-3 text-white">
                        <div className="text-xs opacity-80">Completed</div>
                        <div className="text-2xl font-bold">$5,200</div>
                      </div>
                    </div>

                    <div className="bg-purple-600 rounded-xl p-3 text-white mb-4">
                      <div className="text-xs opacity-80">Total Delivered</div>
                      <div className="text-2xl font-bold">$18,750</div>
                    </div>

                    {/* Active Escrows */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Active Escrows</div>
                      
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 dark:text-gray-300">Website Development</span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">$5,000</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full" style={{width: '75%'}}></div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 dark:text-gray-300">Equipment Purchase</span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">$3,000</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full" style={{width: '50%'}}></div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 dark:text-gray-300">Digital Marketing</span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">$3,790</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{width: '100%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Nav */}
                  <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 flex justify-around">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 bg-blue-600 rounded-lg"></div>
                      <span className="text-[10px] text-blue-600 font-semibold">Home</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                      <span className="text-[10px] text-gray-500">Escrows</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                      <span className="text-[10px] text-gray-500">Accounts</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                      <span className="text-[10px] text-gray-500">Profile</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Shield */}
              <motion.div
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 -left-16 transform -translate-y-1/2"
              >
                <div className="w-32 h-32 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30 flex items-center justify-center shadow-xl">
                  <span className="text-5xl">🛡️</span>
                </div>
              </motion.div>

              {/* Floating Coins */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-1/4 -right-12"
              >
                <div className="flex flex-col gap-1">
                  <div className="w-16 h-4 bg-yellow-400 rounded-full shadow-lg"></div>
                  <div className="w-16 h-4 bg-yellow-500 rounded-full shadow-lg -ml-2"></div>
                  <div className="w-16 h-4 bg-yellow-600 rounded-full shadow-lg"></div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;