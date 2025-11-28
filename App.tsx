
import React, { useState } from 'react';
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
import { AuthProvider } from './contexts/AuthContext';
import { Page } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

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
        return <AdminPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        <Header currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-grow">
          {renderPage()}
        </main>
        <Footer onNavigate={setCurrentPage}/>
      </div>
    </AuthProvider>
  );
};

export default App;
