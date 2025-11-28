import React from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  return (
    <header className="xl:hidden bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-slate-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {/* Hamburger Button triggers Sidebar */}
             <button onClick={onOpenSidebar} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
             </button>

            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <div>
                <h1 className="text-lg font-bold text-indigo-900 leading-none">FINQUEST</h1>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};