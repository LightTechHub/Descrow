// File: src/pages/CareersPage.jsx
import React, { useEffect } from 'react';
import {
  Briefcase, Heart, TrendingUp, Users, Globe, Zap, Award, Coffee
} from 'lucide-react';
import SEOHead from '../components/SEOHead';

const CareersPage = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openPositions = [
    {
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'Build scalable features for our universal escrow platform using React, Node.js, and MongoDB.'
    },
    {
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Full-time',
      description: 'Create intuitive user experiences for buyers, sellers, and API developers on the platform.'
    },
    {
      title: 'Customer Success Manager',
      department: 'Support',
      location: 'Remote',
      type: 'Full-time',
      description: 'Help our users succeed with expert escrow guidance and world-class relationship management.'
    },
    {
      title: 'DevOps Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'Maintain and scale our infrastructure to handle millions of secure escrow transactions.'
    },
    {
      title: 'Marketing Manager',
      department: 'Marketing',
      location: 'Remote',
      type: 'Full-time',
      description: 'Drive growth through creative campaigns and data-driven strategies for a global audience.'
    },
    {
      title: 'Security Engineer',
      department: 'Security',
      location: 'Remote',
      type: 'Full-time',
      description: 'Protect our platform and users with cutting-edge security practices and proactive threat response.'
    }
  ];

  const benefits = [
    { icon: Heart, title: 'Health & Wellness', description: 'Comprehensive health, dental, and vision coverage.' },
    { icon: TrendingUp, title: 'Equity & Growth', description: 'Stock options and clear career progression paths.' },
    { icon: Globe, title: 'Remote First', description: 'Work from anywhere with fully flexible schedules.' },
    { icon: Coffee, title: 'Work-Life Balance', description: 'Unlimited PTO and generous parental leave policy.' },
    { icon: Zap, title: 'Learning Budget', description: '$2,000 yearly budget for courses, books, and conferences.' },
    { icon: Award, title: 'Competitive Salary', description: 'Top-tier compensation with annual performance bonuses.' }
  ];

  const values = [
    { title: 'User Obsessed', description: 'Every feature we ship starts with a real user problem.' },
    { title: 'Move Fast', description: 'We ship quickly, iterate fast, and learn from every release.' },
    { title: 'Transparency', description: 'We communicate openly and build trust through honesty.' },
    { title: 'Excellence', description: 'We set high standards and take pride in quality work.' }
  ];

  // ⚠️ COMPANY INFO NEEDED: Replace these stats with real numbers when available
  const stats = [
    { number: '20+', label: 'Team Members' },
    { number: '5+', label: 'Countries' },
    // { number: '$5M', label: 'Series A Funding' }, // ⚠️ Remove if not confirmed
    { number: '100K+', label: 'Transactions Protected' },
    { number: '4.8/5', label: 'User Rating' }
  ];

  const jobPostingSchema = openPositions.map((job) => ({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: new Date().toISOString(),
    employmentType: job.type,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Dealcross',
      sameAs: 'https://dealcross.net',
      logo: 'https://dealcross.net/logo.png'
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location }
    }
  }));

  return (
    <>
      <SEOHead
        title="Careers at Dealcross | Join Our Team"
        description="Build the future of universal escrow at Dealcross. We're hiring engineers, designers, security experts, and more. Remote-friendly, mission-driven team."
        keywords="Dealcross careers, hiring, remote jobs, engineering jobs, escrow platform, startup jobs"
        schemaData={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://dealcross.net' },
              { '@type': 'ListItem', position: 2, name: 'Careers', item: 'https://dealcross.net/careers' }
            ]
          },
          ...jobPostingSchema
        ]}
      />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* HERO */}
        {/* ✅ FIXED: Replaced blue-to-purple gradient with solid mature blue */}
        <section className="bg-blue-700 dark:bg-blue-900 py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <Briefcase className="w-14 h-14 text-white mx-auto mb-6" aria-hidden="true" />
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Build the Future of Trust
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Join our mission to make every online transaction safe, transparent, and protected — for anyone, anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#openings"
                className="px-8 py-4 bg-white text-blue-700 font-bold text-lg rounded-xl hover:bg-gray-100 transition shadow-xl"
              >
                View Open Positions
              </a>
              <a
                href="#culture"
                className="px-8 py-4 bg-blue-600 dark:bg-blue-700 text-white font-bold text-lg rounded-xl hover:bg-blue-500 transition border border-white/30"
              >
                Our Culture
              </a>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-800 text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {stat.number}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MISSION */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">Our Mission</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
            Dealcross is building the universal infrastructure for trust in online commerce —
            making every transaction safe, transparent, and protected regardless of what's being bought or sold.
          </p>
        </section>

        {/* BENEFITS */}
        <section className="bg-white dark:bg-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Benefits & Perks</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">We take care of our team so they can do their best work.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {benefits.map((benefit, idx) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                  >
                    {/* ✅ FIXED: Replaced blue-to-purple gradient with solid blue-600 */}
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section id="culture" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Our Values</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">The principles that guide how we build and collaborate.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {values.map((value, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{idx + 1}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value.title}</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* OPEN POSITIONS */}
        <section id="openings" className="bg-white dark:bg-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Open Positions</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">Join our growing, remote-first team.</p>
            </div>

            <div className="space-y-4">
              {openPositions.map((position, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {position.title}
                        </h3>
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                          {position.type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {position.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          {position.location}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{position.description}</p>
                    </div>
                    <a
                      href={`mailto:careers@dealcross.net?subject=${encodeURIComponent(`Application for ${position.title}`)}`}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold whitespace-nowrap text-center text-sm sm:text-base"
                    >
                      Apply Now
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* General Application */}
            {/* ✅ FIXED: Replaced blue-to-purple gradient bg with mature blue tint */}
            <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800 text-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Don't See the Right Role?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                We're always looking for exceptional people. Send your CV and tell us how you'd contribute to Dealcross.
              </p>
              <a
                href="mailto:careers@dealcross.net?subject=General%20Application"
                className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold shadow-lg"
              >
                Send General Application
              </a>
            </div>
          </div>
        </section>

        {/* LIFE AT DEALCROSS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Life at Dealcross</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">A remote-first culture that values people and purpose.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop',
                title: 'Collaborative Team',
                description: 'Work with talented, supportive people across multiple time zones.'
              },
              {
                image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&h=400&fit=crop',
                title: 'Remote Flexibility',
                description: 'Work from anywhere that makes you most productive and creative.'
              },
              {
                image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop',
                title: 'Shared Mission',
                description: 'Everyone here is working toward the same goal — safer commerce for all.'
              }
            ].map((item, idx) => (
              <article
                key={idx}
                className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="h-44 sm:h-48 overflow-hidden">
                  <img
                    src={item.image}
                    loading="lazy"
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        {/* ✅ FIXED: Replaced blue-to-purple gradient with solid blue-700 */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="bg-blue-700 dark:bg-blue-800 rounded-3xl p-8 md:p-12 text-center text-white">
            <Users className="w-14 h-14 mx-auto mb-6" aria-hidden="true" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Make an Impact?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join us in building universal escrow infrastructure that protects people across the globe.
            </p>
            <a
              href="#openings"
              className="inline-block px-8 py-4 bg-white text-blue-700 rounded-xl hover:bg-gray-100 transition font-bold text-lg shadow-xl"
            >
              View Open Positions
            </a>
          </div>
        </section>

      </main>
    </>
  );
};

export default CareersPage;
