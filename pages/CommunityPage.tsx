
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDocs, updateDoc, increment } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { VerificationBadge } from '../components/VerificationBadge';
import { Role, BadgeType, CommunityGroup } from '../types';
import { uploadToImgBB } from '../utils/api';

interface Message {
    id: string; text: string; imageUrl?: string; senderId: string; senderName: string; senderRole?: Role; 
    isVerified?: boolean; senderBadges?: BadgeType[]; createdAt: string; avatarUrl?: string;
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

  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
      if (view === 'chat') {
          const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'asc'));
          return onSnapshot(q, (snapshot) => {
              setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
          });
      }
      if (view === 'hub') {
          const fetchGroups = async () => {
              setLoadingGroups(true);
              try {
                  const snap = await getDocs(collection(db, 'groups'));
                  setGroups(snap.docs.map(d => ({id: d.id, ...d.data()}) as CommunityGroup));
              } catch (e) { console.error(e); }
              finally { setLoadingGroups(false); }
          };
          fetchGroups();
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
              text: newMessage.trim(), imageUrl, senderId: auth.user.id, senderName: displayName,
              senderRole: auth.user.role, isVerified: auth.user.isVerified || false,
              senderBadges: auth.user.badges || [], avatarUrl: auth.user.avatarUrl || '',
              createdAt: new Date().toISOString()
          });
          const userRef = doc(db, 'users', auth.user.id);
          await updateDoc(userRef, { messageCount: increment(1) });
          if ((auth.user.messageCount || 0) + 1 >= 50 && !auth.user.badges?.includes('chatty')) {
              await updateDoc(userRef, { badges: [...(auth.user.badges || []), 'chatty'] });
          }
          setNewMessage(''); setPreviewImage(null);
      } catch (error: any) { showNotification("Failed to send.", "error"); } 
      finally { setSending(false); }
  };

  if (view === 'hub') {
      return (
          <div className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full">
              <div className="max-w-4xl mx-auto">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Community Hub</h1>
                  <p className="text-slate-500 dark:text-slate-400 mb-8">Engage with fellow students and join study groups.</p>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-8">
                      <h2 className="font-bold text-xl text-slate-800 dark:text-white mb-4">Student Lounge</h2>
                      <p className="text-slate-600 dark:text-slate-400 mb-6">A real-time public chat room for all registered finance students to discuss topics, share ideas, and connect.</p>
                      <button onClick={() => setView('chat')} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Enter Chat Room</button>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                       <h2 className="font-bold text-xl text-slate-800 dark:text-white mb-4">Official Groups</h2>
                       {loadingGroups ? <p className="text-sm text-slate-500">Loading groups...</p> : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {groups.map(group => (
                                  <a key={group.id} href={group.link} target="_blank" rel="noopener noreferrer" className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                      <h3 className="font-bold text-slate-800 dark:text-white">{group.name}</h3>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{group.description}</p>
                                  </a>
                              ))}
                          </div>
                       )}
                  </div>
              </div>
          </div>
      );
  }

  return (
      <div className="h-screen bg-slate-100 dark:bg-slate-900 flex flex-col transition-colors">
          <header className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex justify-between items-center z-10 shadow-sm">
              <div className="flex items-center gap-2">
                  <button onClick={() => setView('hub')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500">← Back to Hub</button>
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white">Student Lounge</h2>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.map(msg => {
                  const isMe = msg.senderId === auth.user?.id;
                  return (
                      <div key={msg.id} className={`flex gap-3 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'} animate-fade-in group`}>
                          {!isMe && <img src={msg.avatarUrl || `https://ui-avatars.com/api/?name=${msg.senderName}`} className="w-8 h-8 rounded-full shadow-sm" />}
                          <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none'}`}>
                              {!isMe && <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">{msg.senderName}</span><VerificationBadge role={msg.senderRole} isVerified={msg.isVerified} badges={msg.senderBadges} className="w-3 h-3" /></div>}
                              {msg.imageUrl && <img src={msg.imageUrl} className="rounded-lg mb-2 max-w-full h-auto" />}
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              <div className={`text-[10px] mt-1 opacity-70 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                          </div>
                      </div>
                  );
              })}
              <div ref={dummyRef}></div>
          </main>
          <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-indigo-600 transition-colors">📎</button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && setPreviewImage(e.target.files[0])} />
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full px-5 py-3 outline-none text-sm dark:text-white" placeholder="Type a message..." />
              <button type="submit" disabled={!newMessage.trim() && !previewImage || sending} className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg disabled:opacity-50">→</button>
          </form>
      </div>
  );
};
