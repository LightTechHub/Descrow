// File: src/pages/PrivacyPolicyPage.jsx
import React, { useEffect } from 'react';
import SEOHead from '../components/SEOHead';
import { Link } from 'react-router-dom';

const PrivacyPolicyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <SEOHead
        title="Privacy Policy — Dealcross | Data Protection"
        description="Read Dealcross's Privacy Policy. Understand how we collect, use, and protect your personal information on our universal escrow platform."
        keywords="privacy policy, data protection, user privacy, dealcross privacy, GDPR, NDPR"
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 md:p-12">

            {/* Header */}
            <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                Privacy Policy
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Last updated: {formattedDate}
              </p>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Questions about your data? Email{' '}
                  <a href="mailto:privacy@dealcross.net" className="underline font-medium">
                    privacy@dealcross.net
                  </a>.
                </p>
              </div>
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Welcome to Dealcross ("we," "our," or "us"). We are committed to protecting your personal
                  information and your right to privacy. This Privacy Policy explains how we collect, use, disclose,
                  and safeguard your information when you use our universal escrow platform and services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2.1 Personal Information</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  We collect personal information that you voluntarily provide when you:
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                  <li>Register for an account</li>
                  <li>Create or participate in escrow transactions</li>
                  <li>Complete KYC (identity verification)</li>
                  <li>Contact our customer support</li>
                  <li>Subscribe to our newsletter or marketing communications</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  This may include your name, email address, phone number, government ID documents, payment
                  information, transaction history, and other information you choose to provide.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">2.2 Automatically Collected Information</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  When you access our platform, we automatically collect:
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Access times and dates</li>
                  <li>Pages viewed and links clicked</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">We use collected information to:</p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
                  <li>Provide, operate, and maintain our universal escrow services</li>
                  <li>Process transactions and send status notifications</li>
                  <li>Verify your identity and prevent fraud (KYC/AML compliance)</li>
                  <li>Respond to inquiries and provide customer support</li>
                  <li>Send technical notices and security alerts</li>
                  <li>Improve and optimize our platform</li>
                  <li>Comply with legal and regulatory obligations</li>
                  <li>Send promotional communications (with your consent)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Information Sharing and Disclosure</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  We do not sell your personal information. We may share your information in the following situations:
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
                  <li><strong>With transaction parties:</strong> To complete escrow transactions</li>
                  <li><strong>Service providers:</strong> Vendors who perform services on our behalf (payment processors, KYC providers, etc.)</li>
                  <li><strong>Legal requirements:</strong> When required by law, court order, or regulatory authority</li>
                  <li><strong>Business transfers:</strong> During mergers, acquisitions, or asset sales</li>
                  <li><strong>With your consent:</strong> Any other disclosure you authorize</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Data Security</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We implement appropriate security measures including end-to-end encryption, secure servers,
                  access controls, and two-factor authentication. However, no method of internet transmission is
                  100% secure. We encourage you to enable 2FA on your account for maximum protection.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Data Retention</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We retain your information for as long as necessary to provide our services and comply with
                  legal obligations. Transaction records are retained for a minimum of 7 years as required by
                  applicable financial regulations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Your Privacy Rights</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Depending on your location, you may have the right to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                  <li><strong>Access</strong> — Request a copy of your personal data</li>
                  <li><strong>Correction</strong> — Request corrections to inaccurate data</li>
                  <li><strong>Deletion</strong> — Request deletion of your personal data</li>
                  <li><strong>Portability</strong> — Receive your data in a portable format</li>
                  <li><strong>Opt-Out</strong> — Opt out of marketing communications</li>
                  <li><strong>Object</strong> — Object to certain processing activities</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  To exercise your rights, contact{' '}
                  <a href="mailto:privacy@dealcross.net" className="text-blue-600 dark:text-blue-400 hover:underline">
                    privacy@dealcross.net
                  </a>.
                  We will respond within 30 days.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Cookies and Tracking Technologies</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We use cookies and similar tracking technologies for authentication, analytics, and platform
                  functionality. You may disable cookies in your browser settings, but some features may not
                  function correctly.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Third-Party Links</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Our platform may contain links to external websites. We are not responsible for the privacy
                  practices of those sites and encourage you to review their privacy policies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Children's Privacy</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Dealcross is not directed at individuals under 18. We do not knowingly collect personal
                  information from minors. If we discover such data has been collected, we will delete it promptly.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">11. International Data Transfers</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your information may be processed in countries outside your own. We ensure appropriate
                  protections are in place, including standard contractual clauses where required.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">12. Changes to This Privacy Policy</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We may update this Privacy Policy at any time. Changes will be posted here with an updated
                  "Last updated" date. Significant changes will be communicated via email.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">13. Contact Us</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  For privacy-related questions or data requests:
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Privacy Email:</strong>{' '}
                    <a href="mailto:privacy@dealcross.net" className="text-blue-600 dark:text-blue-400 hover:underline">
                      privacy@dealcross.net
                    </a>
                  </p>
                  {/* ⚠️ COMPANY INFO NEEDED: Replace with real registered business address */}
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Address:</strong>{' '}
                    Lagos, Nigeria {/* TODO: Add full registered address */}
                  </p>
                  {/* ⚠️ COMPANY INFO NEEDED: Replace with real phone number or remove */}
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Support:</strong>{' '}
                    <a href="mailto:support@dealcross.net" className="text-blue-600 dark:text-blue-400 hover:underline">
                      support@dealcross.net
                    </a>
                  </p>
                </div>
              </section>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  This Privacy Policy is to be read alongside our{' '}
                  <Link to="/terms" className="underline font-medium">Terms of Service</Link>.
                  For any data requests, contact{' '}
                  <a href="mailto:privacy@dealcross.net" className="underline font-medium">
                    privacy@dealcross.net
                  </a>.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;
