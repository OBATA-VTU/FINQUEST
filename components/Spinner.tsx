
import React from 'react';

interface SpinnerProps {
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ className }) => {
  return (
    <div className={`border-2 border-t-transparent rounded-full animate-spin ${className || 'w-5 h-5 border-white/30 border-t-white'}`}></div>
  );
};

export default Spinner;
