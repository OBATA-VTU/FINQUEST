
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { Link } from 'react-router-dom';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    avatarUrl?: string;
}

export const CommunityPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  // Views: 'hub' or 'chat'
  const [view, setView] = useState<'hub' | 'chat'>('hub');
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const dummyRef = useRef<HTMLDivElement>(null);

  // Social Links State
  const [socialLinks, setSocialLinks] = useState({
      whatsapp: '',
      telegram: '',
      facebook: '',
      instagram: '',
      twitter: '',
      tiktok: ''
  });

  // Fetch Links
  useEffect(() => {
      const fetchLinks = async () => {
          try {
              const docRef = doc(db, 'content', 'social_links');
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                  setSocialLinks(snap.data() as any);
              }
          } catch (e) { console.error("Error fetching links", e); }
      };
      fetchLinks();
  }, []);

  // Chat Effects
  useEffect(() => {
      if (view === 'chat') {
          const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'asc'));
          const unsubscribe = onSnapshot(q, (snapshot) => {
              const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
              setMessages(msgs);
          });
          return () => unsubscribe();
      }
  }, [view]);

  useEffect(() => {
      if (view === 'chat') {
          dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [messages, view]);

  useEffect(() => {
    // Only cleanup if user is admin
    if (auth?.user?.role === 'admin') {
        const cleanup = async () => {
            try {
              const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'desc'));
              const snapshot = await getDocs(q);
              if (snapshot.size > 100) {
                  const toDelete = snapshot.docs.slice(100);
                  toDelete.forEach(async (d) => await deleteDoc(d.ref));
                  console.log("Cleaned up old messages");
              }
            } catch (e) { console.error("Cleanup error", e); }
        };
        cleanup();
    }
  }, [auth?.user?.role]);

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !auth?.user || sending) return;

      setSending(true);
      try {
          // Use username if available, fallback to name, fallback to "User"
          const displayName = auth.user.username ? `@${auth.user.username}` : (auth.user.name || 'User');

          await addDoc(collection(db, 'community_messages'), {
              text: newMessage.trim(),
              senderId: auth.user.id,
              senderName: displayName,
              avatarUrl: auth.user.avatarUrl || '',
              createdAt: new Date().toISOString()
          });
          setNewMessage('');
      } catch (error: any) {
          showNotification("Failed to send: " + error.message, "error");
      } finally {
          setSending(false);
      }
  };

  if (!auth?.user) return <div className="text-center p-10 h-full flex items-center justify-center dark:text-slate-300">Please login to access community.</div>;

  // RENDER: HUB VIEW
  if (view === 'hub') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 animate-fade-in transition-colors duration-300">
              <div className="container mx-auto max-w-4xl">
                  <div className="text-center mb-10">
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Community Hub</h1>
                      <p className="text-slate-500 dark:text-slate-400">Connect with your peers across all platforms.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                      
                      {/* 1. STUDENT LIVE CHAT (Internal) */}
                      <button 
                        onClick={() => setView('chat')}
                        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xl transition-all group text-left relative overflow-hidden"
                      >
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                              <svg className="w-24 h-24 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" /></svg>
                          </div>
                          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Student Chat Interface</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Official live chat for verified students.</p>
                      </button>

                      {/* 2. WhatsApp Group */}
                      <a 
                        href={socialLinks.whatsapp || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xl transition-all group relative overflow-hidden ${!socialLinks.whatsapp && 'opacity-50 cursor-not-allowed'}`}
                      >
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Departmental Group</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Join the general WhatsApp group.</p>
                      </a>

                      {/* 3. Telegram Channel */}
                      <a 
                        href={socialLinks.telegram || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 hover:shadow-xl transition-all group relative overflow-hidden ${!socialLinks.telegram && 'opacity-50 cursor-not-allowed'}`}
                      >
                          <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4 group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Telegram Channel</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Broadcasts and resources.</p>
                      </a>

                      {/* 4. Facebook */}
                      <a 
                        href={socialLinks.facebook || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 hover:shadow-xl transition-all group relative overflow-hidden ${!socialLinks.facebook && 'opacity-50 cursor-not-allowed'}`}
                      >
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Facebook Group</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Official student community page.</p>
                      </a>

                      {/* 5. Instagram */}
                      <a 
                        href={socialLinks.instagram || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-pink-500 dark:hover:border-pink-500 hover:shadow-xl transition-all group relative overflow-hidden ${!socialLinks.instagram && 'opacity-50 cursor-not-allowed'}`}
                      >
                          <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400 mb-4 group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Instagram</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Follow us for photos.</p>
                      </a>
                  </div>
              </div>

              {/* QUICK LINKS (2 cols) */}
              <div className="container mx-auto max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 border-t border-slate-200 dark:border-slate-800 pt-12">
                  <div className="lg:col-span-4">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest border-l-2 border-indigo-500 pl-3">Explore</h3>
                    <ul className="space-y-3">
                        <li><Link to="/" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>Home</Link></li>
                        <li><Link to="/announcements" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>News</Link></li>
                        <li><Link to="/gallery" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>Gallery</Link></li>
                        <li><Link to="/executives" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>Executives</Link></li>
                        <li><Link to="/lecturers" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>Lecturers</Link></li>
                    </ul>
                  </div>

                  <div className="lg:col-span-4">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest border-l-2 border-indigo-500 pl-3">Student Portal</h3>
                    <ul className="space-y-3">
                        {auth?.user ? (
                            <>
                                <li><Link to="/dashboard" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>My Dashboard</Link></li>
                                <li><Link to="/questions" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>Past Questions</Link></li>
                                <li><Link to="/test" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>CBT Practice</Link></li>
                            </>
                        ) : (
                            <li><Link to="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>Login / Register</Link></li>
                        )}
                        <li><Link to="/faq" className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-400 group-hover:bg-indigo-500 rounded-full transition-colors"></span>FAQ</Link></li>
                    </ul>
                  </div>

                  <div className="lg:col-span-4">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest border-l-2 border-indigo-500 pl-3">Contact Us</h3>
                    <address className="not-italic space-y-4">
                      <div className="flex items-start gap-3">
                          <div className="mt-1 text-slate-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Department of Finance,<br/>Faculty of Administration,<br/>Adekunle Ajasin University.</p>
                      </div>
                      
                      <div className="flex flex-col gap-3 pt-2">
                          <a href="mailto:finsa@gmail.com" className="group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg hover:border-indigo-600 transition-all">
                              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-full text-indigo-500 dark:text-indigo-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">finsa@gmail.com</span>
                          </a>
                          <a href="tel:081444222147" className="group flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg hover:border-green-600 transition-all">
                              <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-full text-green-500 dark:text-green-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">081444222147</span>
                          </a>
                      </div>
                    </address>
                  </div>
              </div>
              
              {/* BOTTOM BAR */}
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-4">
                    <p>&copy; {new Date().getFullYear()} FINSA-OBA. All rights reserved.</p>
                    <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
                    <p className="flex items-center gap-1">
                        Developed by <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">OBA - PRO '25/26</span>
                    </p>
                </div>
                <div className="flex gap-6">
                    <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Privacy Policy</Link>
                    <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Terms of Use</Link>
                    <Link to="/faq" className="hover:text-indigo-600 dark:hover:text-white transition-colors">FAQ</Link>
                </div>
              </div>
          </div>
      );
  }

  // RENDER: CHAT VIEW
  return (
      <div className="h-screen bg-white dark:bg-slate-900 flex flex-col transition-colors">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                  <button onClick={() => setView('hub')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </button>
                  <div>
                      <h2 className="font-bold text-slate-900 dark:text-white leading-tight">Student Lounge</h2>
                      <p className="text-xs text-green-500 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          Live Chat
                      </p>
                  </div>
              </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {messages.map((msg) => {
                  const isMe = msg.senderId === auth.user?.id;
                  return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              {msg.avatarUrl ? <img src={msg.avatarUrl} className="w-full h-full rounded-full object-cover" /> : msg.senderName.charAt(0)}
                          </div>
                          <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                              <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'}`}>
                                  {msg.text}
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 px-1">
                                  {!isMe && <span className="font-bold mr-1">{msg.senderName}</span>}
                                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                          </div>
                      </div>
                  );
              })}
              <div ref={dummyRef}></div>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 flex gap-2">
              <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-full px-6 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                  placeholder="Type a message..." 
              />
              <button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending}
                  className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                  <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
          </form>
      </div>
  );
};
