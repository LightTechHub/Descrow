// File: src/components/Navbar.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, Bell, Settings, User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { authService } from '../services/authService';

export default function Navbar({ user: propUser }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(propUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = propUser || authService.getCurrentUser();
    setUser(currentUser);
  }, [propUser]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = useCallback(() => {
    authService.logout();
    setOpen(false);
    setShowUserMenu(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleNotificationClick = useCallback(() => {
    navigate('/notifications');
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
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to="/"
            aria-label="Go to Dealcross homepage"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Logo size="md" />
            <span className="text-xl font-bold text-[#1e3a5f] dark:text-white">
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
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-[#1e3a5f] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
              >
                {item.label}
              </Link>
            ))}

            {user && (
              <>
                <Link
                  to="/dashboard"
                  role="menuitem"
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-[#1e3a5f] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
                >
                  Dashboard
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    role="menuitem"
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-[#1e3a5f] dark:hover:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Desktop Auth/User Menu */}
          <div className="hidden md:flex items-center space-x-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg font-medium transition"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-2.5 bg-[#1e3a5f] dark:bg-[#2d4a7c] hover:bg-[#2d4a7c] dark:hover:bg-[#3d5a8c] text-white rounded-lg font-semibold transition shadow-lg"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                {/* Notifications */}
                <button
                  onClick={handleNotificationClick}
                  className="relative p-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition"
                  title="Notifications"
                  aria-label="View notifications"
                  type="button"
                >
                  <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full" aria-hidden="true"></span>
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition"
                    aria-label="User menu"
                    aria-expanded={showUserMenu}
                    type="button"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-[#1e3a5f] dark:border-[#2d4a7c]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1e3a5f] dark:bg-[#2d4a7c] flex items-center justify-center text-white text-sm font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-gray-900 dark:text-white hidden lg:block">
                      {user.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserMenu(false)}
                          aria-hidden="true"
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1e2936] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-20"
                        >
                          {/* User Info */}
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                            {user.tier && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-[#1e3a5f] dark:bg-[#2d4a7c] text-white text-xs font-medium rounded-lg">
                                {user.tier.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Menu Items */}
                          <div className="py-2">
                            <Link
                              to="/dashboard"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] transition text-gray-700 dark:text-gray-300"
                            >
                              <LayoutDashboard className="w-4 h-4" />
                              <span className="text-sm font-medium">Dashboard</span>
                            </Link>

                            <Link
                              to="/profile"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] transition text-gray-700 dark:text-gray-300"
                            >
                              <User className="w-4 h-4" />
                              <span className="text-sm font-medium">Profile</span>
                            </Link>

                            <Link
                              to="/profile?tab=settings"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] transition text-gray-700 dark:text-gray-300"
                            >
                              <Settings className="w-4 h-4" />
                              <span className="text-sm font-medium">Settings</span>
                            </Link>

                            {isAdmin && (
                              <Link
                                to="/admin/dashboard"
                                onClick={() => setShowUserMenu(false)}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] transition text-gray-700 dark:text-gray-300"
                              >
                                <Shield className="w-4 h-4" />
                                <span className="text-sm font-medium">Admin Panel</span>
                              </Link>
                            )}
                          </div>

                          <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                            <button
                              onClick={handleLogout}
                              type="button"
                              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#fef2f2] dark:hover:bg-[#ef4444]/10 transition text-[#ef4444]"
                            >
                              <LogOut className="w-4 h-4" />
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

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden space-x-2">
            <ThemeToggle />

            <button
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Toggle mobile navigation"
              type="button"
              className="p-2 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition"
            >
              {open ? (
                <X className="h-6 w-6 text-gray-900 dark:text-white" />
              ) : (
                <Menu className="h-6 w-6 text-gray-900 dark:text-white" />
              )}
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
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 md:hidden"
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
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 w-80 h-full bg-white dark:bg-[#1e2936] p-6 z-50 shadow-2xl overflow-y-auto md:hidden"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-8">
                <Link
                  to="/"
                  className="flex items-center gap-3"
                  onClick={() => setOpen(false)}
                >
                  <Logo size="md" />
                  <span className="text-xl font-bold text-[#1e3a5f] dark:text-white">
                    Dealcross
                  </span>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  type="button"
                  className="p-2 hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition"
                >
                  <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* User Info (Mobile) */}
              {user && (
                <div className="mb-6 p-4 bg-[#f8fafc] dark:bg-[#252f3f] rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#1e3a5f] dark:border-[#2d4a7c]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#1e3a5f] dark:bg-[#2d4a7c] flex items-center justify-center text-white text-lg font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {user.tier && (
                    <span className="inline-block mt-2 px-3 py-1 bg-[#1e3a5f] dark:bg-[#2d4a7c] text-white text-xs font-semibold rounded-lg">
                      {user.tier.toUpperCase()} TIER
                    </span>
                  )}
                </div>
              )}

              {/* Sidebar Links */}
              <div className="space-y-2 mb-6">
                {[
                  { to: '/', label: 'Home', icon: '🏠' },
                  { to: '/about', label: 'About', icon: 'ℹ️' },
                  { to: '/contact', label: 'Contact', icon: '📧' },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}

                {user && (
                  <>
                    <Link
                      to="/dashboard"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>

                    <Link
                      to="/profile"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
                    >
                      <User className="w-5 h-5" />
                      <span>Profile</span>
                    </Link>

                    <Link
                      to="/notifications"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
                    >
                      <Bell className="w-5 h-5" />
                      <span>Notifications</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#252f3f] rounded-lg transition font-medium"
                      >
                        <Shield className="w-5 h-5" />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                  </>
                )}
              </div>

              {/* Auth Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                {!user ? (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="block w-full px-4 py-3 text-center text-gray-700 dark:text-gray-300 bg-[#f8fafc] dark:bg-[#252f3f] hover:bg-gray-200 dark:hover:bg-[#2d3e50] rounded-lg transition font-semibold"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setOpen(false)}
                      className="block w-full px-4 py-3 text-center bg-[#1e3a5f] dark:bg-[#2d4a7c] hover:bg-[#2d4a7c] dark:hover:bg-[#3d5a8c] text-white rounded-lg transition font-semibold shadow-lg"
                    >
                      Sign Up
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleLogout}
                    type="button"
                    className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-[#fef2f2] dark:bg-[#ef4444]/10 hover:bg-[#fee2e2] dark:hover:bg-[#ef4444]/20 rounded-lg transition font-semibold text-[#ef4444]"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
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