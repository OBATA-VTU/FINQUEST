import React, { useContext, useState } from 'react';
import { Logo } from './Logo';
import { AuthContext } from '../contexts/AuthContext';
import { Page } from '../types';

interface HeaderProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
}

const NavLink: React.FC<{
  page: Page;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}> = ({ page, currentPage, onNavigate, children }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => onNavigate(page)}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
      }`}
    >
      {children}
    </button>
  );
};

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
  const auth = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-slate-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3 group">
              <Logo className="h-14 w-14 group-hover:rotate-6 transition-transform duration-500" />
              <div className="hidden md:block text-left">
                <h1 className="text-lg font-bold text-indigo-900 leading-none">FINQUEST</h1>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">AAUA Chapter</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center space-x-1">
            <NavLink page="home" currentPage={currentPage} onNavigate={onNavigate}>Home</NavLink>
            <NavLink page="questions" currentPage={currentPage} onNavigate={onNavigate}>Past Questions</NavLink>
            <NavLink page="executives" currentPage={currentPage} onNavigate={onNavigate}>Executives</NavLink>
            <NavLink page="lecturers" currentPage={currentPage} onNavigate={onNavigate}>Lecturers</NavLink>
            <NavLink page="announcements" currentPage={currentPage} onNavigate={onNavigate}>Announcements</NavLink>
            <NavLink page="community" currentPage={currentPage} onNavigate={onNavigate}>Community</NavLink>
          </nav>
          
          <div className="flex items-center gap-3">
             {auth?.user ? (
               <div className="relative">
                 <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none border border-transparent hover:border-slate-200"
                 >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm">
                        {auth.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left mr-1">
                        <span className="block text-sm font-medium text-slate-700 leading-none">{auth.user.name.split(' ')[0]}</span>
                        <span className="block text-[10px] text-slate-500 uppercase">{auth.user.role || 'Student'}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                 </button>

                 {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 border border-slate-100 animate-fade-in-down">
                        <button onClick={() => { onNavigate('profile'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Profile</button>
                        {auth.user.role === 'admin' && (
                            <button onClick={() => { onNavigate('admin'); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Admin Panel</button>
                        )}
                        <div className="border-t border-slate-100 my-1"></div>
                        <button onClick={() => { auth.logout(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">Logout</button>
                    </div>
                 )}
               </div>
             ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Login
                </button>
             )}

             {/* Mobile Menu Button */}
             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="xl:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
             </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
          <div className="xl:hidden bg-white border-t border-slate-100 py-4 shadow-lg absolute w-full left-0 z-50">
            <div className="flex flex-col space-y-2 px-4">
                <button onClick={() => {onNavigate('home'); setIsMobileMenuOpen(false)}} className="text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">Home</button>
                <button onClick={() => {onNavigate('questions'); setIsMobileMenuOpen(false)}} className="text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">Past Questions</button>
                <button onClick={() => {onNavigate('executives'); setIsMobileMenuOpen(false)}} className="text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">Executives</button>
                <button onClick={() => {onNavigate('lecturers'); setIsMobileMenuOpen(false)}} className="text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">Lecturers</button>
                <button onClick={() => {onNavigate('announcements'); setIsMobileMenuOpen(false)}} className="text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">Announcements</button>
                 <button onClick={() => {onNavigate('community'); setIsMobileMenuOpen(false)}} className="text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">Community</button>
            </div>
          </div>
      )}
    </header>
  );
};