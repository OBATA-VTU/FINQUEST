
import React, { useState, useContext } from 'react';
import { Header } from './components/Header';
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

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const auth = useContext(AuthContext);

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
      case 'login':
        return <LoginPage onLoginSuccess={() => setCurrentPage('home')} />;
      case 'admin':
        // Protected Admin Route
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-grow">
        {renderPage()}
      </main>
      <Footer onNavigate={setCurrentPage}/>
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
