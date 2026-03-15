// File: src/components/PaymentMethods.jsx
// FIXED: Reflects actual payment stack - Paystack, Flutterwave, Crypto, Wallet
// REMOVED: PayPal (not integrated), M-Pesa (not in our stack)
// ADDED: Wallet balance, Bank Transfer (NGN via Paystack), USDT/stablecoins
import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Shield, Zap, Globe, Wallet } from 'lucide-react';

const paymentMethods = [
  { icon: '🇳🇬', title: 'Paystack',          description: 'Cards, bank transfer & USSD',    badge: 'NGN',            badgeColor: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  { icon: '🌍',  title: 'Flutterwave',        description: 'Multi-currency, global cards',   badge: 'International',  badgeColor: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' },
  { icon: '₿',   title: 'Cryptocurrency',     description: 'BTC, ETH, USDT, USDC & more',   badge: 'via NowPayments',badgeColor: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' },
  { icon: '💰',  title: 'Dealcross Wallet',   description: 'Instant from your balance',      badge: 'Zero fees',      badgeColor: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  { icon: '🏦',  title: 'Bank Transfer',      description: 'NGN direct bank payment',        badge: 'NGN',            badgeColor: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  { icon: '💳',  title: 'Debit / Credit Cards',description: 'Visa & Mastercard supported',  badge: 'Global',         badgeColor: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' },
];

const highlights = [
  { icon: Zap,    label: 'Real-time processing'    },
  { icon: Globe,  label: 'Multi-currency support'  },
  { icon: Shield, label: 'Fraud-protected payments' },
  { icon: Wallet, label: 'Instant wallet settlement' },
];

const PaymentMethods = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="py-16 sm:py-20 bg-white dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-12 sm:mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Flexible Payment Options
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Fund your escrow with whichever method works best for you, locally or globally
            </p>
          </motion.div>
        </div>

        <div ref={ref} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
          {paymentMethods.map((method, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: index * 0.08 }} className="group">
              <div className="h-full bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 sm:p-5 text-center border-2 border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col items-center gap-3">
                <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300">{method.icon}</span>
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">{method.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{method.description}</p>
                  <span className={`inline-block text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${method.badgeColor}`}>{method.badge}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 sm:mt-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-7 sm:p-10 text-center text-white"
        >
          <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">
            Funds Released Only When You're Satisfied
          </h3>
          <p className="text-blue-100 mb-7 max-w-2xl mx-auto text-sm sm:text-base">
            Your payment is held securely in escrow until you confirm everything is as agreed.
            No chargebacks, no disputes after the fact. Both sides are always protected.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded-full">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-300" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          Paystack processes NGN card & bank payments · Flutterwave handles international · Crypto via NowPayments · All transactions are secured and monitored
        </p>
      </div>
    </section>
  );
};

export default PaymentMethods;
