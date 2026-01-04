import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  const [stats, setStats] = useState({ users: 0, pendingMaterials: 0, pendingLostFound: 0 });
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const uSnap = await getDocs(collection(db, 'users'));
            const pMatSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'pending')));
            const pLostSnap = await getDocs(query(collection(db, 'lost_items'), where('status', '==', 'pending')));
            setStats({ 
                users: uSnap.size, 
                pendingMaterials: pMatSnap.size, 
                pendingLostFound: pLostSnap.size 
            });
        } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

  const handleBroadcast = async () => {
      if (!broadcastMsg.trim()) return;
      try {
          await addDoc(collection(db, 'notifications'), {
              userId: 'all', message: broadcastMsg, type: 'info', read: false, createdAt: new Date().toISOString()
          });
          showNotification("Broadcast sent to all students!", "success");
          setIsBroadcastOpen(false);
          setBroadcastMsg('');
      } catch (e) { showNotification("Broadcast failed", "error"); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-4xl font-serif font-black text-slate-900">Command Center</h1>
                <p className="text-slate-500 font-medium">Hello PRO, here is the portal status for today.</p>
            </div>
            <button onClick={() => setIsBroadcastOpen(true)} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Broadcast Alert
            </button>
        </header>

        {/* GUIDANCE BOX FOR NEW PROs */}
        <div className="bg-indigo-950 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-indigo-900">
            <div className="relative z-10 max-w-2xl">
                <span className="bg-indigo-500/20 text-[10px] font-black uppercase px-3 py-1 rounded-full mb-4 inline-block border border-indigo-500/50">PRO Guide</span>
                <h2 className="text-3xl font-bold mb-4">Maintaining the Portal</h2>
                <p className="text-indigo-200 text-sm leading-relaxed mb-8">
                    Your main tasks are: (1) <b>Approve Submissions</b> from students daily to keep the archive fresh, (2) <b>Post Announcements</b> for department news, and (3) <b>Verify Users</b> to maintain academic integrity.
                </p>
                <div className="flex flex-wrap gap-4">
                    <button onClick={() => navigate('/admin/approvals')} className="bg-white text-indigo-950 px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-50">Review Submissions ({stats.pendingMaterials})</button>
                    <button onClick={() => navigate('/admin/content')} className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-600">Update News</button>
                </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div onClick={() => navigate('/admin/approvals')} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <h3 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Tasks Pending</h3>
                <p className="text-4xl font-black text-slate-900">{stats.pendingMaterials + stats.pendingLostFound}</p>
            </div>
            <div onClick={() => navigate('/admin/users')} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
                <h3 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Total Verified Students</h3>
                <p className="text-4xl font-black text-slate-900">{stats.users}</p>
            </div>
        </div>

        {isBroadcastOpen && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 animate-fade-in-up">
                    <h3 className="text-2xl font-bold mb-2">Send Broadcast</h3>
                    <p className="text-slate-500 text-sm mb-6">Type a message for all students.</p>
                    <textarea className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none mb-6 min-h-[150px]" placeholder="e.g. Exam timetable is out!" value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)}></textarea>
                    <div className="flex gap-3">
                        <button onClick={() => setIsBroadcastOpen(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
                        <button onClick={handleBroadcast} className="flex-2 py-4 px-8 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30">Dispatch</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};