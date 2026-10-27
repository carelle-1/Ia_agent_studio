import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Bot,
  Layers,
  FileCheck2,
} from 'lucide-react';

interface CalendarViewProps {
  setCurrentView: (view: string) => void;
  onOpenPostDetail?: (postId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ setCurrentView, onOpenPostDetail }) => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [calendars, setCalendars] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Generation modal state
  const [genAgentId, setGenAgentId] = useState('');
  const [genPageId, setGenPageId] = useState('');
  const [genFrequency, setGenFrequency] = useState(7);

  const fetchCalendar = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;

      const [calRes, pagRes, agRes] = await Promise.all([
        fetch('/api/calendars', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/social/pages', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (calRes.ok) {
        const data = await calRes.json();
        setCalendars(data.calendars);
        setItems(data.items);
      }
      if (pagRes.ok) {
        const pgs = await pagRes.json();
        setPages(pgs);
        if (pgs.length > 0 && !selectedPageId) {
          setSelectedPageId(pgs[0].id);
          setGenPageId(pgs[0].id);
        }
      }
      if (agRes.ok) {
        const ags = await agRes.json();
        setAgents(ags);
        if (ags.length > 0 && !genAgentId) {
          setGenAgentId(ags[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [user]);

  const handleGenerateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/calendars/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pageId: genPageId || selectedPageId,
          agentId: genAgentId,
          frequency: Number(genFrequency),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsGenerateModalOpen(false);
        setSuccessMsg(`Calendrier éditorial hebdomadaire généré avec succès (${data.items.length} créneaux) !`);
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchCalendar();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePostFromItem = async (itemId: string) => {
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/calendars/items/${itemId}/generate-post`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Publication générée par l’agent IA ! Elle vous attend dans le Studio pour validation.');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchCalendar();
        if (data.post && onOpenPostDetail) {
          onOpenPostDetail(data.post.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter items by selected page if any
  const displayedItems = selectedPageId
    ? items.filter((i) => i.pageId === selectedPageId)
    : items;

  // Format mapping
  const formatLabels: Record<string, string> = {
    single_image: 'Image unique',
    carousel: 'Carrousel',
    reel: 'Reel / Vidéo courte',
    educational: 'Conseil pratique',
    story: 'Story',
    link_post: 'Article & Lien',
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center space-x-2.5">
            <CalendarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>Calendrier Éditorial Intelligent</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Planification stratégique hebdomadaire adaptée au public de chaque page et à ses heures optimales.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 self-start"
        >
          <Sparkles className="w-4 h-4" />
          <span>Générer Calendrier avec l’IA</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Page Filter Bar */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-1 text-xs font-semibold">
        <span className="text-gray-500 dark:text-zinc-400">Filtrer par page :</span>
        <button
          onClick={() => setSelectedPageId('')}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedPageId === ''
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-zinc-900 border text-gray-700 dark:text-zinc-300'
          }`}
        >
          Toutes les pages ({items.length})
        </button>
        {pages.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPageId(p.id)}
            className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
              selectedPageId === p.id
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-900 border text-gray-700 dark:text-zinc-300'
            }`}
          >
            <span>{p.name}</span>
            <span className="text-[10px] uppercase font-bold opacity-75">({p.platform})</span>
          </button>
        ))}
      </div>

      {/* Items Timeline / Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedItems.map((item) => {
          const page = pages.find((p) => p.id === item.pageId);
          const agent = agents.find((a) => a.id === item.agentId);

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-purple-500 dark:hover:border-purple-500 transition flex flex-col justify-between"
            >
              <div>
                {/* Date & Platform */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center space-x-1.5 text-gray-900 dark:text-white font-bold">
                    <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{item.scheduledDate}</span>
                    <span className="text-gray-400">à</span>
                    <span className="text-purple-600 dark:text-purple-400">{item.scheduledTime}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      page?.platform === 'facebook'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                    }`}
                  >
                    {page?.platform || 'Facebook'}
                  </span>
                </div>

                {/* Theme & Objective */}
                <h3 className="font-bold text-sm text-gray-950 dark:text-white leading-snug mb-1">
                  {item.theme}
                </h3>
                <div className="flex items-center space-x-2 text-[11px] text-gray-500 dark:text-zinc-400 mb-2.5">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    Objectif : {item.objective}
                  </span>
                  <span>•</span>
                  <span>{formatLabels[item.format] || item.format}</span>
                </div>

                {/* Summary */}
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                  {item.summary || item.editorialAngle}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                {item.postId ? (
                  <button
                    onClick={() => setCurrentView('posts')}
                    className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 font-semibold rounded-xl flex items-center justify-center space-x-1.5 hover:bg-emerald-100 transition"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Publication prête (Voir Studio)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleGeneratePostFromItem(item.id)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Générer la publication avec l’IA</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {displayedItems.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-dashed rounded-3xl p-6">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-bold text-base text-gray-950 dark:text-white mb-1">
            Aucun créneau planifié pour cette page
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            Lancez le générateur d'IA pour élaborer un calendrier éditorial hebdomadaire complet en quelques secondes.
          </p>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Générer le calendrier maintenant</span>
          </button>
        </div>
      )}

      {/* Generate Calendar Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gray-950 dark:text-white mb-1">
              Générer un Calendrier Éditorial Hebdomadaire
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              L'agent sélectionné analysera vos thématiques et construira une grille éditoriale cohérente.
            </p>

            <form onSubmit={handleGenerateCalendar} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Page sociale cible *</label>
                <select
                  value={genPageId}
                  onChange={(e) => setGenPageId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  required
                >
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.platform})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Agent responsable *</label>
                <select
                  value={genAgentId}
                  onChange={(e) => setGenAgentId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  required
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Fréquence de publication</label>
                <select
                  value={genFrequency}
                  onChange={(e) => setGenFrequency(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                >
                  <option value={3}>3 publications (Pack Starter / Pro)</option>
                  <option value={5}>5 publications par semaine</option>
                  <option value={7}>7 publications (1 par jour)</option>
                </select>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-purple-900 dark:text-purple-300 rounded-xl text-[11px] leading-relaxed">
                ✨ Chaque créneau généré pourra ensuite être converti en publication complète et sera impérativement soumis à votre validation.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center space-x-1.5"
                >
                  {isGenerating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isGenerating ? 'Génération en cours...' : 'Lancer la génération'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
