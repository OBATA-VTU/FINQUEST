import React from 'react';
import { Role } from '../types';

interface VerificationBadgeProps {
  role: Role;
  isVerified?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ role, isVerified, className = "w-4 h-4" }) => {
  // Unified Verified Seal Path (Twitter/IG Style Seal with Checkmark)
  const badgePath = "M8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5zm4.15-7.53L9.19 11.41l1.42-1.42 2.14 2.14 4.44-4.44 1.42 1.42-5.86 5.86z";

  // Admin = Gold Tick (Pulse)
  if (role === 'admin') {
    return (
      <svg className={`${className} text-amber-500 fill-current ml-1 animate-pulse`} viewBox="0 0 24 24">
        <title>Admin Verified</title>
        <path d={badgePath} />
      </svg>
    );
  }

  // Executives / VP / Librarian / Supplement = Red Tick (Bounce)
  if (['executive', 'vice_president', 'librarian', 'supplement'].includes(role)) {
    return (
      <svg className={`${className} text-rose-500 fill-current ml-1 animate-bounce`} viewBox="0 0 24 24">
        <title>Executive Verified</title>
        <path d={badgePath} />
      </svg>
    );
  }

  // Verified Students = Blue Tick (Normal/Pulse)
  if (isVerified) {
    return (
      <svg className={`${className} text-blue-500 fill-current ml-1`} viewBox="0 0 24 24">
        <title>Verified Student</title>
        <path d={badgePath} />
      </svg>
    );
  }

  return null;
};