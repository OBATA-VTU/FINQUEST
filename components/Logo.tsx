import React from 'react';

// Use the new website-specific logo for the UI, keeping the official one for SEO/favicon.
const LOGO_SRC = '/website-logo.svg';

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-24 w-24' }) => {
  return (
    <img 
      src={LOGO_SRC} 
      alt="FINSA AAUA Portal Logo" 
      className={`${className} object-contain`} 
    />
  );
};
