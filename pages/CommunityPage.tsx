
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';
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
  const [sending, setSending] = useState(false);
  const dummyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      // Real-time listener
      const q = query(collection(db, 'community_messages'), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
          setMessages(msgs);
      });
      return () => unsubscribe();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
      dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Periodic cleanup (run once on mount, or could be a cloud function)
  useEffect(() => {
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
          console.error("Send error:", error);
          showNotification("Failed to send message: " + error.message, "error");
      } finally {
          setSending(false);
      }
  };

  if (!auth?.user) return <div className="text-center p-10 h-full flex items-center justify-center">Please login to join the chat.</div>;

  return (
    // Use calc(100dvh - header) to ensure full screen fit on mobile with address bar
    // header is approx 64px. Layout main container has flex-col.
    <div className="h-full flex flex-col bg-slate-50">
      
      <div className="flex-1 flex flex-col container mx-auto px-0 md:px-4 max-w-4xl h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white md:rounded-t-2xl border-b border-slate-200 p-4 shadow-sm flex items-center justify-between shrink-0 z-10">
            <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-800">Student Lounge</h1>
                <p className="text-xs text-green-500 font-bold flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live Chat</p>
            </div>
            <div className="text-xs text-slate-400">Messages auto-clear</div>
        </div>

        {/* Message Area */}
        <div className="flex-1 bg-white overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
                <div className="text-center text-slate-400 py-10 text-sm">No messages yet. Start the conversation!</div>
            )}
            {messages.map((msg) => {
                const isMe = msg.senderId === auth.user?.id;
                return (
                    <div key={msg.id} className={`flex gap-2 md:gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                            {msg.avatarUrl ? <img src={msg.avatarUrl} className="w-full h-full object-cover" alt="avatar" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">{msg.senderName[0]}</div>}
                        </div>
                        <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                            {!isMe && <p className="text-[10px] font-bold text-indigo-500 mb-1 leading-none">{msg.senderName}</p>}
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            <p className={`text-[9px] mt-1 text-right opacity-70`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                );
            })}
            <div ref={dummyRef} className="h-2"></div>
        </div>

        {/* Input Area - Sticky at bottom */}
        <div className="bg-white p-3 md:p-4 md:rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-slate-100 shrink-0 z-20">
            <form onSubmit={handleSend} className="flex gap-2 items-center">
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    placeholder="Type a message..." 
                    className="flex-1 border border-slate-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm md:text-base bg-slate-50" 
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
