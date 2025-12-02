
import React, { useState, useContext, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { AuthContext } from '../contexts/AuthContext';
import { Role } from '../types';

interface AdminNavItemProps {
    to: string;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
}

const AdminNavItem: React.FC<AdminNavItemProps> = ({ to, label, icon, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
            isActive
                ? 'bg-white/10 text-white shadow-inner backdrop-blur-sm border-l-4 border-indigo-400'
                : 'text-indigo-200 hover:bg-white/5 hover:text-white'
        }`}
    >
        {({ isActive }) => (
            <>
                <div className={`${isActive ? 'text-indigo-400' : 'text-indigo-300 group-hover:text-white'}`}>
                    {icon}
                </div>
                <span className="font-medium text-sm tracking-wide">{label}</span>
            </>
        )}
    </NavLink>
);

interface AdminNavSectionProps {
    title: string;
    children: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
}

const AdminNavSection: React.FC<AdminNavSectionProps> = ({ title, children, isExpanded, onToggle }) => {
    return (
        <div className="mb-4">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-indigo-400 uppercase tracking-widest hover:text-white transition-colors group focus:outline-none"
            >
                <span>{title}</span>
                <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="mt-1 space-y-1">
                    {children}
                </div>
            </div>
        </div>
    );
}

export const AdminLayout: React.FC = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    
    // Collapsible Sections State
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        overview: true,
        management: true,
        system: true
    });

    // TEST MODE: Role Simulation State (Defaults to actual user role)
    const [simulatedRole, setSimulatedRole] = useState<Role>(auth?.user?.role || 'student');

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({...prev, [section]: !prev[section]}));
    };

    const handleLogout = async () => {
        if (auth) {
            await auth.logout();
            navigate('/login', { replace: true });
        }
    };

    const closeSidebar = () => setIsOpen(false);

    // Determines effective role (Actual or Simulated)
    const effectiveRole = useMemo(() => {
        // Only actual 'admin' can simulate
        if (auth?.user?.role === 'admin') {
            return simulatedRole;
        }
        return auth?.user?.role || 'student';
    }, [auth?.user?.role, simulatedRole]);

    const isSuperAdmin = effectiveRole === 'admin';

    return (
        <div className="h-screen bg-slate-50 flex font-sans overflow-hidden">
            
            {/* Mobile Overlay */}
            <div 
                className={`fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 transition-opacity duration-300 xl:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={closeSidebar}
            ></div>

            {/* Sidebar */}
            <aside 
                className={`
                    fixed xl:sticky top-0 left-0 h-[100dvh] w-72 bg-indigo-950 z-50 
                    transform transition-transform duration-300 ease-in-out shrink-0 flex flex-col shadow-2xl xl:shadow-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
                `}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-indigo-800/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white rounded-full p-1 shadow-lg">
                            <Logo className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-xl font-serif font-bold text-white leading-none tracking-wide">ADMIN</h1>
                            <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-[0.2em] mt-1">Control Panel</p>
                        </div>
                    </div>
                    <button onClick={closeSidebar} className="xl:hidden p-1 text-indigo-300 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Role Switcher for Super Admin (Testing) */}
                {auth?.user?.role === 'admin' && (
                    <div className="px-4 pt-4 pb-2">
                        <label className="block text-[10px] uppercase font-bold text-indigo-400 mb-1">View As (Test Mode)</label>
                        <select 
                            value={simulatedRole} 
                            onChange={(e) => setSimulatedRole(e.target.value as Role)}
                            className="w-full bg-indigo-900 border border-indigo-700 text-white text-xs rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="admin">Super Admin (PRO)</option>
                            <option value="librarian">Librarian</option>
                            <option value="vice_president">Vice President</option>
                        </select>
                    </div>
                )}

                {/* Nav Links */}
                <nav className="flex-1 px-3 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-800">
                    
                    <AdminNavSection title="Overview" isExpanded={expandedSections.overview} onToggle={() => toggleSection('overview')}>
                        <AdminNavItem 
                            to="/admin/dashboard" 
                            label="Dashboard" 
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                            onClick={closeSidebar}
                        />
                    </AdminNavSection>

                    <AdminNavSection title="Content Management" isExpanded={expandedSections.management} onToggle={() => toggleSection('management')}>
                        <AdminNavItem 
                            to="/admin/approvals" 
                            label="Approvals" 
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            onClick={closeSidebar}
                        />
                        <AdminNavItem 
                            to="/admin/content" 
                            label={isSuperAdmin ? "CMS (Full)" : "Materials & AI"} 
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>}
                            onClick={closeSidebar}
                        />
                    </AdminNavSection>

                    <AdminNavSection title="System" isExpanded={expandedSections.system} onToggle={() => toggleSection('system')}>
                        <AdminNavItem 
                            to="/admin/users" 
                            label={isSuperAdmin ? "Users & Roles" : "Users (Read Only)"} 
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                            onClick={closeSidebar}
                        />
                        {isSuperAdmin && (
                            <AdminNavItem 
                                to="/admin/settings" 
                                label="Settings" 
                                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                onClick={closeSidebar}
                            />
                        )}
                    </AdminNavSection>
                </nav>

                {/* Footer Controls */}
                <div className="p-4 border-t border-indigo-800 bg-indigo-900 shrink-0 flex gap-2">
                    <button onClick={() => navigate('/dashboard')} className="flex-1 py-2 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                        Exit to App
                    </button>
                    <button onClick={handleLogout} className="w-10 h-10 bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center justify-center transition-colors shadow-lg" title="Logout">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col h-full bg-slate-50">
                {/* Mobile Header Toggle */}
                <div className="xl:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-4">
                    <button onClick={() => setIsOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <span className="font-bold text-slate-800">Admin Panel</span>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
                    {/* Pass effective role to all child pages */}
                    <Outlet context={{ role: effectiveRole }} />
                </main>
            </div>
        </div>
    );
};