
import React, { useState, useRef, useEffect, useContext } from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { notifications, removeNotification } = useNotification();
  const auth = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Side: Mobile Toggle & Brand */}
          <div className="flex items-center gap-3">
             <button onClick={onOpenSidebar} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md xl:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
             </button>

            <Link to="/" className="flex items-center gap-2 xl:hidden">
              <Logo className="h-8 w-8" />
              <div>
                <h1 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 leading-none font-serif">FINQUEST</h1>
              </div>
            </Link>
          </div>

          {/* Right Side: Date, Theme Toggle & Notifications */}
          <div className="flex items-center gap-3 ml-auto">
                <div className="hidden sm:block px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>

                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Toggle Dark Mode"
                >
                  {theme === 'dark' ? (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  )}
                </button>
                
                {/* Notification Bell - ONLY FOR LOGGED IN USERS */}
                {auth?.user && (
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`p-2 rounded-full border relative transition-colors ${showNotifications ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {notifications.length > 0 && (
                                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in-down origin-top-right">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Notifications</h3>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{notifications.length} new</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            <p>No new notifications</p>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {notifications.map((note) => (
                                                <li key={note.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-3">
                                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                                        note.type === 'success' ? 'bg-emerald-500' : 
                                                        note.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'
                                                    }`}></div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{note.message}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1 capitalize">{note.type}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => removeNotification(note.id)}
                                                        className="text-slate-300 hover:text-slate-500"
                                                    >
                                                        ✕
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
          </div>

        </div>
      </div>
    </header>
  );
};
