import React from 'react';
import { Role } from '../types';

interface VerificationBadgeProps {
  role: Role;
  isVerified?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ role, isVerified, className = "w-4 h-4" }) => {
  // Base Jagged Badge Path (Twitter/Instagram Style)
  const badgePath = "M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z";

  // Admin = Gold Tick (Spinning)
  if (role === 'admin') {
    return (
      <svg className={`${className} text-amber-500 fill-current ml-1 animate-[spin_4s_linear_infinite]`} viewBox="0 0 24 24">
        <title>Admin Verified</title>
        <path d={badgePath} />
      </svg>
    );
  }

  // Executives / VP / Librarian / Supplement = Red Tick (Bouncing)
  if (['executive', 'vice_president', 'librarian', 'supplement'].includes(role)) {
    return (
      <svg className={`${className} text-rose-500 fill-current ml-1 animate-bounce`} viewBox="0 0 24 24">
        <title>Executive Verified</title>
        <path d={badgePath} />
      </svg>
    );
  }

  // Verified Students = Blue Tick (Pulsing)
  if (isVerified) {
    return (
      <svg className={`${className} text-blue-500 fill-current ml-1 animate-pulse`} viewBox="0 0 24 24">
        <title>Verified Student</title>
        <path d={badgePath} />
      </svg>
    );
  }

  return null;
};