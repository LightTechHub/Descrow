// File: src/components/PaymentMethods.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const PaymentMethods = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const paymentMethods = [
    {
      icon: '💳',
      title: 'Credit & Debit Cards',
      description: 'Visa, Mastercard, Amex',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: '🏦',
      title: 'Bank Transfer',
      description: 'Direct bank payments',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: '₿',
      title: 'Cryptocurrency',
      description: 'Bitcoin, Ethereum, USDT',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: '📱',
      title: 'Mobile Money',
      description: 'M-Pesa, Airtel Money',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: '💰',
      title: 'PayPal',
      description: 'Global digital wallet',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: '🌍',
      title: 'International',
      description: 'Multi-currency support',
      color: 'from-teal-500 to-teal-600'
    }
  ];

  return (
    <section className="py-20 bg-white dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              Accept All Payment Methods
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 transition-colors duration-300">
              We support every way your customers want to pay
            </p>
          </motion.div>
        </div>

        <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {paymentMethods.map((method, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {method.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
                  {method.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  {method.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Feature Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
        >
          <h3 className="text-2xl font-bold mb-3">Instant Settlement</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Receive payments instantly in your preferred currency. No delays, no hassle. Get paid the moment your customer confirms delivery.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Real-time processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Multi-currency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Low fees</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Secure transactions</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PaymentMethods;