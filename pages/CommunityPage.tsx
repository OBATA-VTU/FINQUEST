
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

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
    // Only cleanup occasionally or if user is admin, ideally this is backend job
    // We leave this here from previous code
    const cleanup = async () => {
        try {
          const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(q);
          if (snapshot.size > 100) {
              const toDelete = snapshot.docs.slice(100);
              toDelete.forEach(async (d) => await deleteDoc(d.ref));
          }
        } catch (e) { console.error("Cleanup error", e); }
    };
    cleanup();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !auth?.user || sending) return;

      setSending(true);
      try {
          await addDoc(collection(db, 'community_messages'), {
              text: newMessage.trim(),
              senderId: auth.user.id,
              senderName: auth.user.name,
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      
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
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Instagram</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Follow for photos and stories.</p>
                      </a>

                       {/* 6. Twitter / X */}
                      <a 
                        href={socialLinks.twitter || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-slate-800 dark:hover:border-slate-500 hover:shadow-xl transition-all group relative overflow-hidden ${!socialLinks.twitter && 'opacity-50 cursor-not-allowed'}`}
                      >
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-800 dark:text-slate-200 mb-4 group-hover:scale-110 transition-transform">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Twitter / X</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Quick updates and threads.</p>
                      </a>

                      {/* 7. TikTok */}
                      <a 
                        href={socialLinks.tiktok || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-black dark:hover:border-white hover:shadow-xl transition-all group relative overflow-hidden ${!socialLinks.tiktok && 'opacity-50 cursor-not-allowed'}`}
                      >
                          <div className="w-12 h-12 bg-slate-900 dark:bg-black rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.35-1.17.82-1.51 1.47-.49 1.05-.51 2.25-.09 3.32.74 1.75 2.56 2.75 4.41 2.62 1.92-.13 3.54-1.49 4.09-3.32.25-1.09.28-2.22.19-3.33-.02-2.85-.02-5.69-.02-8.54.02-.32.09-.64.22-.93.58-1.52 1.83-2.67 3.35-3.14.28-.11.58-.2.87-.29V.02h-3.91z"/></svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">TikTok</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Trends and fun moments.</p>
                      </a>
                  </div>
              </div>
          </div>
      );
  }

  // RENDER: CHAT VIEW
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 animate-fade-in transition-colors duration-300">
      
      <div className="flex-1 flex flex-col container mx-auto px-0 md:px-4 max-w-4xl h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 md:rounded-t-2xl border-b border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center justify-between shrink-0 z-10 transition-colors">
            <div className="flex items-center gap-3">
                <button onClick={() => setView('hub')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition text-slate-500 dark:text-slate-400">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">Student Lounge</h1>
                    <p className="text-xs text-green-500 font-bold flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live Chat</p>
                </div>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Messages auto-clear</div>
        </div>

        {/* Message Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 overflow-y-auto p-4 space-y-4 transition-colors">
            {messages.length === 0 && (
                <div className="text-center text-slate-400 py-10 text-sm">No messages yet. Start the conversation!</div>
            )}
            {messages.map((msg) => {
                const isMe = msg.senderId === auth.user?.id;
                return (
                    <div key={msg.id} className={`flex gap-2 md:gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-600">
                            {msg.avatarUrl ? <img src={msg.avatarUrl} className="w-full h-full object-cover" alt="avatar" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-xs">{msg.senderName[0]}</div>}
                        </div>
                        <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                            {!isMe && <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mb-1 leading-none">{msg.senderName}</p>}
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            <p className={`text-[9px] mt-1 text-right opacity-70`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                );
            })}
            <div ref={dummyRef} className="h-2"></div>
        </div>

        {/* Input Area - Sticky at bottom */}
        <div className="bg-white dark:bg-slate-800 p-3 md:p-4 md:rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-slate-100 dark:border-slate-700 shrink-0 z-20 transition-colors">
            <form onSubmit={handleSend} className="flex gap-2 items-center">
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    placeholder="Type a message..." 
                    className="flex-1 border border-slate-300 dark:border-slate-600 rounded-full px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm md:text-base bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" 
                    disabled={sending}
                />
                <button 
                    type="submit" 
                    disabled={sending || !newMessage.trim()}
                    className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {sending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    )}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};
