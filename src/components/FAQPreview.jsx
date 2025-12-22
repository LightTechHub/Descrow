// File: src/components/FAQPreview.jsx
import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const FAQPreview = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: 'How does escrow work?',
      answer: 'When a buyer creates an escrow, their payment is held securely by Dealcross. The seller ships the item, and once the buyer confirms receipt and satisfaction, we release the payment to the seller. Simple and secure.'
    },
    {
      question: 'What are the fees?',
      answer: 'Fees are deducted immediately when the escrow is funded and range from 2-5% depending on your tier. Free tier: 5%, Basic: 3%, Pro: 2%, Enterprise: 1.5%. No hidden charges.'
    },
    {
      question: 'Is my money safe?',
      answer: 'Yes! We use bank-level encryption, 2FA, and hold funds in segregated accounts. Your money is protected until delivery is confirmed.'
    },
    {
      question: 'What payment methods do you support?',
      answer: 'We support all major payment methods: Cards (Visa, Mastercard), Bank Transfers, Mobile Money, and Cryptocurrencies (Bitcoin, Ethereum, USDT).'
    },
    {
      question: 'What if there\'s a dispute?',
      answer: 'Our dispute resolution team reviews all evidence and makes a fair decision within 24-48 hours. Both parties can submit proof.'
    },
    {
      question: 'Can I integrate Dealcross into my website?',
      answer: 'Yes! We provide a simple API for businesses to integrate escrow payments. Documentation and support included.'
    }
  ];

  return (
    <section id="faq" className="py-20 bg-white dark:bg-[#0f1419] transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#1e3a5f] dark:bg-[#2d4a7c] px-4 py-2 rounded-lg mb-4">
              <HelpCircle className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold text-white">FAQ</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 transition-colors duration-300">
              Everything you need to know about Dealcross
            </p>
          </motion.div>
        </div>

        <div ref={ref} className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div
                className={`bg-[#f8fafc] dark:bg-[#1e2936] rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                  openIndex === index
                    ? 'border-[#1e3a5f] dark:border-[#2d4a7c] shadow-lg'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-gray-50 dark:hover:bg-[#252f3f] transition-colors duration-200"
                >
                  <span className="font-semibold text-lg text-gray-900 dark:text-white pr-8">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-6 h-6 text-[#1e3a5f] dark:text-[#2d4a7c] flex-shrink-0 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === index ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center bg-[#f8fafc] dark:bg-[#1e2936] rounded-2xl p-8 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Still have questions?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Our support team is here to help you 24/7
          </p>
          <button className="px-8 py-3 bg-[#1e3a5f] dark:bg-[#2d4a7c] text-white rounded-xl font-semibold hover:bg-[#2d4a7c] dark:hover:bg-[#3d5a8c] transition-all duration-200 shadow-lg">
            Contact Support
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQPreview;