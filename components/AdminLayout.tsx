
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    const AdminNavItem = ({ to, label, icon }: { to: string, label: string, icon: React.ReactNode }) => (
        <NavLink 
            to={to} 
            onClick={closeMenu}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all mb-2 font-medium ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
        >
            {icon}
            <span className="text-sm tracking-wide">{label}</span>
        </NavLink>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
            
            {/* MOBILE HEADER */}
            <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-2">
                    <Logo className="h-8 w-8" />
                    <span className="font-serif font-bold text-indigo-900 text-lg">Admin Panel</span>
                </div>
                <button onClick={toggleMenu} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </div>

            {/* MOBILE DRAWER OVERLAY */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={closeMenu}></div>
            )}

            {/* SIDEBAR (Desktop Fixed / Mobile Drawer) */}
            <aside 
                className={`
                    fixed md:sticky top-0 left-0 h-[100dvh] w-72 bg-white border-r border-slate-200 z-50 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-8 border-b border-slate-100 flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-xl"><Logo className="h-8 w-8" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 font-serif leading-none">Admin</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Control Center</p>
                    </div>
                    {/* Close Button Mobile */}
                    <button onClick={closeMenu} className="md:hidden ml-auto text-slate-400 p-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <nav className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-4">Overview</div>
                    <AdminNavItem to="/admin/dashboard" label="Dashboard" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
                    <AdminNavItem to="/admin/approvals" label="Approvals" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 mt-8 px-4">Management</div>
                    <AdminNavItem to="/admin/content" label="CMS & Content" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>} />
                    <AdminNavItem to="/admin/users" label="Users & Roles" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
                    <AdminNavItem to="/admin/settings" label="Settings" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                </nav>

                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-indigo-700 shadow-sm">
                            {auth?.user?.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-sm text-slate-800 truncate">{auth?.user?.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Administrator</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="w-full py-2.5 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
                        Exit to App
                    </button>
                </div>
            </aside>

            {/* Page Content */}
            <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
                <Outlet />
            </main>
        </div>
    );
};
