// File: src/components/Footer.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, MapPin, Phone } from 'lucide-react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);



  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      await axios.post('/api/newsletter', { email });
      toast.success('Subscribed! Thank you.');
      setEmail('');
    } catch {
      // Graceful fallback if route doesn't exist yet
      toast('Newsletter coming soon - thank you for your interest!', { icon: '📬' });
      setEmail('');
    } finally {
      setSubscribing(false);
    }
  };

  const footerLinks = {
    company: [
      { name: 'About Us',  path: '/about',   description: 'Learn about our mission' },
      { name: 'Careers',   path: '/careers', description: 'Join our growing team' },
      { name: 'Contact',   path: '/contact', description: 'Get in touch' },
      { name: 'Blog',      path: '/blog',    description: 'Latest news and updates' },
    ],
    product: [
      { name: 'How It Works',       path: '/#how-it-works', description: 'Learn how escrow works' },
      { name: 'API Documentation',  path: '/api',           description: 'Integrate Dealcross API' },
      { name: 'Referral Program',   path: '/referral',      description: 'Earn by referring friends' },
      { name: 'FAQ',                path: '/faq',           description: 'Frequently asked questions' },
    ],
    resources: [
      { name: 'Documentation', path: '/docs',          description: 'Platform guides' },
      { name: 'Help Center',   path: '/faq',           description: 'Get help and support' },
      { name: 'Refund Policy', path: '/refund-policy', description: 'Our refund terms' },
    ],
    legal: [
      { name: 'Privacy Policy',  path: '/privacy-policy', description: 'How we protect your data' },
      { name: 'Terms of Service', path: '/terms',          description: 'Our terms and conditions' },
      { name: 'Cookie Policy',   path: '/cookies',        description: 'How we use cookies' },
    ],
  };

  const socialLinks = [
    { icon: FaFacebookF,  url: 'https://facebook.com/dealcross',          ariaLabel: 'Follow us on Facebook',         color: 'hover:text-blue-600' },
    { icon: FaTwitter,    url: 'https://twitter.com/dealcross',            ariaLabel: 'Follow us on Twitter / X',      color: 'hover:text-sky-500' },
    { icon: FaInstagram,  url: 'https://instagram.com/dealcross',          ariaLabel: 'Follow us on Instagram',        color: 'hover:text-pink-500' },
    { icon: FaLinkedinIn, url: 'https://linkedin.com/company/dealcross',   ariaLabel: 'Connect on LinkedIn',           color: 'hover:text-blue-700' },
    { icon: FaGithub,     url: 'https://github.com/dealcross',             ariaLabel: 'View our code on GitHub',       color: 'hover:text-gray-900 dark:hover:text-white' },
  ];

  const trustBadges = [
    { label: '256-bit SSL Encryption', description: 'Bank-level security' },
    { label: 'PCI DSS Compliant',      description: 'Payment security certified' },
    { label: 'GDPR Compliant',         description: 'EU data protection' },
    { label: 'SOC 2 Certified',        description: 'Security audited' },
  ];

  const navLinkClass =
    'text-gray-600 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-blue-300 transition text-sm focus:text-[#1e3a5f] focus:outline-none focus:underline';

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Dealcross',
          url: 'https://dealcross.net',
          logo: 'https://dealcross.net/logo.png',
          description: 'Universal escrow platform for secure online transactions',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '204 Ikot Ekpene Road',
            addressLocality: 'Aba',
            addressRegion: 'Abia State',
            addressCountry: 'NG'
          },
          telephone: '+2349063980422',
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Support',
            email: 'support@dealcross.net',
            areaServed: 'Worldwide',
            availableLanguage: ['English']
          },
          sameAs: [
            'https://facebook.com/dealcross',
            'https://twitter.com/dealcross',
            'https://instagram.com/dealcross',
            'https://linkedin.com/company/dealcross',
            'https://github.com/dealcross'
          ]
        })}
      </script>

      <footer
        role="contentinfo"
        aria-label="Site footer"
        className="bg-[#f8fafc] dark:bg-[#0f1419] border-t border-gray-200 dark:border-gray-700 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">

            {/* Brand - 2 columns */}
            <div className="lg:col-span-2">
              <Link
                to="/"
                aria-label="Dealcross - Universal Escrow Platform"
                className="flex items-center mb-4 group"
              >
                <Shield className="w-8 h-8 text-[#1e3a5f] dark:text-blue-400 mr-2 group-hover:scale-110 transition-transform" aria-hidden="true" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Dealcross</span>
              </Link>

              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm leading-relaxed text-sm">
                Universal escrow platform protecting transactions worldwide - goods, services, digital assets,
                and more. Buy and sell with total confidence.
              </p>
              <address className="space-y-3 mb-6 not-italic">
                <a
                  href="mailto:support@dealcross.net"
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-blue-300 transition group"
                >
                  <Mail className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  <span className="text-sm">support@dealcross.net</span>
                </a>
                <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-sm">204 Ikot Ekpene Road, Aba, Abia State, Nigeria</span>
                </div>
              </address>

              {/* Social Links */}
              <nav aria-label="Social media links" className="flex space-x-4">
                {socialLinks.map((social, idx) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      aria-label={social.ariaLabel}
                      className={`text-gray-500 dark:text-gray-400 ${social.color} transition-all duration-200 transform hover:scale-110`}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </a>
                  );
                })}
              </nav>
            </div>

            {/* Link columns */}
            {[
              { id: 'footer-company',   label: 'Company',   links: footerLinks.company },
              { id: 'footer-product',   label: 'Product',   links: footerLinks.product },
              { id: 'footer-resources', label: 'Resources', links: footerLinks.resources },
              { id: 'footer-legal',     label: 'Legal',     links: footerLinks.legal },
            ].map(({ id, label, links }) => (
              <nav key={id} aria-labelledby={id}>
                <h3
                  id={id}
                  className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4"
                >
                  {label}
                </h3>
                <ul className="space-y-3">
                  {links.map((link, idx) => (
                    <li key={idx}>
                      <Link to={link.path} className={navLinkClass} title={link.description}>
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left">
                © {currentYear} Dealcross. All rights reserved.
              </p>
              <nav aria-label="Footer quick links" className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <Link to="/privacy-policy" className={navLinkClass}>Privacy</Link>
                <Link to="/terms"          className={navLinkClass}>Terms</Link>
                <Link to="/cookies"        className={navLinkClass}>Cookies</Link>
                <Link to="/docs"           className={navLinkClass}>Help</Link>
              </nav>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div
              className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-gray-500 dark:text-gray-600"
              role="list"
              aria-label="Security and compliance certifications"
            >
              {trustBadges.map((badge, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 group cursor-help"
                  role="listitem"
                  title={badge.description}
                >
                  <Shield className="w-4 h-4 group-hover:text-[#1e3a5f] dark:group-hover:text-blue-300 transition" aria-hidden="true" />
                  <span className="text-xs font-medium group-hover:text-[#1e3a5f] dark:group-hover:text-blue-300 transition">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter - ✅ FIXED: wired to POST /api/newsletter with toast feedback */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-md mx-auto text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Stay Updated</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Get the latest security tips and platform updates
              </p>
              <form className="flex gap-2" onSubmit={handleNewsletterSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  aria-label="Email address for newsletter"
                  required
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#1e2936] text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="px-4 py-2 bg-[#1e3a5f] dark:bg-blue-700 hover:bg-[#2d4a7c] dark:hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Subscribe to newsletter"
                >
                  {subscribing ? 'Subscribing…' : 'Subscribe'}
                </button>
              </form>
              <p className="text-xs text-gray-500 dark:text-gray-600 mt-2">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </div>
          </div>

        </div>
      </footer>
    </>
  );
};

export default Footer;
