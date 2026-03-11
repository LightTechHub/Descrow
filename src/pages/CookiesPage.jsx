// File: src/pages/CookiesPage.jsx
// ✅ FIXED: Address updated to Aba, Abia State, Nigeria
// ✅ FIXED: Removed fake NY address and DPO email (remove if not applicable)
// ✅ FIXED: Mobile sizing and spacing
import React, { useEffect } from 'react';
import { Cookie, Settings, Eye, Shield } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const CookiesPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const cookieSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Cookie Policy - Dealcross",
    "description": "Official Cookie Policy for Dealcross. Learn how we use cookies for security, analytics, personalization, and platform optimization.",
    "url": "https://dealcross.net/cookies",
    "publisher": {
      "@type": "Organization",
      "name": "Dealcross",
      "url": "https://dealcross.net",
      "logo": { "@type": "ImageObject", "url": "https://dealcross.net/logo.png" }
    },
    "mainEntity": { "@type": "Article", "headline": "Dealcross Cookie Policy", "dateModified": new Date().toISOString() }
  };

  return (
    <>
      <SEOHead
        title="Cookie Policy - Dealcross | How We Use Cookies for Security & Experience"
        description="Read Dealcross' Cookie Policy. Understand how we use essential, analytics, and functional cookies to improve security, user experience, fraud prevention, and platform performance."
        keywords="Dealcross cookie policy, how cookies work, website cookies, privacy cookies, analytics cookies, essential cookies, functional cookies, cookie consent"
        canonical="https://dealcross.net/cookies"
      />

      <script type="application/ld+json">{JSON.stringify(cookieSchema)}</script>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 sm:py-16 px-4 sm:px-6 lg:px-8" role="main">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 md:p-12">

            <header className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="p-2.5 sm:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex-shrink-0">
                <Cookie className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Cookie Policy</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                  Last updated:{" "}
                  {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </header>

            <article className="prose prose-sm sm:prose-lg dark:prose-invert max-w-none space-y-8 sm:space-y-10">

              <section id="what-are-cookies">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">1. What Are Cookies?</h2>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                  Cookies are small text files stored on your device when you visit a website. They help improve functionality, security, and user experience by remembering your actions and preferences.
                </p>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                  At <strong>Dealcross</strong>, we use cookies to enhance your experience, secure your account, and understand how our platform is used.
                </p>
              </section>

              <section id="cookie-types">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Types of Cookies We Use</h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <h3 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">Essential Cookies</h3>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Required for core system functionality.</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      <li>Secure login & authentication</li>
                      <li>Fraud and CSRF protection</li>
                      <li>Session stability</li>
                      <li>Traffic load balancing</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 sm:p-6 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3 mb-3">
                      <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <h3 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">Analytics Cookies</h3>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Used to understand usage and improve performance.</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      <li>Google Analytics</li>
                      <li>User behaviour insights</li>
                      <li>Feature optimisation & A/B testing</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-3">
                      <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <h3 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white">Functional Cookies</h3>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Enhance your personalised experience.</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      <li>Theme preferences (dark/light mode)</li>
                      <li>Language settings</li>
                      <li>Saved dashboard layout</li>
                      <li>Recent searches</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="how-we-use-cookies">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">3. How We Use Cookies</h2>
                <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                  <li>Security & fraud prevention</li>
                  <li>Account authentication</li>
                  <li>Personalised dashboard experience</li>
                  <li>Performance analytics</li>
                  <li>Transaction protection</li>
                </ul>
              </section>

              <section id="third-party-cookies">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">4. Third-Party Cookies</h2>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Google Analytics</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Used to understand visitor activity.{' '}
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Privacy Policy</a>
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Payment Providers</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Paystack, Flutterwave, and NowPayments may use cookies for fraud detection during checkout.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Customer Support Tools</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Live chat tools may set session cookies to maintain support conversations.</p>
                  </div>
                </div>
              </section>

              <section id="cookie-duration">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">5. How Long Do Cookies Last?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 sm:p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm sm:text-base">Session Cookies</h4>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1">Deleted when your browser closes.</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 sm:p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-200 text-sm sm:text-base">Persistent Cookies</h4>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1">Last between 30 days and 2 years.</p>
                  </div>
                </div>
              </section>

              <section id="managing-cookies">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">6. Managing Cookie Preferences</h2>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3">You can control your cookie preferences via your browser settings:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                  <li>Chrome → Privacy & Security → Cookies</li>
                  <li>Firefox → Privacy & Security → Cookies</li>
                  <li>Safari → Privacy → Cookies</li>
                  <li>Edge → Cookies & Site Permissions</li>
                </ul>
              </section>

              <section id="disable-impact">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">7. Impact of Disabling Cookies</h2>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 sm:p-6 rounded-xl">
                  <p className="font-semibold text-yellow-900 dark:text-yellow-200 text-sm sm:text-base mb-2">Warning:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-yellow-800 dark:text-yellow-300">
                    <li>Frequent logouts</li>
                    <li>Lost preferences and dashboard settings</li>
                    <li>Reduced platform functionality</li>
                    <li>Weaker fraud protection</li>
                  </ul>
                </div>
              </section>

              <section id="do-not-track">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">8. Do Not Track (DNT)</h2>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                  Some browsers send DNT signals. While universal standards are not yet fully defined, Dealcross does not track users across third-party websites for advertising purposes.
                </p>
              </section>

              <section id="updates">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">9. Updates to This Policy</h2>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                  We may update this Cookie Policy to reflect changes in law, security practices, or platform improvements. Significant updates will be clearly communicated via email or in-app notification.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">10. Contact Us</h2>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4">For questions regarding cookies or privacy, please contact:</p>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Email</p>
                    <a href="mailto:privacy@dealcross.net" className="text-blue-600 dark:text-blue-400 underline text-sm sm:text-base">privacy@dealcross.net</a>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Address</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Dealcross<br />
                      Aba, Abia State<br />
                      Nigeria
                    </p>
                  </div>
                </div>
              </section>

            </article>
          </div>
        </div>
      </div>
    </>
  );
};

export default CookiesPage;
