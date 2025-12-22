// File: src/components/APISection.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const APISection = () => {
  const navigate = useNavigate();
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section id="api" className="py-20 bg-[#1e3a5f] dark:bg-[#0f1419] text-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-white/5 px-4 py-2 rounded-lg mb-6 border border-white/20 dark:border-white/10">
              <Code className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold text-white">For Developers</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Powerful API for Your Platform
            </h2>
            <p className="text-xl text-gray-200 dark:text-gray-300 mb-8 leading-relaxed">
              Integrate Dealcross escrow into your marketplace or e-commerce platform in minutes. Simple REST API with comprehensive documentation.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                'Easy integration in any language',
                'Webhook support for real-time updates',
                'Sandbox environment for testing',
                '24/7 developer support'
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-100 dark:text-gray-200 text-lg">{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl font-semibold transition-all duration-200 text-lg shadow-xl hover:shadow-2xl"
            >
              Get API Access
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[#0f1419] dark:bg-black rounded-2xl p-6 overflow-hidden shadow-2xl border border-gray-700 dark:border-gray-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-[#ef4444] rounded-full"></div>
                <div className="w-3 h-3 bg-[#f59e0b] rounded-full"></div>
                <div className="w-3 h-3 bg-[#10b981] rounded-full"></div>
              </div>
              <span className="text-gray-400 text-sm ml-4">api-example.js</span>
            </div>
            <pre className="text-sm text-[#10b981] overflow-x-auto leading-relaxed">
{`// Create an escrow transaction
const response = await fetch(
  'https://api.dealcross.net/v1/escrow',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      seller: 'seller@example.com',
      item: 'MacBook Pro',
      amount: 2500,
      currency: 'USD'
    })
  }
);

const escrow = await response.json();
console.log(escrow.id); // ESC123456`}
            </pre>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default APISection;