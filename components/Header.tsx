import React, { useState, useRef, useEffect, useContext } from 'react';
import { Logo } from './Logo';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { collection, query, where, limit, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Notification as FirestoreNotification } from '../types';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [dbNotifications, setDbNotifications] = useState<FirestoreNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      if (!auth?.user) return;
      // Hardened query: only fetch notifications that are specifically for this user or 'all' AND are unread
      const q = query(
          collection(db, 'notifications'), 
          where('userId', 'in', [auth.user.id, 'all']),
          where('read', '==', false),
          limit(20) 
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const notes = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as FirestoreNotification))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          // Filter out duplicates if any (e.g. system issues)
          const uniqueNotes = notes.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
          setDbNotifications(uniqueNotes);
      });
      return () => unsubscribe();
  }, [auth?.user?.id]);

  const handleClearAll = async () => {
      if (dbNotifications.length === 0) {
          setShowNotifications(false);
          return;
      }
      
      const currentNotes = [...dbNotifications];
      // Optimistic Reset - Clear UI first
      setDbNotifications([]);
      
      try {
          const batch = writeBatch(db);
          currentNotes.forEach(note => {
              const noteRef = doc(db, 'notifications', note.id);
              batch.update(noteRef, { read: true });
          });
          await batch.commit();
          // After success, we don't need to do anything as setDbNotifications([]) already happened
      } catch (e) {
          // Revert UI if update fails
          setDbNotifications(currentNotes);
          console.error("Failed to clear notifications", e);
      }
  };
  
  const handleNotificationClick = (notification: FirestoreNotification) => {
      setShowNotifications(false);
      navigate('/notifications', { state: { highlightId: notification.id } });
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
             <button onClick={onOpenSidebar} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md xl:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>
            <Link to="/" className="flex items-center gap-2 xl:hidden">
              <Logo className="h-8 w-8" />
              <h1 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 leading-none font-serif">FINSA</h1>
            </Link>
          </div>
          <div className="flex items-center gap-3 ml-auto">
                <div className="hidden sm:block px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <button onClick={toggleTheme} className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  {theme === 'dark' ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                </button>
                {auth?.user && (
                    <div className="relative" ref={dropdownRef}>
                        <button type="button" onClick={() => setShowNotifications(!showNotifications)} className={`p-2 rounded-full border relative transition-colors ${showNotifications ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 text-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-600'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {dbNotifications.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>}
                        </button>
                        {showNotifications && (
                            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in-down origin-top-right z-[100]">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                                    <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Notifications</h3>
                                    {dbNotifications.length > 0 && <button onClick={handleClearAll} className="text-[10px] font-black uppercase text-indigo-600 hover:text-rose-500 transition-colors">Clear All</button>}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {dbNotifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Quiet for now</div>
                                    ) : (
                                        <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {dbNotifications.slice(0, 5).map((note) => (
                                                <li key={note.id} onClick={() => handleNotificationClick(note)} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-3 cursor-pointer">
                                                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${note.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug font-bold line-clamp-2">{note.message}</p>
                                                        <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-tight">{new Date(note.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 text-center">
                                    <Link to="/notifications" onClick={() => setShowNotifications(false)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline tracking-widest">Inbox Archive</Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {auth?.user && (
                    <Link to="/profile" className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 overflow-hidden flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-black text-sm shadow-sm transition-transform active:scale-95">
                        {auth.user.avatarUrl ? <img src={auth.user.avatarUrl} alt={auth.user.name} className="w-full h-full object-cover" /> : auth.user.name.charAt(0).toUpperCase()}
                    </Link>
                )}
          </div>
        </div>
      </div>
    </header>
  );
};
