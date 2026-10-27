import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { FacebookPreview } from '../components/previews/FacebookPreview';
import { InstagramPreview } from '../components/previews/InstagramPreview';
import {
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Share2,
  RefreshCw,
  Send,
  XCircle,
  Eye,
  Sliders,
  History,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface PostsViewProps {
  initialPostId?: string;
}

export const PostsView: React.FC<PostsViewProps> = ({ initialPostId }) => {
  const { user, plan } = useAuth();
  const { t } = useI18n();

  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending_approval');
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [isRegeneratingVisual, setIsRegeneratingVisual] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit form state
  const [editedFormatted, setEditedFormatted] = useState('');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editedDate, setEditedDate] = useState('');
  const [editedTime, setEditedTime] = useState('');
  const [selectedVariantType, setSelectedVariantType] = useState('shorter');

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;
      const res = await fetch('/api/posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);

        // Select initial or first
        if (initialPostId) {
          const found = data.find((p: any) => p.id === initialPostId);
          if (found) selectPostForEdit(found);
        } else if (!selectedPost && data.length > 0) {
          const pending = data.find((p: any) => p.status === 'pending_approval') || data[0];
          selectPostForEdit(pending);
        } else if (selectedPost) {
          const updated = data.find((p: any) => p.id === selectedPost.id);
          if (updated) setSelectedPost(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const selectPostForEdit = (post: any) => {
    setSelectedPost(post);
    setEditedFormatted(post.contentFormatted);
    setEditedPrompt(post.visualPrompt || '');
    setEditedDate(post.scheduledDate);
    setEditedTime(post.scheduledTime);
    setPreviewPlatform(post.platform || 'facebook');
  };

  const handleSaveEdits = async () => {
    if (!selectedPost) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/posts/${selectedPost.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentFormatted: editedFormatted,
          visualPrompt: editedPrompt,
          scheduledDate: editedDate,
          scheduledTime: editedTime,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: data.approvalInvalidated
            ? 'Publication modifiée. Le statut a été réinitialisé à "En attente de validation".'
            : 'Modifications enregistrées avec succès.',
        });
        setTimeout(() => setFeedback(null), 4000);
        fetchPosts();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  const handleApprove = async () => {
    if (!selectedPost) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/posts/${selectedPost.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }

        setFeedback({ type: 'success', message: data.message });
        setTimeout(() => setFeedback(null), 5000);
        fetchPosts();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  const handleReject = async () => {
    if (!selectedPost) return;
    const reason = prompt('Motif du rejet (optionnel pour orienter l’agent IA) :', 'À reformuler avec un ton plus dynamique');
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/posts/${selectedPost.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Publication marquée comme rejetée.' });
        setTimeout(() => setFeedback(null), 4000);
        fetchPosts();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  const handlePublishNow = async () => {
    if (!selectedPost) return;
    setIsPublishing(true);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/posts/${selectedPost.id}/publish-now`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Publication en direct réussie sur Meta ! Identifiant : ${data.metaPostId}`,
        });
        setTimeout(() => setFeedback(null), 6000);
        fetchPosts();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Échec de publication.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRegenerateTextVariant = async () => {
    if (!selectedPost) return;
    setIsRegeneratingText(true);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/posts/${selectedPost.id}/regenerate-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ variantType: selectedVariantType }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditedFormatted(data.contentFormatted);
        setFeedback({ type: 'success', message: `Nouvelle proposition générée (${selectedVariantType}) !` });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setIsRegeneratingText(false);
    }
  };

  const handleRegenerateVisual = async () => {
    if (!selectedPost) return;
    setIsRegeneratingVisual(true);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/posts/${selectedPost.id}/regenerate-visual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: editedPrompt }),
      });
      const data = await res.json();
      if (res.ok) {
        selectedPost.visualUrl = data.visualUrl;
        selectedPost.visualPrompt = data.visualPrompt;
        setFeedback({ type: 'success', message: 'Nouveau visuel généré avec succès !' });
        setTimeout(() => setFeedback(null), 3000);
        fetchPosts();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setIsRegeneratingVisual(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  const pendingCount = posts.filter((p) => p.status === 'pending_approval').length;
  const approvedCount = posts.filter((p) => p.status === 'approved' || p.status === 'scheduled').length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center space-x-2.5">
            <FileCheck2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Studio des Publications & Validation Obligatoire</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Règle stricte Meta Colab : Aucune publication n’est programmée ou diffusée sans votre accord explicite.
          </p>
        </div>

        {/* Global Mandatory Rule Badge */}
        <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-semibold self-start">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Contrôle Humain Actif</span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setStatusFilter('pending_approval')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 ${
            statusFilter === 'pending_approval'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white dark:bg-zinc-900 border text-gray-700 dark:text-zinc-300'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>À Valider ({pendingCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 ${
            statusFilter === 'approved'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-zinc-900 border text-gray-700 dark:text-zinc-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Validées / Prêtes ({approvedCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('published')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 ${
            statusFilter === 'published'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-zinc-900 border text-gray-700 dark:text-zinc-300'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Publiées ({publishedCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-2 rounded-xl transition ${
            statusFilter === 'all'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'bg-white dark:bg-zinc-900 border text-gray-700 dark:text-zinc-300'
          }`}
        >
          Toutes ({posts.length})
        </button>
      </div>

      {/* Main Split Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Posts selection list */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredPosts.map((post) => {
            const isSelected = selectedPost?.id === post.id;
            const isPending = post.status === 'pending_approval';

            return (
              <div
                key={post.id}
                onClick={() => selectPostForEdit(post)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        post.platform === 'facebook'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                      }`}
                    >
                      {post.platform}
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      {post.scheduledDate} à {post.scheduledTime}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isPending
                        ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 animate-pulse'
                        : post.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {t(`approvalStatus.${post.status}`, post.status)}
                  </span>
                </div>

                <div className="flex items-start space-x-3">
                  {post.visualUrl && (
                    <img
                      src={post.visualUrl}
                      alt="Thumbnail"
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    />
                  )}
                  <p className="text-xs text-gray-700 dark:text-zinc-300 line-clamp-3 leading-relaxed">
                    {post.contentRawText || post.contentFormatted}
                  </p>
                </div>
              </div>
            );
          })}

          {filteredPosts.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400 bg-white dark:bg-zinc-900 border rounded-2xl">
              Aucune publication dans cette catégorie.
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Post Inspector, Caption Editor & Realistic Preview */}
        {selectedPost ? (
          <div className="lg:col-span-7 space-y-5">
            {/* Top Gatekeeper Action Bar */}
            <div className="p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedPost.status === 'pending_approval'
                      ? 'bg-amber-500 animate-ping'
                      : selectedPost.status === 'published'
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs text-gray-950 dark:text-white">
                    Statut : {t(`approvalStatus.${selectedPost.status}`, selectedPost.status)}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Version #{selectedPost.versionNumber || 1} • Créée par l'agent
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedPost.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={handleReject}
                      className="px-3 py-1.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold rounded-xl transition"
                    >
                      Rejeter
                    </button>
                    <button
                      onClick={handleApprove}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('approvePost')}</span>
                    </button>
                  </>
                )}

                {(selectedPost.status === 'approved' || selectedPost.status === 'scheduled') && (
                  <button
                    onClick={handlePublishNow}
                    disabled={isPublishing}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
                  >
                    <Send className={`w-3.5 h-3.5 ${isPublishing ? 'animate-spin' : ''}`} />
                    <span>{isPublishing ? 'Diffusion...' : t('publishNow')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Split Editor and Realistic Preview Tabs */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
              {/* Platform Preview Selector */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center space-x-1.5">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span>Aperçu Réaliste en direct</span>
                </span>
                <div className="flex space-x-1 bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setPreviewPlatform('facebook')}
                    className={`px-3 py-1 rounded-md font-semibold transition ${
                      previewPlatform === 'facebook'
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    Facebook Feed
                  </button>
                  <button
                    onClick={() => setPreviewPlatform('instagram')}
                    className={`px-3 py-1 rounded-md font-semibold transition ${
                      previewPlatform === 'instagram'
                        ? 'bg-white dark:bg-zinc-900 text-rose-600 shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    Instagram Post
                  </button>
                </div>
              </div>

              {/* Live Preview Display */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-950 rounded-2xl flex items-center justify-center">
                {previewPlatform === 'facebook' ? (
                  <FacebookPreview
                    pageName={selectedPost.page?.name || user?.companyName || 'Atelier Créatif Paris'}
                    content={editedFormatted}
                    imageUrl={selectedPost.visualUrl}
                    dateStr={`${editedDate} à ${editedTime}`}
                  />
                ) : (
                  <InstagramPreview
                    handle={selectedPost.page?.name || '@ateliercreatif_paris'}
                    content={editedFormatted}
                    imageUrl={selectedPost.visualUrl}
                    hashtags={selectedPost.hashtags}
                  />
                )}
              </div>

              {/* Caption Editor Form */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-gray-900 dark:text-white">
                    {t('postTextEditor')} (Markdown supporté)
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <select
                      value={selectedVariantType}
                      onChange={(e) => setSelectedVariantType(e.target.value)}
                      className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 border rounded-lg text-[11px]"
                    >
                      <option value="shorter">Plus court & percutant</option>
                      <option value="detailed">Approfondi & technique</option>
                      <option value="commercial">Commercial avec CTA</option>
                      <option value="storytelling">Storytelling de marque</option>
                      <option value="educational">Conseil pédagogique</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleRegenerateTextVariant}
                      disabled={isRegeneratingText}
                      className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-semibold flex items-center space-x-1 hover:bg-purple-100 transition"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isRegeneratingText ? 'Rédaction...' : 'Nouvel angle'}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={editedFormatted}
                  onChange={(e) => setEditedFormatted(e.target.value)}
                  rows={6}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
                />

                {/* Visual Prompt Section */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-xs text-gray-900 dark:text-white">
                      {t('visualPrompt')}
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateVisual}
                      disabled={isRegeneratingVisual}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRegeneratingVisual ? 'animate-spin' : ''}`} />
                      <span>{isRegeneratingVisual ? 'Génération...' : t('regenerateVisual')}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl text-xs text-gray-700 dark:text-zinc-300"
                  />
                </div>

                {/* Schedule & Save Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Date</label>
                    <input
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800 border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 block mb-1">Heure</label>
                    <input
                      type="time"
                      value={editedTime}
                      onChange={(e) => setEditedTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800 border rounded-xl text-xs"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-end">
                    <button
                      onClick={handleSaveEdits}
                      className="w-full py-2 bg-gray-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-12 text-center bg-white dark:bg-zinc-900 border rounded-3xl text-gray-400 text-xs">
            Sélectionnez une publication à gauche pour l’inspecter et la valider.
          </div>
        )}
      </div>
    </div>
  );
};
