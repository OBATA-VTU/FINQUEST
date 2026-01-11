import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-24 w-24' }) => (
  <img 
    src="/logo.svg" 
    alt="FINSA Logo" 
    className={`${className} object-contain`} 
  />
);