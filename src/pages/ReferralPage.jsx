// FILE: src/pages/ReferralPage.jsx

import React, { useEffect, useState } from 'react';
import {
  Gift,
  Users,
  DollarSign,
  Copy,
  CheckCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ReferralPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // ✅ FIXED: Removed unused setReferralStats (was causing ESLint build error)
  // referralStats is kept as local const with defaults — fetching from API can be wired later
  const referralStats = {
    totalReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const currentUser = authService.getCurrentUser();

    if (currentUser) {
      setUser(currentUser);
      const generatedCode = `${currentUser.name
        .substring(0, 4)
        .toUpperCase()}${currentUser._id?.substring(0, 4) || '1234'}`;
      setReferralCode(generatedCode);

      // TODO: fetch real referral stats from API
      // authService.getReferralStats().then(stats => setReferralStats(stats));
    }
  }, []);

  const getReferralLink = () =>
    `https://dealcross.net/signup?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getReferralLink()).then(() => {
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleShare = (platform) => {
    const link = getReferralLink();
    const text = `Join me on Dealcross — the universal escrow platform. Get $10 credit with my code: ${referralCode}`;

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`,
      email: `mailto:?subject=${encodeURIComponent('Join Dealcross')}&body=${encodeURIComponent(text + '\n\n' + link)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: '$20 Per Referral',
      description: 'Earn $20 for each friend who signs up and completes their first escrow transaction.'
    },
    {
      icon: Gift,
      title: '$10 Friend Bonus',
      description: 'Your friends get $10 credit on their first transaction when they use your code.'
    },
    {
      icon: TrendingUp,
      title: 'Unlimited Earnings',
      description: 'No cap on referrals or earnings — the more you share, the more you earn.'
    },
    {
      icon: Award,
      title: 'Instant Payouts',
      description: "Rewards are credited to your wallet immediately after your friend's first transaction."
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Share Your Link',
      description: 'Send your unique referral link to friends via social media or messaging apps.'
    },
    {
      step: 2,
      title: 'Friend Signs Up',
      description: 'Your friend creates an account using your referral link and gets $10 credit.'
    },
    {
      step: 3,
      title: 'Complete Transaction',
      description: 'When your friend completes their first escrow transaction, rewards unlock.'
    },
    {
      step: 4,
      title: 'Get Rewarded',
      description: 'Earn $20 instantly in your Dealcross wallet — withdraw or use anytime.'
    }
  ];

  return (
    <>
      <SEOHead
        title="Dealcross Referral Program | Earn $20 Per Referral"
        description="Invite friends to Dealcross universal escrow and earn $20 for every successful referral. Unlimited earnings, instant payouts, and your friends get $10 credit."
        keywords="dealcross referral program, earn money referring friends, escrow affiliate, referral bonus"
        canonical="https://dealcross.net/referral"
        ogTitle="Earn $20 Per Referral on Dealcross"
        ogDescription="Join the Dealcross referral program. Earn $20 per referral, give your friends $10 credit."
      />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* HERO */}
        {/* ✅ FIXED: Replaced purple-to-indigo gradient with solid mature blue */}
        <section className="bg-blue-700 dark:bg-blue-900 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
          </div>

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6">
              <Gift className="w-4 h-4" />
              <span>Invite friends. Earn instantly.</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Earn $20 for Every Friend
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Share Dealcross with others and earn instantly. They get $10 credit, you get $20.
            </p>

            {/* Referral Card */}
            {user ? (
              <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 sm:p-8 text-left">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Your Referral Code
                </label>
                <div className="flex items-center gap-3 mb-6">
                  <input
                    type="text"
                    readOnly
                    value={referralCode}
                    aria-label="Your referral code"
                    className="flex-1 px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-mono text-2xl font-bold text-center text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleCopyLink}
                    aria-label="Copy referral link"
                    className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
                  >
                    {copied ? <CheckCircle className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  </button>
                </div>

                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Your Referral Link
                </label>
                <div className="flex items-center gap-3 mb-6">
                  <input
                    type="text"
                    readOnly
                    value={getReferralLink()}
                    aria-label="Referral link"
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white min-w-0"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-5 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition font-semibold whitespace-nowrap text-sm"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Share Via
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: 'twitter', name: 'Twitter', icon: '𝕏', color: 'bg-black hover:bg-gray-900' },
                    { id: 'facebook', name: 'Facebook', icon: 'f', color: 'bg-blue-600 hover:bg-blue-700' },
                    { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: 'bg-blue-700 hover:bg-blue-800' },
                    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: 'bg-green-600 hover:bg-green-700' },
                    { id: 'email', name: 'Email', icon: '✉', color: 'bg-gray-600 hover:bg-gray-700' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      aria-label={`Share on ${btn.name}`}
                      onClick={() => handleShare(btn.id)}
                      className={`${btn.color} text-white px-4 py-3 rounded-lg transition font-semibold text-sm flex items-center justify-center gap-1`}
                    >
                      <span>{btn.icon}</span>
                      <span className="hidden sm:inline">{btn.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 text-left">
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                  Sign in to get your personal referral code and start earning.
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-semibold"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-8 py-4 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl transition font-semibold"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* STATS (only when logged in) */}
        {user && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Total Referrals', value: referralStats.totalReferrals, icon: Users, color: 'text-blue-600' },
                { label: 'Total Earnings', value: `$${referralStats.totalEarnings}`, icon: DollarSign, color: 'text-green-600' },
                { label: 'Pending Earnings', value: `$${referralStats.pendingEarnings}`, icon: TrendingUp, color: 'text-yellow-600' }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</span>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BENEFITS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Why Join Our Referral Program?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              Earn real money just by sharing a platform your network will love.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-800 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition"
                >
                  {/* ✅ FIXED: Replaced blue-to-purple gradient with solid blue-600 */}
                  <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{b.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{b.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-white dark:bg-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                How It Works
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                Start earning in 4 simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {howItWorks.map((step, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700">
                  {/* ✅ FIXED: Step number badges — solid blue-600, no purple gradient */}
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full font-bold text-xl flex items-center justify-center mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'When do I get paid?',
                a: "You receive $20 immediately after your referred friend completes their first escrow transaction."
              },
              {
                q: 'Is there a limit to referrals?',
                a: 'No. Refer unlimited friends and earn unlimited rewards.'
              },
              {
                q: 'How does my friend get their bonus?',
                a: 'Your friend gets $10 instantly after signing up using your referral link.'
              },
              {
                q: 'Can I withdraw my earnings?',
                a: 'Yes. Withdraw anytime to your bank account or use your balance within Dealcross.'
              },
              {
                q: 'What qualifies as a completed transaction?',
                a: 'A full escrow lifecycle: buyer funds, seller delivers, buyer confirms — the entire process must complete.'
              }
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">{faq.q}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        {/* ✅ FIXED: Replaced blue-to-purple gradient with solid blue-700 */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <div className="bg-blue-700 dark:bg-blue-800 text-center rounded-3xl p-8 sm:p-10 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Start Earning?</h2>
            <p className="text-lg text-blue-100 mt-4 max-w-2xl mx-auto">
              Share Dealcross and earn passive income every time a friend transacts safely.
            </p>
            {user ? (
              <button
                onClick={handleCopyLink}
                className="px-8 py-4 bg-white text-blue-700 rounded-xl hover:bg-gray-100 transition font-bold text-lg shadow-xl mt-6"
              >
                Copy My Referral Link
              </button>
            ) : (
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 bg-white text-blue-700 rounded-xl hover:bg-gray-100 transition font-bold text-lg shadow-xl mt-6"
              >
                Sign Up & Get Started
              </button>
            )}
          </div>
        </section>

      </main>
    </>
  );
};

export default ReferralPage;
