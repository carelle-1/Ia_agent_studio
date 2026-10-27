import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  ShieldCheck,
  Users,
  Layers,
  Cpu,
  FileText,
  DollarSign,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  RefreshCw,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'plans' | 'ai' | 'logs'>('metrics');
  const [metrics, setMetrics] = useState<any | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit AI provider modal state
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;

      const [metRes, usrRes, plnRes, aiRes, logRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/ai-providers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (metRes.ok) setMetrics(await metRes.json());
      if (usrRes.ok) setUsersList(await usrRes.json());
      if (plnRes.ok) setPlansList(await plnRes.json());
      if (aiRes.ok) setAiProviders(await aiRes.json());
      if (logRes.ok) setLogs(await logRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const handleToggleUserStatus = async (targetUser: any) => {
    const newStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setFeedback(`Statut de ${targetUser.email} mis à jour : ${newStatus}`);
        setTimeout(() => setFeedback(null), 3000);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAiProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/admin/ai-providers/${selectedProvider.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: apiKeyInput,
          baseUrl: selectedProvider.baseUrl,
          defaultModel: selectedProvider.defaultModel,
          status: selectedProvider.status,
          priority: selectedProvider.priority,
        }),
      });
      if (res.ok) {
        setSelectedProvider(null);
        setApiKeyInput('');
        setFeedback('Configuration du fournisseur d’IA enregistrée avec chiffrement AES-256.');
        setTimeout(() => setFeedback(null), 4000);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Super Administrateur • Console Centrale</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight">
            Espace d'Administration Globale
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Surveillance des utilisateurs, gestion des forfaits, routage de l'IA et audit de sécurité.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3.5 py-2.5 rounded-xl transition ${
            activeTab === 'metrics'
              ? 'bg-purple-600 text-white font-bold'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          Indicateurs & KPIs
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white font-bold'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Utilisateurs ({usersList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'plans'
              ? 'bg-purple-600 text-white font-bold'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Gestion des Packs ({plansList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'ai'
              ? 'bg-purple-600 text-white font-bold'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Fournisseurs d’IA ({aiProviders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'logs'
              ? 'bg-purple-600 text-white font-bold'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Journaux & File de Tâches</span>
        </button>
      </div>

      {/* Tab 1: Global KPIs */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 border p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-semibold text-gray-500 block mb-1">Total Utilisateurs</span>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {metrics.kpis?.totalUsers}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">{metrics.kpis?.activeUsers} actifs</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 border p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-semibold text-gray-500 block mb-1">Publications Créées</span>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {metrics.kpis?.totalPosts}
              </div>
              <span className="text-[10px] text-blue-600 font-bold">{metrics.kpis?.publishedPosts} publiées sur Meta</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 border p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-semibold text-gray-500 block mb-1">Consommation IA Totale</span>
              <div className="text-2xl font-black text-purple-600">
                {metrics.kpis?.totalAiTokens?.toLocaleString()}
              </div>
              <span className="text-[10px] text-gray-500">Coût estimé : {metrics.kpis?.totalAiCostEur} €</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 border p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] font-semibold text-gray-500 block mb-1">Chiffre d’Affaires Sandbox</span>
              <div className="text-2xl font-black text-emerald-600">
                {metrics.kpis?.totalRevenueEur} €
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">Abonnements SaaS</span>
            </div>
          </div>

          {/* Subscriptions breakdown */}
          <div className="bg-white dark:bg-zinc-900 border rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-sm text-gray-950 dark:text-white mb-3">
              Répartition des Abonnements par Pack
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(metrics.planDistribution || {}).map(([planName, count]: any) => (
                <div key={planName} className="p-3.5 bg-gray-50 dark:bg-zinc-800 rounded-2xl border text-xs">
                  <span className="text-gray-500 block mb-1">{planName}</span>
                  <div className="text-lg font-black text-gray-900 dark:text-white">{count} compte(s)</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-zinc-900 border rounded-3xl p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 font-semibold">
                <th className="pb-3">Utilisateur</th>
                <th className="pb-3">Entreprise</th>
                <th className="pb-3">Rôle</th>
                <th className="pb-3">Pack Actif</th>
                <th className="pb-3">Statut</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 font-bold text-gray-900 dark:text-white">
                    <div>{u.firstName} {u.lastName}</div>
                    <div className="text-[11px] text-gray-400 font-normal">{u.email}</div>
                  </td>
                  <td className="py-3.5 text-gray-600 dark:text-zinc-300">{u.companyName}</td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 font-semibold text-blue-600 dark:text-blue-400">
                    {u.plan?.name || 'Pack Pro'}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    {u.role !== 'superadmin' && (
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          u.status === 'active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspendre' : 'Réactiver'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Plans Manager */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plansList.map((p) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 border rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</h3>
                  <span className="font-black text-sm text-blue-600">{p.price} €/mois</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                <div className="text-[11px] text-gray-600 dark:text-zinc-400 space-y-1 border-t pt-2">
                  <div>Max agents : {p.maxAgents === -1 ? 'Illimité' : p.maxAgents}</div>
                  <div>Posts / semaine : {p.maxPostsPerWeek === -1 ? 'Illimité' : p.maxPostsPerWeek}</div>
                  <div>Modif visuel prompt : {p.canEditVisualPrompt ? 'Oui' : 'Non'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: AI Providers */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl text-xs text-blue-900 dark:text-blue-200">
            🔒 Sécurité : Toutes les clés API sont chiffrées avec AES-256-GCM. Elles ne sont jamais renvoyées en clair dans les réponses réseau.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiProviders.map((prov) => (
              <div
                key={prov.id}
                className="bg-white dark:bg-zinc-900 border rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{prov.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        prov.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {prov.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Modèle par défaut : <strong className="text-gray-900 dark:text-white">{prov.defaultModel}</strong>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-2">
                    Clé API enregistrée : {prov.hasApiKey ? '✅ Oui (Chiffrée)' : '❌ Non configurée'}
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedProvider(prov);
                      setApiKeyInput('');
                    }}
                    className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold text-xs rounded-xl"
                  >
                    Configurer la clé API
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Logs & Jobs */}
      {activeTab === 'logs' && logs && (
        <div className="bg-white dark:bg-zinc-900 border rounded-3xl p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-sm text-gray-950 dark:text-white mb-2">
              Derniers Événements d'Audit de Sécurité
            </h3>
            <div className="space-y-2 text-xs">
              {logs.auditLogs?.slice(0, 10).map((log: any) => (
                <div key={log.id} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white mr-2">[{log.action}]</span>
                    <span className="text-gray-600 dark:text-zinc-300">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit AI Provider Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gray-950 dark:text-white mb-1">
              Configurer {selectedProvider.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              La clé API sera chiffrée avec la clé secrète de l’application avant écriture en base.
            </p>

            <form onSubmit={handleSaveAiProvider} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Nouvelle Clé API</label>
                <input
                  type="password"
                  placeholder="Collez votre clé secrète ici..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Modèle</label>
                <input
                  type="text"
                  value={selectedProvider.defaultModel}
                  onChange={(e) =>
                    setSelectedProvider({ ...selectedProvider, defaultModel: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
