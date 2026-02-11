import React from 'react';

const LOGO_SRC = '/logo.svg';

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-12 w-12' }) => {
  return (
    <img 
      src={LOGO_SRC} 
      alt="FINSA AAUA" 
      className={`${className} object-contain transition-transform hover:scale-105 duration-300`} 
    />
  );
};