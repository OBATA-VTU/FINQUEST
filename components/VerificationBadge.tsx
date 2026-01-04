import React from 'react';
import { Role, BadgeType } from '../types';

interface VerificationBadgeProps {
  role?: Role;
  isVerified?: boolean;
  badges?: BadgeType[];
  className?: string;
  showAll?: boolean;
}

const BADGE_CONFIG: Record<string, { icon: string, color: string, title: string }> = {
    'pioneer': { icon: '🌱', color: 'text-emerald-500', title: 'Pioneer Member' },
    'first_step': { icon: '🎯', color: 'text-blue-400', title: 'First Upload Approved' },
    'brainiac': { icon: '🧠', color: 'text-purple-500', title: '100% Test Score' },
    'legend': { icon: '👑', color: 'text-amber-500', title: 'Academic Legend' },
    'scholar': { icon: '🎓', color: 'text-indigo-400', title: 'Senior Scholar' },
    'chatty': { icon: '💬', color: 'text-pink-400', title: 'Community Pillar' },
    'top_10': { icon: '🔥', color: 'text-orange-500', title: 'Top 10 Leaderboard' },
    'librarian_pick': { icon: '🔖', color: 'text-cyan-500', title: "Librarian's Choice" },
};

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ role, isVerified, badges = [], className = "w-4 h-4", showAll = false }) => {
  const checkmarkPath = "M8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5zm4.15-7.53L9.19 11.41l1.42-1.42 2.14 2.14 4.44-4.44 1.42 1.42-5.86 5.86z";

  return (
    <div className="inline-flex items-center gap-0.5">
      {/* Primary Role Badges */}
      {role === 'admin' && (
        <svg className={`${className} text-amber-500 fill-current animate-pulse`} viewBox="0 0 24 24">
          <title>Main Admin</title>
          <path d={checkmarkPath} />
        </svg>
      )}
      {['executive', 'vice_president', 'librarian', 'supplement'].includes(role || '') && (
        <svg className={`${className} text-rose-500 fill-current animate-bounce`} viewBox="0 0 24 24">
          <title>Executive</title>
          <path d={checkmarkPath} />
        </svg>
      )}
      {isVerified && role === 'student' && (
        <svg className={`${className} text-blue-500 fill-current`} viewBox="0 0 24 24">
          <title>Verified Student</title>
          <path d={checkmarkPath} />
        </svg>
      )}

      {/* Specialty Academic Badges */}
      {(showAll ? badges : badges.slice(0, 3)).map(b => (
          <span key={b} className="cursor-help transition-transform hover:scale-125" title={BADGE_CONFIG[b]?.title || b}>
            {BADGE_CONFIG[b]?.icon || '✨'}
          </span>
      ))}
      
      {badges.length > 3 && !showAll && (
          <span className="text-[8px] font-bold text-slate-400">+{badges.length - 3}</span>
      )}
    </div>
  );
};
