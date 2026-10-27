import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Views
import { DashboardView } from './views/DashboardView';
import { AgentsView } from './views/AgentsView';
import { SocialConnectView } from './views/SocialConnectView';
import { CalendarView } from './views/CalendarView';
import { PostsView } from './views/PostsView';
import { BrandInspirationView } from './views/BrandInspirationView';
import { IntelligenceView } from './views/IntelligenceView';
import { PerformanceView } from './views/PerformanceView';
import { BillingView } from './views/BillingView';
import { SupportView } from './views/SupportView';
import { AdminView } from './views/AdminView';
import { AuthModal } from './views/AuthModal';
import { NotificationsModal } from './views/NotificationsModal';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedPostIdForDetail, setSelectedPostIdForDetail] = useState<string | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  // Gérer l'affichage de la modale en fonction de l'authentification
  useEffect(() => {
    if (user) {
      setIsAuthModalOpen(false);
      // Rediriger l'administrateur vers la console admin dès la connexion
      if (user?.role === 'superadmin') {
        setCurrentView('admin');
      } else {
        setCurrentView('dashboard');
      }
    } else {
      setIsAuthModalOpen(true);
      setCurrentView('dashboard');
    }
  }, [user]);

  const navigateToPost = (postId: string) => {
    setSelectedPostIdForDetail(postId);
    setCurrentView('posts');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            setCurrentView={setCurrentView}
            onSelectPostToReview={navigateToPost}
          />
        );
      case 'agents':
        return <AgentsView />;
      case 'connections':
        return <SocialConnectView />;
      case 'calendar':
        return (
          <CalendarView
            setCurrentView={setCurrentView}
            onOpenPostDetail={navigateToPost}
          />
        );
      case 'posts':
        return <PostsView initialPostId={selectedPostIdForDetail} />;
      case 'inspiration':
        return <BrandInspirationView />;
      case 'intelligence':
        return <IntelligenceView />;
      case 'analytics':
        return <PerformanceView />;
      case 'billing':
        return <BillingView />;
      case 'support':
        return <SupportView />;
      case 'admin':
        return user?.role === 'superadmin' ? <AdminView /> : <DashboardView setCurrentView={setCurrentView} />;
      default:
        return <DashboardView setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-brand selection:text-white">
      {/* On masque navbar et sidebar tant que non connecté */}
      {user && (
        <>
          <Navbar
            currentView={currentView}
            setCurrentView={setCurrentView}
            onOpenNotifications={() => setIsNotificationsModalOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />

          <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

            <main className="flex-1 min-w-0 pb-12">
              {renderView()}
            </main>
          </div>

          <NotificationsModal
            isOpen={isNotificationsModalOpen}
            onClose={() => setIsNotificationsModalOpen(false)}
            onNavigate={(view) => setCurrentView(view)}
          />
        </>
      )}

      {/* Auth Modal - toujours ouverte tant que non connecté */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          // Empêcher la fermeture si aucun utilisateur connecté
          if (user) {
            setIsAuthModalOpen(false);
          }
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
