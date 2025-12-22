// File: src/components/BlogPreviewList.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const BlogPreviewList = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const blogPosts = [
    {
      title: '5 Tips for Safe Online Trading',
      excerpt: 'Learn how to protect yourself from scams and fraudulent sellers when trading online. Essential security practices every trader should know.',
      date: 'March 15, 2025',
      readTime: '5 min read',
      category: 'Security',
      link: '/blog/safe-online-trading',
      color: '#1e3a5f'
    },
    {
      title: 'Understanding Escrow Services',
      excerpt: 'A complete guide to how escrow services work and why they are essential for secure transactions in the digital age.',
      date: 'March 10, 2025',
      readTime: '8 min read',
      category: 'Education',
      link: '/blog/understanding-escrow',
      color: '#2d4a7c'
    },
    {
      title: 'Cryptocurrency Payments Explained',
      excerpt: 'Everything you need to know about accepting Bitcoin, Ethereum, and other cryptocurrencies for your business.',
      date: 'March 5, 2025',
      readTime: '6 min read',
      category: 'Crypto',
      link: '/blog/cryptocurrency-payments',
      color: '#10b981'
    }
  ];

  return (
    <section className="py-20 bg-[#f8fafc] dark:bg-[#0f1419] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#10b981] px-4 py-2 rounded-lg mb-4">
              <span className="text-sm font-semibold text-white">📚 Blog</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              Latest from Our Blog
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 transition-colors duration-300">
              Tips, guides, and industry insights to help you succeed
            </p>
          </motion.div>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                to={post.link}
                className="group block bg-white dark:bg-[#1e2936] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:border-[#1e3a5f] dark:hover:border-[#2d4a7c] transition-all duration-300 h-full"
              >
                {/* Category Badge */}
                <div className="h-2" style={{ backgroundColor: post.color }}></div>
                
                <div className="p-8">
                  {/* Category & Date */}
                  <div className="flex items-center justify-between mb-4">
                    <span 
                      className="px-3 py-1 text-white text-xs font-semibold rounded-lg"
                      style={{ backgroundColor: post.color }}
                    >
                      {post.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-[#1e3a5f] dark:group-hover:text-[#2d4a7c] transition-colors duration-200">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    {post.excerpt}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#1e3a5f] dark:text-[#2d4a7c] font-semibold group-hover:gap-3 transition-all duration-200">
                      <span>Read More</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#1e3a5f] dark:bg-[#2d4a7c] text-white rounded-xl font-semibold hover:bg-[#2d4a7c] dark:hover:bg-[#3d5a8c] transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            View All Posts
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default BlogPreviewList;