
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
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

  const StatCard = ({ title, value, color, icon, link }: any) => (
      <div onClick={() => navigate(link)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:-translate-y-1">
          <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
              {icon}
          </div>
          <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-2">{title}</h3>
          <p className={`text-4xl font-bold ${color.replace('text', 'text')}`}>{value}</p>
          <div className="mt-4 text-xs font-medium text-slate-400 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
              Manage {title} &rarr;
          </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Overview of system status and activities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
                title="Users" 
                value={stats.users} 
                color="text-indigo-600" 
                link="/admin/users"
                icon={<svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>}
            />
            <StatCard 
                title="Archives" 
                value={stats.questions} 
                color="text-emerald-600" 
                link="/admin/approvals"
                icon={<svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>}
            />
            <div onClick={() => navigate('/admin/approvals')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:-translate-y-1">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 text-rose-500">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                </div>
                <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-2">Pending</h3>
                <p className="text-4xl font-bold text-rose-500">{stats.pending}</p>
                {stats.pending > 0 && <div className="absolute top-6 right-6 w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>}
                <div className="mt-4 text-xs font-medium text-slate-400 flex items-center gap-1 group-hover:text-rose-600 transition-colors">
                    Review Requests &rarr;
                </div>
            </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => navigate('/admin/content')} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 transition flex flex-col items-center gap-2 text-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <span className="text-xs font-bold">Post News</span>
                </button>
                <button onClick={() => navigate('/admin/content')} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-600 hover:text-emerald-700 transition flex flex-col items-center gap-2 text-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="text-xs font-bold">Add Executive</span>
                </button>
                <button onClick={() => navigate('/admin/approvals')} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 transition flex flex-col items-center gap-2 text-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-xs font-bold">Approve Files</span>
                </button>
                <button onClick={() => navigate('/admin/settings')} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-slate-600 hover:text-amber-700 transition flex flex-col items-center gap-2 text-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-xs font-bold">Settings</span>
                </button>
            </div>
        </div>
    </div>
  );
};
