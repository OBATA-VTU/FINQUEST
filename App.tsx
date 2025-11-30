
import React, { useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { PastQuestionsPage } from './pages/PastQuestionsPage';
import { ExecutivesPage } from './pages/ExecutivesPage';
import { LecturersPage } from './pages/LecturersPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './components/AdminLayout'; // New Layout
import { AdminPage } from './pages/AdminPage'; // Dashboard
import { AdminApprovalsPage } from './pages/AdminApprovalsPage';
import { AdminContentPage } from './pages/AdminContentPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { CommunityPage } from './pages/CommunityPage';
import { GalleryPage } from './pages/GalleryPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { TestPage } from './pages/TestPage'; // New Page
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Logo } from './components/Logo';
import { Layout } from './components/Layout';
import ScrollToTop from './components/ScrollToTop';

// Professional Splash Screen
const LoadingScreen = () => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-900 transition-opacity duration-500">
      <div className="relative mb-8">
          <Logo className="h-32 w-32 animate-pulse" />
          <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
      </div>
      <h1 className="text-3xl font-serif font-bold text-indigo-900 dark:text-indigo-100 tracking-wider mb-2">FINQUEST</h1>
      <p className="text-xs text-indigo-400 uppercase tracking-[0.3em] font-medium mb-8">Official Department Portal</p>
      
      <div className="flex gap-2">
        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce animation-delay-2000" style={{ animationDelay: '0.15s' }}></div>
        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce animation-delay-4000" style={{ animationDelay: '0.3s' }}></div>
      </div>
  </div>
);

// Protected Route Wrapper
const RequireAuth = ({ children, adminOnly = false }: { children?: React.ReactNode, adminOnly?: boolean }) => {
    const auth = useContext(AuthContext);
    
    if (!auth?.user) {
        if (auth?.loading) return null; 
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && auth.user.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 bg-slate-50 dark:bg-slate-900">
                <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full mb-6">
                    <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-slate-100 mb-4">Restricted Access</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">You do not have the necessary administrative privileges to view this page.</p>
                <a href="/dashboard" className="px-8 py-3 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition shadow-lg font-medium">Return to Dashboard</a>
            </div>
        );
    }

    return <>{children}</>;
};

const AppContent: React.FC = () => {
  const auth = useContext(AuthContext);

  if (auth?.loading) {
      return <LoadingScreen />;
  }

  return (
    <>
        <ScrollToTop />
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Main App Routes */}
            <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                
                {/* Protected Routes (Authenticated Users Only) */}
                <Route path="/dashboard" element={<RequireAuth><UserDashboardPage /></RequireAuth>} />
                <Route path="/questions" element={<RequireAuth><PastQuestionsPage /></RequireAuth>} />
                <Route path="/community" element={<RequireAuth><CommunityPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/test" element={<RequireAuth><TestPage /></RequireAuth>} />
                
                {/* Gated Public-ish Pages (Hidden from Guests) */}
                <Route path="/executives" element={<RequireAuth><ExecutivesPage /></RequireAuth>} />
                <Route path="/lecturers" element={<RequireAuth><LecturersPage /></RequireAuth>} />
            </Route>

            {/* Admin Routes - Nested Layout */}
            <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminPage />} />
                <Route path="approvals" element={<AdminApprovalsPage />} />
                <Route path="content" element={<AdminContentPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;