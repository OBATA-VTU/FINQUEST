import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { pathname } = useLocation();
    
    // NOTE: The scroll-to-top logic has been moved to a dedicated <ScrollToTop /> component
    // in App.tsx for better reliability across all routes, including those outside the Layout.

    // Intelligent Footer Logic
    // We strictly define pages where the footer IS expected (Public/Info pages)
    // It will be hidden on Dashboard, Profile, Test, Chat, Admin, etc to give a native app feel
    const showFooterPages = ['/', '/announcements', '/gallery', '/lecturers', '/executives', '/privacy', '/terms'];
    
    // Check if current path matches exact public pages or is NOT a dashboard/app route
    // Remove trailing slash for consistent matching
    const currentPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
    const showFooter = showFooterPages.includes(currentPath);

    // AI and Community pages handle their own scrolling to keep input bars anchored
    const isFixedLayout = ['/community', '/ai'].includes(pathname);

    return (
        <div className="h-screen bg-slate-50 text-slate-800 flex font-sans overflow-hidden">
            {/* Sidebar for Desktop & Mobile */}
            <Sidebar 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            
            <div className="flex-1 min-w-0 flex flex-col h-full">
                {/* Header for Mobile (Triggers Sidebar) */}
                <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
                
                {/* Main Content with Fade Animation */}
                <main 
                    id="main-content"
                    className={`flex-1 relative z-0 animate-fade-in ${isFixedLayout ? 'overflow-hidden' : 'overflow-y-auto'}`}
                >
                    <div className={isFixedLayout ? 'h-full' : 'min-h-full flex flex-col'}>
                        <Outlet />
                        {showFooter && <Footer />}
                    </div>
                </main>
            </div>
        </div>
    );
};