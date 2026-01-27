import React from 'react';

// Hardcode the logo path and remove settings dependency for consistency.
const LOGO_SRC = '/logo.svg';

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-24 w-24' }) => {
  return (
    <img 
      src={LOGO_SRC} 
      alt="FINSA AAUA Department Logo" 
      className={`${className} object-contain`} 
    />
  );
};