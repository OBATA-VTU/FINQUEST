
import React, { useState, useContext, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { PastQuestionsPage } from './pages/PastQuestionsPage';
import { ExecutivesPage } from './pages/ExecutivesPage';
import { LecturersPage } from './pages/LecturersPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { CommunityPage } from './pages/CommunityPage';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Page } from './types';
import { Logo } from './components/Logo';

// Custom Loading Screen Component
const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 animate-fade-in">
      <div className="relative mb-6">
          <Logo className="h-24 w-24 animate-pulse" />
          <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-10 animate-ping"></div>
      </div>
      <h2 className="text-2xl font-bold text-indigo-900 tracking-widest mb-2">FINQUEST</h2>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce animation-delay-2000" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce animation-delay-4000" style={{ animationDelay: '0.2s' }}></div>
      </div>
  </div>
);

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const auth = useContext(AuthContext);

  // Auth Redirect Logic
  useEffect(() => {
    // If user attempts to access protected routes while logged out
    if (!auth?.loading && !auth?.user) {
        if (['questions', 'profile', 'admin', 'community'].includes(currentPage)) {
            setCurrentPage('login');
        }
    }
    // If logged in and on login page, redirect home
    if (!auth?.loading && auth?.user && currentPage === 'login') {
        setCurrentPage('home');
    }
    // Scroll to top on page change
    window.scrollTo(0, 0);
  }, [auth?.user, auth?.loading, currentPage]);

  if (auth?.loading) {
      return <LoadingScreen />;
  }

  // Login Page takes full screen (no sidebar)
  if (currentPage === 'login') {
      return <LoginPage onLoginSuccess={() => setCurrentPage('home')} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'questions':
        return <PastQuestionsPage />;
      case 'executives':
        return <ExecutivesPage />;
      case 'lecturers':
        return <LecturersPage />;
      case 'announcements':
        return <AnnouncementsPage />;
      case 'community':
        return <CommunityPage />;
      case 'admin':
        if (auth?.user?.role === 'admin') {
            return <AdminPage />;
        } else {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <div className="bg-red-100 p-4 rounded-full mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-600 mb-6">You do not have the necessary permissions to view this page.</p>
                    <button onClick={() => setCurrentPage('home')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Return Home</button>
                </div>
            );
        }
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      {/* Sidebar for Desktop & Mobile */}
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header for Mobile (Triggers Sidebar) */}
        <Header 
            currentPage={currentPage} 
            onNavigate={setCurrentPage} 
            onOpenSidebar={() => setIsSidebarOpen(true)}
        />
        
        {/* Main Content with Fade Animation */}
        <main className="flex-grow animate-fade-in">
            {renderPage()}
        </main>
        
        <Footer onNavigate={setCurrentPage}/>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;
