import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthPage } from './pages/AuthPage';
import { SurveyPage } from './pages/SurveyPage';
import { SearchPage } from './pages/SearchPage';
import { MatchesPage } from './pages/MatchesPage';
import { ChatPage } from './pages/ChatPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPropertiesPage } from './pages/AdminPropertiesPage';
import { Navbar } from './components/Navbar';
import { NotificationToast } from './components/NotificationToast';
import { supabase } from './lib/supabase';

type AppPage = 'auth' | 'survey' | 'search' | 'matches' | 'chat' | 'dashboard' | 'admin-properties';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<AppPage>('auth');
  const [hasPreferences, setHasPreferences] = useState(false);
  const [checkingPreferences, setCheckingPreferences] = useState(true);

  useEffect(() => {
    if (user) {
      checkUserPreferences();
    } else {
      setCurrentPage('auth');
      setCheckingPreferences(false);
    }
  }, [user]);

  const checkUserPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    setHasPreferences(!!data);
    setCheckingPreferences(false);

    if (!data) {
      setCurrentPage('survey');
    } else {
      setCurrentPage('search');
    }
  };

  const handleAuthSuccess = () => {
    setCurrentPage('survey');
  };

  const handleSurveyComplete = () => {
    setHasPreferences(true);
    setCurrentPage('search');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as AppPage);
  };

  if (loading || checkingPreferences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  if (!hasPreferences && currentPage === 'survey') {
    return <SurveyPage onComplete={handleSurveyComplete} />;
  }

  return (
    <>
      <Navbar activePage={currentPage} onNavigate={handleNavigate} />
      {currentPage === 'search' && <SearchPage />}
      {currentPage === 'matches' && <MatchesPage />}
      {currentPage === 'chat' && <ChatPage />}
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'admin-properties' && <AdminPropertiesPage />}
      <NotificationToast />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
