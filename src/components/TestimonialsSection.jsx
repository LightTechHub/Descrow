// File: src/components/TestimonialsSection.jsx
import React from 'react';
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

// ✅ FIXED: Avatar fallback component — renders initials when no real photo is available.
// ⚠️ COMPANY INFO NEEDED: Replace avatarSrc with real testimonial photos when available.
// Suggested sizes: 64x64px or 128x128px, circular crop. Store in /public/images/testimonials/
const Avatar = ({ name, src }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src && !src.startsWith('/images/')) {
    // Only render img if it's an actual external URL, not a local placeholder path
    return (
      <img
        src={src}
        alt={name}
        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  // Fallback: render styled initials avatar
  return (
    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg select-none">
      {initials}
    </div>
  );
};

const TestimonialsSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const testimonials = [
    {
      name: 'David Anderson',
      role: 'CEO, Sarah Innovations',
      // ⚠️ REPLACE: Add real photo at /public/images/testimonials/david.jpg
      image: '/images/testimonials/david.jpg',
      quote: 'Dealcross makes escrow easy and secure. It\'s the best platform for protecting both parties in any transaction. I use it for everything from product purchases to service contracts.',
      rating: 5,
      verified: true
    },
    {
      name: 'Sarah Johnson',
      role: 'E-commerce Entrepreneur',
      // ⚠️ REPLACE: Add real photo at /public/images/testimonials/sarah.jpg
      image: '/images/testimonials/sarah.jpg',
      quote: 'The best escrow service I\'ve used. My international transactions are now 100% secure and my customers love the protection it offers. Highly recommended.',
      rating: 5,
      verified: true
    },
    {
      name: 'Michael Chen',
      role: 'Marketplace Owner',
      // ⚠️ REPLACE: Add real photo at /public/images/testimonials/michael.jpg
      image: '/images/testimonials/michael.jpg',
      quote: 'Integrated the API in under 2 hours. Transaction disputes dropped to zero. This is exactly what our platform needed — universal escrow that works for any deal type.',
      rating: 5,
      verified: true
    }
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-4">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Trusted by Thousands</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 transition-colors duration-300">
              Real feedback from real businesses and individuals using Dealcross
            </p>
          </motion.div>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                {/* Quote Icon */}
                <div className="mb-4">
                  <Quote className="w-10 h-10 text-blue-600 dark:text-blue-400 opacity-50" />
                </div>

                {/* Quote Text */}
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6 flex-grow italic">
                  "{testimonial.quote}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {/* ✅ FIXED: Avatar renders initials fallback instead of broken img 404 */}
                  <Avatar name={testimonial.name} src={testimonial.image} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">
                        {testimonial.name}
                      </h4>
                      {testimonial.verified && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center"
        >
          {[
            { value: '10,000+', label: 'Active Users' },
            { value: '$50M+',   label: 'In Escrow' },
            { value: '150+',    label: 'Countries' },
            { value: '99.9%',   label: 'Uptime' }
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-950 rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-gray-800"
            >
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
