import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCheck, ExternalLink, Clock, AlertCircle } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      if (!token) return;
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('metacolab_token');
      await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      const token = localStorage.getItem('metacolab_token');
      await fetch(`/api/notifications/${notif.id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      // silent
    }

    onClose();
    if (notif.link?.includes('posts')) {
      onNavigate('posts');
    } else if (notif.link?.includes('calendar')) {
      onNavigate('calendar');
    } else if (notif.link?.includes('support')) {
      onNavigate('support');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800 mb-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-sm text-gray-950 dark:text-white">
              Centre de Notifications ({notifications.filter((n) => !n.read).length} non lues)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tout marquer comme lu</span>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold p-1">
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 text-xs">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                !n.read
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                  : 'bg-gray-50/50 dark:bg-zinc-800/40 border-gray-200/60 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                  <span>{n.title}</span>
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                {n.message}
              </p>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-xs">
              Aucune notification pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
