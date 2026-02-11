import React, { useContext, useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

// Synchronous Import for the Landing Page to ensure "Immediate First Load"
import { HomePage } from './pages/HomePage';

// Lazy Loaded Pages
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
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const LostFoundPage = lazy(() => import('./pages/LostFoundPage').then(m => ({ default: m.LostFoundPage })));
const FAQPage = lazy(() => import('./pages/FAQPage').then(m => ({ default: m.FAQPage })));
const DownloadAppPage = lazy(() => import('./pages/DownloadAppPage').then(m => ({ default: m.DownloadAppPage })));

const PageLoader = () => (
    <div className="h-[60vh] w-full flex flex-col items-center justify-center bg-transparent animate-fade-in">
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-indigo-500 animate-pulse">
            loading page please wait...
        </p>
    </div>
);

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
    <>
        <ScrollToTop />
        <NotificationHandler />
        <SEOMetadataUpdater />
        <Routes>
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><SignInPage /></Suspense>} />
            <Route path="/signup" element={<Suspense fallback={<PageLoader />}><SignUpPage /></Suspense>} />
            <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/announcements" element={<Suspense fallback={<PageLoader />}><AnnouncementsPage /></Suspense>} />
                <Route path="/gallery" element={<Suspense fallback={<PageLoader />}><GalleryPage /></Suspense>} />
                <Route path="/faq" element={<Suspense fallback={<PageLoader />}><FAQPage /></Suspense>} />
                <Route path="/download-app" element={<Suspense fallback={<PageLoader />}><DownloadAppPage /></Suspense>} />
                <Route path="/lost-and-found" element={<Suspense fallback={<PageLoader />}><LostFoundPage /></Suspense>} />
                
                {/* Authenticated Routes */}
                <Route path="/dashboard" element={<RequireAuth><Suspense fallback={<PageLoader />}><UserDashboardPage /></Suspense></RequireAuth>} />
                <Route path="/questions" element={<RequireAuth><Suspense fallback={<PageLoader />}><PastQuestionsPage /></Suspense></RequireAuth>} />
                <Route path="/community" element={<RequireAuth><Suspense fallback={<PageLoader />}><CommunityPage /></Suspense></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></RequireAuth>} />
                <Route path="/test" element={<RequireAuth><Suspense fallback={<PageLoader />}><TestPage /></Suspense></RequireAuth>} />
                <Route path="/arcade" element={<RequireAuth><Suspense fallback={<PageLoader />}><ArcadePage /></Suspense></RequireAuth>} />
                <Route path="/notes" element={<RequireAuth><Suspense fallback={<PageLoader />}><NotesPage /></Suspense></RequireAuth>} />
                <Route path="/upload" element={<RequireAuth><Suspense fallback={<PageLoader />}><UploadPage /></Suspense></RequireAuth>} />
                <Route path="/marketplace" element={<RequireAuth><Suspense fallback={<PageLoader />}><MarketplacePage /></Suspense></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense></RequireAuth>} />
                <Route path="/executives" element={<RequireAuth><Suspense fallback={<PageLoader />}><ExecutivesPage /></Suspense></RequireAuth>} />
                <Route path="/lecturers" element={<RequireAuth><Suspense fallback={<PageLoader />}><LecturersPage /></Suspense></RequireAuth>} />
                <Route path="/leaderboard" element={<RequireAuth><Suspense fallback={<PageLoader />}><LeaderboardPage /></Suspense></RequireAuth>} />
            </Route>
            <Route path="/admin/*" element={<RequireAuth adminOnly><Suspense fallback={<PageLoader />}><AdminLayout /></Suspense></RequireAuth>}>
                <Route path="dashboard" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </>
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