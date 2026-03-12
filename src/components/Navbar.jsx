// File: src/components/Navbar.jsx
// ✅ FIXED: Notification badge now shows real live unread count from API
// ✅ FIXED: Badge only shows when unread > 0 (not always red dot)
// ✅ FIXED: Mobile menu closes on route change
// ✅ FIXED: Small screen sizing throughout
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Bell, Settings, User, LogOut, LayoutDashboard, Shield, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { authService } from '../services/authService';

const API_URL = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

export default function Navbar({ user: propUser }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(propUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const currentUser = propUser || authService.getCurrentUser();
    setUser(currentUser);
  }, [propUser]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Live unread notification count ──────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data?.data?.count ?? data?.count ?? 0);
      }
    } catch {
      // Silent fail — navbar should not break if this fails
    }
  }, []);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    fetchUnreadCount();
    // Poll every 60 seconds while the user is logged in
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  const handleLogout = useCallback(() => {
    authService.logout();
    setOpen(false);
    setShowUserMenu(false);
    setUnreadCount(0);
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleNotificationClick = useCallback(() => {
    navigate('/notifications');
    setUnreadCount(0); // Optimistic clear — real count will refresh on next poll
  }, [navigate]);

  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  return (
    <nav
      className={`bg-white dark:bg-[#1e2936] sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-lg border-b-0' : 'shadow-sm border-b border-gray-200 dark:border-gray-700'
      }`}
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link
            to="/"
            aria-label="Go to Dealcross homepage"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <Logo size="md" />
            <span className="text-lg sm:text-xl font-bold text-[#1e3a5f] dark:text-white">
              Dealcross
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1" role="menubar">
            {[
              { to: '/', label: 'Home' },
              { to: '/about', label: 'About' },
              { to: '/contact', label: 'Contact' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                role="menuitem"
                className="px-3 lg:px-4 py-2 text-sm lg:text-base text-gray-700 dark:text-gray-300 hover:text-[#1e3a5f] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
              >
                {item.label}
              </Link>
            ))}

            {user && (
              <>
                <Link to="/dashboard" role="menuitem"
                  className="px-3 lg:px-4 py-2 text-sm lg:text-base text-gray-700 dark:text-gray-300 hover:text-[#1e3a5f] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium">
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link to="/admin/dashboard" role="menuitem"
                    className="px-3 lg:px-4 py-2 text-sm lg:text-base text-gray-700 dark:text-gray-300 hover:text-[#1e3a5f] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium">
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Desktop Right — Auth / User */}
          <div className="hidden md:flex items-center space-x-2">
            {!user ? (
              <>
                <Link to="/login"
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg font-medium transition">
                  Login
                </Link>
                <Link to="/signup"
                  className="px-4 py-2 bg-[#1e3a5f] dark:bg-[#2d4a7c] hover:bg-[#2d4a7c] dark:hover:bg-[#3d5a8c] text-white rounded-lg font-semibold transition shadow-sm text-sm">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                {/* Notifications Bell */}
                <button
                  onClick={handleNotificationClick}
                  className="relative p-2 sm:p-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition"
                  title="Notifications"
                  aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                  type="button"
                >
                  <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  {/* Live unread badge — only shows when count > 0 */}
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
                      aria-hidden="true"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* User dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-2 px-2 sm:px-3 py-2 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition"
                    aria-label="User menu"
                    aria-expanded={showUserMenu}
                    type="button"
                  >
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-[#1e3a5f] dark:border-[#2d4a7c]"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1e3a5f] dark:bg-[#2d4a7c] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="font-medium text-gray-900 dark:text-white hidden lg:block text-sm">
                      {user.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} aria-hidden="true" />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-60 sm:w-64 bg-white dark:bg-[#1e2936] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-20"
                        >
                          {/* User Info */}
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                            {user.tier && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-[#1e3a5f] dark:bg-[#2d4a7c] text-white text-xs font-semibold rounded-md">
                                {user.tier.toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="py-1.5">
                            {[
                              { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
                              { to: '/profile',           icon: User,            label: 'Profile' },
                              { to: '/wallet',            icon: Wallet,          label: 'Wallet' },
                              { to: '/profile?tab=settings', icon: Settings,     label: 'Settings' },
                            ].map(({ to, icon: Icon, label }) => (
                              <Link key={to} to={to} onClick={() => setShowUserMenu(false)}
                                className="flex items-center gap-3 px-4 py-2 sm:py-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] transition text-gray-700 dark:text-gray-300">
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm font-medium">{label}</span>
                              </Link>
                            ))}

                            {isAdmin && (
                              <Link to="/admin/dashboard" onClick={() => setShowUserMenu(false)}
                                className="flex items-center gap-3 px-4 py-2 sm:py-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] transition text-gray-700 dark:text-gray-300">
                                <Shield className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm font-medium">Admin Panel</span>
                              </Link>
                            )}
                          </div>

                          <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 pb-0.5">
                            <button onClick={handleLogout} type="button"
                              className="flex items-center gap-3 w-full px-4 py-2 sm:py-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 transition text-red-600 dark:text-red-400">
                              <LogOut className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm font-medium">Logout</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile — Notification + Hamburger */}
          <div className="flex items-center md:hidden gap-1">
            {user && (
              <button
                onClick={handleNotificationClick}
                className="relative p-2 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition"
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                type="button"
              >
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <ThemeToggle />
            <button
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Toggle mobile navigation"
              type="button"
              className="p-2 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition"
            >
              {open ? <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900 dark:text-white" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900 dark:text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            <motion.aside
              id="mobile-menu"
              role="menu"
              aria-label="Mobile Navigation Menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 right-0 w-[min(320px,90vw)] h-full bg-white dark:bg-[#1e2936] p-5 sm:p-6 z-50 shadow-2xl overflow-y-auto md:hidden"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                  <Logo size="md" />
                  <span className="text-lg font-bold text-[#1e3a5f] dark:text-white">Dealcross</span>
                </Link>
                <button onClick={() => setOpen(false)} aria-label="Close menu" type="button"
                  className="p-2 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition">
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* User Info (mobile) */}
              {user && (
                <div className="mb-5 p-4 bg-[#f8fafc] dark:bg-[#252f3f] rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name}
                        className="w-11 h-11 rounded-full object-cover border-2 border-[#1e3a5f] dark:border-[#2d4a7c] flex-shrink-0"
                        onError={e => { e.target.style.display='none'; }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#1e3a5f] dark:bg-[#2d4a7c] flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  {user.tier && (
                    <span className="inline-block mt-2.5 px-2.5 py-1 bg-[#1e3a5f] dark:bg-[#2d4a7c] text-white text-xs font-semibold rounded-md">
                      {user.tier.toUpperCase()} TIER
                    </span>
                  )}
                </div>
              )}

              {/* Nav Links */}
              <div className="space-y-1 mb-5">
                {[
                  { to: '/',       label: 'Home',    emoji: '🏠' },
                  { to: '/about',  label: 'About',   emoji: 'ℹ️' },
                  { to: '/contact',label: 'Contact', emoji: '📧' },
                ].map(link => (
                  <Link key={link.to} to={link.to} role="menuitem" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium">
                    <span className="text-lg w-5 text-center">{link.emoji}</span>
                    {link.label}
                  </Link>
                ))}

                {user && (
                  <>
                    {[
                      { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
                      { to: '/profile',             icon: User,            label: 'Profile' },
                      { to: '/wallet',              icon: Wallet,          label: 'Wallet' },
                    ].map(({ to, icon: Icon, label }) => (
                      <Link key={to} to={to} role="menuitem" onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium">
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {label}
                      </Link>
                    ))}

                    <Link to="/notifications" role="menuitem" onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium">
                      <div className="relative flex-shrink-0">
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    {isAdmin && (
                      <Link to="/admin/dashboard" role="menuitem" onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium">
                        <Shield className="w-5 h-5 flex-shrink-0" />
                        Admin Panel
                      </Link>
                    )}
                  </>
                )}
              </div>

              {/* Auth Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                {!user ? (
                  <div className="space-y-2.5">
                    <Link to="/login" onClick={() => setOpen(false)}
                      className="block w-full px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300 bg-[#f8fafc] dark:bg-[#252f3f] hover:bg-gray-200 dark:hover:bg-[#2d3e50] rounded-lg transition font-semibold">
                      Login
                    </Link>
                    <Link to="/signup" onClick={() => setOpen(false)}
                      className="block w-full px-4 py-3 text-center text-sm bg-[#1e3a5f] dark:bg-[#2d4a7c] hover:bg-[#2d4a7c] text-white rounded-lg transition font-semibold shadow-sm">
                      Sign Up
                    </Link>
                  </div>
                ) : (
                  <button onClick={handleLogout} type="button"
                    className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition font-semibold text-red-600 dark:text-red-400 text-sm">
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
