import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  Layers,
  Check,
} from 'lucide-react';

export const BillingView: React.FC = () => {
  const { user, plan, subscription, usage, refreshMe } = useAuth();
  const { t } = useI18n();

  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<any | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/billing/plans')
      .then((r) => r.json())
      .then(setPlans)
      .catch(console.error);
  }, []);

  const handleSimulateCheckout = async () => {
    if (!selectedPlanToUpgrade) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: selectedPlanToUpgrade.id,
          paymentMethod: 'Visa Sandbox (**** 4242)',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCheckoutModalOpen(false);
        setFeedback(`Félicitations ! Vous êtes maintenant sur le ${selectedPlanToUpgrade.name}.`);
        setTimeout(() => setFeedback(null), 5000);
        refreshMe();
      }
    } catch (e: any) {
      setFeedback(e.message || 'Erreur lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trial days remaining
  let trialDaysLeft = 0;
  if (subscription?.trialEndsAt) {
    const diffMs = new Date(subscription.trialEndsAt).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diffMs / 86400000));
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center space-x-2.5">
          <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span>Abonnements & Gestion des Quotas</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Gérez votre forfait, surveillez vos plafonds d'agents et de publications, et faites évoluer votre formule à tout moment.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Current Active Plan Card */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              <span>Forfait Actif</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">{plan?.name || 'Pack Pro'}</h2>
            <p className="text-blue-100 text-xs max-w-xl mt-1">
              {plan?.description}
            </p>

            {subscription?.status === 'trialing' && (
              <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1 bg-amber-400 text-amber-950 font-bold text-xs rounded-full">
                <Clock className="w-3.5 h-3.5" />
                <span>Période d'essai en cours : {trialDaysLeft} jours restants</span>
              </div>
            )}
          </div>

          <div className="text-right flex flex-col items-start md:items-end">
            <div className="text-3xl sm:text-4xl font-black">
              {plan?.price === 0 ? '0 €' : `${plan?.price || 79} €`}
              <span className="text-sm font-medium text-blue-200"> /mois</span>
            </div>
            <span className="text-xs text-blue-200 mt-0.5">
              Renouvellement : {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'Actif'}
            </span>
          </div>
        </div>

        {/* Quota Usage Meters */}
        <div className="mt-8 pt-6 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <span className="text-[11px] text-blue-200 font-semibold block mb-1">
              Agents IA autorisés
            </span>
            <div className="text-xl font-black">
              2 / {plan?.maxAgents === -1 ? 'Illimités' : plan?.maxAgents || 3}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <span className="text-[11px] text-blue-200 font-semibold block mb-1">
              Publications hebdomadaires
            </span>
            <div className="text-xl font-black">
              {usage?.postsCreatedCount || 4} / {plan?.maxPostsPerWeek === -1 ? 'Sans plafond' : plan?.maxPostsPerWeek || 21}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <span className="text-[11px] text-blue-200 font-semibold block mb-1">
              Jetons d'IA consommés
            </span>
            <div className="text-xl font-black">
              {usage?.aiTokensUsed?.toLocaleString() || '42,150'} / {plan?.aiTokenMonthlyQuota?.toLocaleString() || '300,000'}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-950 dark:text-white mb-2">
          Comparer et Changer de Forfait
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Tous nos forfaits incluent la règle stricte de validation humaine obligatoire avant publication.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => {
            const isCurrent = p.id === plan?.id;

            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-zinc-900 border rounded-3xl p-6 shadow-sm flex flex-col justify-between transition ${
                  isCurrent
                    ? 'border-blue-600 ring-2 ring-blue-500/20'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-gray-950 dark:text-white">
                      {p.name}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Actuel
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-black text-gray-950 dark:text-white mb-2">
                    {p.price === 0 ? 'Gratuit' : `${p.price} €`}
                    {p.price > 0 && <span className="text-xs text-gray-500 font-normal"> /mois</span>}
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    {p.description}
                  </p>

                  <div className="space-y-2 text-xs border-t border-gray-100 dark:border-zinc-800 pt-3">
                    <div className="flex items-center space-x-2 text-gray-700 dark:text-zinc-300">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>{p.maxAgents === -1 ? 'Agents illimités' : `${p.maxAgents} Agent(s) IA`}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-700 dark:text-zinc-300">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>{p.maxPagesPerAgent === -1 ? 'Pages illimitées' : `${p.maxPagesPerAgent} page(s) par agent`}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-700 dark:text-zinc-300">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>{p.maxPostsPerWeek === -1 ? 'Publications sans plafond' : `${p.maxPostsPerWeek} posts / semaine`}</span>
                    </div>
                    {p.canEditVisualPrompt && (
                      <div className="flex items-center space-x-2 text-gray-700 dark:text-zinc-300">
                        <Check className="w-4 h-4 text-purple-500" />
                        <span>Modification des prompts visuels</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-400 font-bold text-xs rounded-xl"
                    >
                      Forfait Actif
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedPlanToUpgrade(p);
                        setIsCheckoutModalOpen(true);
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Choisir {p.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Checkout Modal */}
      {isCheckoutModalOpen && selectedPlanToUpgrade && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-950 dark:text-white">
              Confirmation de Souscription
            </h3>
            <p className="text-xs text-gray-500">
              Passage au <strong>{selectedPlanToUpgrade.name}</strong> pour <strong>{selectedPlanToUpgrade.price} € / mois</strong>.
            </p>

            <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border text-xs space-y-2">
              <div className="flex justify-between">
                <span>Moyen de paiement :</span>
                <span className="font-semibold">Carte bancaire (Mode Sandbox)</span>
              </div>
              <div className="flex justify-between">
                <span>Facturation :</span>
                <span className="font-semibold">Mensuelle avec reconduction</span>
              </div>
              <div className="flex justify-between text-blue-600 dark:text-blue-400 font-bold pt-2 border-t">
                <span>Total à régler :</span>
                <span>{selectedPlanToUpgrade.price} € TTC</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="px-4 py-2 border rounded-xl font-semibold text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSimulateCheckout}
                disabled={isProcessing}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {isProcessing ? 'Validation...' : 'Confirmer l’abonnement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
