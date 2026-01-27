

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
  const [systemHealth, setSystemHealth] = useState({ status: 'Online', latency: '24ms', aiCredits: 'Checking...', dbStatus: 'Connected' });
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  const role = auth?.user?.role || 'student';
  const isSuperAdmin = role === 'admin';
  const isLibrarian = role === 'librarian';
  const isVP = role === 'vice_president';

  useEffect(() => {
    const fetchStats = async () => {
        const start = Date.now();
        try {
            // General Stats
            if (!isLibrarian) {
                const uSnap = await getDocs(collection(db, 'users'));
                const tenMinutesAgo = new Date().getTime() - (10 * 60 * 1000);
                const activeCount = uSnap.docs.filter(doc => {
                    const data = doc.data();
                    return data.lastActive && new Date(data.lastActive).getTime() > tenMinutesAgo;
                }).length;
                
                setStats(prev => ({ ...prev, users: uSnap.size, activeUsers: activeCount }));
            }

            if (!isVP) {
                const qSnap = await getDocs(collection(db, 'questions'));
                const pMatSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'pending')));
                setStats(prev => ({ ...prev, materials: qSnap.size, pendingMaterials: pMatSnap.size }));
            }

            if (!isLibrarian) {
                const pLostSnap = await getDocs(query(collection(db, 'lost_items'), where('status', '==', 'pending')));
                setStats(prev => ({ ...prev, pendingLostFound: pLostSnap.size }));
            }

            // Health & AI Stats
            const usageRef = doc(db, 'system_stats', 'ai_usage');
            const usageSnap = await getDoc(usageRef);
            let totalCalls = 0;
            if (usageSnap.exists()) {
                totalCalls = usageSnap.data().total_calls || 0;
            }
            
            // Latency Check
            const end = Date.now();
            setSystemHealth({
                status: 'Optimal',
                latency: `${end - start}ms`,
                aiCredits: `Usage: ${totalCalls} calls`, // Approximating health by tracking usage
                dbStatus: 'Connected'
            });

        } catch (e) { 
            console.error(e);
            setSystemHealth(prev => ({ ...prev, status: 'Issues Detected', dbStatus: 'Error' }));
        }
    };
    fetchStats();
  }, [isLibrarian, isVP]);

  const handleBroadcast = async () => {
      if (!broadcastMsg.trim()) return;
      try {
          await addDoc(collection(db, 'notifications'), {
              userId: 'all',
              message: broadcastMsg,
              type: 'info',
              read: false,
              createdAt: new Date().toISOString()
          });
          showNotification("Broadcast sent to all users!", "success");
          setIsBroadcastOpen(false);
          setBroadcastMsg('');
      } catch (e) { showNotification("Broadcast failed", "error"); }
  };

  const StatCard = ({ title, value, color, icon, link, visible = true }: any) => {
      if (!visible) return null;
      
      const darkColorMap: { [key: string]: string } = {
        'text-indigo-600': 'dark:text-indigo-400',
        'text-emerald-500': 'dark:text-emerald-400',
        'text-blue-600': 'dark:text-blue-400',
      };
      const darkColorClass = darkColorMap[color] || '';

      return (
        <div onClick={() => link && navigate(link)} className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${link ? '' : 'cursor-default'}`}>
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                {icon}
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-2">{title}</h3>
            <p className={`text-4xl font-bold ${color} ${darkColorClass}`}>{value}</p>
            {link && <div className="mt-4 text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">View Details &rarr;</div>}
        </div>
      );
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-20">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {isLibrarian ? 'Library Dashboard' : isVP ? 'VP Dashboard' : 'Main Dashboard'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Platform overview and quick actions.</p>
        </div>

        {/* System Health Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 text-white p-4 rounded-xl flex flex-col justify-between shadow-lg">
                <span className="text-[10px] uppercase text-slate-400 font-bold">System Status</span>
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${systemHealth.status === 'Optimal' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="font-bold">{systemHealth.status}</span>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Latency</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{systemHealth.latency}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase text-slate-400 font-bold">AI Usage</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{systemHealth.aiCredits}</span>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Database</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{systemHealth.dbStatus}</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Total Users" value={stats.users} color="text-indigo-600" link="/admin/users" visible={!isLibrarian} 
                icon={<svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>}
            />
            <StatCard 
                title="Active Now" value={stats.activeUsers} color="text-emerald-500" link="/admin/users" visible={!isLibrarian}
                icon={<svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
            />
            <StatCard 
                title="Study Materials" value={stats.materials} color="text-blue-600" link="/admin/materials" visible={!isVP} 
                icon={<svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>}
            />
            <div onClick={() => navigate('/admin/approvals')} className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${isVP ? 'hidden' : ''}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 text-rose-500">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                </div>
                <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-2">Pending Uploads</h3>
                <p className="text-4xl font-bold text-rose-500">{stats.pendingMaterials}</p>
                {stats.pendingMaterials > 0 && <div className="absolute top-6 right-6 w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>}
            </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase tracking-wide">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => navigate('/admin/materials')} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 hover:border-indigo-200 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 transition flex flex-col items-center gap-2 text-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <span className="text-xs font-bold">Manage Content</span>
                </button>
                <button onClick={() => navigate('/admin/approvals')} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:border-emerald-700 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition flex flex-col items-center gap-2 text-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-xs font-bold">Approvals</span>
                </button>
                {(isSuperAdmin || isVP) && (
                    <button onClick={() => setIsBroadcastOpen(true)} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-sky-50 hover:border-sky-200 dark:hover:border-sky-700 text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 transition flex flex-col items-center gap-2 text-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                        <span className="text-xs font-bold">Broadcast Alert</span>
                    </button>
                )}
                {isSuperAdmin && (
                    <button onClick={() => navigate('/admin/settings')} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-amber-50 hover:border-amber-200 dark:hover:border-amber-700 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 transition flex flex-col items-center gap-2 text-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-xs font-bold">Settings</span>
                    </button>
                )}
            </div>
        </div>

        {isBroadcastOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl animate-fade-in-down">
                    <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Global Broadcast</h3>
                    <textarea className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-4 dark:bg-slate-700 dark:border-slate-600 dark:text-white" rows={4} placeholder="Type announcement..." value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)}></textarea>
                    <div className="flex gap-2">
                        <button onClick={() => setIsBroadcastOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                        <button onClick={handleBroadcast} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Send All</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};