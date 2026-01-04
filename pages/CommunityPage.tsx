import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { VerificationBadge } from '../components/VerificationBadge';
import { Role, BadgeType } from '../types';
import { uploadToImgBB } from '../utils/api';

interface Message {
    id: string;
    text: string;
    imageUrl?: string;
    senderId: string;
    senderName: string;
    senderRole?: Role; 
    isVerified?: boolean; 
    senderBadges?: BadgeType[];
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<File | null>(null);

  useEffect(() => {
      if (view === 'chat') {
          const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'asc'));
          return onSnapshot(q, (snapshot) => {
              setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
          });
      }
  }, [view]);

  useEffect(() => {
      if (view === 'chat') dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view]);

  const handleSend = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if ((!newMessage.trim() && !previewImage) || !auth?.user || sending) return;

      setSending(true);
      try {
          let imageUrl = '';
          if (previewImage) imageUrl = await uploadToImgBB(previewImage);

          const displayName = auth.user.username ? `@${auth.user.username}` : auth.user.name;
          await addDoc(collection(db, 'community_messages'), {
              text: newMessage.trim(),
              imageUrl,
              senderId: auth.user.id,
              senderName: displayName,
              senderRole: auth.user.role,
              isVerified: auth.user.isVerified || false,
              senderBadges: auth.user.badges || [],
              avatarUrl: auth.user.avatarUrl || '',
              createdAt: new Date().toISOString()
          });
          
          // Reward "Chatty" badge after 50 messages
          const userRef = doc(db, 'users', auth.user.id);
          await updateDoc(userRef, { messageCount: increment(1) });
          if ((auth.user.messageCount || 0) + 1 >= 50 && !auth.user.badges?.includes('chatty')) {
              await updateDoc(userRef, { badges: arrayUnion('chatty') });
          }

          setNewMessage('');
          setPreviewImage(null);
      } catch (error: any) {
          showNotification("Failed to send.", "error");
      } finally {
          setSending(false);
      }
  };

  if (view === 'hub') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-fade-in transition-colors">
              <div className="container mx-auto max-w-4xl pt-10">
                  <h1 className="text-5xl font-serif font-black text-center text-slate-900 dark:text-white mb-4">The Square</h1>
                  <p className="text-center text-slate-500 mb-12">Connect with the departmental community.</p>
                  <div className="grid md:grid-cols-2 gap-8">
                      <button onClick={() => setView('chat')} className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl hover:scale-[1.02] transition-transform text-left group">
                          <h3 className="text-3xl font-bold mb-2">Student Lounge</h3>
                          <p className="text-indigo-100 opacity-80">General chat room for all students.</p>
                          <div className="mt-8 inline-flex items-center gap-2 bg-white/20 px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest">Open Chat →</div>
                      </button>
                      <div className="space-y-4">
                          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                             <h4 className="font-bold text-slate-800 dark:text-white mb-2">Help Center</h4>
                             <p className="text-xs text-slate-500">Find partners for study or ask questions about departmental issues.</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
      <div className="h-screen bg-slate-100 dark:bg-slate-950 flex flex-col transition-colors relative z-0">
          <div className="px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10 shadow-sm">
              <div className="flex items-center gap-4">
                  <button onClick={() => setView('hub')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">←</button>
                  <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Lounge</h2>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950">
              {messages.map((msg) => {
                  const isMe = msg.senderId === auth.user?.id;
                  return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} animate-fade-in group`}>
                          {!isMe && <div className="w-10 h-10 rounded-2xl bg-slate-200 overflow-hidden shrink-0 shadow-sm"><img src={msg.avatarUrl || `https://ui-avatars.com/api/?name=${msg.senderName}`} className="w-full h-full object-cover" /></div>}
                          <div className={`max-w-[80%] rounded-[2rem] px-6 py-4 shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-800'}`}>
                              {!isMe && (
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400">{msg.senderName}</span>
                                    <VerificationBadge role={msg.senderRole} isVerified={msg.isVerified} badges={msg.senderBadges} className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {msg.imageUrl && <img src={msg.imageUrl} className="rounded-2xl mb-3 max-w-full h-auto" />}
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                              <div className="flex justify-end mt-1.5 opacity-30 text-[9px] font-bold">
                                  {new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </div>
                          </div>
                      </div>
                  );
              })}
              <div ref={dummyRef}></div>
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-indigo-600 transition-colors">📎</button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && setPreviewImage(e.target.files[0])} />
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl px-6 py-3.5 outline-none text-sm dark:text-white" placeholder="Say something..." />
              <button type="submit" disabled={!newMessage.trim() && !previewImage || sending} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-500/20 disabled:opacity-30">Send</button>
          </form>

          {previewImage && (
              <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-md">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] w-full max-w-md">
                      <img src={URL.createObjectURL(previewImage)} className="rounded-[1.5rem] mb-6 max-h-[60vh] w-full object-contain" />
                      <div className="flex gap-3">
                          <button type="button" onClick={() => setPreviewImage(null)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
                          <button onClick={handleSend} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl">Post</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};