
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserDashboardPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user;
  const [greeting, setGreeting] = useState('');
  const [profileComplete, setProfileComplete] = useState(0);

  useEffect(() => {
    // Smart Greeting based on Time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Smart Profile Completeness Logic
    if (user) {
        let score = 0;
        if (user.name) score += 20;
        if (user.email) score += 20;
        if (user.avatarUrl) score += 20;
        if (user.matricNumber) score += 20;
        if (user.level) score += 20;
        setProfileComplete(score);
    }
  }, [user]);

  if (!user) return null;

  // Icons (Heroicons style)
  const icons = {
      book: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
      chat: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      user: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      users: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      upload: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
      bell: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
  };

  const quickActions = [
    { label: 'Archive', desc: 'Browse Questions', icon: icons.book, path: '/questions', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { label: 'Community', desc: 'Join Groups', icon: icons.chat, path: '/community', color: 'bg-rose-50 text-rose-600 border-rose-200' },
    { label: 'Lecturers', desc: 'Directory', icon: icons.users, path: '/lecturers', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { label: 'Profile', desc: 'Settings', icon: icons.user, path: '/profile', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-serif font-bold text-slate-900">{greeting}, {user.name.split(' ')[0]}</h1>
                <p className="text-slate-500">Welcome to your student dashboard.</p>
            </div>
            <div className="flex items-center gap-3">
                <button className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 border border-slate-200 relative">
                    {icons.bell}
                    {/* Mock Notification Dot - Logic can be added later */}
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-sm font-medium text-slate-600">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        </div>

        {/* Profile Completeness Widget - Hidden if 100% */}
        {profileComplete < 100 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                 <div className="flex justify-between items-center mb-2">
                     <h3 className="font-bold text-slate-800">Profile Completeness</h3>
                     <span className="font-bold text-sm text-indigo-600">{profileComplete}%</span>
                 </div>
                 <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                     <div className="h-2.5 rounded-full bg-indigo-600 transition-all duration-1000" style={{ width: `${profileComplete}%` }}></div>
                 </div>
                 <p className="text-xs text-slate-500 cursor-pointer hover:text-indigo-600 hover:underline" onClick={() => navigate('/profile')}>Complete your profile to unlock full features &rarr;</p>
            </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider mb-1">Academic Level</p>
                        <h2 className="text-4xl font-bold">{user.level}L</h2>
                    </div>
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                        <svg className="w-6 h-6 text-indigo-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                 <div className="flex items-start justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">User Role</p>
                        <h2 className="text-2xl font-bold text-slate-800 capitalize">{user.role}</h2>
                        <p className="text-xs text-slate-400 mt-1">AAUA Chapter Member</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                         <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                 <div className="flex items-start justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Status</p>
                        <h2 className="text-2xl font-bold text-emerald-600">Active</h2>
                        <p className="text-xs text-slate-400 mt-1">Matric: {user.matricNumber || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg">
                         <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
            </div>
        </div>

        {/* Action Center */}
        <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, idx) => (
                    <button 
                        key={idx}
                        onClick={() => navigate(action.path)}
                        className={`p-6 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md text-left group ${action.color}`}
                    >
                        <div className="mb-4">{action.icon}</div>
                        <h3 className="font-bold text-lg mb-1">{action.label}</h3>
                        <p className="text-xs opacity-70">{action.desc}</p>
                    </button>
                ))}
            </div>
        </div>

        {/* Contribution Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                     <h3 className="text-xl font-bold mb-2">Contribute to the Archive</h3>
                     <p className="text-indigo-200 text-sm max-w-lg">Help your fellow students by uploading past questions you have. Every contribution makes the department stronger.</p>
                 </div>
                 <button onClick={() => navigate('/questions')} className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-900 font-bold rounded-lg hover:bg-indigo-50 transition shadow-lg whitespace-nowrap">
                     {icons.upload}
                     Upload Material
                 </button>
             </div>
        </div>

      </div>
    </div>
  );
};
