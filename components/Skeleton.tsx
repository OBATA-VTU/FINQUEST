import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const baseClasses = "bg-slate-200 dark:bg-slate-800 animate-pulse";
  const variantClasses = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} aria-hidden="true" />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
    <Skeleton className="h-32 w-full" />
    <div className="space-y-2">
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-8 flex-1" />
      <Skeleton className="h-8 flex-1" />
    </div>
  </div>
);