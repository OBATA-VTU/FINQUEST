
import React from 'react';

interface UploadButtonProps {
  onClick: () => void;
}

export const UploadButton: React.FC<UploadButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      title="Upload Past Question"
      className="fixed bottom-8 right-8 bg-rose-500 hover:bg-rose-600 text-white font-bold w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    </button>
  );
};