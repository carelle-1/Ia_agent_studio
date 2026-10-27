import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  MessageSquare,
  Send,
  User as UserIcon,
  ShieldCheck,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';

export const SupportView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isNewConvOpen, setIsNewConvOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newInitialMsg, setNewInitialMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;
      const res = await fetch('/api/support/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (!activeConv && data.length > 0) {
          selectConversation(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectConversation = async (conv: any) => {
    setActiveConv(conv);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/support/conversations/${conv.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      if (activeConv) {
        selectConversation(activeConv);
      }
    }, 6000); // 6s polling for messages
    return () => clearInterval(interval);
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConv) return;
    setIsSending(true);
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch(`/api/support/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: messageText }),
      });
      if (res.ok) {
        setMessageText('');
        selectConversation(activeConv);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('metacolab_token');
      const res = await fetch('/api/support/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: newSubject,
          initialMessage: newInitialMsg,
        }),
      });
      if (res.ok) {
        setIsNewConvOpen(false);
        setNewSubject('');
        setNewInitialMsg('');
        fetchConversations();
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
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center space-x-2.5">
            <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Messagerie Support & Assistance Technique</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Échangez directement avec l’équipe technique et les administrateurs de Meta Colab.
          </p>
        </div>

        <button
          onClick={() => setIsNewConvOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Conversation</span>
        </button>
      </div>

      {/* Main Split Chat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm min-h-[580px]">
        {/* Left Side: Conversations List */}
        <div className="md:col-span-4 border-r border-gray-200 dark:border-zinc-800 p-4 space-y-2 max-h-[580px] overflow-y-auto">
          <div className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">
            Discussions actives ({conversations.length})
          </div>

          {conversations.map((c) => {
            const isSelected = activeConv?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => selectConversation(c)}
                className={`p-3.5 rounded-2xl cursor-pointer transition ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-zinc-800 border-blue-500 border'
                    : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-gray-950 dark:text-white truncate">
                    {c.subject}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">
                  {c.lastMessage || 'Nouvelle conversation...'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Side: Message Thread & Input */}
        <div className="md:col-span-8 flex flex-col justify-between h-[580px]">
          {activeConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-950 dark:text-white">
                    {activeConv.subject}
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Statut : {activeConv.status === 'open' ? 'Ouvert' : 'En attente de réponse'}
                  </span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
                {messages.map((m) => {
                  const isAdmin = m.senderRole === 'admin';
                  const isMe = user?.role === 'superadmin' ? isAdmin : !isAdmin;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-gray-400">
                        <span>{isAdmin ? 'Support Meta Colab' : user?.firstName}</span>
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-md p-3.5 rounded-2xl leading-relaxed ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-tl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Send Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-zinc-800 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Écrivez votre message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border rounded-xl text-xs text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isSending || !messageText.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
              Sélectionnez une discussion à gauche pour afficher les messages.
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {isNewConvOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gray-950 dark:text-white mb-1">
              Contacter le Support Meta Colab
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Posez votre question concernant les autorisations Meta, vos quotas ou la configuration des agents.
            </p>

            <form onSubmit={handleCreateConversation} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">Objet de la demande *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Configuration du token Instagram Pro"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Votre message initial *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Expliquez votre question ou difficulté..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewConvOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
