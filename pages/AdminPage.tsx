import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  const [stats, setStats] = useState({ users: 0, activeUsers: 0, pendingMaterials: 0, materials: 0, pendingLostFound: 0 });
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const role = auth?.user?.role || 'student';
  const isSuperAdmin = role === 'admin';
  const isLibrarian = role === 'librarian';
  const isVP = role === 'vice_president';

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const uSnap = await getDocs(collection(db, 'users'));
            const pMatSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'pending')));
            const pLostSnap = await getDocs(query(collection(db, 'lost_items'), where('status', '==', 'pending')));
            setStats({ 
                users: uSnap.size, 
                activeUsers: 0, 
                materials: 0, 
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
          showNotification("Broadcast sent to all users!", "success");
          setIsBroadcastOpen(false);
          setBroadcastMsg('');
      } catch (e) { showNotification("Broadcast failed", "error"); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-4xl font-serif font-black text-slate-900">PRO Command Center</h1>
                <p className="text-slate-500 font-medium">Welcome back, {auth?.user?.name.split(' ')[0]}. Here's the state of the portal.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsBroadcastOpen(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    Broadcast Alert
                </button>
            </div>
        </header>

        {/* GUIDANCE BOX FOR FUTURE PROS */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 p-10 opacity-10"><svg className="w-40 h-40" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg></div>
            <div className="relative z-10 max-w-2xl">
                <span className="bg-indigo-500 text-[10px] font-black uppercase px-3 py-1 rounded-full mb-4 inline-block">PRO Handbook</span>
                <h2 className="text-2xl font-bold mb-3">Maintaining the Portal</h2>
                <p className="text-indigo-200 text-sm leading-relaxed mb-6">Success as a PRO depends on engagement. Every morning, check <b>Pending Approvals</b> to verify student uploads. Use <b>Broadcasts</b> for urgent departmental news, and keep the <b>Gallery</b> fresh with recent event photos.</p>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/admin/approvals')} className="bg-white text-indigo-950 px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-50 transition-all">Review Submissions ({stats.pendingMaterials})</button>
                    <button onClick={() => navigate('/admin/content')} className="bg-indigo-500/30 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-500/50 transition-all">Post News</button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div onClick={() => navigate('/admin/approvals')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Pending Tasks</h3>
                <p className="text-4xl font-black text-slate-900">{stats.pendingMaterials + stats.pendingLostFound}</p>
            </div>
            <div onClick={() => navigate('/admin/users')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
                <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Total Verified</h3>
                <p className="text-4xl font-black text-slate-900">{stats.users}</p>
            </div>
        </div>

        {isBroadcastOpen && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 animate-fade-in-up">
                    <h3 className="text-2xl font-bold mb-2">Send Broadcast</h3>
                    <p className="text-slate-500 text-sm mb-6">This will notify all students instantly.</p>
                    <textarea className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none mb-6 min-h-[150px]" placeholder="Type important update..." value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)}></textarea>
                    <div className="flex gap-3">
                        <button onClick={() => setIsBroadcastOpen(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
                        <button onClick={handleBroadcast} className="flex-2 py-4 px-8 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30">Send All</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};