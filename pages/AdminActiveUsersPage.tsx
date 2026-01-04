
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { VerificationBadge } from '../components/VerificationBadge';
import { User } from '../types';

const INACTIVITY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export const AdminActiveUsersPage: React.FC = () => {
    const [activeUsers, setActiveUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAndFilterUsers = async () => {
            setLoading(true);
            try {
                const snap = await getDocs(collection(db, 'users'));
                const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
                
                const now = Date.now();
                const filtered = allUsers.filter(u => {
                    if (!u.lastActive) return false;
                    const lastActiveTime = new Date(u.lastActive).getTime();
                    return (now - lastActiveTime) < INACTIVITY_THRESHOLD_MS;
                });
                
                // Sort by most recent activity
                filtered.sort((a, b) => new Date(b.lastActive!).getTime() - new Date(a.lastActive!).getTime());

                setActiveUsers(filtered);
            } catch (error) {
                console.error("Failed to fetch active users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndFilterUsers();
        // Set up a poller to refresh active users every 30 seconds
        const interval = setInterval(fetchAndFilterUsers, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Active Users</h1>
                <p className="text-sm text-slate-500">
                    Showing users active in the last 10 minutes. This list auto-refreshes.
                </p>
            </div>
            
            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading active user list...</div>
            ) : activeUsers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium">No users are currently active.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <ul className="divide-y divide-slate-100">
                        {activeUsers.map(user => (
                            <li key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden">
                                            {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt={user.name} /> : user.name?.[0]}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                            {user.name}
                                            <VerificationBadge role={user.role} isVerified={user.isVerified} className="w-4 h-4" />
                                        </p>
                                        <p className="text-xs text-slate-500">@{user.username || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                        Online
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Last seen: {new Date(user.lastActive!).toLocaleTimeString()}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
