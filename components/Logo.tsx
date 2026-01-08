import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-24 w-24' }) => {
  const settings = useSettings();
  const logoSrc = settings?.logoUrl || '/logo.svg';

  return (
    <img 
      src={logoSrc} 
      alt="FINSA Logo" 
      className={`${className} object-contain`} 
    />
  );
};
