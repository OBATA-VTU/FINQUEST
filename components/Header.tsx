
import React, { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { notifications, removeNotification } = useNotification();
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
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-slate-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Side: Mobile Toggle & Brand */}
          <div className="flex items-center gap-3">
             <button onClick={onOpenSidebar} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md xl:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
             </button>

            <Link to="/" className="flex items-center gap-2 xl:hidden">
              <Logo className="h-8 w-8" />
              <div>
                <h1 className="text-lg font-bold text-indigo-900 leading-none font-serif">FINQUEST</h1>
              </div>
            </Link>
          </div>

          {/* Right Side: Date & Notifications */}
          <div className="flex items-center gap-3 ml-auto">
                <div className="hidden sm:block px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 whitespace-nowrap">
                    {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`p-2 rounded-full border relative transition-colors ${showNotifications ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {notifications.length > 0 && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in-down origin-top-right">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                <span className="text-xs text-slate-500">{notifications.length} new</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        <p>No new notifications</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-50">
                                        {notifications.map((note) => (
                                            <li key={note.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
                                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                                    note.type === 'success' ? 'bg-emerald-500' : 
                                                    note.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'
                                                }`}></div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-700 leading-snug">{note.message}</p>
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
          </div>

        </div>
      </div>
    </header>
  );
};
