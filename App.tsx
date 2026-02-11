
import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { PastQuestionsPage } from './pages/PastQuestionsPage';
import { ExecutivesPage } from './pages/ExecutivesPage';
import { LecturersPage } from './pages/LecturersPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
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
import { SettingsProvider } from './contexts/SettingsContext';
import { Layout } from './components/Layout';
import { CountdownPage } from './pages/CountdownPage';
import ScrollToTop from './components/ScrollToTop';
import { NotificationHandler } from './components/NotificationHandler';
import { SEOMetadataUpdater } from './components/SEOMetadataUpdater';

import { AdminMaterialsPage } from './pages/AdminMaterialsPage';
import { AdminNewsPage } from './pages/AdminNewsPage';
import { AdminExecutivesPage } from './pages/AdminExecutivesPage';
import { AdminLecturersPage } from './pages/AdminLecturersPage';
import { AdminCommunityPage } from './pages/AdminCommunityPage';
import { AdminGalleryPage } from './pages/AdminGalleryPage';
import { ArcadePage } from './pages/ArcadePage';
import { MarketplacePage } from './pages/MarketplacePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SessionWrapPage } from './pages/SessionWrapPage';
import { DownloadAppPage } from './pages/DownloadAppPage';
import { InputPage } from './pages/InputPage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const LAUNCH_DATE = new Date('2026-01-10T12:00:00+01:00');

const RequireAuth = ({ children, adminOnly = false }: { children?: React.ReactNode, adminOnly?: boolean }) => {
    const auth = useContext(AuthContext);
    if (auth?.loading) return null; 
    if (!auth?.user) return <Navigate to="/login" replace />;

    if (adminOnly && !['admin', 'librarian', 'vice_president', 'supplement'].includes(auth.user.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
};

const AppContent: React.FC = () => {
  const auth = useContext(AuthContext);
  const [sessionWrapInfo, setSessionWrapInfo] = useState<{ start: string; end: string; session: string } | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      if (!auth?.user) { setCheckingSession(false); return; }
      try {
        const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          const { lastSessionEndTimestamp, secondToLastSessionEndTimestamp, session } = settings;
          if (lastSessionEndTimestamp) {
            const lastWrapViewed = auth.user.viewedSessionWrapTimestamp ? new Date(auth.user.viewedSessionWrapTimestamp).getTime() : 0;
            const sessionEndedTime = new Date(lastSessionEndTimestamp).getTime();
            if (sessionEndedTime > lastWrapViewed) {
              setSessionWrapInfo({
                start: secondToLastSessionEndTimestamp || new Date('2026-01-10T12:00:00+01:00').toISOString(),
                end: lastSessionEndTimestamp,
                session: session || '2025/2026',
              });
            }
          }
        }
      } catch (e) { console.error(e); } finally { setCheckingSession(false); }
    };
    checkSession();
  }, [auth?.user]);

  if (checkingSession) return <div className="h-screen w-screen bg-slate-950"></div>;
  if (sessionWrapInfo) return <SessionWrapPage info={sessionWrapInfo} onFinish={() => setSessionWrapInfo(null)} />;
  
  return (
    <>
        <ScrollToTop />
        <NotificationHandler />
        <SEOMetadataUpdater />
        <Routes>
            <Route path="/login" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/input" element={<RequireAuth><InputPage /></RequireAuth>} />

            <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/lost-and-found" element={<LostFoundPage />} />
                <Route path="/download-app" element={<DownloadAppPage />} />
                
                <Route path="/dashboard" element={<RequireAuth><UserDashboardPage /></RequireAuth>} />
                <Route path="/questions" element={<RequireAuth><PastQuestionsPage /></RequireAuth>} />
                <Route path="/community" element={<RequireAuth><CommunityPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/test" element={<RequireAuth><TestPage /></RequireAuth>} />
                <Route path="/arcade" element={<RequireAuth><ArcadePage /></RequireAuth>} />
                <Route path="/notes" element={<RequireAuth><NotesPage /></RequireAuth>} />
                <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
                <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
                <Route path="/marketplace" element={<RequireAuth><MarketplacePage /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                <Route path="/executives" element={<RequireAuth><ExecutivesPage /></RequireAuth>} />
                <Route path="/lecturers" element={<RequireAuth><LecturersPage /></RequireAuth>} />
            </Route>

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
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </>
  );
};

const App: React.FC = () => {
  const isBeforeLaunch = new Date() < LAUNCH_DATE;
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname.includes('/cdq')) {
      sessionStorage.setItem('FINSA_LAUNCH_BYPASS', 'true');
      const newPath = location.pathname.replace(/\/cdq/g, '') || '/';
      navigate(newPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  const isBypassActive = sessionStorage.getItem('FINSA_LAUNCH_BYPASS') === 'true';

  if (isBeforeLaunch && !isBypassActive) {
    return <ThemeProvider><CountdownPage /></ThemeProvider>;
  }

  return (
    <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <SettingsProvider>
              <AppContent />
            </SettingsProvider>
          </AuthProvider>
        </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
