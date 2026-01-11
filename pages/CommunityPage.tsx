
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { VerificationBadge } from '../components/VerificationBadge';
import { Role } from '../types';
import { uploadToImgBB } from '../utils/api';

interface Message {
    id: string;
    text: string;
    imageUrl?: string;
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
  
  // Image Upload & Preview State
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [socialLinks, setSocialLinks] = useState({ whatsapp: '', telegram: '' });

  useEffect(() => {
      const fetchLinks = async () => {
          try {
              const docRef = doc(db, 'content', 'social_links');
              const snap = await getDoc(docRef);
              if (snap.exists()) setSocialLinks(snap.data() as any);
          } catch (e) {}
      };
      fetchLinks();
  }, []);

  useEffect(() => {
      if (view === 'chat') {
          const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'asc'));
          const unsubscribe = onSnapshot(q, (snapshot) => {
              setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
          });
          return () => unsubscribe();
      }
  }, [view]);

  useEffect(() => {
      if (view === 'chat') dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setPreviewImage(e.target.files[0]);
          setImageCaption(''); // Reset caption
      }
  };

  const cancelImagePreview = () => {
      setPreviewImage(null);
      setImageCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteMessage = async (msgId: string) => {
      if (!window.confirm("Delete this message?")) return;
      try {
          await deleteDoc(doc(db, 'community_messages', msgId));
      } catch (e) { showNotification("Failed to delete", "error"); }
  };

  const handleSend = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      
      const textToSend = previewImage ? imageCaption.trim() : newMessage.trim();
      const hasImage = !!previewImage;

      if ((!textToSend && !hasImage) || !auth?.user || sending) return;

      setSending(true);
      try {
          let imageUrl = '';
          if (previewImage) {
              imageUrl = await uploadToImgBB(previewImage);
          }

          const displayName = auth.user.username ? `@${auth.user.username}` : (auth.user.name || 'User');

          await addDoc(collection(db, 'community_messages'), {
              text: textToSend, // Caption or regular message
              imageUrl,
              senderId: auth.user.id,
              senderName: displayName,
              senderRole: auth.user.role,
              isVerified: auth.user.isVerified || false,
              avatarUrl: auth.user.avatarUrl || '',
              createdAt: new Date().toISOString()
          });
          
          setNewMessage('');
          cancelImagePreview();
      } catch (error: any) {
          showNotification("Failed to send.", "error");
      } finally {
          setSending(false);
      }
  };

  if (!auth?.user) return <div className="text-center p-10">Please login.</div>;

  if (view === 'hub') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 animate-fade-in transition-colors">
              <div className="container mx-auto max-w-4xl pt-10">
                  <h1 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">Community Hub</h1>
                  <p className="text-center text-slate-500 mb-10">Connect with your department peers.</p>

                  <div className="grid md:grid-cols-2 gap-6">
                      <button onClick={() => setView('chat')} className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 rounded-3xl text-white shadow-xl hover:scale-[1.02] transition-transform text-left relative overflow-hidden group">
                          <div className="absolute right-0 top-0 p-6 opacity-20"><svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /></svg></div>
                          <h3 className="text-2xl font-bold mb-2">Student Lounge</h3>
                          <p className="text-indigo-100">Live chat with verified students.</p>
                          <span className="mt-6 inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Enter Chat &rarr;</span>
                      </button>

                      <div className="space-y-4">
                          <a href={socialLinks.whatsapp || '#'} target="_blank" className="block bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg></div>
                              <div className="font-bold text-slate-800 dark:text-white">Official WhatsApp Group</div>
                          </a>
                          <a href={socialLinks.telegram || '#'} target="_blank" className="block bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 transition-colors flex items-center gap-4">
                              <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-600"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg></div>
                              <div className="font-bold text-slate-800 dark:text-white">Telegram Channel</div>
                          </a>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // CHAT VIEW
  return (
      <div className="h-screen bg-slate-100 dark:bg-slate-950 flex flex-col transition-colors">
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                  <button onClick={() => setView('hub')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                      </div>
                      <div>
                          <h2 className="font-bold text-slate-900 dark:text-white leading-tight">Student Lounge</h2>
                          <p className="text-xs text-green-500 font-medium">● Online</p>
                      </div>
                  </div>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] dark:bg-slate-950/50 dark:bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              {messages.map((msg) => {
                  const isMe = msg.senderId === auth.user?.id;
                  return (
                      <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} animate-fade-in group`}>
                          {!isMe && <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden shrink-0"><img src={msg.avatarUrl || `https://ui-avatars.com/api/?name=${msg.senderName}`} className="w-full h-full object-cover" /></div>}
                          
                          <div className={`relative max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-2 shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none'}`}>
                              {!isMe && <div className="flex items-center gap-1 mb-1"><span className={`text-xs font-bold ${['admin', 'executive'].includes(msg.senderRole || '') ? 'text-rose-500' : 'text-indigo-500'}`}>{msg.senderName}</span><VerificationBadge role={msg.senderRole || 'student'} isVerified={msg.isVerified} className="w-3 h-3" /></div>}
                              
                              {msg.imageUrl && <img src={msg.imageUrl} alt="Attachment" className="rounded-lg mb-2 max-w-full h-auto cursor-pointer hover:opacity-90 border-2 border-transparent hover:border-white/20" onClick={() => window.open(msg.imageUrl, '_blank')} />}
                              
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                              
                              <div className={`flex items-center justify-end gap-1 mt-1 opacity-70`}>
                                  <span className="text-[10px]">{new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                  {isMe && <span className="text-[10px]">✓✓</span>}
                              </div>

                              {isMe && (
                                  <button onClick={() => handleDeleteMessage(msg.id)} className="absolute top-0 -left-8 p-1 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                              )}
                          </div>
                      </div>
                  );
              })}
              <div ref={dummyRef}></div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative z-20">
              {/* Image Preview Modal Overlay */}
              {previewImage && (
                  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 w-full max-w-md shadow-2xl animate-fade-in-up">
                          <div className="relative mb-4 rounded-xl overflow-hidden bg-slate-900">
                              <img src={URL.createObjectURL(previewImage)} alt="Preview" className="max-h-[60vh] w-full object-contain mx-auto" />
                              <button onClick={cancelImagePreview} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-rose-500 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                          <div className="flex gap-2">
                              <input 
                                  autoFocus
                                  className="flex-1 bg-slate-100 dark:bg-slate-700 dark:text-white px-4 py-3 rounded-xl outline-none" 
                                  placeholder="Add a caption..." 
                                  value={imageCaption}
                                  onChange={e => setImageCaption(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                              />
                              <button onClick={handleSend} disabled={sending} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                  {sending ? <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Attach Image">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                  
                  <input 
                      value={newMessage} 
                      onChange={e => setNewMessage(e.target.value)} 
                      className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-5 py-3 focus:outline-none text-sm dark:text-white border border-transparent focus:border-indigo-300 dark:focus:border-indigo-700 transition-colors" 
                      placeholder="Type a message..." 
                  />
                  <button type="submit" disabled={!newMessage.trim() || sending} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg">
                      {sending ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                  </button>
              </form>
          </div>
      </div>
  );
};
