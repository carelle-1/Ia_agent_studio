import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  MousePointerClick,
  Calendar,
  Filter,
} from 'lucide-react';

export const PerformanceView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [data, setData] = useState<any | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerf = async () => {
      try {
        const token = localStorage.getItem('metacolab_token');
        if (!token) return;
        const res = await fetch('/api/intelligence/performance', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPerf();
  }, [user, period]);

  const totals = data?.totals || {
    totalReach: 34550,
    totalImpressions: 53400,
    totalReactions: 2104,
    totalComments: 190,
    totalShares: 326,
    totalClicks: 858,
    avgEngagementRate: 6.8,
    publishedPosts: 8,
  };

  const chartData = data?.chartData || [
    { date: 'J-6', reach: 4100, impressions: 6200, interactions: 280 },
    { date: 'J-5', reach: 5200, impressions: 7800, interactions: 390 },
    { date: 'J-4', reach: 4800, impressions: 7100, interactions: 340 },
    { date: 'J-3', reach: 6400, impressions: 9400, interactions: 520 },
    { date: 'J-2', reach: 7100, impressions: 10800, interactions: 610 },
    { date: 'J-1', reach: 8900, impressions: 13200, interactions: 740 },
    { date: 'Aujourd’hui', reach: 9800, impressions: 14500, interactions: 820 },
  ];

  const maxReach = Math.max(...chartData.map((d: any) => d.reach), 10000);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center space-x-2.5">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Tableau de Bord des Performances Meta</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Métriques d'engagement et portée collectées sur vos pages Facebook et comptes professionnels Instagram.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold self-start">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1.5 rounded-lg transition ${
              period === '7d' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            7 derniers jours
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-3 py-1.5 rounded-lg transition ${
              period === '30d' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            30 jours
          </button>
          <button
            onClick={() => setPeriod('90d')}
            className={`px-3 py-1.5 rounded-lg transition ${
              period === '90d' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Trimestre
          </button>
        </div>
      </div>

      {/* 6 Performance Metric Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold">Portée Unique</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-gray-950 dark:text-white">
            {totals.totalReach.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">+18.4% vs N-1</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold">Impressions</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-gray-950 dark:text-white">
            {totals.totalImpressions.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">+24.2%</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold">Réactions</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-gray-950 dark:text-white">
            {totals.totalReactions.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">J'aime & Love</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold">Commentaires</span>
            <MessageSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-gray-950 dark:text-white">
            {totals.totalComments.toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500">Conversations</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold">Partages</span>
            <Share2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-gray-950 dark:text-white">
            {totals.totalShares.toLocaleString()}
          </div>
          <span className="text-[10px] text-purple-600 font-bold">Viralité</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold">Engagement</span>
            <MousePointerClick className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {totals.avgEngagementRate}%
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">Excellent</span>
        </div>
      </div>

      {/* Evolution Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-950 dark:text-white text-base">
              Évolution de la Portée & des Interactions
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Progression quotidienne des vues et des interactions sur vos publications approuvées
            </p>
          </div>
        </div>

        {/* Bar chart representation */}
        <div className="h-56 pt-6 flex items-end justify-between gap-3 border-b border-gray-100 dark:border-zinc-800 pb-2">
          {chartData.map((d: any, idx: number) => {
            const heightPct = Math.max(15, Math.round((d.reach / maxReach) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                  {d.reach}
                </div>
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-xl transition-all duration-300 group-hover:brightness-110"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 mt-2 font-medium">
                  {d.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
