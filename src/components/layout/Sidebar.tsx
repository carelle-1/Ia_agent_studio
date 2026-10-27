import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import {
  LayoutDashboard,
  Bot,
  Share2,
  Calendar,
  FileCheck2,
  Palette,
  TrendingUp,
  BarChart3,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Zap,
  CheckCircle,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  pendingPostsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  pendingPostsCount = 1,
}) => {
  const { user, plan, usage } = useAuth();
  const { t } = useI18n();

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: string | number;
    badgeColor?: string;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'agents', label: t('agents'), icon: Bot },
    { id: 'connections', label: t('connections'), icon: Share2 },
    { id: 'calendar', label: t('calendar'), icon: Calendar },
    {
      id: 'posts',
      label: t('posts'),
      icon: FileCheck2,
      badge: pendingPostsCount > 0 ? pendingPostsCount : undefined,
      badgeColor: 'bg-warn-600 text-white animate-pulse',
    },
    { id: 'inspiration', label: t('inspiration'), icon: Palette },
    { id: 'intelligence', label: t('intelligence'), icon: TrendingUp },
    { id: 'analytics', label: t('analytics'), icon: BarChart3 },
    { id: 'billing', label: t('billing'), icon: CreditCard },
    { id: 'support', label: t('support'), icon: MessageSquare },
  ];

  if (user?.role === 'superadmin') {
    navItems.push({
      id: 'admin',
      label: t('admin'),
      icon: ShieldCheck,
      badge: 'PRO',
      badgeColor: 'bg-accent-600 text-white',
    });
  }

  // Quota calculation
  const maxWeeklyPosts = plan?.maxPostsPerWeek && plan.maxPostsPerWeek !== -1 ? plan.maxPostsPerWeek : 21;
  const postsCount = usage?.postsCreatedCount || 4;
  const postPct = Math.min(100, Math.round((postsCount / maxWeeklyPosts) * 100));

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 flex flex-col justify-between py-4 select-none">
      <div className="space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand/25'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 dark:text-zinc-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${item.badgeColor || 'bg-gray-200 text-gray-800'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Subscription & Safety Quota Widget */}
      <div className="px-4 mt-4">
        <div className="p-3.5 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-zinc-900 dark:to-zinc-900/80 border border-brand-100 dark:border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-warn-600" />
              <span>{plan?.name || 'Pack Pro'}</span>
            </span>
            <span className="text-[10px] font-semibold text-brand dark:text-brand">
              {postsCount}/{maxWeeklyPosts} posts
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-brand/20 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
            <div
              className="bg-brand-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${postPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400">
            <span>Validation requise</span>
            <span className="text-brand dark:text-brand font-semibold flex items-center space-x-0.5">
              <CheckCircle className="w-3 h-3" />
              <span>100% sécurisé</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
