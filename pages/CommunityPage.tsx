
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, getDocs, deleteDoc, doc, getDoc, where } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { VerificationBadge } from '../components/VerificationBadge';
import { Role } from '../types';
import { Link } from 'react-router-dom';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderRole?: Role; 
    isVerified?: boolean; 
    createdAt: string;
    avatarUrl?: string;
}

export const CommunityPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  const [view, setView] = useState<'hub' | 'chat'>('hub');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const dummyRef = useRef<HTMLDivElement>(null);

  const [socialLinks, setSocialLinks] = useState({
      whatsapp: '',
      telegram: '',
      facebook: '',
      instagram: '',
      twitter: '',
      tiktok: ''
  });

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

  // 24-HOUR AUTO CLEANUP LOGIC
  useEffect(() => {
    if (auth?.user?.role === 'admin') {
        const cleanup = async () => {
            try {
              const now = Date.now();
              const oneDayMs = 24 * 60 * 60 * 1000;
              const cutoff = new Date(now - oneDayMs).toISOString();

              // Query messages older than 24 hours
              const q = query(collection(db, 'community_messages'), where('createdAt', '<', cutoff));
              const snapshot = await getDocs(q);
              
              if (!snapshot.empty) {
                  console.log(`Cleaning up ${snapshot.size} expired messages...`);
                  const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
                  await Promise.all(deletePromises);
              }
            } catch (e) { console.error("Cleanup error", e); }
        };
        cleanup();
    }
  }, [auth?.user?.role, view]);

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !auth?.user || sending) return;

      setSending(true);
      try {
          const displayName = auth.user.username ? `@${auth.user.username}` : (auth.user.name || 'User');

          await addDoc(collection(db, 'community_messages'), {
              text: newMessage.trim(),
              senderId: auth.user.id,
              senderName: displayName,
              senderRole: auth.user.role,
              isVerified: auth.user.isVerified || false,
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

  if (view === 'hub') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 animate-fade-in transition-colors duration-300">
              <div className="container mx-auto max-w-5xl">
                  <div className="text-center mb-12">
                      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Community Hub</h1>
                      <p className="text-slate-500 dark:text-slate-400 text-lg">Connect, chat, and collaborate with your peers.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {/* Live Chat Card */}
                      <button 
                        onClick={() => setView('chat')}
                        className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none hover:shadow-2xl hover:scale-[1.02] transition-all group text-left relative overflow-hidden text-white"
                      >
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /></svg>
                          </div>
                          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-6 text-white">
                              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          </div>
                          <h3 className="text-2xl font-bold mb-2">Student Lounge</h3>
                          <p className="text-indigo-100 font-medium">Join the live conversation. Real-time chat with verified students.</p>
                          <div className="mt-6 flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-full uppercase tracking-wider">
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                              Active Now
                          </div>
                      </button>

                      {/* WhatsApp */}
                      <a href={socialLinks.whatsapp || '#'} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group">
                          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">WhatsApp Group</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Join the official general group for announcements.</p>
                      </a>

                      {/* Telegram */}
                      <a href={socialLinks.telegram || '#'} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 transition-all group">
                          <div className="w-14 h-14 bg-sky-100 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400 mb-6 group-hover:scale-110 transition-transform">
                              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Telegram Channel</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Access file archives and broadcasts.</p>
                      </a>
                  </div>
              </div>
          </div>
      );
  }

  // CHAT VIEW
  return (
      <div className="h-screen bg-slate-100 dark:bg-slate-950 flex flex-col transition-colors">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 shadow-sm z-10">
              <div className="flex items-center gap-3">
                  <button onClick={() => setView('hub')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </button>
                  <div>
                      <h2 className="font-bold text-slate-900 dark:text-white text-lg">Student Lounge</h2>
                      <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Live Conversation</p>
                      </div>
                  </div>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100 dark:bg-slate-950">
              {messages.map((msg) => {
                  const isMe = msg.senderId === auth.user?.id;
                  return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} animate-fade-in`}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden ${isMe ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              {msg.avatarUrl ? <img src={msg.avatarUrl} className="w-full h-full object-cover" /> : msg.senderName.charAt(0)}
                          </div>
                          <div className={`max-w-[80%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                                  {msg.text}
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                                  {!isMe && (
                                      <>
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{msg.senderName}</span>
                                        <VerificationBadge role={msg.senderRole || 'student'} isVerified={msg.isVerified} className="w-3 h-3" />
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                      </>
                                  )}
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </span>
                          </div>
                      </div>
                  );
              })}
              <div ref={dummyRef}></div>
          </div>

          <form onSubmit={handleSend} className="p-3 md:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-full px-5 py-3 focus:ring-0 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-all text-sm"
                  placeholder="Type a message..." 
              />
              <button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
              >
                  <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
          </form>
      </div>
  );
};