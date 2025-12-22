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
    <section className="relative bg-[#1e3a5f] py-20 overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t('welcome_to_dealcross') || 'Secure Escrow Payments for Your Transactions'}
            </h1>
            <p className="text-lg md:text-xl text-blue-200 mb-8 max-w-2xl">
              {t('your_trusted_escrow') || 'Trustworthy and easy-to-use escrow platform designed to protect buyers and sellers in financial transactions'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 text-lg flex items-center justify-center gap-2 shadow-lg"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-lg font-semibold hover:bg-white/20 transition-all duration-200 text-lg"
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

          {/* Right Content - Phone Mockup with Real Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Floating Lock Icon */}
            <div className="absolute -top-10 -left-10 z-20 hidden lg:block">
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-blue-500/20 backdrop-blur-sm rounded-2xl border border-blue-400/30 flex items-center justify-center shadow-xl"
              >
                <span className="text-3xl">🔒</span>
              </motion.div>
            </div>

            {/* Floating Money Icon */}
            <div className="absolute -bottom-10 -right-10 z-20 hidden lg:block">
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="w-24 h-24 bg-green-500/20 backdrop-blur-sm rounded-2xl border border-green-400/30 flex items-center justify-center shadow-xl"
              >
                <span className="text-4xl">💰</span>
              </motion.div>
            </div>

            {/* Phone Mockup Container */}
            <div className="relative mx-auto max-w-sm lg:max-w-md">
              {/* Phone Frame */}
              <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] overflow-hidden">
                  {/* Status Bar */}
                  <div className="bg-[#1e3a5f] px-6 py-3 flex items-center justify-between text-white text-xs">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                      </svg>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="bg-white dark:bg-gray-950 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">Dealcross</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <div className="w-7 h-7 bg-orange-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        F
                      </div>
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-950">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 font-semibold">sordanfra@dcross</div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-blue-600 rounded-xl p-3 text-white">
                        <div className="text-[10px] opacity-80 mb-1">Assupiciaae</div>
                        <div className="text-lg font-bold">$1,200</div>
                      </div>
                      <div className="bg-green-600 rounded-xl p-3 text-white">
                        <div className="text-[10px] opacity-80 mb-1">Deret distant</div>
                        <div className="text-lg font-bold">$5,200</div>
                      </div>
                    </div>

                    <div className="bg-purple-600 rounded-xl p-3 text-white mb-4">
                      <div className="text-[10px] opacity-80 mb-1">There delivered</div>
                      <div className="text-xl font-bold">$18,750</div>
                    </div>

                    {/* Active Escrows */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-gray-900 dark:text-white mb-2">Active Escrows</div>
                      
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between text-[10px] mb-1.5">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Website Development</span>
                          <span className="text-green-600 dark:text-green-400 font-bold">$5,000</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{width: '75%'}}></div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-900 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between text-[10px] mb-1.5">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Equipment Purchase</span>
                          <span className="text-green-600 dark:text-green-400 font-bold">$3,000</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{width: '50%'}}></div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-900 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between text-[10px] mb-1.5">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Digital Marketing</span>
                          <span className="text-green-600 dark:text-green-400 font-bold">$3,790</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div className="bg-green-600 h-1.5 rounded-full" style={{width: '100%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Nav */}
                  <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 flex justify-around">
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      <span className="text-[9px] text-blue-600 font-semibold">Home</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[9px] text-gray-400">Escrows</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[9px] text-gray-400">Accounts</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[9px] text-gray-400">Profile</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Shield - Desktop Only */}
              <motion.div
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 -left-16 transform -translate-y-1/2 hidden xl:block"
              >
                <div className="w-24 h-24 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30 flex items-center justify-center shadow-xl">
                  <span className="text-4xl">🛡️</span>
                </div>
              </motion.div>

              {/* Floating Coins - Desktop Only */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-1/4 -right-12 hidden xl:block"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="w-12 h-3 bg-yellow-400 rounded-full shadow-lg"></div>
                  <div className="w-12 h-3 bg-yellow-500 rounded-full shadow-lg -ml-1"></div>
                  <div className="w-12 h-3 bg-yellow-600 rounded-full shadow-lg"></div>
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