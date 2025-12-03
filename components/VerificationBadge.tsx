import React from 'react';
import { Role } from '../types';

interface VerificationBadgeProps {
  role: Role;
  isVerified?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ role, isVerified, className = "w-4 h-4" }) => {
  // Admin = Gold Star Seal (Slow Spin)
  if (role === 'admin') {
    return (
      <svg className={`${className} text-amber-500 fill-current ml-1 animate-[spin_8s_linear_infinite]`} viewBox="0 0 24 24">
        <title>Admin</title>
        <path d="M12 1L15.39 8.26L23.36 9.27L17.5 14.14L18.82 22.02L12 18.28L5.18 22.02L6.5 14.14L0.64 9.27L8.61 8.26L12 1Z" />
      </svg>
    );
  }

  // Executives / VP / Librarian / Supplement = Pink Crown (Bouncing)
  if (['executive', 'vice_president', 'librarian', 'supplement'].includes(role)) {
    return (
      <svg className={`${className} text-pink-500 fill-current ml-1 animate-bounce`} viewBox="0 0 24 24">
        <title>Executive</title>
        <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
      </svg>
    );
  }

  // Verified Students = Blue Badge (Pulsing)
  if (isVerified) {
    return (
      <svg className={`${className} text-blue-500 fill-current ml-1 animate-pulse`} viewBox="0 0 24 24">
        <title>Verified Student</title>
        <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" />
      </svg>
    );
  }

  return null;
};