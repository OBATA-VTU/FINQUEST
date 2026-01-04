
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';

const StatCard: React.FC<{ title: string; value: string | number; color: string; onClick: () => void; subtitle?: string; }> = ({ title, value, color, onClick, subtitle }) => (
    <div onClick={onClick} className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-${color}-300 transition-all cursor-pointer group`}>
        <h3 className={`text-sm font-bold uppercase text-slate-500`}>{title}</h3>
        <p className={`text-5xl font-black text-${color}-600 mt-2`}>{value}</p>
        {subtitle && <p className="text-xs font-bold text-slate-400 mt-1">{subtitle}</p>}
    </div>
);

const ActionLink: React.FC<{ to: string; icon: string; label: string; }> = ({ to, icon, label }) => (
    <Link to={to} className="bg-slate-50 p-4 rounded-lg text-center hover:bg-slate-100 transition-colors">
        <span className="text-3xl block mb-2">{icon}</span>
        <span className="font-bold text-sm text-slate-700">{label}</span>
    </Link>
);


export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  const [stats, setStats] = useState({ users: 0, pendingMaterials: 0, pendingLostFound: 0, active: 0 });
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const uSnap = await getDocs(collection(db, 'users'));
            const pMatSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'pending')));
            const pLostSnap = await getDocs(query(collection(db, 'lost_items'), where('status', '==', 'pending')));
            
            const now = Date.now();
            const tenMinutesAgo = now - (10 * 60 * 1000);
            const activeUsers = uSnap.docs.filter(d => {
                const user = d.data();
                if (!user.lastActive) return false;
                return new Date(user.lastActive).getTime() > tenMinutesAgo;
            }).length;

            setStats({ 
                users: uSnap.size, 
                pendingMaterials: pMatSnap.size, 
                pendingLostFound: pLostSnap.size,
                active: activeUsers
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
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500">Overview of portal activity and management tasks.</p>
            </div>
            <button onClick={() => setIsBroadcastOpen(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 flex items-center gap-2 text-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Broadcast
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Pending Approvals" value={stats.pendingMaterials + stats.pendingLostFound} color="rose" onClick={() => navigate('/admin/approvals')} />
            <StatCard title="Total Users" value={stats.users} color="indigo" onClick={() => navigate('/admin/users')} />
            <StatCard title="Active Users" value={stats.active} color="emerald" onClick={() => navigate('/admin/active-users')} subtitle="Online Now" />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-800">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ActionLink to="/admin/approvals" icon="✅" label="Approvals" />
                <ActionLink to="/admin/content" icon="📝" label="Content" />
                <ActionLink to="/admin/users" icon="👥" label="Users" />
                <ActionLink to="/admin/settings" icon="⚙️" label="Settings" />
            </div>
        </div>

        {isBroadcastOpen && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6 animate-fade-in-up">
                    <h3 className="text-xl font-bold mb-2">Send Broadcast</h3>
                    <p className="text-slate-500 text-sm mb-6">Type a message for all students.</p>
                    <textarea className="w-full border-2 border-slate-200 p-4 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-6" placeholder="e.g. Exam timetable is out!" value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)}></textarea>
                    <div className="flex gap-3">
                        <button onClick={() => setIsBroadcastOpen(false)} className="flex-1 py-3 font-bold text-slate-500 border border-slate-200 rounded-lg">Cancel</button>
                        <button onClick={handleBroadcast} className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-lg font-bold">Dispatch</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
