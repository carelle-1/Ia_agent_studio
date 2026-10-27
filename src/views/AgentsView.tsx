import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  Bot,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  Edit,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';

export const AgentsView: React.FC = () => {
  const { user, plan } = useAuth();
  const { t } = useI18n();

  const [agents, setAgents] = useState<any[]>([]);
  const [agentTemplates, setAgentTemplates] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'objectives' | 'business'>('details');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newInstruction, setNewInstruction] = useState({ title: '', content: '', category: 'general' });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingObjectiveIndex, setEditingObjectiveIndex] = useState<number | null>(null);
  const [editObjectiveContent, setEditObjectiveContent] = useState('');

  // Calendar generation from agent config
  const [isGenCalendarOpen, setIsGenCalendarOpen] = useState(false);
  const [genCalendarPageId, setGenCalendarPageId] = useState<string>('');
  const [genCalendarFrequency, setGenCalendarFrequency] = useState(7);
  const [genCalendarPages, setGenCalendarPages] = useState<any[]>([]);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);

  // New Agent Form State
  const [formData, setFormData] = useState({
    name: '',
    businessDomain: '',
    associatedCompany: user?.companyName || '',
    tone: 'Professionnel, chaleureux et inspirant',
    communicationStyle: 'Storytelling immersif avec appels à l’action élégants',
    targetAudience: 'Clients haut de gamme, amateurs de design et architecture',
    primaryGoal: 'Développer l’engagement et convertir l’audience en clients fidèles.',
    postingFrequency: 'daily',
    skills: ['Storytelling de marque', 'Rédaction commerciale', 'Création de calendriers éditoriaux'],
  });

  const availableSkills = [
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

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;
      const [agentsRes, templatesRes] = await Promise.all([
        fetch('/api/agents', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/agents/templates', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data);
        if (selectedAgent) {
          const updated = data.find((a: any) => a.id === selectedAgent.id);
          if (updated) setSelectedAgent(updated);
        }
      }
      if (templatesRes.ok) {
        const templates = await templatesRes.json();
        setAgentTemplates(templates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [user]);

  const handleOpenDetail = async (agent: any) => {
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/agents/${agent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fullAgent = await res.json();
        setSelectedAgent(fullAgent);
        setActiveTab('details');
      }
    } catch (e) {
      setSelectedAgent(agent);
    }
  }; 

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur lors de la création de l’agent.');
        return;
      }
      setIsCreateModalOpen(false);
      setSelectedTemplateId('');
      setSuccessMsg(`L’agent ${data.name} a été créé avec succès !`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchAgents();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = agentTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setFormData((prev) => ({
      ...prev,
      businessDomain: template.businessDomain,
      tone: template.tone || prev.tone,
      communicationStyle: template.communicationStyle || prev.communicationStyle,
      targetAudience: template.targetAudience || prev.targetAudience,
      skills: template.skills?.length ? template.skills : prev.skills,
    }));
  };

  const handleAddInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !newInstruction.content) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const existingObjectives = selectedAgent.customInstructions ? selectedAgent.customInstructions.split('|').filter(Boolean) : [];

      if (editingObjectiveIndex !== null) {
        existingObjectives[editingObjectiveIndex] = newInstruction.content;
        setEditingObjectiveIndex(null);
        setEditObjectiveContent('');
      } else {
        existingObjectives.push(newInstruction.content);
      }

      setNewInstruction({ title: '', content: '', category: 'general' });

      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customInstructions: existingObjectives.join('|'),
          reason: editingObjectiveIndex !== null ? 'Modification d’objectif' : 'Ajout d’objectif',
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAgent(updated.agent || updated);
        fetchAgents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditObjective = (idx: number, content: string) => {
    setEditingObjectiveIndex(idx);
    setEditObjectiveContent(content);
    setNewInstruction((prev) => ({ ...prev, content }));
  };

  const handleDeleteObjective = async (idx: number) => {
    if (!selectedAgent) return;
    if (!confirm('Supprimer cet objectif ?')) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const existingObjectives = selectedAgent.customInstructions ? selectedAgent.customInstructions.split('|').filter(Boolean) : [];
      existingObjectives.splice(idx, 1);

      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customInstructions: existingObjectives.join('|'),
          reason: 'Suppression d’objectif',
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAgent(updated.agent || updated);
        fetchAgents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Business info state
  const [businessInfoForm, setBusinessInfoForm] = useState<any>(null);

  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessDomain: businessInfoForm.businessDomain,
          associatedCompany: businessInfoForm.associatedCompany,
          description: businessInfoForm.description,
          targetAudience: businessInfoForm.targetAudience,
          primaryGoal: businessInfoForm.primaryGoal,
          reason: 'Modification des informations entreprise/produit',
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAgent(updated.agent || updated);
        setBusinessInfoForm(null);
        setSuccessMsg('Informations entreprise/produit enregistrées.');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchAgents();
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Erreur réseau');
    }
  };

  // Charger les pages sociales pour le sélecteur de génération de calendrier
  const fetchGenCalendarPages = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;
      const res = await fetch('/api/social/pages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const pages = await res.json();
        setGenCalendarPages(pages);
        if (pages.length > 0 && !genCalendarPageId) {
          setGenCalendarPageId(pages[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openGenCalendar = () => {
    setIsGenCalendarOpen(true);
    fetchGenCalendarPages();
  };

  const handleGenerateCalendarFromAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setIsGeneratingCalendar(true);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/calendars/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pageId: genCalendarPageId,
          agentId: selectedAgent.id,
          frequency: Number(genCalendarFrequency),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsGenCalendarOpen(false);
        setSuccessMsg(`Calendrier éditorial généré avec succès (${data.items.length} créneaux) basé sur la configuration de l'agent "${selectedAgent.name}" !`);
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchAgents();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingCalendar(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Bot className="w-6 h-6 text-brand dark:text-brand" />
            <span>Studio des Agents IA Spécialisés</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Configurez les compétences, les styles de rédaction et les règles de vos assistants dédiés à vos pages Meta.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedTemplateId('');
            setFormData((prev) => ({ ...prev, businessDomain: '' }));
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Agent IA</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900 text-brand-900 dark:text-brand-100 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-brand" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-brand dark:hover:border-brand transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start space-x-3.5 mb-3.5">
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-brand/20"
                />
                <div>
                  <h3 className="font-bold text-sm text-gray-950 dark:text-white leading-tight">
                    {agent.name}
                  </h3>
                  <p className="text-[11px] text-brand dark:text-brand font-semibold mt-0.5">
                    {agent.associatedCompany || user?.companyName}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                    {agent.businessDomain}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed mb-4 line-clamp-2">
                {agent.description}
              </p>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {agent.skills?.slice(0, 3).map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                  >
                    {skill}
                  </span>
                ))}
                {agent.skills?.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-500">
                    +{agent.skills.length - 3}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                {agent.assignedPages?.length || 0} page(s) assignée(s)
              </span>
              <button
                onClick={() => handleOpenDetail(agent)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-semibold rounded-lg transition flex items-center space-x-1"
              >
                <span>Configurer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Detail & Configuration Modal / Drawer */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <img
                  src={selectedAgent.avatarUrl}
                  alt={selectedAgent.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-brand/30"
                />
                <div>
                  <h2 className="font-extrabold text-base text-gray-950 dark:text-white">
                    {selectedAgent.name}
                  </h2>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-zinc-400">
                    <span>{selectedAgent.businessDomain}</span>
                    <span>•</span>
<span className="text-brand dark:text-brand font-semibold flex items-center space-x-0.5">
                    <Shield className="w-3 h-3" />
                    <span>Mode Supervisé (Validation Obligatoire)</span>
</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-sm font-bold p-2"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 flex space-x-4 border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 border-b-2 transition ${
                  activeTab === 'details'
                    ? 'border-blue-600 text-brand dark:text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Profil & Compétences
              </button>
              <button
                onClick={() => setActiveTab('objectives')}
                className={`py-3 border-b-2 transition flex items-center space-x-1.5 ${
                  activeTab === 'objectives'
                    ? 'border-blue-600 text-brand dark:text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>Objectif</span>
                <span className="px-1.5 py-0.2 rounded-full bg-brand-100 dark:bg-brand-900/60 text-[10px]">
                  {selectedAgent.customInstructions ? selectedAgent.customInstructions.split('|').filter(Boolean).length : 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('business')}
                className={`py-3 border-b-2 transition flex items-center space-x-1.5 ${
                  activeTab === 'business'
                    ? 'border-blue-600 text-brand dark:text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Entreprise & Produit</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-gray-200/60 dark:border-zinc-800">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase">
                        Ton de rédaction
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">
                        {selectedAgent.tone}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-gray-200/60 dark:border-zinc-800">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase">
                        Public Cible
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">
                        {selectedAgent.targetAudience}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                      Compétences assignées
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.skills?.map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 border border-brand-100 dark:border-brand-900 font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-warn-50 dark:bg-warn-950/30 border border-warn-100 dark:border-warn-900/60 p-3.5 rounded-xl">
                    <h4 className="font-bold text-warn-900 dark:text-warn-100 mb-1 flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-warn-600" />
                      <span>Règles strictes & Limites de l’Agent</span>
                    </h4>
                  <p className="text-warn-900 dark:text-warn-100 leading-relaxed">
                    {selectedAgent.mandatoryRules || 'Validation humaine obligatoire avant toute publication.'}
                  </p>
                </div>

                {/* Générer calendrier éditorial depuis la config de l'agent */}
                <div className="bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 p-3.5 rounded-xl">
                  <h4 className="font-bold text-brand-900 dark:text-brand-100 mb-2 flex items-center space-x-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-brand-600" />
                    <span>Calendrier Éditorial depuis cet Agent</span>
                  </h4>
                  <p className="text-brand-900 dark:text-brand-100 text-[11px] leading-relaxed mb-3">
                    Générez une grille éditoriale hebdomadaire basée sur le domaine d’activité, le ton, la fréquence et les objectifs de cet agent.
                  </p>
                  <button
                    onClick={openGenCalendar}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Créer le Calendrier Éditorial</span>
                  </button>
                </div>
              </div>
            )}

              {activeTab === 'objectives' && (
                <div className="space-y-4">
                  {/* Add Objective Form */}
                  <form onSubmit={handleAddInstruction} className="p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-3">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                      Définir un nouvel objectif
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Augmenter l'engagement de 20%"
                        value={newInstruction.title}
                        onChange={(e) => setNewInstruction({ ...newInstruction, title: e.target.value })}
                        className="col-span-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs"
                        required
                      />
                      <select
                        value={newInstruction.category}
                        onChange={(e) => setNewInstruction({ ...newInstruction, category: e.target.value })}
                        className="px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs"
                      >
                        <option value="general">Objectif permanent</option>
                        <option value="campaign">Objectif lié à une campagne</option>
                        <option value="post">Objectif relatif à une publication</option>
                        <option value="temporary">Objectif temporaire</option>
                      </select>
                    </div>
                    <textarea
                      placeholder="Contenu de l'objectif (ex: Augmenter le taux d'engagement des publications Instagram de 20% d'ici fin trimestre)..."
                      value={newInstruction.content}
                      onChange={(e) => setNewInstruction({ ...newInstruction, content: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs h-20 resize-none"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Enregistrer l'objectif
                    </button>
                  </form>

                  {/* Objectives List */}
                  <div className="space-y-2">
                    {selectedAgent.customInstructions?.split('|').filter(Boolean).map((obj: string, idx: number) => {
                      const isEditing = editingObjectiveIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl flex items-start justify-between gap-3"
                        >
                          {isEditing ? (
                            <div className="flex-1 min-w-0">
                              <textarea
                                value={editObjectiveContent}
                                onChange={(e) => setEditObjectiveContent(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs h-20 resize-none mb-2"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewInstruction({ ...newInstruction, content: editObjectiveContent });
                                    setEditingObjectiveIndex(null);
                                    setEditObjectiveContent('');
                                  }}
                                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-lg transition"
                                >
                                  Enregistrer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingObjectiveIndex(null);
                                    setEditObjectiveContent('');
                                  }}
                                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg hover:bg-gray-300 transition"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-gray-900 dark:text-white">Objectif #{idx + 1}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                                  Permanent
                                </span>
                              </div>
                              <p className="text-gray-600 dark:text-zinc-300 mt-1 leading-relaxed">
                                {obj}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditObjective(idx, obj)}
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs transition flex items-center justify-center"
                              title="Modifier"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteObjective(idx)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs transition flex items-center justify-center"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {selectedAgent.customInstructions?.split('|').filter(Boolean).length === 0 && (
                      <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-xl text-center text-xs text-gray-500">
                        Aucun objectif défini pour le moment.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'business' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs mb-4 uppercase tracking-wider">
                      Informations Entreprise & Produit
                    </h4>
                    <form onSubmit={handleSaveBusinessInfo} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="font-semibold block mb-1 text-xs text-gray-500 dark:text-zinc-400">
                            Domaine d'activité
                          </label>
                          <input
                            type="text"
                            value={businessInfoForm?.businessDomain || selectedAgent.businessDomain || ''}
                            onChange={(e) =>
                              setBusinessInfoForm((prev: any) => ({ ...prev, businessDomain: e.target.value }))
                            }
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1 text-xs text-gray-500 dark:text-zinc-400">
                            Entreprise / Marque
                          </label>
                          <input
                            type="text"
                            value={businessInfoForm?.associatedCompany || selectedAgent.associatedCompany || ''}
                            onChange={(e) =>
                              setBusinessInfoForm((prev: any) => ({ ...prev, associatedCompany: e.target.value }))
                            }
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-semibold block mb-1 text-xs text-gray-500 dark:text-zinc-400">
                          Description
                        </label>
                        <textarea
                          value={businessInfoForm?.description || selectedAgent.description || ''}
                          onChange={(e) =>
                            setBusinessInfoForm((prev: any) => ({ ...prev, description: e.target.value }))
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs h-24 resize-none"
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="font-semibold block mb-1 text-xs text-gray-500 dark:text-zinc-400">
                            Public cible
                          </label>
                          <input
                            type="text"
                            value={businessInfoForm?.targetAudience || selectedAgent.targetAudience || ''}
                            onChange={(e) =>
                              setBusinessInfoForm((prev: any) => ({ ...prev, targetAudience: e.target.value }))
                            }
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1 text-xs text-gray-500 dark:text-zinc-400">
                            Objectif principal
                          </label>
                          <input
                            type="text"
                            value={businessInfoForm?.primaryGoal || selectedAgent.primaryGoal || ''}
                            onChange={(e) =>
                              setBusinessInfoForm((prev: any) => ({ ...prev, primaryGoal: e.target.value }))
                            }
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                      >
                        Enregistrer les informations
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                  Créer un nouvel Agent IA Spécialisé
                </h3>
                <p className="text-xs text-gray-500">
                  Définissez l'identité, les compétences et les consignes strictes de votre assistant.
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 font-bold p-1">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Nom de l’Agent *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Clara - Rédactrice Storytelling"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Domaine d’activité *</label>
                  <select
                    required
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      if (e.target.value) handleTemplateSelect(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  >
                    <option value="">Sélectionner un domaine d’activité…</option>
                    {agentTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} — {tpl.businessDomain}
                      </option>
                    ))}
                  </select>
                  {agentTemplates.length === 0 && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Aucun modèle disponible pour le moment.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Ton rédactionnel</label>
                <input
                  type="text"
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Public cible</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              {/* Skills Selector */}
              <div>
                <label className="font-semibold block mb-1.5">Compétences attendues</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableSkills.map((sk) => {
                    const isSelected = formData.skills.includes(sk);
                    return (
                      <button
                        type="button"
                        key={sk}
                        onClick={() => toggleSkill(sk)}
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

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Créer l'agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Calendar from Agent Config Modal */}
      {isGenCalendarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gray-950 dark:text-white mb-1">
              Calendrier Éditorial depuis "{selectedAgent?.name}"
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              La configuration de l’agent (domaine, ton, audience, objectifs) servira à bâtir une grille éditoriale cohérente.
            </p>

            <form onSubmit={handleGenerateCalendarFromAgent} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Page sociale cible *</label>
                <select
                  value={genCalendarPageId}
                  onChange={(e) => setGenCalendarPageId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                  required
                >
                  {genCalendarPages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.platform})
                    </option>
                  ))}
                  {genCalendarPages.length === 0 && (
                    <option disabled>
                      Aucune page disponible
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Fréquence de publication</label>
                <select
                  value={genCalendarFrequency}
                  onChange={(e) => setGenCalendarFrequency(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                >
                  <option value={3}>3 publications / semaine</option>
                  <option value={5}>5 publications / semaine</option>
                  <option value={7}>7 publications / semaine (1 par jour)</option>
                </select>
              </div>

              <div className="p-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-100 text-brand-900 dark:text-brand-100 rounded-xl text-[11px] leading-relaxed">
                ✨ Les créneaux générés reprendront le domaine d’activité, le ton rédactionnel et les objectifs définis pour cet agent. Chaque publication sera soumise à votre validation avant mise en ligne.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsGenCalendarOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingCalendar}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center space-x-1.5"
                >
                  {isGeneratingCalendar ? (
                    <Sparkles className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isGeneratingCalendar ? 'Génération…' : 'Lancer la génération'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
