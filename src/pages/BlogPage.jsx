// File: src/pages/BlogPage.jsx
import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, ArrowRight, Search } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import { Link } from 'react-router-dom';

const BlogPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const categories = ['All', 'Security', 'Guides', 'Updates', 'Tips', 'Industry News'];

  const blogPosts = [
    {
      id: 1,
      title: '10 Tips for Safe Online Transactions',
      excerpt: 'Learn essential security practices to protect yourself when buying or selling online with escrow.',
      author: 'Dealcross Team',
      date: 'Nov 10, 2024',
      readTime: '5 min read',
      category: 'Security',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop',
      featured: true
    },
    {
      id: 2,
      title: 'Universal Escrow: A Complete Guide',
      excerpt: "Everything you need to know about how escrow works for any transaction type — goods, services, digital assets, and more.",
      author: 'Dealcross Team',
      date: 'Nov 8, 2024',
      readTime: '8 min read',
      category: 'Guides',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop',
      featured: true
    },
    {
      id: 3,
      title: 'How Freelancers Use Escrow to Get Paid Safely',
      excerpt: 'Protecting your freelance income with escrow — how to set up milestone payments and ensure you always get paid.',
      author: 'Dealcross Team',
      date: 'Nov 5, 2024',
      readTime: '6 min read',
      category: 'Guides',
      image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop',
      featured: false
    },
    {
      id: 4,
      title: 'Cross-Border Transactions Made Safe',
      excerpt: 'How to use escrow for international deals — currencies, regulations, and best practices.',
      author: 'Dealcross Team',
      date: 'Nov 2, 2024',
      readTime: '7 min read',
      category: 'Industry News',
      image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=400&fit=crop',
      featured: false
    }
  ];

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      post.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const featuredPosts = blogPosts.filter((p) => p.featured);
  const showFeatured = searchQuery === '' && selectedCategory === 'all';

  return (
    <>
      <SEOHead
        title="Blog — Dealcross | Escrow News, Guides & Updates"
        description="Latest escrow guides, security tips, platform updates, and industry insights from Dealcross — the universal escrow platform."
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

        {/* Header */}
        <div className="bg-blue-700 dark:bg-blue-900 py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Dealcross Blog</h1>
            <p className="text-xl text-blue-100 mb-8">
              Guides, security tips, and insights for safer online transactions
            </p>
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 dark:bg-gray-800 dark:text-white border-0 focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {categories.map((cat) => {
                const normalized = cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(normalized)}
                    className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm ${
                      selectedCategory === normalized
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Featured */}
          {showFeatured && featuredPosts.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Featured Articles
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {featuredPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.id}`}
                    className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl border border-gray-200 dark:border-gray-800 transition-all"
                  >
                    <div className="relative h-56 sm:h-64 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        Featured
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
                          {post.category}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {post.readTime}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 text-sm sm:text-base">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* ✅ FIXED: removed purple gradient from avatar */}
                          <div className="w-8 h-8 bg-blue-600 rounded-full text-white flex items-center justify-center text-sm font-semibold">
                            {post.author.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{post.author}</p>
                            <p className="text-xs text-gray-500">{post.date}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All / Filtered Posts */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {searchQuery !== '' || selectedCategory !== 'all'
              ? `${filteredPosts.length} ${filteredPosts.length === 1 ? 'Result' : 'Results'}`
              : 'All Articles'}
          </h2>

          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.id}`}
                  className="group bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-800 transition-all"
                >
                  <div className="relative h-44 sm:h-48 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-gray-900/90 text-xs font-medium rounded-full text-gray-700 dark:text-gray-300">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{post.date}</span>
                      <span>·</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{post.readTime}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{post.author}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No articles found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search or filters.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Newsletter */}
          {/* ✅ FIXED: Removed purple gradient, replaced with mature blue */}
          <div className="mt-16 bg-blue-700 dark:bg-blue-800 text-white rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Subscribe to get the latest escrow guides, security tips, and platform updates.
            </p>
            {/* ⚠️ COMPANY INFO NEEDED: Wire this to a real newsletter/email service (e.g. Mailchimp, Resend) */}
            <form
              className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 justify-center"
              onSubmit={(e) => { e.preventDefault(); alert('Newsletter coming soon!'); }}
            >
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-300 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-gray-100 transition whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
            <p className="text-xs text-blue-200 mt-3">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPage;
