import React, { useState, useEffect, useRef } from 'react';
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
  Bot,
  UserPlus,
  Edit,
  Trash2,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'plans' | 'ai' | 'logs' | 'agents'>('metrics');
  const [metrics, setMetrics] = useState<any | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [allAgents, setAllAgents] = useState<any[]>([]);

  // Edit AI provider modal state
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Create agent form state
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [createAgentForm, setCreateAgentForm] = useState({
    userId: '',
    name: '',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    businessDomain: '',
    description: '',
    primaryGoal: '',
    tone: 'Professionnel et inspirant',
    communicationStyle: 'Clair et percutant',
    targetAudience: 'Clients potentiels et communauté cible',
    skills: ['Rédaction commerciale', 'Storytelling', 'Veille de tendances'],
    postingFrequency: 'daily',
    autonomyLevel: 'supervised',
  });
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Edit existing agent state
  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [editAgentForm, setEditAgentForm] = useState<any>(null);
  const [isEditingAgent, setIsEditingAgent] = useState(false);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;

      const [metRes, usrRes, plnRes, aiRes, logRes, agRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/ai-providers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/logs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (metRes.ok) setMetrics(await metRes.json());
      if (usrRes.ok) setUsersList(await usrRes.json());
      if (plnRes.ok) setPlansList(await plnRes.json());
      if (aiRes.ok) setAiProviders(await aiRes.json());
      if (logRes.ok) setLogs(await logRes.json());
      if (agRes.ok) setAllAgents(await agRes.json());
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

  // Create agent
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;
      setIsCreatingAgent(true);
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createAgentForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Erreur lors de la création de l’agent.');
        return;
      }
      setFeedback(`L'agent "${data.name}" a été créé avec succès.`);
      setIsCreateAgentOpen(false);
      setCreateAgentForm({
        userId: '',
        name: '',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        businessDomain: '',
        description: '',
        primaryGoal: '',
        tone: 'Professionnel et inspirant',
        communicationStyle: 'Clair et percutant',
        targetAudience: 'Clients potentiels et communauté cible',
        skills: ['Rédaction commerciale', 'Storytelling', 'Veille de tendances'],
        postingFrequency: 'daily',
        autonomyLevel: 'supervised',
      });
      setTimeout(() => setFeedback(null), 4000);
      fetchAdminData();
    } catch (e: any) {
      setFeedback(e.message || 'Erreur réseau');
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const openEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setEditAgentForm({ ...agent });
    setIsEditAgentOpen(true);
  };

  const handleEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!editingAgent) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;
      setIsEditingAgent(true);
      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...editAgentForm, reason: 'Modification depuis l’interface admin' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Erreur lors de la modification de l’agent.');
        return;
      }
      setFeedback(`L'agent "${data.agent.name}" a été modifié avec succès.`);
      setIsEditAgentOpen(false);
      setEditingAgent(null);
      setEditAgentForm(null);
      setTimeout(() => setFeedback(null), 4000);
      fetchAdminData();
    } catch (e: any) {
      setFeedback(e.message || 'Erreur réseau');
    } finally {
      setIsEditingAgent(false);
    }
  };

  const toggleEditSkill = (skill: string) => {
    setEditAgentForm((prev: any) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s: string) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const toggleCreateSkill = (skill: string) => {
    setCreateAgentForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const availableCreateSkills = [
    'Storytelling de marque',
    'Rédaction commerciale',
    'Création de calendriers éditoriaux',
    'Communication institutionnelle',
    'Présentation de produits & services',
    'Communication éducative & conseils d’experts',
    'Promotion d’événements & saisons',
    'Analyse de tendances sectorielles',
    'Veille concurrentielle active',
    'Recommandations stratégiques',
  ];

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
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'agents'
              ? 'bg-purple-600 text-white font-bold'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Gestion des Agents ({allAgents.length})</span>
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

      {/* Tab 6: Agents Management */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-gray-950 dark:text-white uppercase tracking-wider mb-1">
                Gestion des Agents IA
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Créer, modifier et archiver les agents IA de la plateforme.
              </p>
            </div>
            <button
              onClick={() => setIsCreateAgentOpen(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un Agent</span>
            </button>
          </div>

          {/* Agents List */}
          <div className="bg-white dark:bg-zinc-900 border rounded-3xl p-6 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-gray-400 font-semibold">
                  <th className="pb-3">Agent</th>
                  <th className="pb-3">Utilisateur</th>
                  <th className="pb-3">Domaine</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Autonomie</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {allAgents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Aucun agent créé pour le moment.
                    </td>
                  </tr>
                ) : (
                  allAgents.map((agent) => {
                    const owner = usersList.find((u) => u.id === agent.userId);
                    return (
                      <tr key={agent.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                        <td className="py-3.5">
                          <div className="flex items-center space-x-2">
                            <img
                              src={agent.avatarUrl}
                              alt={agent.name}
                              className="w-8 h-8 rounded-xl object-cover bg-gray-200 dark:bg-zinc-800"
                            />
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{agent.name}</div>
                              <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                                {agent.businessDomain}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-gray-600 dark:text-zinc-300">
                          {owner ? `${owner.firstName} ${owner.lastName}` : '—'}
                          <div className="text-[11px] text-gray-400">{owner ? owner.email : '—'}</div>
                        </td>
                        <td className="py-3.5 text-gray-600 dark:text-zinc-300">
                          {agent.associatedCompany || '—'}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              agent.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {agent.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-gray-600 dark:text-zinc-300">
                          {agent.autonomyLevel}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => openEditAgent(agent)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition"
                            title="Modifier l'agent"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          {agent.status !== 'archived' ? (
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Voulez-vous vraiment archiver l’agent "${agent.name}" ?`
                                  )
                                ) {
                                  fetch(`/api/agents/${agent.id}`, {
                                    method: 'DELETE',
                                    headers: {
                                      Authorization: `Bearer ${localStorage.getItem('metacolab_token')}`,
                                    },
                                  }).then(() => fetchAdminData());
                                }
                              }}
                              className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-semibold transition"
                              title="Archiver"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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

      {/* Create Agent Modal */}
      {isCreateAgentOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800 mb-4">
              <h3 className="font-bold text-base text-gray-950 dark:text-white">
                Créer un Agent IA
              </h3>
              <button
                onClick={() => setIsCreateAgentOpen(false)}
                className="text-gray-400 font-bold p-1 hover:text-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
              {/* Photo de l'agent */}
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 border border-gray-200 dark:border-zinc-700">
                <label className="font-semibold block mb-3 text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Photo de l’agent
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <img
                      src={createAgentForm.avatarUrl}
                      alt="Avatar de l’agent"
                      className="w-20 h-20 rounded-full object-cover border-4 border-brand-100 dark:border-brand-900/30 shadow-sm transition-transform hover:scale-105"
                    />
                    <div className="absolute bottom-0 right-0 bg-brand-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <span className="text-[10px] font-bold">Changer</span>
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev: any) => {
                          setCreateAgentForm({ ...createAgentForm, avatarUrl: ev.target.result });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="mt-2 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1"
                    >
                      <span className="w-3 h-3">📁</span>
                      <span>Modifier la photo</span>
                    </button>
                  </div>
                  <div className="flex-1">
                    <label className="font-semibold block mb-1 text-xs text-gray-500 dark:text-zinc-400">
                      URL de l’image
                    </label>
                    <input
                      type="text"
                      placeholder="https://exemple.com/photo.jpg"
                      value={createAgentForm.avatarUrl}
                      onChange={(e) =>
                        setCreateAgentForm({ ...createAgentForm, avatarUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Utilisateur cible *</label>
                <select
                  value={createAgentForm.userId}
                  onChange={(e) =>
                    setCreateAgentForm({ ...createAgentForm, userId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                >
                  <option value="">Créer pour moi-même (admin)</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Nom de l’agent *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sophie - Directrice Éditoriale"
                    value={createAgentForm.name}
                    onChange={(e) =>
                      setCreateAgentForm({ ...createAgentForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Domaine d’activité *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Design d’intérieur, Mobilier, BTP"
                    value={createAgentForm.businessDomain}
                    onChange={(e) =>
                      setCreateAgentForm({
                        ...createAgentForm,
                        businessDomain: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Description de l’agent et de son rôle"
                  value={createAgentForm.description}
                  onChange={(e) =>
                    setCreateAgentForm({ ...createAgentForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Objectif principal</label>
                <input
                  type="text"
                  placeholder="Ex: Développer la notoriété et convertir l’audience"
                  value={createAgentForm.primaryGoal}
                  onChange={(e) =>
                    setCreateAgentForm({ ...createAgentForm, primaryGoal: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Ton rédactionnel</label>
                  <input
                    type="text"
                    value={createAgentForm.tone}
                    onChange={(e) =>
                      setCreateAgentForm({ ...createAgentForm, tone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Style de communication</label>
                  <input
                    type="text"
                    value={createAgentForm.communicationStyle}
                    onChange={(e) =>
                      setCreateAgentForm({
                        ...createAgentForm,
                        communicationStyle: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Public cible</label>
                <input
                  type="text"
                  value={createAgentForm.targetAudience}
                  onChange={(e) =>
                    setCreateAgentForm({ ...createAgentForm, targetAudience: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Compétences</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableCreateSkills.map((sk) => {
                    const isSelected = createAgentForm.skills.includes(sk);
                    return (
                      <button
                        type="button"
                        key={sk}
                        onClick={() => toggleCreateSkill(sk)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {sk}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Fréquence de publication</label>
                  <select
                    value={createAgentForm.postingFrequency}
                    onChange={(e) =>
                      setCreateAgentForm({
                        ...createAgentForm,
                        postingFrequency: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  >
                    <option value="daily">Quotidien</option>
                    <option value="3_per_week">3 par semaine</option>
                    <option value="5_per_week">5 par semaine</option>
                    <option value="custom">Personnalisée</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Niveau d’autonomie</label>
                  <select
                    value={createAgentForm.autonomyLevel}
                    onChange={(e) =>
                      setCreateAgentForm({
                        ...createAgentForm,
                        autonomyLevel: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  >
                    <option value="supervised">Supervisé (validation obligatoire)</option>
                    <option value="semi_autonomous">Semi-autonome</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAgentOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAgent}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isCreatingAgent ? 'Création…' : 'Créer l’agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit existing Agent Modal */}
      {isEditAgentOpen && editingAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800 mb-4">
              <h3 className="font-bold text-base text-gray-950 dark:text-white">
                Modifier l’agent
              </h3>
              <button
                onClick={() => setIsEditAgentOpen(false)}
                className="text-gray-400 font-bold p-1 hover:text-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditAgent} className="space-y-4 text-xs">
              {/* Photo de l'agent */}
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4 border border-gray-200 dark:border-zinc-700">
                <label className="font-semibold block mb-3 text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Photo de l’agent
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => editAvatarInputRef.current?.click()}>
                    <img
                      src={editAgentForm.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt="Avatar de l’agent"
                      className="w-20 h-20 rounded-full object-cover border-4 border-brand-100 dark:border-brand-900/30 shadow-sm transition-transform hover:scale-105"
                    />
                    <div className="absolute bottom-0 right-0 bg-brand-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <span className="text-[10px] font-bold">Changer</span>
                    </div>
                    <input
                      ref={editAvatarInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev: any) => {
                          setEditAgentForm((prev: any) => ({ ...prev, avatarUrl: ev.target.result }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => editAvatarInputRef.current?.click()}
                      className="mt-2 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1"
                    >
                      <span className="w-3 h-3">📁</span>
                      <span>Modifier la photo</span>
                    </button>
                  </div>
                  <div className="flex-1">
                    <label className="font-semibold block mb-1 text-xs text-gray-500 dark:text-zinc-400">
                      URL de l’image
                    </label>
                    <input
                      type="text"
                      placeholder="https://exemple.com/photo.jpg"
                      value={editAgentForm.avatarUrl || ''}
                      onChange={(e) =>
                        setEditAgentForm((prev: any) => ({ ...prev, avatarUrl: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Nom de l’agent *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nom de l’agent"
                    value={editAgentForm.name || ''}
                    onChange={(e) =>
                      setEditAgentForm((prev: any) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Domaine d’activité *</label>
                  <input
                    type="text"
                    required
                    placeholder="Domaine d’activité"
                    value={editAgentForm.businessDomain || ''}
                    onChange={(e) =>
                      setEditAgentForm((prev: any) => ({ ...prev, businessDomain: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Description"
                  value={editAgentForm.description || ''}
                  onChange={(e) =>
                    setEditAgentForm((prev: any) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Objectif principal</label>
                <input
                  type="text"
                  placeholder="Objectif principal"
                  value={editAgentForm.primaryGoal || ''}
                  onChange={(e) =>
                    setEditAgentForm((prev: any) => ({ ...prev, primaryGoal: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Ton rédactionnel</label>
                  <input
                    type="text"
                    value={editAgentForm.tone || ''}
                    onChange={(e) =>
                      setEditAgentForm((prev: any) => ({ ...prev, tone: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Style de communication</label>
                  <input
                    type="text"
                    value={editAgentForm.communicationStyle || ''}
                    onChange={(e) =>
                      setEditAgentForm((prev: any) => ({ ...prev, communicationStyle: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Public cible</label>
                <input
                  type="text"
                  value={editAgentForm.targetAudience || ''}
                  onChange={(e) =>
                    setEditAgentForm((prev: any) => ({ ...prev, targetAudience: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Compétences</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableCreateSkills.map((sk) => {
                    const isSelected = editAgentForm.skills?.includes(sk) ?? false;
                    return (
                      <button
                        type="button"
                        key={sk}
                        onClick={() => toggleEditSkill(sk)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {sk}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Fréquence de publication</label>
                  <select
                    value={editAgentForm.postingFrequency || 'daily'}
                    onChange={(e) =>
                      setEditAgentForm((prev: any) => ({ ...prev, postingFrequency: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  >
                    <option value="daily">Quotidien</option>
                    <option value="3_per_week">3 par semaine</option>
                    <option value="5_per_week">5 par semaine</option>
                    <option value="custom">Personnalisée</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Niveau d’autonomie</label>
                  <select
                    value={editAgentForm.autonomyLevel || 'supervised'}
                    onChange={(e) =>
                      setEditAgentForm((prev: any) => ({ ...prev, autonomyLevel: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  >
                    <option value="supervised">Supervisé (validation obligatoire)</option>
                    <option value="semi_autonomous">Semi-autonome</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditAgentOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isEditingAgent}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isEditingAgent ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
