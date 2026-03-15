// File: src/components/TestimonialsSection.jsx
// ✅ FIXED: Avatar uses gradient initials - shows cleanly when no real photo available
// ✅ NEW:   Animated counting stats - count up from 0 when section enters viewport
// ✅ FIXED: Mobile sizing, padding, typography
import React, { useState, useEffect, useRef } from 'react';
import { Star, Quote, Shield } from 'lucide-react';

// ── Animated counter hook ─────────────────────────────────────────────────────
const useCountUp = (target, duration = 2000, started = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = null;
    const end = typeof target === 'number' ? target : parseFloat(target);
    if (isNaN(end)) return;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return count;
};

// ── Stat item with animated number ───────────────────────────────────────────
const StatItem = ({ value, label, started }) => {
  // Parse value like "10000", "50", "150", "99.9"
  const numericPart = parseFloat(value.replace(/[^0-9.]/g, ''));
  const prefix = value.match(/^[^0-9]*/)?.[0] || '';
  const suffix = value.match(/[^0-9.]+$/)?.[0] || '';
  const count = useCountUp(numericPart, 2200, started);

  const display = () => {
    if (value === '99.9%') {
      // Show one decimal place for 99.9
      const pct = started ? (count >= 99 ? '99.9' : count.toString()) : '0';
      return `${pct}%`;
    }
    return `${prefix}${count.toLocaleString()}${suffix}`;
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 text-center hover:shadow-md transition-shadow">
      <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2 tabular-nums">
        {display()}
      </div>
      <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium leading-tight">{label}</div>
    </div>
  );
};

// ── Avatar - initials fallback if no real photo ───────────────────────────────
const Avatar = ({ name, src }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-green-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-orange-500 to-red-500',
    'from-cyan-500 to-blue-500',
  ];
  const gradient = gradients[name.charCodeAt(0) % gradients.length];

  // Only attempt real image load if src is an actual external URL
  const isExternalUrl = src && (src.startsWith('http://') || src.startsWith('https://'));

  if (isExternalUrl && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0 border-2 border-gray-100 dark:border-gray-800"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 text-white font-bold text-base sm:text-lg select-none border-2 border-white dark:border-gray-800 shadow-sm`}>
      {initials}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const TestimonialsSection = () => {
  const [statsVisible, setStatsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const testimonials = [
    {
      name: 'Michael Torres',
      role: 'E-commerce Merchant, Miami',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
      quote: 'Dealcross has completely changed how I do business online. I used to lose money every week to fraud - now every transaction is protected and both sides trust the process.',
      rating: 5,
      verified: true
    },
    {
      name: 'Sophie Müller',
      role: 'Freelance Designer, Berlin',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face',
      quote: 'As a freelancer, getting paid was always stressful. With Dealcross, the client funds escrow before I start, and I receive payment immediately on delivery. Zero disputes.',
      rating: 5,
      verified: true
    },
    {
      name: 'David Chen',
      role: 'Marketplace Owner, Singapore',
      image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
      quote: 'I integrated the Dealcross API in less than a day. Transaction disputes on my platform dropped to nearly zero. This is exactly what global e-commerce needed.',
      rating: 5,
      verified: true
    }
  ];

  const stats = [
    { value: '10000+',  label: 'Active Users' },
    { value: '$50M+',   label: 'In Escrow' },
    { value: '150+',    label: 'Countries' },
    { value: '99.9%',   label: 'Uptime' },
  ];

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 lg:py-24 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">Trusted by Thousands</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            What Our Users Say
          </h2>
          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Real feedback from businesses and individuals using Dealcross every day
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-10 sm:mb-16">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-950 rounded-2xl p-5 sm:p-8 border border-gray-200 dark:border-gray-800 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 flex flex-col"
            >
              <Quote className="w-7 h-7 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400 opacity-40 mb-3 sm:mb-4" />

              <p className="text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-4 sm:mb-6 flex-grow italic">
                "{t.quote}"
              </p>

              <div className="flex gap-0.5 sm:gap-1 mb-4 sm:mb-6">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <div className="flex items-center gap-3 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                <Avatar name={t.name} src={t.image} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">{t.name}</h4>
                    {t.verified && (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Animated Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {stats.map((stat, i) => (
            <StatItem key={i} value={stat.value} label={stat.label} started={statsVisible} />
          ))}
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
