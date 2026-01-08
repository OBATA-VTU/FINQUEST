
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { Notification } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const highlightId = location.state?.highlightId;

    useEffect(() => {
        if (!auth?.user) { setLoading(false); return; }
        const q = query(collection(db, 'notifications'), where('userId', 'in', [auth.user.id, 'all']));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Notification))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotifications(notes);
            setLoading(false);
            if (highlightId) {
                const noteToRead = notes.find(n => n.id === highlightId);
                if (noteToRead && !noteToRead.read) {
                  // Fire-and-forget update, onSnapshot will handle the UI change eventually.
                  markAsRead(highlightId);
                }
            }
        });
        return () => unsubscribe();
    }, [auth?.user, highlightId]);

    const markAsRead = async (id: string) => {
        try { await updateDoc(doc(db, 'notifications', id), { read: true }); } catch (e) {}
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
        
        // Optimistic UI update for better UX
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        
        try {
            const batch = writeBatch(db);
            unread.forEach(note => {
                const noteRef = doc(db, 'notifications', note.id);
                batch.update(noteRef, { read: true });
            });
            await batch.commit();
        } catch (e) {
            console.error("Failed to mark all as read", e);
            // Revert UI on failure if needed, though onSnapshot should correct it.
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch(type) {
            case 'success': return <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 p-3 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>;
            case 'warning':
            case 'error': return <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 p-3 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>;
            default: return <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 p-3 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
            <div className="container mx-auto max-w-3xl">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Notifications</h1>
                    {notifications.some(n => !n.read) && <button onClick={markAllAsRead} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Mark all as read</button>}
                </div>
                {loading ? <div className="text-center py-20 text-slate-500">Loading...</div> : notifications.length === 0 ? <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400">No notifications found.</div> : (
                    <div className="space-y-3">
                        {notifications.map(note => (
                            <div key={note.id} onClick={() => { if(!note.read) markAsRead(note.id); if(note.link) navigate(note.link); }} className={`p-5 rounded-2xl flex items-start gap-4 transition-all duration-300 border-2 relative ${note.read ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm'}`}>
                                {!note.read && <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></div>}
                                <div className="shrink-0">{getIcon(note.type)}</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 dark:text-white">{note.title || 'System Update'}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{note.message}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest">{new Date(note.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
