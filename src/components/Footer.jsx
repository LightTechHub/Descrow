// File: src/components/ContactSection.jsx
import React, { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import API from '../../utils/api';
import toast from 'react-hot-toast';

const ContactSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/contact', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send message. Please email us directly at support@dealcross.net';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };



  const contactInfo = [
    {
      icon: Mail,
      title: 'Email Us',
      content: 'support@dealcross.net',
      link: 'mailto:support@dealcross.net',
      color: '#1e3a5f'
    },
    {
      icon: MapPin,
      title: 'Location',
      content: '204 Ikot Ekpene Road, Aba, Abia State, Nigeria',
      link: '#',
      color: '#2d4a7c'
    }
  ];


  const socials = [
    { id: 'twitter',   href: 'https://twitter.com/dealcross',          label: '𝕏',   ariaLabel: 'Twitter / X' },
    { id: 'linkedin',  href: 'https://linkedin.com/company/dealcross', label: 'in',  ariaLabel: 'LinkedIn' },
    { id: 'facebook',  href: 'https://facebook.com/dealcross',         label: 'f',   ariaLabel: 'Facebook' },
    { id: 'instagram', href: 'https://instagram.com/dealcross',        label: '📷',  ariaLabel: 'Instagram' },
  ];

  const inputClass =
    'w-full px-4 py-3 bg-white dark:bg-[#0f1419] border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] dark:focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white';

  return (
    <section id="contact" className="py-20 bg-white dark:bg-[#0f1419] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Have questions? We'd love to hear from you.
            </p>
          </motion.div>
        </div>

        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left - contact cards */}
          <div className="space-y-6">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              const isLink = info.link !== '#';
              const cardClass =
                'block bg-[#f8fafc] dark:bg-[#1e2936] rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-[#1e3a5f] dark:hover:border-blue-600 transition-all duration-300 group';
              const inner = (
                <>
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: info.color }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{info.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{info.content}</p>
                </>
              );
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {isLink ? (
                    <a href={info.link} className={cardClass}>{inner}</a>
                  ) : (
                    <div className={cardClass}>{inner}</div>
                  )}
                </motion.div>
              );
            })}

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="bg-[#1e3a5f] dark:bg-blue-800 rounded-2xl p-6 text-white"
            >
              <h3 className="text-lg font-bold mb-4">Follow Us</h3>
              <div className="flex gap-3">
                {socials.map((s) => (
                  <a
                    key={s.id}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.ariaLabel}
                    className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 font-semibold text-sm"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right - Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-[#f8fafc] dark:bg-[#1e2936] rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Your Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className={`${inputClass} resize-none`}
                      placeholder="Tell us more about your inquiry…"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-8 py-4 bg-[#1e3a5f] dark:bg-blue-700 text-white rounded-xl font-semibold hover:bg-[#2d4a7c] dark:hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending…' : 'Send Message'}
                    {!loading && <Send className="w-5 h-5" />}
                  </button>
                </form>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Message Sent!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-2 bg-[#1e3a5f] dark:bg-blue-700 text-white rounded-xl font-semibold hover:bg-[#2d4a7c] transition text-sm"
                  >
                    Send Another Message
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
