
import React from 'react';
import { Role, BadgeType } from '../types';
import { BADGE_MAP } from '../constants';

interface VerificationBadgeProps {
  role?: Role;
  isVerified?: boolean;
  badges?: BadgeType[];
  className?: string;
  showAll?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ role, isVerified, badges = [], className = "w-4 h-4", showAll = false }) => {
  const checkmarkPath = "M8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5zm4.15-7.53L9.19 11.41l1.42-1.42 2.14 2.14 4.44-4.44 1.42 1.42-5.86 5.86z";

  return (
    <div className="inline-flex items-center gap-1">
      {/* Official Status Badges */}
      {role === 'admin' && (
        <svg className={`${className} text-amber-500 fill-current animate-pulse`} viewBox="0 0 24 24" title="Main Admin">
          <path d={checkmarkPath} />
        </svg>
      )}
      {['executive', 'vice_president', 'librarian', 'supplement'].includes(role || '') && (
        <svg className={`${className} text-rose-500 fill-current`} viewBox="0 0 24 24" title="Executive Member">
          <path d={checkmarkPath} />
        </svg>
      )}
      {isVerified && role === 'student' && (
        <svg className={`${className} text-blue-500 fill-current`} viewBox="0 0 24 24" title="Verified Student">
          <path d={checkmarkPath} />
        </svg>
      )}

      {/* Dynamic Achievement Badges */}
      <div className="flex -space-x-1">
        {(showAll ? badges : badges.slice(0, 2)).map(b => (
            <span key={b} className="text-xs transition-transform hover:scale-125 cursor-help" title={BADGE_MAP[b]?.label || b}>
                {BADGE_MAP[b]?.icon || '✨'}
            </span>
        ))}
      </div>
      
      {badges.length > 2 && !showAll && (
          <span className="text-[9px] font-black text-slate-400">+{badges.length - 2}</span>
      )}
    </div>
  );
};
