import React from 'react';
import { Role } from '../types';

interface VerificationBadgeProps {
  role: Role;
  isVerified?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ role, isVerified, className = "w-4 h-4" }) => {
  // Admin = Gold
  if (role === 'admin') {
    return (
      <svg className={`${className} text-amber-500 fill-current ml-1`} viewBox="0 0 24 24">
        <title>Admin</title>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    );
  }

  // Executives / VP / Librarian = Pink
  if (['executive', 'vice_president', 'librarian'].includes(role)) {
    return (
      <svg className={`${className} text-pink-500 fill-current ml-1`} viewBox="0 0 24 24">
        <title>Executive</title>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    );
  }

  // Verified Students = Blue
  if (isVerified) {
    return (
      <svg className={`${className} text-blue-500 fill-current ml-1`} viewBox="0 0 24 24">
        <title>Verified Student</title>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    );
  }

  return null;
};