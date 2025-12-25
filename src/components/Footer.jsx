// File: src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Phone, MapPin } from 'lucide-react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaGithub } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: 'About Us', path: '/about', description: 'Learn about Dealcross mission and team' },
      { name: 'Careers', path: '/careers', description: 'Join our growing team' },
      { name: 'Contact', path: '/contact', description: 'Get in touch with us' },
      { name: 'Blog', path: '/blog', description: 'Latest news and updates' },
    ],
    product: [
      { name: 'How It Works', path: '/#how-it-works', description: 'Learn how escrow works' },
      { name: 'API Documentation', path: '/api', description: 'Integrate Dealcross API' },
      { name: 'Referral Program', path: '/referral', description: 'Earn by referring friends' },
      { name: 'FAQ', path: '/faq', description: 'Frequently asked questions' },
    ],
    resources: [
      { name: 'Documentation', path: '/docs', description: 'Complete platform guides' },
      { name: 'Help Center', path: '/faq', description: 'Get help and support' },
      { name: 'Refund Policy', path: '/refund-policy', description: 'Our refund terms' },
    ],
    legal: [
      { name: 'Privacy Policy', path: '/privacy-policy', description: 'How we protect your data' },
      { name: 'Terms of Service', path: '/terms', description: 'Our terms and conditions' },
      { name: 'Cookie Policy', path: '/cookies', description: 'How we use cookies' },
    ],
  };

  const socialLinks = [
    { 
      icon: FaFacebookF, 
      url: 'https://facebook.com/dealcross', 
      label: 'Facebook', 
      color: 'hover:text-[#1877f2]',
      ariaLabel: 'Follow us on Facebook'
    },
    { 
      icon: FaTwitter, 
      url: 'https://twitter.com/dealcross', 
      label: 'Twitter', 
      color: 'hover:text-[#1da1f2]',
      ariaLabel: 'Follow us on Twitter'
    },
    { 
      icon: FaInstagram, 
      url: 'https://instagram.com/dealcross', 
      label: 'Instagram', 
      color: 'hover:text-[#e4405f]',
      ariaLabel: 'Follow us on Instagram'
    },
    { 
      icon: FaLinkedinIn, 
      url: 'https://linkedin.com/company/dealcross', 
      label: 'LinkedIn', 
      color: 'hover:text-[#0077b5]',
      ariaLabel: 'Connect with us on LinkedIn'
    },
    { 
      icon: FaGithub, 
      url: 'https://github.com/dealcross', 
      label: 'GitHub', 
      color: 'hover:text-gray-900 dark:hover:text-white',
      ariaLabel: 'View our code on GitHub'
    },
  ];

  const trustBadges = [
    { label: '256-bit SSL Encryption', description: 'Bank-level security' },
    { label: 'PCI DSS Compliant', description: 'Payment security certified' },
    { label: 'GDPR Compliant', description: 'EU data protection' },
    { label: 'SOC 2 Certified', description: 'Security audited' },
  ];

  return (
    <>
      {/* Structured Data for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Dealcross",
          "url": "https://dealcross.net",
          "logo": "https://dealcross.net/logo.png",
          "description": "Secure escrow platform for online transactions",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "123 Escrow Street",
            "addressLocality": "New York",
            "addressRegion": "NY",
            "postalCode": "10001",
            "addressCountry": "US"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+1-555-123-4567",
            "contactType": "Customer Support",
            "email": "support@dealcross.net",
            "areaServed": "Worldwide",
            "availableLanguage": ["English"]
          },
          "sameAs": [
            "https://facebook.com/dealcross",
            "https://twitter.com/dealcross",
            "https://instagram.com/dealcross",
            "https://linkedin.com/company/dealcross",
            "https://github.com/dealcross"
          ]
        })}
      </script>

      <footer
        role="contentinfo"
        aria-label="Site footer"
        className="bg-[#f8fafc] dark:bg-[#0f1419] border-t border-gray-200 dark:border-gray-700 transition-colors duration-300"
        itemScope
        itemType="https://schema.org/WPFooter"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">

            {/* Brand Section - 2 columns wide */}
            <div className="lg:col-span-2" itemScope itemType="https://schema.org/Organization">
              <Link
                to="/"
                aria-label="Dealcross - Secure Escrow Platform Home"
                className="flex items-center mb-4 group"
                itemProp="url"
              >
                <Shield 
                  className="w-8 h-8 text-[#1e3a5f] dark:text-[#2d4a7c] mr-2 group-hover:scale-110 transition-transform" 
                  aria-hidden="true"
                />
                <span 
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                  itemProp="name"
                >
                  Dealcross
                </span>
              </Link>

              <p 
                className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm leading-relaxed text-sm"
                itemProp="description"
              >
                Secure escrow platform protecting millions of transactions worldwide.
                Buy and sell with total confidence using bank-level encryption.
              </p>

              {/* Contact Info with Schema */}
              <address className="space-y-3 mb-6 not-italic" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                <a
                  href="mailto:support@dealcross.net"
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition group"
                  itemProp="email"
                  aria-label="Email support at support@dealcross.net"
                >
                  <Mail className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  <span className="text-sm">support@dealcross.net</span>
                </a>

                <a
                  href="tel:+15551234567"
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition group"
                  itemProp="telephone"
                  aria-label="Call us at +1 555-123-4567"
                >
                  <Phone className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </a>

                <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-sm">
                    <span itemProp="streetAddress">123 Escrow Street</span><br />
                    <span itemProp="addressLocality">New York</span>, <span itemProp="addressRegion">NY</span> <span itemProp="postalCode">10001</span>
                  </span>
                </div>
              </address>

              {/* Social Links with Schema */}
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
                      className={`text-gray-500 dark:text-gray-400 ${social.color} transition-all duration-200 transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] dark:focus:ring-[#2d4a7c] rounded`}
                      itemProp="sameAs"
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </a>
                  );
                })}
              </nav>
            </div>

            {/* Company Links */}
            <nav aria-labelledby="footer-company">
              <h3
                id="footer-company"
                className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4"
              >
                Company
              </h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.path}
                      className="text-gray-600 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition text-sm focus:text-[#1e3a5f] dark:focus:text-[#2d4a7c] focus:outline-none focus:underline"
                      title={link.description}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Product Links */}
            <nav aria-labelledby="footer-product">
              <h3
                id="footer-product"
                className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4"
              >
                Product
              </h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.path}
                      className="text-gray-600 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition text-sm focus:text-[#1e3a5f] dark:focus:text-[#2d4a7c] focus:outline-none focus:underline"
                      title={link.description}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Resources Links */}
            <nav aria-labelledby="footer-resources">
              <h3
                id="footer-resources"
                className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4"
              >
                Resources
              </h3>
              <ul className="space-y-3">
                {footerLinks.resources.map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.path}
                      className="text-gray-600 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition text-sm focus:text-[#1e3a5f] dark:focus:text-[#2d4a7c] focus:outline-none focus:underline"
                      title={link.description}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Legal Links */}
            <nav aria-labelledby="footer-legal">
              <h3
                id="footer-legal"
                className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4"
              >
                Legal
              </h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.path}
                      className="text-gray-600 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition text-sm focus:text-[#1e3a5f] dark:focus:text-[#2d4a7c] focus:outline-none focus:underline"
                      title={link.description}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left">
                © {currentYear} <span itemProp="name">Dealcross</span>. All rights reserved.
              </p>

              <nav aria-label="Footer quick links" className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <Link 
                  to="/privacy-policy" 
                  className="hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition focus:text-[#1e3a5f] dark:focus:text-[#2d4a7c] focus:outline-none focus:underline"
                  title="Read our privacy policy"
                >
                  Privacy
                </Link>
                <Link 
                  to="/terms" 
                  className="hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition focus:text-[#1e3a5f] dark:focus:text-[#2d4a7c] focus:outline-none focus:underline"
                  title="Read our terms of service"
                >
                  Terms
                </Link>
                <Link 
                  to="/cookies" 
                  className="hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition focus:text-[#1e3a5f] dark:focus:text-[#2d4a7c] focus:outline-none focus:underline"
                  title="Learn about our cookie policy"
                >
                  Cookies
                </Link>
                <Link 
                  to="/docs" 
                  className="hover:text-[#1e3a5f] dark:hover:text-[#2d4a7c] transition focus:text-[#1e3a5f] dark:focus:text-[#2d4a7c] focus:outline-none focus:underline"
                  title="Get help and documentation"
                >
                  Help
                </Link>
              </nav>
            </div>
          </div>

          {/* Trust Badges with Tooltips */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div 
              className="flex flex-wrap justify-center items-center gap-8 text-gray-500 dark:text-gray-600"
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
                  <Shield className="w-4 h-4 group-hover:text-[#1e3a5f] dark:group-hover:text-[#2d4a7c] transition" aria-hidden="true" />
                  <span className="text-xs font-medium group-hover:text-[#1e3a5f] dark:group-hover:text-[#2d4a7c] transition">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-md mx-auto text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Stay Updated
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Get the latest security tips and platform updates
              </p>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  aria-label="Email address for newsletter"
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] dark:focus:ring-[#2d4a7c] focus:border-transparent bg-white dark:bg-[#1e2936] text-gray-900 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e3a5f] dark:bg-[#2d4a7c] hover:bg-[#2d4a7c] dark:hover:bg-[#3d5a8c] text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] dark:focus:ring-[#2d4a7c] focus:ring-offset-2"
                  aria-label="Subscribe to newsletter"
                >
                  Subscribe
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