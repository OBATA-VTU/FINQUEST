// THIS FILE IS DEPRECATED AND NO LONGER USED.
// The functionality has been moved to pages/UploadPage.tsx to ensure
// the correct upload logic (respecting Google Drive/Dropbox settings) is used.
// If you see this modal, it means an old component is still calling it.

import React from 'react';

export const UploadModal: React.FC<{ isOpen: boolean; onClose: () => void; onUpload: (newQuestion: any) => void; }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg text-center" onClick={e => e.stopPropagation()}>
                <h2 className="font-bold text-lg text-red-600">Upload Method Deprecated</h2>
                <p className="my-4 text-slate-700">This upload modal is no longer active. Please use the dedicated upload page by navigating to '/upload'.</p>
                <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded">Close</button>
            </div>
        </div>
    );
};
