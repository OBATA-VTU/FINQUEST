import React, { useContext, useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { Layout } from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import { NotificationHandler } from './components/NotificationHandler';
import { SEOMetadataUpdater } from './components/SEOMetadataUpdater';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Lazy Loaded Pages for performance
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage').then(m => ({ default: m.UserDashboardPage })));
const PastQuestionsPage = lazy(() => import('./pages/PastQuestionsPage').then(m => ({ default: m.PastQuestionsPage })));
const ExecutivesPage = lazy(() => import('./pages/ExecutivesPage').then(m => ({ default: m.ExecutivesPage })));
const LecturersPage = lazy(() => import('./pages/LecturersPage').then(m => ({ default: m.LecturersPage })));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })));
const SignInPage = lazy(() => import('./pages/SignInPage').then(m => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import('./pages/SignUpPage').then(m => ({ default: m.SignUpPage })));
const AdminLayout = lazy(() => import('./components/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then(m => ({ default: m.CommunityPage })));
const GalleryPage = lazy(() => import('./pages/GalleryPage').then(m => ({ default: m.GalleryPage })));
const TestPage = lazy(() => import('./pages/TestPage').then(m => ({ default: m.TestPage }))); 
const NotesPage = lazy(() => import('./pages/NotesPage').then(m => ({ default: m.NotesPage })));
const UploadPage = lazy(() => import('./pages/UploadPage').then(m => ({ default: m.UploadPage })));
const ArcadePage = lazy(() => import('./pages/ArcadePage').then(m => ({ default: m.ArcadePage })));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const SessionWrapPage = lazy(() => import('./pages/SessionWrapPage').then(m => ({ default: m.SessionWrapPage })));

const PageLoader = () => (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-emerald-400 font-bold tracking-widest text-xs uppercase animate-pulse">Initializing Portal...</div>
    </div>
);

const LAUNCH_DATE = new Date('2026-01-10T12:00:00+01:00');

const RequireAuth = ({ children, adminOnly = false }: { children?: React.ReactNode, adminOnly?: boolean }) => {
    const auth = useContext(AuthContext);
    if (auth?.loading) return <PageLoader />; 
    if (!auth?.user) return <Navigate to="/login" replace />;
    if (adminOnly && !['admin', 'librarian', 'vice_president', 'supplement'].includes(auth.user.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
};

const AppContent: React.FC = () => {
  const auth = useContext(AuthContext);
  const [sessionWrapInfo, setSessionWrapInfo] = useState<{ start: string; end: string; session: string } | null>(null);

  useEffect(() => {
    if (!auth?.user?.id) return;
    const checkSession = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'content', 'site_settings'));
        if (settingsDoc.exists()) {
          const { lastSessionEndTimestamp, secondToLastSessionEndTimestamp, session } = settingsDoc.data();
          const lastWrapViewed = auth.user.viewedSessionWrapTimestamp ? new Date(auth.user.viewedSessionWrapTimestamp).getTime() : 0;
          if (lastSessionEndTimestamp && new Date(lastSessionEndTimestamp).getTime() > lastWrapViewed) {
              setSessionWrapInfo({
                start: secondToLastSessionEndTimestamp || new Date('2026-01-10T12:00:00+01:00').toISOString(),
                end: lastSessionEndTimestamp,
                session: session || '2025/2026',
              });
          }
        }
      } catch (e) {}
    };
    checkSession();
  }, [auth?.user?.id]);

  if (sessionWrapInfo) return <Suspense fallback={<PageLoader />}><SessionWrapPage info={sessionWrapInfo} onFinish={() => setSessionWrapInfo(null)} /></Suspense>;
  
  return (
    <Suspense fallback={<PageLoader />}>
        <ScrollToTop />
        <NotificationHandler />
        <SEOMetadataUpdater />
        <Routes>
            <Route path="/login" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/dashboard" element={<RequireAuth><UserDashboardPage /></RequireAuth>} />
                <Route path="/questions" element={<RequireAuth><PastQuestionsPage /></RequireAuth>} />
                <Route path="/community" element={<RequireAuth><CommunityPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/test" element={<RequireAuth><TestPage /></RequireAuth>} />
                <Route path="/arcade" element={<RequireAuth><ArcadePage /></RequireAuth>} />
                <Route path="/notes" element={<RequireAuth><NotesPage /></RequireAuth>} />
                <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
                <Route path="/marketplace" element={<RequireAuth><MarketplacePage /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                <Route path="/executives" element={<RequireAuth><ExecutivesPage /></RequireAuth>} />
                <Route path="/lecturers" element={<RequireAuth><LecturersPage /></RequireAuth>} />
            </Route>
            <Route path="/admin/*" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
                <Route path="dashboard" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  const isBeforeLaunch = new Date() < LAUNCH_DATE;
  const isBypassActive = sessionStorage.getItem('FINSA_LAUNCH_BYPASS') === 'true';

  if (isBeforeLaunch && !isBypassActive) {
    return <ThemeProvider><HomePage /></ThemeProvider>; 
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