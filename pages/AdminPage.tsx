
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const AdminPage: React.FC = () => {
  const [stats, setStats] = useState({ users: 0, pending: 0, questions: 0 });

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const uSnap = await getDocs(collection(db, 'users'));
            const qSnap = await getDocs(collection(db, 'questions'));
            const pSnap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'pending')));
            setStats({ users: uSnap.size, questions: qSnap.size, pending: pSnap.size });
        } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Total Users</h3>
                <p className="text-4xl font-bold text-indigo-900 mt-2">{stats.users}</p>
            </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Total Archives</h3>
                <p className="text-4xl font-bold text-emerald-600 mt-2">{stats.questions}</p>
            </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Pending Approvals</h3>
                <p className="text-4xl font-bold text-rose-500 mt-2">{stats.pending}</p>
                {stats.pending > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full animate-ping m-4"></div>}
            </div>
        </div>
        
        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
            Chart / Recent Activity Graph would go here.
        </div>
    </div>
  );
};
