import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  Palette,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Tag,
  Shield,
  Layers,
} from 'lucide-react';

export const BrandInspirationView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [brandProfile, setBrandProfile] = useState<any | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'identity' | 'gallery'>('identity');
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New asset form
  const [assetTitle, setAssetTitle] = useState('');
  const [assetCategory, setAssetCategory] = useState('product');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetInstructions, setAssetInstructions] = useState('');

  const fetchBrandData = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;

      const [profRes, assRes] = await Promise.all([
        fetch('/api/brand/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/brand/inspiration', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (profRes.ok) setBrandProfile(await profRes.json());
      if (assRes.ok) setAssets(await assRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBrandData();
  }, [user]);

  const handleSaveBrandProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandProfile) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/brand/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(brandProfile),
      });
      if (res.ok) {
        setFeedback('Identité visuelle et charte de marque enregistrées avec succès !');
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/brand/inspiration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: assetTitle,
          category: assetCategory,
          fileUrl: assetUrl,
          instructions: assetInstructions,
          tags: [assetCategory, 'Inspiration'],
        }),
      });
      if (res.ok) {
        setIsAddAssetOpen(false);
        setAssetTitle('');
        setAssetUrl('');
        setAssetInstructions('');
        setFeedback('Élément ajouté à la galerie d’inspiration.');
        setTimeout(() => setFeedback(null), 3000);
        fetchBrandData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const token = localStorage.getItem('metacolab_token');
      await fetch(`/api/brand/inspiration/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBrandData();
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
            <Palette className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            <span>Identité Visuelle & Galerie d’Inspiration</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Définissez votre charte graphique, vos couleurs de marque et votre galerie d’images de référence pour les agents IA.
          </p>
        </div>

        {activeTab === 'gallery' && (
          <button
            onClick={() => setIsAddAssetOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Référence</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-3 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('identity')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'identity'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Charte Graphique & Ton de Marque
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`pb-3 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === 'gallery'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Galerie d’Inspiration</span>
          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-[10px]">
            {assets.length}
          </span>
        </button>
      </div>

      {/* Brand Identity Form Tab */}
      {activeTab === 'identity' && brandProfile && (
        <form onSubmit={handleSaveBrandProfile} className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-950 dark:text-white text-base">
              Couleurs & Palette Officielle
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Primary Color */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">
                  Couleur Principale
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={brandProfile.primaryColor}
                    onChange={(e) => setBrandProfile({ ...brandProfile, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={brandProfile.primaryColor}
                    onChange={(e) => setBrandProfile({ ...brandProfile, primaryColor: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">
                  Couleur Secondaire
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={brandProfile.secondaryColor}
                    onChange={(e) => setBrandProfile({ ...brandProfile, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={brandProfile.secondaryColor}
                    onChange={(e) => setBrandProfile({ ...brandProfile, secondaryColor: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">
                  Couleur d’Accentuation
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={brandProfile.accentColor}
                    onChange={(e) => setBrandProfile({ ...brandProfile, accentColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={brandProfile.accentColor}
                    onChange={(e) => setBrandProfile({ ...brandProfile, accentColor: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Voice & Aesthetic Guidelines Card */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-950 dark:text-white text-base">
              Ligne Éditoriale & Contraintes Négatives
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Voix de marque (Brand Voice)</label>
                <textarea
                  value={brandProfile.brandVoice}
                  onChange={(e) => setBrandProfile({ ...brandProfile, brandVoice: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl resize-none"
                  placeholder="Ex: Élégant, chaleureux, expert en artisanat d'art..."
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Style Visuel & Ambiance photographique</label>
                <textarea
                  value={brandProfile.visualStyle}
                  onChange={(e) => setBrandProfile({ ...brandProfile, visualStyle: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl resize-none"
                  placeholder="Ex: Lumière naturelle, textures bois et lin, composition épurée..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1 text-red-600 dark:text-red-400">
                    Contraintes Visuelles à Éviter (Negative Prompts)
                  </label>
                  <textarea
                    value={brandProfile.negativePrompts}
                    onChange={(e) => setBrandProfile({ ...brandProfile, negativePrompts: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl resize-none"
                    placeholder="Flou, couleurs criardes, personnages déformés..."
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-red-600 dark:text-red-400">
                    Sujets ou Mots Interdits (Do Not Mention)
                  </label>
                  <textarea
                    value={brandProfile.doNotMention}
                    onChange={(e) => setBrandProfile({ ...brandProfile, doNotMention: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl resize-none"
                    placeholder="Prix discount, termes négatifs, concurrents..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Enregistrer la charte
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Inspiration Gallery Tab */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] bg-zinc-900 overflow-hidden">
                <img
                  src={asset.fileUrl}
                  alt={asset.title}
                  className="w-full h-full object-cover transition hover:scale-105 duration-300"
                />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/60 text-white backdrop-blur">
                  {asset.category}
                </span>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-gray-900 dark:text-white truncate">
                    {asset.title}
                  </h3>
                  <button
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="text-gray-400 hover:text-red-500 transition p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {asset.instructions && (
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2">
                    {asset.instructions}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Add Asset Card */}
          <div
            onClick={() => setIsAddAssetOpen(true)}
            className="border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 transition bg-gray-50/50 dark:bg-zinc-900/40"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-xs text-gray-900 dark:text-white">
              Ajouter une inspiration
            </h4>
            <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">
              Fournissez des images de référence exploitables par vos agents.
            </p>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gray-950 dark:text-white mb-1">
              Ajouter une Image d’Inspiration
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Liez une photo d'ambiance ou un exemple pour guider la direction artistique des agents.
            </p>

            <form onSubmit={handleAddAsset} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">Titre de la référence *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Table en travertin romain"
                  value={assetTitle}
                  onChange={(e) => setAssetTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">URL de l’image *</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={assetUrl}
                  onChange={(e) => setAssetUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Catégorie</label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                >
                  <option value="product">Photo Produit</option>
                  <option value="lifestyle">Ambiance Lifestyle</option>
                  <option value="behind_the_scenes">Coulisses d'Atelier</option>
                  <option value="infographic">Infographie / Conseil</option>
                  <option value="quote">Citation Visuelle</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Consignes d’utilisation pour l’agent IA</label>
                <textarea
                  value={assetInstructions}
                  onChange={(e) => setAssetInstructions(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl resize-none"
                  placeholder="Ex: Reproduire le cadrage serré et la lumière zénithale..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddAssetOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
