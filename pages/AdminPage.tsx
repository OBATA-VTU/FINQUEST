import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  const [stats, setStats] = useState({ users: 0, activeUsers: 0, pendingMaterials: 0, materials: 0, pendingLostFound: 0 });
  const [loading, setLoading] = useState(true);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('Global Announcement');

  const role = auth?.user?.role || 'student';

  useEffect(() => {
    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch Users and filter for 24h activity
            const uSnap = await getDocs(collection(db, 'users'));
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            const activeCount = uSnap.docs.filter(doc => {
                const data = doc.data();
                return data.lastActive && new Date(data.lastActive).getTime() > twentyFourHoursAgo;
            }).length;
            
            // Fetch Materials
            const qSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'approved')));
            const pMatSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'pending')));
            
            // Fetch Lost Items
            const pLostSnap = await getDocs(query(collection(db, 'lost_items'), where('status', '==', 'pending')));

            setStats({
                users: uSnap.size,
                activeUsers: activeCount,
                materials: qSnap.size,
                pendingMaterials: pMatSnap.size,
                pendingLostFound: pLostSnap.size
            });
        } catch (error) {
            console.error("Failed to fetch admin stats:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchStats();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!broadcastMsg.trim()) return;
      try {
          await addDoc(collection(db, 'notifications'), {
              userId: 'all',
              title: broadcastTitle,
              message: broadcastMsg,
              type: 'info',
              read: false,
              createdAt: new Date().toISOString()
          });
          showNotification("Broadcast sent to all students!", "success");
          setBroadcastMsg('');
          setIsBroadcastOpen(false);
      } catch (e) {
          showNotification("Failed to send broadcast", "error");
      }
  };

  const StatCard = ({ title, value, sub, link, color }: any) => (
      <Link to={link} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <div className="flex items-end justify-between">
              <div>
                  <p className={`text-4xl font-black ${color || 'text-slate-900 dark:text-white'}`}>{loading ? '...' : value}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
          </div>
      </Link>
  );

  return (
    <div className="animate-fade-in space-y-8 pb-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400">System overview and departmental management.</p>
            </div>
            <button 
                onClick={() => setIsBroadcastOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:-translate-y-1"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                Send Broadcast
            </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Students" value={stats.users} sub="Registered Profiles" link="/admin/users" />
            <StatCard title="Active Now" value={stats.activeUsers} sub="Active in last 24h" link="/admin/active-users" color="text-emerald-500" />
            <StatCard title="Study Materials" value={stats.materials} sub="Total approved items" link="/admin/materials" />
            <StatCard title="Pending Approvals" value={stats.pendingMaterials} sub="Action required" link="/admin/approvals" color={stats.pendingMaterials > 0 ? 'text-rose-500' : ''} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
                <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Quick Management
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link to="/admin/news" className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl flex items-center gap-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                        <div className="w-10 h-10 bg-white dark:bg-slate-600 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">Announcements</p>
                            <p className="text-xs text-slate-500">Post news and updates</p>
                        </div>
                    </Link>
                    <Link to="/admin/executives" className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl flex items-center gap-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                        <div className="w-10 h-10 bg-white dark:bg-slate-600 rounded-xl flex items-center justify-center text-rose-600 shadow-sm">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">Executives</p>
                            <p className="text-xs text-slate-500">Manage council directory</p>
                        </div>
                    </Link>
                </div>
            </div>

            <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg></div>
                <h3 className="font-bold text-indigo-200 mb-6 uppercase tracking-widest text-xs">System Health</h3>
                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center">
                        <span className="text-indigo-300 text-sm">Database</span>
                        <span className="text-emerald-400 font-bold text-sm">Online</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-indigo-300 text-sm">Cloud AI</span>
                        <span className="text-emerald-400 font-bold text-sm">Ready</span>
                    </div>
                </div>
            </div>
        </div>

        {isBroadcastOpen && (
            <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsBroadcastOpen(false)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-down" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold dark:text-white">Emergency Broadcast</h3>
                        <button onClick={() => setIsBroadcastOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    <form onSubmit={handleBroadcast} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title</label>
                            <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Message</label>
                            <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" rows={4} required />
                        </div>
                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all">Send Now</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
