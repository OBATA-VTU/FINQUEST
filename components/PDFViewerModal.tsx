
import React, { useEffect, useRef, useState } from 'react';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ isOpen, onClose, fileUrl, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other'>('other');

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
      if (fileUrl) {
          const lower = fileUrl.toLowerCase();
          // Check for image extensions or Firebase 'alt=media' usually implies a file, but we need to check extension in path
          // If no extension found in url string (signed url), assume other/pdf unless we have metadata. 
          // For simplicity, we check common image extensions in the URL string.
          if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.gif') || lower.includes('imgbb')) {
              setFileType('image');
          } else if (lower.includes('.pdf') || fileUrl.startsWith('blob:')) {
              setFileType('pdf');
          } else {
              setFileType('other');
          }
      }
  }, [fileUrl]);

  if (!isOpen) return null;

  const isLocalBlob = fileUrl.startsWith('blob:');
  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex justify-center items-center p-2 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-down"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col min-w-0">
             <h3 className="font-bold text-lg text-slate-800 truncate pr-4">{title}</h3>
             <p className="text-xs text-slate-500 truncate">{fileType === 'image' ? 'Image Preview' : 'Document Preview'}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-grow bg-slate-100 relative flex items-center justify-center overflow-auto">
            {fileType === 'image' ? (
                <img src={fileUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            ) : fileType === 'pdf' ? (
                // For PDFs, try a direct object embed first (works better on some modern browsers), 
                // then iframe with blob or google docs for remote.
                <div className="w-full h-full">
                     {isLocalBlob ? (
                         <iframe src={fileUrl} className="w-full h-full" title="PDF Preview" />
                     ) : (
                         <object data={fileUrl} type="application/pdf" className="w-full h-full">
                            {/* Fallback for browsers that don't support object embed of PDF (e.g. some mobile) */}
                            <iframe src={googleDocsUrl} className="w-full h-full" title="Google Docs Viewer">
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                                    <p className="mb-4">Unable to preview this file inside the browser.</p>
                                    <a href={fileUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Download to View</a>
                                </div>
                            </iframe>
                        </object>
                     )}
                </div>
            ) : (
                // Fallback for Word docs or unknown types -> Google Docs Viewer
                 <iframe src={googleDocsUrl} className="w-full h-full" title="Document Viewer" />
            )}
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
             <a href={fileUrl} download={title} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Original
            </a>
        </div>
      </div>
    </div>
  );
};
