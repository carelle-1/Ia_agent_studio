import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';
import {
  Sun,
  Moon,
  Globe,
  Bell,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  onOpenNotifications: () => void;
  onOpenAuthModal: () => void;
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNotifications,
  onOpenAuthModal,
  currentView,
  setCurrentView,
}) => {
  const { user, plan, subscription, logout, quickLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(2);

  // Poll notifications
  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const token = localStorage.getItem('metacolab_token');
        if (!token) return;
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotificationsCount(data.unreadCount || 0);
        }
      } catch (e) {
        // silent
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-gray-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center cursor-pointer" onClick={() => setCurrentView('dashboard')}>
          <img src="/assets/logo-white.png" alt="Logo" className="w-32 h-32 object-contain" />
        </div>

        {/* Right controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-900 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-warn-600" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          {/* Language Selector */}
          <button
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-lg transition border border-gray-200 dark:border-zinc-800"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase">{language}</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            aria-label="Open notifications"
            className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-900 transition"
          >
            <Bell className="w-4 h-4" />
            {notificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                {notificationsCount}
              </span>
            )}
          </button>

          {/* User Account Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 pl-2 pr-1.5 py-1 rounded-full border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition"
              >
                <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-zinc-400 leading-none">
                    {plan?.name || (user.role === 'superadmin' ? 'Super Admin' : 'Free Test')}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl py-2 z-50 text-xs"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-zinc-800">
                    <div className="font-bold text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-gray-500 dark:text-zinc-400 truncate">{user.email}</div>
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-100 dark:bg-brand-900/60 text-brand-900 dark:text-brand-100">
                      {plan?.name || 'Pack Pro'}
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentView('billing')}
                    className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center space-x-2 text-gray-700 dark:text-zinc-300"
                  >
                    <Layers className="w-4 h-4 text-brand" />
                    <span>Gérer mon abonnement</span>
                  </button>

                  {user.role === 'superadmin' && (
                    <button
                      onClick={() => setCurrentView('admin')}
                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-semibold"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Console Super Admin</span>
                    </button>
                  )}

                  <div className="border-t border-gray-100 dark:border-zinc-800 my-1" />

                  <button
                    onClick={logout}
                    className="w-full text-left px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center space-x-2 text-red-600 dark:text-red-400 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-lg shadow-sm transition"
            >
              {t('login')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
