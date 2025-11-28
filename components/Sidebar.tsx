import React, { useContext } from 'react';
import { Logo } from './Logo';
import { AuthContext } from '../contexts/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
      auth?.logout();
      navigate('/login');
      onClose();
  };

  const NavItem = ({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) => (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-indigo-600 text-white shadow-md'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {({ isActive }) => (
          <>
            <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                {icon}
            </div>
            <span className="font-medium text-sm">{label}</span>
          </>
      )}
    </NavLink>
  );

  return (
    <>
        {/* Mobile Overlay */}
        <div 
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 xl:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        ></div>

        {/* Sidebar Container */}
        <aside 
            className={`
                fixed xl:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-200 z-50 
                transform transition-transform duration-300 ease-in-out shrink-0 flex flex-col shadow-xl xl:shadow-none
                ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
            `}
        >
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
                <Logo className="h-10 w-10" />
                <div>
                    <h1 className="text-xl font-bold text-indigo-900 leading-none">FINQUEST</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">AAUA Chapter</p>
                </div>
            </div>
            {/* Close Button (Mobile Only) */}
            <button onClick={onClose} className="xl:hidden p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-100">
            <NavItem 
                to="/" 
                label="Home" 
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
            />
            <NavItem 
                to="/questions" 
                label="Past Questions" 
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
            />
            <NavItem 
                to="/announcements" 
                label="Announcements" 
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
            />
            <NavItem 
                to="/community" 
                label="Community" 
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            />
            
            <div className="pt-4 mt-4 border-t border-slate-100">
                <h3 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Department</h3>
                <NavItem 
                    to="/executives" 
                    label="Executives" 
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                />
                <NavItem 
                    to="/lecturers" 
                    label="Lecturers" 
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                />
            </div>
          </nav>

          {auth?.user ? (
              <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                  <div 
                    onClick={() => { navigate('/profile'); onClose(); }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm cursor-pointer transition-all mb-3"
                  >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 overflow-hidden shrink-0">
                          {auth.user.avatarUrl ? (
                              <img src={auth.user.avatarUrl} alt={auth.user.name} className="w-full h-full object-cover" />
                          ) : (
                              auth.user.name.charAt(0).toUpperCase()
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{auth.user.name}</p>
                          <p className="text-[10px] text-slate-500 truncate uppercase font-semibold">{auth.user.role}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-2">
                    {auth.user.role === 'admin' && (
                        <button 
                            onClick={() => { navigate('/admin'); onClose(); }}
                            className="w-full px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Admin Dashboard
                        </button>
                    )}
                    <button 
                        onClick={handleLogout}
                        className="w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sign Out
                    </button>
                  </div>
              </div>
          ) : (
            <div className="p-4 border-t border-slate-200">
                <button
                    onClick={() => { navigate('/login'); onClose(); }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                    Login Account
                </button>
            </div>
          )}
        </aside>
    </>
  );
};