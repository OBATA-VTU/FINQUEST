import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
            {/* Sidebar for Desktop & Mobile */}
            <Sidebar 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Header for Mobile (Triggers Sidebar) */}
                <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
                
                {/* Main Content with Fade Animation */}
                <main className="flex-grow animate-fade-in relative z-0">
                    <Outlet />
                </main>
                
                <Footer />
            </div>
        </div>
    );
};