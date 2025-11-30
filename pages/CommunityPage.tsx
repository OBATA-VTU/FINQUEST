
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const dummyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      // Real-time listener
      const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
          setMessages(msgs);
          dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
      return () => unsubscribe();
  }, []);

  const cleanupOldMessages = async () => {
      try {
          const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(q);
          if (snapshot.size > 100) {
              const toDelete = snapshot.docs.slice(100);
              toDelete.forEach(async (d) => await deleteDoc(d.ref));
          }
      } catch (e) { console.error("Cleanup error", e); }
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !auth?.user) return;

      try {
          await addDoc(collection(db, 'community_messages'), {
              text: newMessage,
              senderId: auth.user.id,
              senderName: auth.user.name,
              avatarUrl: auth.user.avatarUrl || '',
              createdAt: new Date().toISOString()
          });
          setNewMessage('');
          cleanupOldMessages(); // Trigger cleanup on send
      } catch (error) {
          showNotification("Failed to send message", "error");
      }
  };

  if (!auth?.user) return <div className="text-center p-10">Please login to join the chat.</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-4 md:pt-8 pb-4 h-[calc(100vh-64px)]">
      <div className="container mx-auto px-4 max-w-4xl flex-1 flex flex-col">
        <div className="bg-white rounded-t-2xl border-b border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
                <h1 className="text-xl font-bold text-slate-800">Student Lounge</h1>
                <p className="text-xs text-green-500 font-bold flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live Chat</p>
            </div>
            <div className="text-xs text-slate-400">Messages are auto-cleared daily</div>
        </div>

        <div className="flex-1 bg-white overflow-y-auto p-4 space-y-4 shadow-sm">
            {messages.map((msg) => {
                const isMe = msg.senderId === auth.user?.id;
                return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                            {msg.avatarUrl ? <img src={msg.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">{msg.senderName[0]}</div>}
                        </div>
                        <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                            {!isMe && <p className="text-[10px] font-bold text-indigo-500 mb-1">{msg.senderName}</p>}
                            <p>{msg.text}</p>
                            <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                );
            })}
            <div ref={dummyRef}></div>
        </div>

        <form onSubmit={handleSend} className="bg-white p-4 rounded-b-2xl shadow-sm border-t border-slate-100 flex gap-2">
            <input 
                type="text" 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
                placeholder="Type a message..." 
                className="flex-1 border border-slate-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
            <button type="submit" className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 shadow-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
        </form>
      </div>
    </div>
  );
};
