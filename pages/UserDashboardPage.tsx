
import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserDashboardPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;

  if (!user) return null;

  const quickActions = [
    { label: 'Past Questions', desc: 'Browse Archive', icon: '📚', path: '/questions', color: 'from-blue-500 to-indigo-600' },
    { label: 'Community', desc: 'Join Groups', icon: '💬', path: '/community', color: 'from-rose-500 to-pink-600' },
    { label: 'My Profile', desc: 'Edit Details', icon: '👤', path: '/profile', color: 'from-emerald-500 to-teal-600' },
    { label: 'Lecturers', desc: 'View Directory', icon: '👨‍🏫', path: '/lecturers', color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Premium Welcome Header */}
        <div className="relative overflow-hidden rounded-3xl bg-indigo-900 text-white shadow-2xl">
             <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 rounded-full bg-indigo-500 blur-3xl opacity-20"></div>
             <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 rounded-full bg-purple-500 blur-3xl opacity-20"></div>
             
             <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-8">
                 <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/20 shadow-xl overflow-hidden bg-indigo-800 shrink-0">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-indigo-200">
                            {user.name.charAt(0)}
                        </div>
                    )}
                 </div>
                 <div className="text-center md:text-left">
                     <h1 className="text-3xl md:text-5xl font-serif font-bold mb-2 tracking-tight">
                        Hello, {user.name.split(' ')[0]}
                     </h1>
                     <p className="text-indigo-200 text-lg mb-6 max-w-xl">
                        Welcome to your student portal. You are currently logged in as a <span className="font-bold text-white">{user.level} Level</span> student.
                     </p>
                     <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium backdrop-blur-sm">
                            @{user.username}
                        </span>
                        <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium backdrop-blur-sm font-mono">
                            {user.matricNumber || 'No Matric No'}
                        </span>
                     </div>
                 </div>
             </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Overview & Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickActions.map((action, idx) => (
                    <button 
                        key={idx}
                        onClick={() => navigate(action.path)}
                        className="group relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 text-left"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${action.color} opacity-5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150`}></div>
                        
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-2xl text-white shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                            {action.icon}
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{action.label}</h3>
                        <p className="text-slate-500 text-sm">{action.desc}</p>
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Academic Stats */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Academic Status</h3>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase rounded-full tracking-wider">Active</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                            <span className="text-4xl font-black text-indigo-900 mb-2">{user.level}</span>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Current Level</span>
                        </div>
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                            <span className="text-4xl font-black text-indigo-900 mb-2">{user.role === 'admin' ? 'ADM' : 'STU'}</span>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Account Type</span>
                        </div>
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                            <span className="text-4xl font-black text-indigo-900 mb-2">AAUA</span>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Chapter</span>
                        </div>
                    </div>
                </div>

                {/* Contribution CTA */}
                <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-lg">
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                        <div>
                            <h3 className="font-bold text-xl mb-2">Help the Community</h3>
                            <p className="text-slate-300 text-sm max-w-md">Do you have past questions or materials that could help others? Upload them to the archive.</p>
                        </div>
                        <button onClick={() => navigate('/questions')} className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition shadow-lg shrink-0">
                            Upload Material
                        </button>
                    </div>
                    {/* Decor */}
                    <svg className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 text-white/5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                </div>
            </div>

            {/* Right Column: Recent Activity (Placeholder) */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col h-full">
                <h3 className="font-bold text-slate-800 text-lg mb-6">Recent Activity</h3>
                
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-slate-500 font-medium">No recent activity</p>
                    <p className="text-xs text-slate-400 mt-1">Your downloads and uploads will appear here.</p>
                </div>
                
                <button onClick={() => navigate('/profile')} className="w-full mt-8 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                    View Full Profile
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};
