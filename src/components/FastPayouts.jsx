// File: src/components/FastPayouts.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const FastPayouts = () => {
  const navigate = useNavigate();
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const pricing = [
    {
      name: 'Free',
      price: 0,
      period: 'forever',
      features: [
        '$500 max per transaction',
        '5 transactions per month',
        'Basic support',
        'Standard processing'
      ],
      highlight: false,
      buttonColor: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      name: 'Basic',
      price: 10,
      period: 'month',
      features: [
        '$5,000 max per transaction',
        '50 transactions per month',
        'Priority support',
        'Fast processing',
        'API access'
      ],
      highlight: false,
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Pro',
      price: 50,
      period: 'month',
      features: [
        '$50,000 max per transaction',
        'Unlimited transactions',
        '24/7 Priority support',
        'Instant processing',
        'Full API access',
        'Custom integration'
      ],
      highlight: true,
      buttonColor: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'Enterprise',
      price: 'Contact',
      period: '',
      features: [
        'Unlimited transaction amount',
        'Unlimited transactions',
        'Dedicated account manager',
        'Custom integration',
        'White-label options',
        'SLA guarantees'
      ],
      highlight: false,
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 transition-colors duration-300">
              Choose the plan that fits your business needs
            </p>
          </motion.div>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricing.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {plan.highlight && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`bg-white dark:bg-gray-950 rounded-2xl p-8 border-2 ${
                plan.highlight 
                  ? 'border-green-500 dark:border-green-400 shadow-2xl scale-105' 
                  : 'border-gray-200 dark:border-gray-800 shadow-lg'
              } transition-all duration-300 hover:shadow-xl h-full flex flex-col`}>
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    {typeof plan.price === 'number' ? (
                      <>
                        <span className="text-5xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                          ${plan.price}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
                          /{plan.period}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                        {plan.price}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300 text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/signup')}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-lg text-white ${plan.buttonColor}`}
                >
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            All plans include: Secure escrow • 2FA security • Email support • Transaction history
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            No hidden fees • Cancel anytime • 30-day money-back guarantee
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FastPayouts;