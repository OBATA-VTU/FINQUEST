import React, { useContext, useState } from 'react';
import { Logo } from './Logo';
import { AuthContext } from '../contexts/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';

interface NavItemProps {
    to: string;
    label: string;
    icon: React.ReactNode;
    onClose: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon, onClose }) => (
    <NavLink
        to={to}
        onClick={onClose}
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

interface NavSectionProps {
    title: string;
    children: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
}

const NavSection: React.FC<NavSectionProps> = ({ title, children, isExpanded, onToggle }) => {
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      main: true,
      resources: true,
      department: true
  });

  // Check if user has any administrative role
  const isAdminUser = ['admin', 'librarian', 'vice_president'].includes(auth?.user?.role || '');

  const toggleSection = (section: string) => {
      setExpandedSections(prev => ({...prev, [section]: !prev[section]}));
  };

  const handleLogout = async () => {
      if (auth) {
          await auth.logout();
          navigate('/login', { replace: true });
          onClose();
      }
  };

  return (
    <>
        {/* Mobile Overlay */}
        <div 
            className={`fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 transition-opacity duration-300 xl:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        {/* Sidebar Container */}
        <aside 
            className={`
                fixed xl:sticky top-0 left-0 h-[100dvh] w-72 bg-indigo-900 dark:bg-slate-950 z-50 
                transform transition-transform duration-300 ease-in-out shrink-0 flex flex-col shadow-2xl xl:shadow-none
                ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
            `}
        >
          {/* Header (Fixed) */}
          <div className="p-6 flex items-center justify-between border-b border-indigo-800/50 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white rounded-full p-1 shadow-lg">
                    <Logo className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-xl font-serif font-bold text-white leading-none tracking-wide">FINSA</h1>
                    <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-[0.2em] mt-1">AAUA Chapter</p>
                </div>
            </div>
            <button onClick={onClose} className="xl:hidden p-1 text-indigo-300 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="flex-1 px-3 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-700">
            
            <NavSection 
                title="Main Menu" 
                isExpanded={expandedSections['main']} 
                onToggle={() => toggleSection('main')}
            >
                <NavItem 
                    to="/" 
                    label="Home" 
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                    onClose={onClose}
                />
                
                {auth?.user && (
                    <NavItem 
                        to="/dashboard" 
                        label="Dashboard" 
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                        onClose={onClose}
                    />
                )}
            </NavSection>
            
            {auth?.user && (
                <NavSection 
                    title="Resources"
                    isExpanded={expandedSections['resources']}
                    onToggle={() => toggleSection('resources')}
                >
                    <NavItem 
                        to="/questions" 
                        label="Past Questions" 
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                        onClose={onClose}
                    />
                    <NavItem 
                        to="/test" 
                        label="Quick Test" 
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                        onClose={onClose}
                    />
                     <NavItem 
                        to="/community" 
                        label="Community" 
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                        onClose={onClose}
                    />
                    <NavItem 
                        to="/lost-and-found" 
                        label="Lost & Found" 
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>}
                        onClose={onClose}
                    />
                </NavSection>
            )}

            <NavSection 
                title="Department"
                isExpanded={expandedSections['department']}
                onToggle={() => toggleSection('department')}
            >
                 <NavItem 
                    to="/announcements" 
                    label="News & Updates" 
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>}
                    onClose={onClose}
                />
                
                <NavItem 
                    to="/gallery" 
                    label="Gallery" 
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    onClose={onClose}
                />
                
                {auth?.user && (
                    <>
                        <NavItem 
                            to="/lecturers" 
                            label="Lecturers" 
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                            onClose={onClose}
                        />
                        <NavItem 
                            to="/executives" 
                            label="Executives" 
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                            onClose={onClose}
                        />
                    </>
                )}
            </NavSection>
          </nav>

          <div className="p-4 border-t border-indigo-800 bg-indigo-950 dark:bg-slate-900 shrink-0">
            {auth?.user ? (
                <div>
                    <div 
                        onClick={() => { navigate('/profile'); onClose(); }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all mb-3 group"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border-2 border-indigo-400 overflow-hidden shrink-0 group-hover:border-white transition-colors">
                            {auth.user.avatarUrl ? (
                                <img src={auth.user.avatarUrl} alt={auth.user.name} className="w-full h-full object-cover" />
                            ) : (
                                auth.user.name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{auth.user.name}</p>
                            <p className="text-xs text-indigo-300 truncate uppercase font-semibold tracking-wide">
                                {isAdminUser ? auth.user.role.replace('_', ' ') : `${auth.user.level}L Student`}
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                        {isAdminUser && (
                            <button 
                                onClick={() => { navigate('/admin/dashboard'); onClose(); }}
                                className="col-span-3 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Admin
                            </button>
                        )}
                        <button 
                            onClick={handleLogout}
                            className={`px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md transition-colors flex items-center justify-center ${isAdminUser ? 'col-span-1' : 'col-span-4'}`}
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => { navigate('/login'); onClose(); }}
                    className="w-full py-3 rounded-lg bg-white hover:bg-indigo-50 text-indigo-900 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Student Login
                </button>
            )}
          </div>
        </aside>
    </>
  );
};