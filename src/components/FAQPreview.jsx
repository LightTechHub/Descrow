// File: src/components/FAQPreview.jsx
import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const FAQPreview = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: 'How does escrow work?',
      answer: "When a buyer creates an escrow, their payment is held securely by Dealcross. The seller delivers the goods or service, and once the buyer confirms receipt and satisfaction, we release the payment to the seller. Simple and secure for any deal type."
    },
    {
      question: 'What are the fees?',
      answer: 'Fees are deducted when the escrow is funded and range from 1.5% to 5% depending on your plan. Free: 5%, Basic: 3%, Pro: 2%, Enterprise: 1.5%. No hidden charges ever.'
    },
    {
      question: 'Is my money safe?',
      answer: 'Yes. We use bank-level encryption, 2FA, and hold funds in segregated escrow accounts. Your money is fully protected until you confirm delivery.'
    },
    {
      question: 'What payment methods do you support?',
      answer: 'We support major payment methods: Cards (Visa, Mastercard), Bank Transfers, Mobile Money, and Cryptocurrencies (Bitcoin, Ethereum, USDT).'
    },
    {
      question: "What if there's a dispute?",
      answer: 'Our dispute resolution team reviews all evidence and makes a fair decision within 24 to 48 hours. Both parties can submit proof through the dashboard.'
    },
    {
      question: 'Can I integrate Dealcross into my website?',
      answer: 'Yes. We provide a developer-friendly API for businesses to integrate escrow payments into any platform. Full documentation and support are included.'
    }
  ];

  return (
    <section id="faq" className="py-20 bg-white dark:bg-[#0f1419] transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-[#1e3a5f] dark:bg-blue-800 px-4 py-2 rounded-lg mb-4">
              <HelpCircle className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold text-white">FAQ</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Everything you need to know about Dealcross
            </p>
          </motion.div>
        </div>

        <div ref={ref} className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: index * 0.08 }}>
              <div className={`bg-[#f8fafc] dark:bg-[#1e2936] rounded-xl border-2 transition-all duration-300 overflow-hidden ${openIndex === index ? 'border-[#1e3a5f] dark:border-blue-600 shadow-lg' : 'border-gray-200 dark:border-gray-700'}`}>
                <button
                  onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-gray-50 dark:hover:bg-[#252f3f] transition-colors duration-200"
                  aria-expanded={openIndex === index}
                >
                  <span className="font-semibold text-lg text-gray-900 dark:text-white pr-8">{faq.question}</span>
                  <ChevronDown className={`w-6 h-6 text-[#1e3a5f] dark:text-blue-400 flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center bg-[#f8fafc] dark:bg-[#1e2936] rounded-2xl p-8 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Still have questions?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Our support team is available 24/7 to help you</p>
          <Link to="/contact" className="inline-block px-8 py-3 bg-[#1e3a5f] dark:bg-blue-700 text-white rounded-xl font-semibold hover:bg-[#2d4a7c] dark:hover:bg-blue-600 transition-all duration-200 shadow-lg">
            Contact Support
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQPreview;
