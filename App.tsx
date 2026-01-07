
import React, { useContext, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { PastQuestionsPage } from './pages/PastQuestionsPage';
import { ExecutivesPage } from './pages/ExecutivesPage';
import { LecturersPage } from './pages/LecturersPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './components/AdminLayout';
import { AdminPage } from './pages/AdminPage';
import { AdminApprovalsPage } from './pages/AdminApprovalsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminActiveUsersPage } from './pages/AdminActiveUsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { CommunityPage } from './pages/CommunityPage';
import { GalleryPage } from './pages/GalleryPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { TestPage } from './pages/TestPage'; 
import { LostFoundPage } from './pages/LostFoundPage';
import { FAQPage } from './pages/FAQPage';
import { NotesPage } from './pages/NotesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { UploadPage } from './pages/UploadPage';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { CountdownPage } from './pages/CountdownPage';
import ScrollToTop from './components/ScrollToTop';
import { NotificationHandler } from './components/NotificationHandler';

// NEW: Import new pages
import { AdminMaterialsPage } from './pages/AdminMaterialsPage';
import { AdminNewsPage } from './pages/AdminNewsPage';
import { AdminExecutivesPage } from './pages/AdminExecutivesPage';
import { AdminLecturersPage } from './pages/AdminLecturersPage';
import { AdminCommunityPage } from './pages/AdminCommunityPage';
import { AdminGalleryPage } from './pages/AdminGalleryPage';
import { ArcadePage } from './pages/ArcadePage';
import { MarketplacePage } from './pages/MarketplacePage';
import { NotificationsPage } from './pages/NotificationsPage';

// Target launch date: Jan 10, 2026, 12:00 PM West Africa Time (UTC+1)
const LAUNCH_DATE = new Date('2026-01-10T12:00:00+01:00');

const RequireAuth = ({ children, adminOnly = false }: { children?: React.ReactNode, adminOnly?: boolean }) => {
    const auth = useContext(AuthContext);
    
    if (auth?.loading) {
        return null; 
    }

    if (!auth?.user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !['admin', 'librarian', 'vice_president', 'supplement'].includes(auth.user.role)) {
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
  return (
    <>
        <ScrollToTop />
        <NotificationHandler />
        <Routes>
            {/* The special /cdq bypass is now handled by the main App component logic */}
            
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Main App Routes */}
            <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/lost-and-found" element={<LostFoundPage />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={<RequireAuth><UserDashboardPage /></RequireAuth>} />
                <Route path="/questions" element={<RequireAuth><PastQuestionsPage /></RequireAuth>} />
                <Route path="/community" element={<RequireAuth><CommunityPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/test" element={<RequireAuth><TestPage /></RequireAuth>} />
                <Route path="/notes" element={<RequireAuth><NotesPage /></RequireAuth>} />
                <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
                <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
                <Route path="/marketplace" element={<RequireAuth><MarketplacePage /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />

                
                {/* Gated Public-ish Pages */}
                <Route path="/executives" element={<RequireAuth><ExecutivesPage /></RequireAuth>} />
                <Route path="/lecturers" element={<RequireAuth><LecturersPage /></RequireAuth>} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminPage />} />
                <Route path="approvals" element={<AdminApprovalsPage />} />
                <Route path="materials" element={<AdminMaterialsPage />} />
                <Route path="news" element={<AdminNewsPage />} />
                <Route path="executives" element={<AdminExecutivesPage />} />
                <Route path="lecturers" element={<AdminLecturersPage />} />
                <Route path="community" element={<AdminCommunityPage />} />
                <Route path="gallery" element={<AdminGalleryPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="active-users" element={<AdminActiveUsersPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </>
  );
};

const App: React.FC = () => {
  const isBeforeLaunch = new Date() < LAUNCH_DATE;
  const location = useLocation();
  const navigate = useNavigate();

  // This effect detects the bypass key, sets a session flag,
  // and then cleans the URL to prevent refresh issues and loops.
  useEffect(() => {
    if (location.pathname.includes('/cdq')) {
      sessionStorage.setItem('FINSA_LAUNCH_BYPASS', 'true');
      // Replace '/cdq' with nothing and redirect. If the path was just '/cdq', it becomes '/'.
      const newPath = location.pathname.replace(/\/cdq/g, '') || '/';
      navigate(newPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  const isBypassActive = sessionStorage.getItem('FINSA_LAUNCH_BYPASS') === 'true';

  // If it's before launch AND the bypass is NOT active, show the countdown.
  if (isBeforeLaunch && !isBypassActive) {
    return (
      <ThemeProvider>
        <CountdownPage />
      </ThemeProvider>
    );
  }

  // Otherwise, render the full application.
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
