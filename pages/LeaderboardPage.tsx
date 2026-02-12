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

const TrophyIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H7M14 14.66V17c0 .55.45 1 1 1h2M12 4v10.66M6 4v7a6 6 0 0 0 12 0V4H6Z" />
    </svg>
);

const RankBadge = ({ rank }: { rank: number }) => {
    const colors = {
        1: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
        2: "text-slate-400 bg-slate-100 dark:bg-slate-700/30",
        3: "text-orange-500 bg-orange-100 dark:bg-orange-900/30"
    };
    if (rank <= 3) {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${colors[rank as 1|2|3]}`}>
                <TrophyIcon className="w-6 h-6" />
            </div>
        );
    }
    return <span className="text-xl font-black text-slate-400 font-mono">#{rank}</span>;
};

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
                    .filter(u => u.contributionPoints > 0); 

                setUsers(data);
            } catch (e) {
                console.error("Failed to fetch leaderboard", e);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getPercentage = (points: number) => {
        if (users.length === 0) return 0;
        const highest = Math.max(users[0].contributionPoints, 100); 
        return ((points / highest) * 100).toFixed(2);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 transition-colors animate-fade-in">
            <div className="container mx-auto max-w-4xl">
                <div className="text-center mb-12">
                    <span className="text-indigo-600 font-bold tracking-widest text-[10px] uppercase mb-2 block animate-pulse">Top Contributors</span>
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
                    <div className="text-center py-24 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 opacity-40">
                            <TrophyIcon className="w-10 h-10 text-slate-500" />
                        </div>
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
                                    className={`relative flex items-center p-4 md:p-6 rounded-2xl transition-all duration-500 hover:scale-[1.01] hover:shadow-xl group overflow-hidden animate-slide-in-up
                                        ${rank === 1 ? 'bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-800 border-2 border-amber-400/50 shadow-amber-200/20 z-10' : 
                                          rank === 2 ? 'bg-gradient-to-r from-slate-50 to-white dark:from-slate-700/10 dark:to-slate-800 border-2 border-slate-400/50 shadow-slate-200/20' : 
                                          rank === 3 ? 'bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/10 dark:to-slate-800 border-2 border-orange-400/50 shadow-orange-200/20' : 
                                          'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}
                                    `}
                                    style={{ animationDelay: `${idx * 70}ms` }}
                                >
                                    {/* Rank Badge */}
                                    <div className="flex-shrink-0 w-12 text-center mr-4">
                                        <RankBadge rank={rank} />
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-shrink-0 mr-4">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full p-1 ${isTop3 ? 'bg-white dark:bg-slate-600' : 'bg-slate-100 dark:bg-slate-700 shadow-inner'}`}>
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} className="w-full h-full object-cover rounded-full" alt={user.name} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">{user.name.charAt(0)}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold text-base md:text-lg truncate ${rank === 1 ? 'text-amber-900 dark:text-amber-200' : 'text-slate-900 dark:text-white'}`}>
                                                {user.name}
                                            </h3>
                                            <VerificationBadge role={user.role as any} isVerified={user.isVerified} className="w-4 h-4" />
                                        </div>
                                        <p className={`text-xs ${rank === 1 ? 'text-amber-800 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>@{user.username} • {user.level}L</p>
                                        
                                        {/* Progress Bar Visual */}
                                        <div className="mt-2 w-full max-w-xs h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${rank === 1 ? 'bg-amber-500' : 'bg-indigo-600'}`} 
                                                style={{ width: `${getPercentage(user.contributionPoints)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Points */}
                                    <div className="flex-shrink-0 text-right pl-4">
                                        <div className={`text-2xl md:text-3xl font-black ${rank === 1 ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                            {user.contributionPoints}
                                        </div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider ${rank === 1 ? 'text-amber-700/70' : 'text-slate-400'}`}>
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