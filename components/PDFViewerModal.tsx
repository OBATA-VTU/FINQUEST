import React, { useEffect, useRef, useState } from 'react';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ isOpen, onClose, fileUrl, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isImage, setIsImage] = useState(false);

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
          setIsImage(lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('imgbb'));
      }
  }, [fileUrl]);

  if (!isOpen) return null;

  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
  const isLocalBlob = fileUrl.startsWith('blob:');

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
             <p className="text-xs text-slate-500 truncate">{isImage ? 'Image Preview' : 'Document Preview'}</p>
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
            {isImage ? (
                <img src={fileUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            ) : (
                isLocalBlob ? (
                    <iframe src={fileUrl} className="w-full h-full" title="PDF Preview" frameBorder="0" />
                ) : (
                    <iframe src={googleDocsUrl} className="w-full h-full" title="Document Viewer" frameBorder="0">
                        <object data={fileUrl} type="application/pdf" className="w-full h-full">
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center">
                                <p className="mb-4">Unable to display this file directly.</p>
                                <a href={fileUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Download to View</a>
                            </div>
                        </object>
                    </iframe>
                )
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