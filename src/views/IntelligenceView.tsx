import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  TrendingUp,
  Search,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Flame,
  Award,
} from 'lucide-react';

export const IntelligenceView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [competitors, setCompetitors] = useState<any[]>([]);
  const [trendReport, setTrendReport] = useState<any | null>(null);
  const [optimalTimes, setOptimalTimes] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'competitors' | 'trends' | 'times'>('competitors');
  const [isAddCompetitorOpen, setIsAddCompetitorOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New competitor form
  const [compName, setCompName] = useState('');
  const [compUrl, setCompUrl] = useState('');
  const [compPlatform, setCompPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [compIndustry, setCompIndustry] = useState('');
  const [compNotes, setCompNotes] = useState('');

  const fetchIntelligenceData = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;

      const [compRes, trendRes, timeRes] = await Promise.all([
        fetch('/api/intelligence/competitors', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/intelligence/trends', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/intelligence/optimal-times', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (compRes.ok) setCompetitors(await compRes.json());
      if (trendRes.ok) setTrendReport(await trendRes.json());
      if (timeRes.ok) setOptimalTimes(await timeRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIntelligenceData();
  }, [user]);

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/intelligence/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: compName,
          pageUrl: compUrl,
          platform: compPlatform,
          industry: compIndustry || user?.companyName,
          notes: compNotes,
        }),
      });
      if (res.ok) {
        setIsAddCompetitorOpen(false);
        setCompName('');
        setCompUrl('');
        setCompNotes('');
        setFeedback('Concurrent ajouté avec succès !');
        setTimeout(() => setFeedback(null), 3000);
        fetchIntelligenceData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAnalysis = async (competitorId: string) => {
    setAnalyzingId(competitorId);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/intelligence/competitors/${competitorId}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedback('Analyse concurrentielle IA générée avec succès !');
        setTimeout(() => setFeedback(null), 4000);
        fetchIntelligenceData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      const token = localStorage.getItem('metacolab_token');
      await fetch(`/api/intelligence/competitors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchIntelligenceData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center space-x-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Veille Concurrentielle, Tendances & Heures Optimales</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Analyse des stratégies publiques de vos pairs, détection des tendances de votre secteur et calcul des meilleurs créneaux.
          </p>
        </div>

        {activeTab === 'competitors' && (
          <button
            onClick={() => setIsAddCompetitorOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Suivre un Concurrent</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-3 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('competitors')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'competitors'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Analyse Concurrentielle ({competitors.length})
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`pb-3 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === 'trends'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Tendances & Opportunités</span>
        </button>
        <button
          onClick={() => setActiveTab('times')}
          className={`pb-3 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === 'times'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Heures de Publication Optimales</span>
        </button>
      </div>

      {/* Tab 1: Competitors */}
      {activeTab === 'competitors' && (
        <div className="space-y-5">
          <div className="p-4 bg-gray-50 dark:bg-zinc-900 border rounded-2xl text-xs text-gray-600 dark:text-zinc-300">
            ℹ️ Règle d'intégrité : Seules les données publiques accessibles sont étudiées. Aucune statistique privée n'est simulée.
          </div>

          <div className="space-y-4">
            {competitors.map((comp) => {
              const analysis = comp.latestAnalysis;

              return (
                <div
                  key={comp.id}
                  className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-zinc-800">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-extrabold text-base text-gray-950 dark:text-white">
                          {comp.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                          {comp.platform}
                        </span>
                      </div>
                      <a
                        href={comp.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 block"
                      >
                        {comp.pageUrl}
                      </a>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRunAnalysis(comp.id)}
                        disabled={analyzingId === comp.id}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${analyzingId === comp.id ? 'animate-spin' : ''}`} />
                        <span>{analyzingId === comp.id ? 'Analyse...' : 'Actualiser l’analyse IA'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCompetitor(comp.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Analysis Breakdown */}
                  {analysis ? (
                    <div className="space-y-4 text-xs">
                      <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-900 dark:text-emerald-200 font-medium">
                        {analysis.rawSummary}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border space-y-2">
                          <span className="font-bold text-gray-900 dark:text-white flex items-center space-x-1.5 text-xs">
                            <Award className="w-4 h-4 text-blue-500" />
                            <span>Forces Publiques Observées</span>
                          </span>
                          <ul className="space-y-1.5 text-gray-600 dark:text-zinc-300">
                            {analysis.publicStrengths?.map((str: string, i: number) => (
                              <li key={i} className="flex items-start space-x-2">
                                <span className="text-emerald-500 font-bold">✓</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Gaps / Opportunities */}
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border space-y-2">
                          <span className="font-bold text-gray-900 dark:text-white flex items-center space-x-1.5 text-xs">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>Lacunes & Opportunités à Exploiter</span>
                          </span>
                          <ul className="space-y-1.5 text-gray-600 dark:text-zinc-300">
                            {analysis.detectedGaps?.map((gap: string, i: number) => (
                              <li key={i} className="flex items-start space-x-2">
                                <span className="text-amber-500 font-bold">⚡</span>
                                <span>{gap}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl space-y-2">
                        <span className="font-bold text-blue-900 dark:text-blue-200 text-xs">
                          Recommandations Stratégiques pour vos Agents :
                        </span>
                        <div className="space-y-1.5">
                          {analysis.recommendations?.map((rec: string, i: number) => (
                            <div key={i} className="flex items-start space-x-2 text-blue-800 dark:text-blue-300">
                              <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-gray-500">
                      Aucune analyse générée pour l'instant. Cliquez sur "Actualiser l'analyse IA" pour lancer l'audit.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Trends */}
      {activeTab === 'trends' && trendReport && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-extrabold text-base text-gray-950 dark:text-white">
                Tendances Sectorielles à Forte Tractions (2026)
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Sujets émergents et angles recommandés pour alimenter vos prochains calendriers éditoriaux.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trendReport.trendingTopics?.map((t: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200/80 dark:border-zinc-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                        Pertinence : {t.relevance}%
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-gray-900 dark:text-white leading-snug mb-2">
                      {t.topic}
                    </h3>
                    <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                      Angle recommandé : {t.angle}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested Hooks */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-2 text-xs">
              <span className="font-bold text-purple-900 dark:text-purple-200">
                Accroches percutantes (Hooks) formulées par l’IA :
              </span>
              <div className="space-y-1 text-purple-800 dark:text-purple-300">
                {trendReport.suggestedHooks?.map((hook: string, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="font-mono text-purple-500">#{idx + 1}</span>
                    <span className="italic">« {hook} »</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Optimal Hours */}
      {activeTab === 'times' && optimalTimes && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-extrabold text-base text-gray-950 dark:text-white">
              Créneaux Horaires Recommandés par Jour
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              {optimalTimes.disclaimer}
            </p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
            {optimalTimes.recommendations?.map((item: any, idx: number) => (
              <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-sm text-gray-900 dark:text-white w-24">
                    {item.day}
                  </span>
                  <div className="flex items-center space-x-2">
                    {item.slots?.map((s: string, sIdx: number) => (
                      <span
                        key={sIdx}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          s === item.bestSlot
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                        }`}
                      >
                        {s} {s === item.bestSlot && '★'}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-[11px] text-gray-500 dark:text-zinc-400">
                  <span>Engagement attendu : <strong className="text-emerald-600">{item.expectedEngagement}</strong></span>
                  <span>Confiance : {item.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Competitor Modal */}
      {isAddCompetitorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gray-950 dark:text-white mb-1">
              Ajouter une Page Concurrente Publique
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              L'agent IA analysera les thématiques et la fréquence apparente des publications.
            </p>

            <form onSubmit={handleAddCompetitor} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">Nom de l’entreprise / page *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Studio Mobilier Contemporain"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">URL publique *</label>
                <input
                  type="url"
                  required
                  placeholder="https://facebook.com/..."
                  value={compUrl}
                  onChange={(e) => setCompUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Plateforme</label>
                <select
                  value={compPlatform}
                  onChange={(e) => setCompPlatform(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                >
                  <option value="facebook">Page Facebook</option>
                  <option value="instagram">Compte Instagram</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCompetitorOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
