

import React, { useContext, useState } from 'react';
import { Logo } from './Logo';
import { AuthContext } from '../contexts/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';

interface NavItemProps {
    to: string;
    label: string;
    icon: React.ReactElement<{ className?: string }>;
    onClose: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon, onClose }) => (
    <NavLink
        to={to}
        onClick={onClose}
        className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group relative ${
            isActive
                ? 'bg-white/10 text-white shadow-inner border-l-2 border-indigo-400'
                : 'text-indigo-200 hover:bg-white/5 hover:text-white'
        }`}
    >
        {({ isActive }) => (
            <>
                <div className={`${isActive ? 'text-indigo-400' : 'text-indigo-300 group-hover:text-white'} transition-colors`}>
                    {React.cloneElement(icon, { className: "w-4 h-4" })}
                </div>
                <span className={`font-semibold text-xs tracking-wide ${isActive ? 'font-bold' : ''}`}>{label}</span>
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-lg pointer-events-none"></div>}
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
                className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-white transition-colors group focus:outline-none mb-1 opacity-80 hover:opacity-100"
            >
                <span>{title}</span>
                <svg
                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-0.5">
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

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      main: true,
      resources: true,
      department: true
  });

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
        <div 
            className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-300 xl:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        <aside 
            className={`
                fixed xl:sticky top-0 left-0 h-[100dvh] w-64 bg-gradient-to-b from-indigo-950 to-slate-950 z-50 
                transform transition-transform duration-300 ease-in-out shrink-0 flex flex-col shadow-2xl xl:shadow-none border-r border-indigo-900/50
                ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
            `}
        >
          <div className="p-5 flex items-center justify-between border-b border-indigo-800/30 shrink-0 bg-indigo-950/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="bg-white rounded-full p-1 shadow-lg ring-2 ring-indigo-500/50">
                    <Logo className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-lg font-serif font-bold text-white leading-none tracking-wide">FINSA</h1>
                    <p className="text-[8px] text-indigo-300 font-bold uppercase tracking-[0.2em] mt-0.5">AAUA Chapter</p>
                </div>
            </div>
            <button onClick={onClose} className="xl:hidden p-1 text-indigo-300 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-900">
            
            <NavSection 
                title="Main Menu" 
                isExpanded={expandedSections['main']} 
                onToggle={() => toggleSection('main')}
            >
                <NavItem 
                    to="/" 
                    label="Home" 
                    icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                    onClose={onClose}
                />
                
                {auth?.user && (
                    <>
                        <NavItem 
                            to="/dashboard" 
                            label="Dashboard" 
                            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                            onClose={onClose}
                        />
                        <NavItem 
                            to="/leaderboard" 
                            label="Leaderboard" 
                            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            onClose={onClose}
                        />
                    </>
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
                        label="Resources Archives" 
                        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                        onClose={onClose}
                    />
                    <NavItem 
                        to="/upload" 
                        label="Upload Material" 
                        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                        onClose={onClose}
                    />
                    <NavItem 
                        to="/test" 
                        label="CBT Practice" 
                        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                        onClose={onClose}
                    />
                    <NavItem 
                        to="/notes" 
                        label="My Notes" 
                        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                        onClose={onClose}
                    />
                     <NavItem 
                        to="/community" 
                        label="Community" 
                        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.