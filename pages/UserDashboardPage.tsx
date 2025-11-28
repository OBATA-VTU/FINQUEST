import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserDashboardPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;

  if (!user) return null;

  const quickActions = [
    { label: 'Past Questions', desc: 'Browse Archive', icon: '📚', path: '/questions', color: 'bg-indigo-100 text-indigo-600' },
    { label: 'Community', desc: 'Join Groups', icon: '💬', path: '/community', color: 'bg-rose-100 text-rose-600' },
    { label: 'My Profile', desc: 'Edit Details', icon: '👤', path: '/profile', color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Lecturers', desc: 'View Directory', icon: '👨‍🏫', path: '/lecturers', color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-8 md:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             <div className="relative z-10">
                 <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Welcome back, {user.name.split(' ')[0]}!</h1>
                 <p className="text-indigo-200 text-lg max-w-2xl">You are logged in as a <span className="text-white font-bold">{user.level} Level</span> Student. Ready to continue your academic journey?</p>
             </div>
        </div>

        {/* Quick Actions Grid */}
        <h2 className="text-xl font-bold text-slate-800 mb-6 px-2">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {quickActions.map((action, idx) => (
                <button 
                    key={idx}
                    onClick={() => navigate(action.path)}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all text-left group"
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${action.color} group-hover:scale-110 transition-transform`}>
                        {action.icon}
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{action.label}</h3>
                    <p className="text-slate-500 text-sm">{action.desc}</p>
                </button>
            ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Recent Activity / Stats */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-6 text-lg">Academic Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-3xl font-bold text-indigo-600 mb-1">{user.level}</span>
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Level</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-3xl font-bold text-emerald-600 mb-1">Active</span>
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Status</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hidden md:block">
                            <span className="block text-3xl font-bold text-rose-600 mb-1">Student</span>
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Role</span>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-indigo-900 mb-2">Have a past question to share?</h3>
                        <p className="text-indigo-700 text-sm mb-4">Contribute to the archive and help your junior colleagues.</p>
                        <button onClick={() => navigate('/questions')} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 transition">Upload Now</button>
                    </div>
                    <div className="text-6xl hidden sm:block">📤</div>
                </div>
            </div>

            {/* Right: Profile Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 h-fit">
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden mb-4 border-4 border-slate-50 shadow-inner">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">
                                {user.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <h3 className="font-bold text-xl text-slate-900">{user.name}</h3>
                    <p className="text-slate-500 text-sm mb-6">{user.email}</p>
                    
                    <div className="w-full border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">Username</span>
                            <span className="text-sm font-bold text-slate-700">@{user.username}</span>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-sm text-slate-500">Matric No</span>
                            <span className="text-sm font-bold text-slate-700 font-mono">{user.matricNumber || 'N/A'}</span>
                        </div>
                        <button onClick={() => navigate('/profile')} className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                            View Full Profile
                        </button>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};