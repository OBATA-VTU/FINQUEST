
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    const DesktopNavItem = ({ to, label, icon }: { to: string, label: string, icon: React.ReactNode }) => (
        <NavLink 
            to={to} 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all mb-2 font-medium ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
        >
            {icon}
            <span className="text-sm tracking-wide">{label}</span>
        </NavLink>
    );

    const MobileNavItem = ({ to, label, icon }: { to: string, label: string, icon: React.ReactNode }) => (
        <NavLink 
            to={to} 
            className={({ isActive }) => `flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
        >
            {icon}
            <span className="text-[10px] font-bold mt-1">{label}</span>
        </NavLink>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans pb-20 md:pb-0">
            
            {/* MOBILE TOP BAR */}
            <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-2">
                    <Logo className="h-8 w-8" />
                    <span className="font-serif font-bold text-indigo-900 text-lg">Admin Panel</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                    {auth?.user?.name.charAt(0)}
                </div>
            </div>

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex sticky top-0 h-screen w-72 bg-white border-r border-slate-200 z-50 flex-col shadow-none">
                <div className="p-8 border-b border-slate-100 flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-xl"><Logo className="h-8 w-8" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 font-serif leading-none">Admin</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Control Center</p>
                    </div>
                </div>

                <nav className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-4">Overview</div>
                    <DesktopNavItem to="/admin/dashboard" label="Dashboard" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
                    <DesktopNavItem to="/admin/approvals" label="Approvals" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 mt-8 px-4">Management</div>
                    <DesktopNavItem to="/admin/content" label="CMS & Content" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>} />
                    <DesktopNavItem to="/admin/users" label="Users & Roles" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
                    <DesktopNavItem to="/admin/settings" label="Settings" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                </nav>

                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <button onClick={() => navigate('/dashboard')} className="w-full py-2.5 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
                        Exit to App
                    </button>
                </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION (FIXED) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-[60] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <MobileNavItem to="/admin/dashboard" label="Home" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
                <MobileNavItem to="/admin/approvals" label="Approve" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <MobileNavItem to="/admin/content" label="CMS" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>} />
                <MobileNavItem to="/admin/users" label="Users" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
                <MobileNavItem to="/admin/settings" label="Config" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
            </div>

            {/* Page Content */}
            <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto h-auto md:h-screen">
                <Outlet />
            </main>
        </div>
    );
};