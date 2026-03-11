// File: src/pages/RefundPolicyPage.jsx
import React, { useEffect } from 'react';
import { RefreshCw, Shield, Clock, AlertCircle } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { Link } from 'react-router-dom';

const RefundPolicyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <SEOHead
        title="Refund Policy — Dealcross | Escrow Refunds & Buyer Protection"
        description="Learn about Dealcross's refund policy, dispute resolution process, refund timelines, and how to request a refund for any escrow transaction."
        keywords="Dealcross refund policy, escrow refunds, dispute resolution, buyer protection, seller protection, refund timelines"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 md:p-12">

            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
                <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                  Refund Policy
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Last updated: {lastUpdated}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-gray-600 dark:text-gray-400">

              {/* 1 */}
              <section id="overview">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">1. Overview</h2>
                <p>
                  At Dealcross, we prioritize fairness, transparency, and safety in every transaction. Our universal
                  escrow system protects both buyers and sellers from fraud, disputes, and delivery issues. This Refund
                  Policy explains when refunds are issued and how they are processed.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <p className="text-sm text-blue-900 dark:text-blue-200 m-0">
                      <strong>Buyer Protection:</strong> Funds stay securely in escrow until delivery is confirmed and the hold period has passed.
                    </p>
                  </div>
                </div>
              </section>

              {/* 2 */}
              <section id="escrow-refunds">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">2. Escrow Transaction Refunds</h2>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">2.1 Automatic Refunds</h3>
                <p>Automatic full refunds (excluding processing fees) are issued when:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Seller declines the transaction before delivery</li>
                  <li>Seller fails to deliver within the agreed timeframe</li>
                  <li>Buyer and seller mutually cancel the transaction</li>
                  <li>A platform error prevents transaction completion</li>
                  <li>Seller account is suspended before delivery</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6">2.2 Dispute-Based Refunds</h3>
                <p>
                  Open a dispute within 7 days of delivery confirmation if the goods or service are unsatisfactory.
                  After investigation, refunds are classified as:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Full Refund:</strong> Item not received, counterfeit, damaged, or significantly not as described</li>
                  <li><strong>Partial Refund:</strong> Minor issues, incomplete delivery, or mutual agreement</li>
                  <li><strong>No Refund:</strong> False claims, buyer remorse, or disputes filed past the deadline</li>
                </ul>
              </section>

              {/* 3 */}
              <section id="service-fees">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3. Service Fee Refunds</h2>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">3.1 Non-Refundable Fees</h3>
                <p>The following fees cannot be refunded:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Platform service fees</li>
                  <li>Payment processor fees</li>
                  <li>Crypto network / gas fees</li>
                  <li>International transfer charges</li>
                  <li>Speed-up or priority processing fees</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6">3.2 Refundable Fees</h3>
                <p>Fees may be refunded when:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Transaction is cancelled before seller acceptance</li>
                  <li>Platform-related technical issues caused the failure</li>
                  <li>Seller is found to have violated our Terms of Service</li>
                  <li>Fraud is confirmed by our investigation team</li>
                </ul>
              </section>

              {/* 4 */}
              <section id="timeline">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">4. Refund Processing Timeline</h2>
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { label: 'Automatic Refunds', detail: 'Instant to Dealcross Wallet. Bank: 1–3 business days.', color: 'text-blue-600 dark:text-blue-400' },
                      { label: 'Dispute Refunds', detail: 'Processed 3–7 business days after resolution.', color: 'text-yellow-600 dark:text-yellow-400' },
                      { label: 'Crypto Refunds', detail: 'Instant to wallet; withdrawal speed depends on network.', color: 'text-green-600 dark:text-green-400' },
                      { label: 'Card Refunds', detail: '5–10 business days depending on your card issuer.', color: 'text-blue-600 dark:text-blue-400' }
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className={`w-5 h-5 ${item.color}`} />
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{item.label}</h4>
                        </div>
                        <p className="text-sm">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 5 */}
              <section id="refund-methods">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">5. Refund Methods</h2>
                <ol className="list-decimal pl-6 space-y-3">
                  <li><strong>Original Payment Method</strong> — refunded to where payment originated</li>
                  <li><strong>Dealcross Wallet</strong> — instant, usable on any future transaction</li>
                  <li><strong>Alternative Method</strong> — available upon request with additional verification</li>
                </ol>
              </section>

              {/* 6 */}
              <section id="request">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">6. How to Request a Refund</h2>
                <ol className="list-decimal pl-6 space-y-3 mb-4">
                  <li>Open the transaction in your dashboard</li>
                  <li>Select "Open Dispute"</li>
                  <li>Choose a reason for the dispute</li>
                  <li>Submit supporting evidence (photos, messages, etc.)</li>
                  <li>Wait for our team to review (48–72 hours)</li>
                </ol>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-200 m-0">
                      Refund requests must be submitted within <strong>7 days</strong> of delivery confirmation.
                      Late disputes will not be accepted.
                    </p>
                  </div>
                </div>
              </section>

              {/* 7 */}
              <section id="partial-refunds">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">7. Partial Refunds</h2>
                <p>Partial refunds may be granted in cases such as:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Minor product defects that don't warrant full return</li>
                  <li>Late delivery causing documented loss</li>
                  <li>Incomplete order (missing items)</li>
                  <li>Mutual agreement between buyer and seller</li>
                  <li>Quality slightly lower than described</li>
                </ul>
              </section>

              {/* 8 */}
              <section id="no-refunds">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">8. Non-Refundable Situations</h2>
                <p>No refund will be issued for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Buyer remorse (change of mind)</li>
                  <li>Item matches its listing description</li>
                  <li>Dispute filed after the 7-day deadline</li>
                  <li>False or fabricated claims</li>
                  <li>Damage caused by the buyer</li>
                  <li>Violations of our Terms of Service</li>
                </ul>
              </section>

              {/* 9 */}
              <section id="chargebacks">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">9. Chargebacks</h2>
                <p>
                  We strongly recommend contacting our support team before initiating a chargeback through your
                  bank or card provider. Unjustified chargebacks can lead to account limitations or suspension.
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
                    <p className="text-sm text-red-900 dark:text-red-200 m-0">
                      Fraudulent or abusive chargebacks may result in account suspension and potential legal action.
                    </p>
                  </div>
                </div>
              </section>

              {/* 10 */}
              <section id="appeal">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">10. Refund Appeal Process</h2>
                <p>If you disagree with a refund decision:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Submit an appeal within 14 days of the decision</li>
                  <li>Provide new evidence or information</li>
                  <li>Clearly explain your concerns</li>
                  <li>A senior team member will review the case</li>
                  <li>Final decision issued within 5–7 business days</li>
                </ol>
              </section>

              {/* 11 */}
              <section id="changes">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">11. Changes to This Policy</h2>
                <p>
                  Dealcross may update this Refund Policy at any time. Significant changes will be communicated
                  via in-app notification or email before they take effect.
                </p>
              </section>

              {/* 12 */}
              <section id="contact">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">12. Contact Us</h2>
                <p>Need help with a refund or dispute? We're here to help:</p>

                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Email Support</p>
                    <a href="mailto:refunds@dealcross.net" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                      refunds@dealcross.net
                    </a>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Live Chat</p>
                    <p className="text-sm">Available 24/7 inside your dashboard</p>
                  </div>
                  {/* ⚠️ COMPANY INFO NEEDED: Replace or remove phone number */}
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">General Support</p>
                    <Link to="/contact" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                      Visit our Contact page →
                    </Link>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RefundPolicyPage;
