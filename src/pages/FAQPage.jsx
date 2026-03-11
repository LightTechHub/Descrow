// File: src/pages/FAQPage.jsx
// ✅ FIXED: Removed $2.50 withdrawal fee (incorrect), removed fake US phone number
// ✅ FIXED: Fee info updated to reflect NGN-first platform
// ✅ FIXED: Small screen sizes and spacing optimized
import React, { useEffect, useState } from 'react';
import { HelpCircle, ChevronDown, Search } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'What is Dealcross and how does it work?',
          a: 'Dealcross is a universal escrow platform that protects both buyers and sellers in any online transaction — physical goods, services, digital assets, real estate, and more. We securely hold the buyer\'s payment until the seller delivers and the buyer confirms satisfaction, then we release the funds. Both parties are protected throughout.'
        },
        {
          q: 'How do I create an account?',
          a: 'Creating an account is simple — click "Sign Up", provide your email address, create a password, and verify your email. You can start exploring Dealcross immediately. For full transaction access and higher limits, complete identity verification (KYC) from your profile settings.'
        },
        {
          q: 'Is Dealcross free to use?',
          a: 'Registration is completely free. We charge a small escrow fee per transaction — the exact percentage depends on your subscription tier (ranging from 1% to 2.5%). The fee is always shown clearly before you confirm any transaction. There are no hidden charges.'
        },
        {
          q: 'What currencies do you support?',
          a: 'We support Nigerian Naira (₦) via Paystack for domestic transactions, international currencies (USD, EUR, GBP and more) via Flutterwave, and popular cryptocurrencies including Bitcoin (BTC), Ethereum (ETH), and USDT via NowPayments. You can choose the right method when creating an escrow.'
        }
      ]
    },
    {
      category: 'Transactions',
      questions: [
        {
          q: 'How long does a transaction take?',
          a: 'It depends on the agreement between buyer and seller. Once the buyer funds the escrow (usually instant via card or wallet), the seller has the agreed timeframe to deliver. After delivery, the buyer typically has 3–7 days to confirm receipt. If confirmed earlier, funds are released immediately.'
        },
        {
          q: 'What happens if there\'s a problem with my order?',
          a: 'If you\'re unsatisfied with the goods or services received, you can open a dispute within the transaction window. Our dispute resolution team will investigate both sides, request evidence from both parties, and make a fair decision. Most disputes are resolved within 48–72 hours.'
        },
        {
          q: 'Can I cancel a transaction?',
          a: 'Yes. Transactions can be cancelled before the seller delivers — both parties must agree to the cancellation. If funds were already deposited, they will be returned to the buyer. After delivery, cancellation requires a dispute to be raised.'
        },
        {
          q: 'How do I track my transaction?',
          a: 'All transactions are tracked in real-time on your dashboard. You\'ll receive in-app and email notifications for every status change. Sellers can upload tracking numbers or proof of delivery for physical shipments.'
        }
      ]
    },
    {
      category: 'Payments & Fees',
      questions: [
        {
          q: 'What payment methods do you accept?',
          a: 'We accept card payments and bank transfers via Paystack (₦ NGN), international payments via Flutterwave (USD, EUR, GBP and 30+ currencies), and cryptocurrencies including Bitcoin, Ethereum, and USDT via NowPayments. Payment availability depends on your selected currency.'
        },
        {
          q: 'How are fees calculated?',
          a: 'Our fee structure is fully transparent and depends on your subscription tier. Free tier: 2.5% escrow fee. Starter: 1.75% each side. Growth: 1.5%. Enterprise: 1.25%. API tier: 1%. There are no hidden charges — the exact fee is always shown before you confirm a transaction.'
        },
        {
          q: 'When do I receive my money as a seller?',
          a: 'Funds are released to your Dealcross wallet immediately after the buyer confirms receipt and satisfaction. From your wallet, you can withdraw to your Nigerian bank account or request an international payout. Withdrawal times depend on your bank.'
        },
        {
          q: 'Are there withdrawal fees?',
          a: 'Withdrawal fees depend on the payment processor and your bank. For Nigerian bank transfers, fees are minimal and shown at checkout. There is no fee for keeping funds in your Dealcross wallet. Premium verified accounts may qualify for reduced or waived withdrawal fees — see the pricing page for details.'
        }
      ]
    },
    {
      category: 'Security',
      questions: [
        {
          q: 'How secure is Dealcross?',
          a: 'Security is our top priority. We use 256-bit SSL encryption, two-factor authentication, and hold escrow funds in segregated accounts. Our platform undergoes regular security audits. User funds are never commingled with company operating funds.'
        },
        {
          q: 'What is two-factor authentication (2FA)?',
          a: 'Two-factor authentication adds an extra layer of security. After entering your password, you\'ll provide a one-time code sent to your phone or authenticator app. This prevents unauthorized access even if someone knows your password. We strongly recommend enabling 2FA.'
        },
        {
          q: 'How do you protect my personal information?',
          a: 'Your personal information is encrypted and never sold to third parties. We only collect data necessary for transaction processing, identity verification, and fraud prevention. KYC documents are processed securely and stored in compliance with applicable data protection regulations.'
        },
        {
          q: 'What if my account is compromised?',
          a: 'If you suspect unauthorized access, immediately change your password and contact our support team at support@dealcross.net. We will investigate suspicious activity, secure your account, and help recover your funds if needed.'
        }
      ]
    },
    {
      category: 'Disputes & Support',
      questions: [
        {
          q: 'How do I open a dispute?',
          a: 'To open a dispute, go to your transaction details and tap "Open Dispute." Provide a clear description of the issue and upload any supporting evidence — photos, screenshots, or tracking records. Both parties will be notified and our team will investigate within 24 hours.'
        },
        {
          q: 'How long does dispute resolution take?',
          a: 'Most disputes are resolved within 48–72 hours. Complex cases may take up to 7 days. We review all evidence from both parties before deciding. You\'ll be notified immediately when a decision is reached.'
        },
        {
          q: 'What evidence should I provide for disputes?',
          a: 'For buyers: photos or videos of damaged or incorrect items, screenshots of conversations, proof of payment. For sellers: proof of delivery with tracking numbers, photos taken before shipping, and any communication records. The more evidence you provide, the faster your dispute will be resolved.'
        },
        {
          q: 'How can I contact customer support?',
          a: 'You can reach us via the Contact page at dealcross.net/contact, or email us directly at support@dealcross.net. We aim to respond to all inquiries within 24 hours. For urgent transaction issues, use the in-app live chat for the fastest response.'
        }
      ]
    },
    {
      category: 'Account & Verification',
      questions: [
        {
          q: 'Why should I verify my account (KYC)?',
          a: 'Verified accounts get full platform access: higher transaction limits, lower fees, access to the escrow dashboard, and a "Verified" badge that builds trust with trading partners. Verification is required to create or fund escrow transactions. The process takes just a few minutes.'
        },
        {
          q: 'What documents are needed for verification?',
          a: 'Nigerian individuals can verify automatically using BVN or NIN via our DiDIT integration — no manual uploads needed. International users or business accounts can upload a government-issued ID (passport, national ID, or driver\'s license), a selfie, and proof of address. All documents must be clear and unedited.'
        },
        {
          q: 'Can I delete my account?',
          a: 'Yes, you can delete your account from Settings > Account > Delete Account. You must first complete all pending transactions and withdraw any remaining wallet funds. Account deletion is permanent and cannot be reversed.'
        },
        {
          q: 'How do I update my email or phone number?',
          a: 'Go to Settings > Security > Update Contact Info. You\'ll verify your identity via 2FA and confirm the change through your new email or phone. Note: your name, date of birth, and account type are locked after KYC approval to prevent identity fraud.'
        }
      ]
    }
  ];

  const filteredFaqs = faqs.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      faq => faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <>
      <SEOHead
        title="FAQ – Dealcross | Frequently Asked Questions"
        description="Find answers to common questions about Dealcross escrow, payments, fees, security, KYC verification, and dispute resolution."
        keywords="dealcross faq, escrow questions, escrow fees, kyc verification, payment methods, dispute resolution, how does escrow work"
        canonical="https://dealcross.net/faq"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950 py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <HelpCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white mx-auto mb-4 sm:mb-6" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-base sm:text-xl text-blue-100 mb-6 sm:mb-8">
              Quick answers to common questions about Dealcross
            </p>
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search FAQ..."
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:bg-gray-800 dark:text-white text-sm sm:text-base shadow-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No results for "{searchQuery}". Try a different search term.</p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {filteredFaqs.map((category, catIndex) => (
                <div key={catIndex} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 sm:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">{category.category}</h2>
                  <div className="space-y-3">
                    {category.questions.map((faq, faqIndex) => {
                      const key = `${catIndex}-${faqIndex}`;
                      const isOpen = openIndex === key;
                      return (
                        <div key={faqIndex} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setOpenIndex(isOpen ? null : key)}
                            className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition gap-3"
                          >
                            <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white leading-snug">{faq.q}</span>
                            <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 sm:mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 sm:p-8 border border-blue-200 dark:border-blue-800 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">Still Have Questions?</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-5 sm:mb-6">
              Can't find the answer you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <a href="/contact" className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-sm sm:text-base">
                Contact Support
              </a>
              <a href="/docs" className="px-5 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition font-semibold text-sm sm:text-base border border-gray-300 dark:border-gray-700">
                View Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQPage;
