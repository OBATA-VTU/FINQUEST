
import React from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
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

          {/* Right Side: Date & Notifications (Visible on Desktop & Mobile) */}
          <div className="flex items-center gap-4 ml-auto">
                <div className="hidden md:block px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600">
                    {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                
                <button className="p-2 bg-white rounded-full hover:bg-slate-50 border border-slate-200 relative text-slate-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                </button>
          </div>

        </div>
      </div>
    </header>
  );
};
