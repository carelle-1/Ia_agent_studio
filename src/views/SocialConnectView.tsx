import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ExternalLink,
  ShieldCheck,
  Bot,
  Trash2,
  Check,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SocialConnectView: React.FC = () => {
  const { user, plan } = useAuth();
  const { t } = useI18n();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [pageNameInput, setPageNameInput] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [oauthConnected, setOauthConnected] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;

      const [accRes, pagRes, agRes] = await Promise.all([
        fetch('/api/social/accounts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/social/pages', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (accRes.ok) setAccounts(await accRes.json());
      if (pagRes.ok) setPages(await pagRes.json());
      if (agRes.ok) setAgents(await agRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    // Détecter le retour OAuth Facebook depuis l'URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'facebook') {
      setOauthConnected(true);
      setFeedback({ type: 'success', message: 'Votre compte Facebook a été connecté avec succès via OAuth Meta.' });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setOauthConnected(false), 5000);
      fetchData();
    }
    if (params.get('error') === 'oauth_denied') {
      setFeedback({ type: 'error', message: 'L’autorisation Facebook a été refusée ou annulée.' });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setFeedback(null), 5000);
    }
    if (params.get('error') === 'invalid_state') {
      setFeedback({ type: 'error', message: 'Session OAuth invalide. Veuillez réessayer.' });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setFeedback(null), 5000);
    }
    if (params.get('error') === 'token_exchange_failed') {
      setFeedback({ type: 'error', message: 'Échec de l’échange du jeton d’accès Facebook.' });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setFeedback(null), 5000);
    }
    if (params.get('error') === 'long_lived_token_failed') {
      setFeedback({ type: 'error', message: 'Échec de l’obtention du jeton longue durée Facebook.' });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setFeedback(null), 5000);
    }
    if (params.get('error') === 'profile_fetch_failed' || params.get('error') === 'pages_fetch_failed') {
      setFeedback({ type: 'error', message: 'Facebook a autorisé la connexion, mais le profil ou les Pages n’ont pas pu être récupérés. Vérifiez les permissions Meta puis réessayez.' });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setFeedback(null), 7000);
    }
    if (params.get('error') === 'no_pages') {
      setFeedback({ type: 'error', message: 'Le compte Facebook est connecté, mais Meta n’a renvoyé aucune Page accessible pour ce compte.' });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setFeedback(null), 7000);
    }
  }, [user]);

  const handleTestConnection = async (account: any, page?: any) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/social/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accountId: account.id, pageId: page?.id }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erreur lors du test de connexion',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnectSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/social/connect-sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: connectPlatform,
          pageName: pageNameInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsConnectModalOpen(false);
        setPageNameInput('');
        setFeedback({ type: 'success', message: data.message });
        setTimeout(() => setFeedback(null), 4000);
        fetchData();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  const handleConnectFacebookOAuth = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/social/oauth/facebook', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Impossible de générer l’URL d’autorisation Facebook.');
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Erreur lors de la connexion Facebook OAuth.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleConnectAccount = async (accountId: string) => {
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/social/accounts/${accountId}/reconnect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Impossible de reconnecter le compte.');
      }
      setFeedback({ type: 'success', message: 'Compte reconnecté avec succès.' });
      setTimeout(() => setFeedback(null), 4000);
      fetchData();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Erreur lors de la reconnexion.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReconnectFacebook = async (accountId?: string) => {
    try {
      const token = localStorage.getItem('metacolab_token');
      const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
      const res = await fetch(`/api/social/oauth/facebook${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Impossible de générer l’URL d’autorisation Facebook.');
      }
      window.location.href = data.url;
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Erreur lors de la reconnexion Facebook.' });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    if (!confirm('Voulez-vous vraiment déconnecter ce compte ? Ses pages et affectations d’agents resteront enregistrées.')) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/social/accounts/${accountId}/disconnect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Impossible de déconnecter le compte.');
      }
      setFeedback({ type: 'success', message: 'Compte déconnecté avec succès.' });
      setTimeout(() => setFeedback(null), 4000);
      fetchData();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Erreur lors de la déconnexion.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce compte ? Ses pages et affectations d’agents seront définitivement supprimées.')) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/social/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Impossible de supprimer le compte.');
      }
      setFeedback({ type: 'success', message: 'Compte et pages supprimés avec succès.' });
      setTimeout(() => setFeedback(null), 4000);
      fetchData();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Erreur lors de la suppression.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleAssignAgent = async (pageId: string, agentId: string) => {
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/social/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pageId, agentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Erreur d’affectation' });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: 'success', message: data.message });
        setTimeout(() => setFeedback(null), 3000);
        fetchData();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Share2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Gestion des Pages Facebook & Comptes Instagram</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Intégration officielle Meta Graph API v21.0. Attribution sécurisée des agents et validation des permissions.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => {
              setConnectPlatform('facebook');
              setIsConnectModalOpen(true);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter Page Facebook</span>
          </button>
          <button
            onClick={handleConnectFacebookOAuth}
            className="px-3.5 py-2 bg-[#1877F2] hover:bg-[#166ab2] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
          >
            <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[#1877F2] font-black text-xs">
              f
            </span>
            <span>Se connecter avec Facebook (OAuth)</span>
          </button>
          <button
            onClick={() => {
              setConnectPlatform('instagram');
              setIsConnectModalOpen(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter Instagram Pro</span>
          </button>
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
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Meta Official Developer Requirements Card */}
      <div className="p-5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-zinc-900 dark:to-zinc-900 border border-blue-200/60 dark:border-zinc-800 rounded-3xl">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-2xl bg-blue-600 text-white flex-shrink-0 shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-gray-950 dark:text-white">
              Conformité Meta Graph API v21.0 & Sécurité des Jetons
            </h3>
            <p className="text-xs text-gray-600 dark:text-zinc-300 mt-1 leading-relaxed">
              Meta Colab utilise les points de terminaison officiels pour récupérer les pages accessibles. Les jetons d'accès longue durée (60 jours) sont chiffrés en base de données avec clé AES-256-GCM. Aucun jeton n’est exposé côté client.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-md font-semibold bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-700">
                pages_show_list
              </span>
              <span className="px-2 py-0.5 rounded-md font-semibold bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-700">
                pages_manage_posts
              </span>
              <span className="px-2 py-0.5 rounded-md font-semibold bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-700">
                instagram_content_publish
              </span>
              <span className="px-2 py-0.5 rounded-md font-semibold bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-700">
                read_insights
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pages & Agent Assignment List */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        <h2 className="font-bold text-gray-950 dark:text-white text-base mb-1">
          Pages Sociales Actives & Affectation des Agents
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6">
          Chaque page doit être associée à un agent autorisé. Connectez ou déconnectez vos comptes Meta depuis cette liste.
        </p>

        <div className="space-y-4">
          {pages.length === 0 && accounts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-8 text-center text-sm text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
              Aucune Page sociale enregistrée. Connectez votre compte Facebook pour récupérer vos Pages et leurs informations.
            </div>
          )}
          {pages.length === 0 && accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                {account.profilePictureUrl ? (
                  <img
                    src={account.profilePictureUrl}
                    alt={`Photo du compte ${account.name}`}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                    <Share2 className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm text-gray-950 dark:text-white">{account.name}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    Compte {account.platform === 'facebook' ? 'Facebook' : 'Instagram'} · {account.status === 'connected' ? 'Aucune Page autorisée trouvée' : 'Déconnecté'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => account.platform === 'facebook' ? handleReconnectFacebook(account.id) : handleConnectAccount(account.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#166ab2]"
              >
                <Share2 className="h-4 w-4" />
                Se connecter
              </button>
            </div>
          ))}
          {pages.map((page) => {
            const account = accounts.find((a) => a.id === page.socialAccountId);
            const isConnected = account?.status === 'connected' && page.status === 'active';
            return (
              <div
                key={page.id}
                className="p-4 sm:p-5 rounded-2xl bg-gray-50/70 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Page Info */}
                <div className="flex items-center space-x-3.5">
                  <div className="relative h-12 w-12 shrink-0">
                    {page.profilePictureUrl ? (
                      <img
                        src={page.profilePictureUrl}
                        alt={`Photo de la Page ${page.name}`}
                        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-blue-500/30"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 ring-2 ring-blue-500/30 dark:bg-blue-900/40 dark:text-blue-300">
                        <Share2 className="h-5 w-5" />
                      </div>
                    )}
                    {account?.profilePictureUrl && (
                      <img
                        src={account.profilePictureUrl}
                        alt={`Photo du compte ${account.name}`}
                        title={`Compte Facebook : ${account.name}`}
                        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-white object-cover dark:border-zinc-800"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-gray-950 dark:text-white">{page.name || 'Page sans nom'}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          page.platform === 'facebook'
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                            : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {page.platform}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>ID : {page.externalPageId}</span>
                      <span>•</span>
                      <span>{(Number(page.followersCount) || 0).toLocaleString()} abonnés</span>
                      {account?.name && (
                        <>
                          <span>•</span>
                          <span>Compte : {account.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Fuseau : {page.timeZone}</span>
                      <span>•</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isConnected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                      }`}>
                        {isConnected ? 'Connecté' : 'Déconnecté'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Agent Assignment Selector & Connect/Disconnect Action */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Agent Select */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Agent :</span>
                    <select
                      value={page.assignedAgent?.id || ''}
                      onChange={(e) => handleAssignAgent(page.id, e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white"
                    >
                      <option value="">Sélectionner un agent...</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Connect / Disconnect Action */}
                  {isConnected ? (
                    <button
                      onClick={() => account && handleDisconnectAccount(account.id)}
                      className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Déconnecter</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (account?.platform === 'facebook' || page.platform === 'facebook') {
                          handleReconnectFacebook(account?.id);
                        } else if (account) {
                          handleConnectAccount(account.id);
                        } else {
                          handleConnectFacebookOAuth();
                        }
                      }}
                      className="px-3.5 py-1.5 bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 text-brand-900 dark:text-brand-100 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Se connecter</span>
                    </button>
                  )}

                  {/* Delete Account Action */}
                  <button
                    onClick={() => account && handleDeleteAccount(account.id)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Test Connection Diagnostic Result Modal */}
      {testResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-start space-x-3 mb-4">
              <div
                className={`p-2.5 rounded-2xl ${
                  testResult.success ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-950 dark:text-white">
                  Résultat du Diagnostic Serveur Meta
                </h3>
                <p className="text-xs text-gray-500">
                  Vérification en direct des autorisations et de la validité du jeton
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border mb-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700 dark:text-zinc-300">Statut technique :</span>
                <span
                  className={`font-extrabold uppercase text-[10px] px-2 py-0.5 rounded ${
                    testResult.success
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300'
                  }`}
                >
                  {testResult.code}
                </span>
              </div>
              <p className="text-gray-700 dark:text-zinc-200 leading-relaxed">
                {testResult.message}
              </p>
              {testResult.expiresInDays && (
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 pt-2 border-t flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Jeton valide pour encore {testResult.expiresInDays} jours.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setTestResult(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
              >
                Fermer le diagnostic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Page Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gray-950 dark:text-white mb-1">
              Connecter {connectPlatform === 'facebook' ? 'une Page Facebook' : 'un Compte Instagram Pro'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              En environnement de développement et de démonstration, une page dédiée sera créée avec permissions conformes.
            </p>

            <form onSubmit={handleConnectSandbox} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Nom de la page ou du compte *</label>
                <input
                  type="text"
                  required
                  placeholder={connectPlatform === 'facebook' ? 'Ex: Mon Entreprise Officielle' : 'Ex: mon_entreprise_pro'}
                  value={pageNameInput}
                  onChange={(e) => setPageNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-blue-800 dark:text-blue-300 rounded-xl text-[11px] leading-relaxed">
                ℹ️ Les permissions de publication (<code>pages_manage_posts</code> ou <code>instagram_content_publish</code>) seront automatiquement vérifiées.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Connecter le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
