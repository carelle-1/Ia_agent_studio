import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  Bot,
  Share2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  setCurrentView: (view: string) => void;
  onSelectPostToReview?: (postId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setCurrentView, onSelectPostToReview }) => {
  const { user, plan, usage } = useAuth();
  const { t } = useI18n();

  const [agentsCount, setAgentsCount] = useState(2);
  const [pagesCount, setPagesCount] = useState(2);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [publishedPosts, setPublishedPosts] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;

      const [agentsRes, pagesRes, postsRes] = await Promise.all([
        fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/social/pages', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/posts', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (agentsRes.ok) {
        const ag = await agentsRes.json();
        setAgentsCount(ag.length);
      }
      if (pagesRes.ok) {
        const pg = await pagesRes.json();
        setPages(pg);
        setPagesCount(pg.length);
      }
      if (postsRes.ok) {
        const posts = await postsRes.json();
        setPendingPosts(posts.filter((p: any) => p.status === 'pending_approval'));
        setScheduledPosts(posts.filter((p: any) => p.status === 'scheduled'));
        setPublishedPosts(posts.filter((p: any) => p.status === 'published'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Welcome & System Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#17B9FF] to-[#FF4297] rounded-3xl p-3 sm:p-4 text-white shadow-lg shadow-brand/10">
        <div>
          <div className="flex items-center space-x-1 text-white text-xs font-semibold uppercase tracking-wider mb-0">
            <span>Plateforme SaaS</span>
            <img src="/assets/logo-white.png" alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bonjour, {user?.firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-white max-w-xl">
            Vos agents IA gèrent le contenu de vos pages sociales avec une rigueur absolue. Chaque publication reste soumise à votre validation avant mise en ligne.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setCurrentView('posts')}
            className="px-4 py-2.5 bg-white text-brand-900 hover:bg-brand-50 rounded-xl font-bold text-xs transition shadow-sm flex items-center space-x-2"
          >
            <span>Examiner les publications</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/20 text-white rounded-xl font-semibold text-xs transition flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Calendrier</span>
          </button>
        </div>
      </div>

      {/* Mandatory Validation Gatekeeper Urgent Alert if posts are waiting */}
      {pendingPosts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl flex-shrink-0 animate-bounce">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-amber-950 dark:text-amber-200 text-sm">
                  {pendingPosts.length} publication(s) en attente de votre validation explicite
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                  Règle Obligatoire
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Conformément aux règles de sécurité Meta Colab, aucun contenu ne sera programmé ou publié sans votre approbation expresse.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('posts')}
            className="flex-shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center space-x-2"
          >
            <span>Valider maintenant</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5 Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Active Agents */}
        <div
          onClick={() => setCurrentView('agents')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm hover:border-blue-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold">{t('kpiActiveAgents')}</span>
            <Bot className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-gray-950 dark:text-white">
            {agentsCount}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 flex items-center space-x-1">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">100% opérationnels</span>
          </div>
        </div>

        {/* Connected Pages */}
        <div
          onClick={() => setCurrentView('connections')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm hover:border-indigo-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold">{t('kpiConnectedPages')}</span>
            <Share2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-gray-950 dark:text-white">
            {pagesCount}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 flex items-center space-x-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Facebook & Instagram</span>
          </div>
        </div>

        {/* Pending Approval */}
        <div
          onClick={() => setCurrentView('posts')}
          className={`p-4 rounded-2xl border shadow-sm transition cursor-pointer ${
            pendingPosts.length > 0
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
              : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">À Valider</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {pendingPosts.length}
          </div>
          <div className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1 font-medium">
            Validation requise
          </div>
        </div>

        {/* Scheduled */}
        <div
          onClick={() => setCurrentView('calendar')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm hover:border-purple-500 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold">{t('kpiScheduled')}</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-gray-950 dark:text-white">
            {scheduledPosts.length}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
            Publication auto prête
          </div>
        </div>

        {/* Published */}
        <div
          onClick={() => setCurrentView('analytics')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm hover:border-emerald-500 transition cursor-pointer col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold">{t('kpiPublished')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-gray-950 dark:text-white">
            {publishedPosts.length || 8}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            En ligne sur Meta
          </div>
        </div>
      </div>

      {/* Middle Row: Connected Social Pages & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Social Pages Card */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-950 dark:text-white text-base">
                Comptes Meta Connectés & Statut
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Surveillance continue des jetons OAuth et des autorisations de publication
              </p>
            </div>
            <button
              onClick={() => setCurrentView('connections')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
            >
              <span>Gérer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {pages.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/60 dark:border-zinc-800"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={p.profilePictureUrl || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=120&auto=format&fit=crop&q=80'}
                    alt={p.name}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/20"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {p.platform}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 flex items-center space-x-2">
                      <span>{p.followersCount.toLocaleString()} abonnés</span>
                      <span>•</span>
                      <span>Agent : {p.assignedAgent?.name || 'Sophie'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connecté</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-gray-950 dark:text-white text-base mb-1">
              {t('quickActions')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
              Opérations rapides pour piloter vos réseaux
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => setCurrentView('agents')}
                className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition flex items-center justify-between text-xs font-semibold text-gray-900 dark:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span>Créer un nouvel agent IA</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setCurrentView('calendar')}
                className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition flex items-center justify-between text-xs font-semibold text-gray-900 dark:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Générer calendrier hebdo</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setCurrentView('intelligence')}
                className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition flex items-center justify-between text-xs font-semibold text-gray-900 dark:text-white"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span>Veille concurrentielle IA</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 mt-4 text-[11px] text-gray-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Forfait : <strong className="text-gray-900 dark:text-white">{plan?.name || 'Pack Pro'}</strong></span>
            <button onClick={() => setCurrentView('billing')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Voir détails
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
