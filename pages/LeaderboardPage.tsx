
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { VerificationBadge } from '../components/VerificationBadge';

interface LeaderboardUser {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    contributionPoints: number;
    level: number;
    role: string;
    isVerified: boolean;
}

export const LeaderboardPage: React.FC = () => {
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Fetch top 50 users by points
                const q = query(collection(db, 'users'), orderBy('contributionPoints', 'desc'), limit(50));
                const snap = await getDocs(q);
                
                const data = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as LeaderboardUser))
                    .filter(u => u.contributionPoints > 0); // Only show if they have points

                setUsers(data);
            } catch (e) {
                console.error("Failed to fetch leaderboard", e);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    // Calculate Percentage relative to highest score (or 1000 if highest is low)
    const getPercentage = (points: number) => {
        if (users.length === 0) return 0;
        const highest = Math.max(users[0].contributionPoints, 100); // Baseline 100 points
        return ((points / highest) * 100).toFixed(2);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 transition-colors animate-fade-in">
            <div className="container mx-auto max-w-4xl">
                <div className="text-center mb-12">
                    <span className="text-amber-500 font-bold tracking-widest text-xs uppercase mb-2 block animate-pulse">Top Contributors</span>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-4">Global Leaderboard</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">Ranking based on total contribution points earned across the platform.</p>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 animate-float">
                        <div className="text-6xl mb-4 grayscale opacity-50">🏆</div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Leaderboard Empty</h3>
                        <p className="text-slate-500 dark:text-slate-500 mt-2">Be the first to earn points by taking tests or uploading materials!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {users.map((user, idx) => {
                            const rank = idx + 1;
                            const isTop3 = rank <= 3;
                            
                            return (
                                <div 
                                    key={user.id} 
                                    className={`relative flex items-center p-4 md:p-6 rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-xl group overflow-hidden animate-slide-in-up
                                        ${rank === 1 ? 'bg-gradient-to-r from-amber-200 to-yellow-100 border-2 border-amber-400 shadow-amber-200/50 z-10' : 
                                          rank === 2 ? 'bg-gradient-to-r from-slate-200 to-slate-100 border-2 border-slate-400 shadow-slate-200/50' : 
                                          rank === 3 ? 'bg-gradient-to-r from-orange-200 to-orange-100 border-2 border-orange-400 shadow-orange-200/50' : 
                                          'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}
                                    `}
                                    style={{ animationDelay: `${idx * 70}ms` }}
                                >
                                    {/* Rank Badge */}
                                    <div className="flex-shrink-0 w-12 text-center mr-4">
                                        {rank === 1 ? <span className="text-4xl">🥇</span> :
                                         rank === 2 ? <span className="text-4xl">🥈</span> :
                                         rank === 3 ? <span className="text-4xl">🥉</span> :
                                         <span className="text-xl font-black text-slate-400 font-mono">#{rank}</span>}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-shrink-0 mr-4">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full p-1 ${isTop3 ? 'bg-white/50' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">{user.name.charAt(0)}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold text-base md:text-lg truncate ${rank === 1 ? 'text-amber-900' : 'text-slate-900 dark:text-white'}`}>
                                                {user.name}
                                            </h3>
                                            <VerificationBadge role={user.role as any} isVerified={user.isVerified} className="w-4 h-4" />
                                        </div>
                                        <p className={`text-xs ${rank === 1 ? 'text-amber-800' : 'text-slate-500 dark:text-slate-400'}`}>@{user.username} • {user.level}L</p>
                                        
                                        {/* Progress Bar Visual */}
                                        <div className="mt-2 w-full max-w-xs h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${rank === 1 ? 'bg-amber-600' : 'bg-indigo-600'}`} 
                                                style={{ width: `${getPercentage(user.contributionPoints)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Points */}
                                    <div className="flex-shrink-0 text-right pl-4">
                                        <div className={`text-2xl md:text-3xl font-black ${rank === 1 ? 'text-amber-700' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                            {user.contributionPoints}
                                        </div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider ${rank === 1 ? 'text-amber-800' : 'text-slate-400'}`}>
                                            Points ({getPercentage(user.contributionPoints)}%)
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};