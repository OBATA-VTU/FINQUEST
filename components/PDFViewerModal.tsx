
import React, { useEffect, useRef, useState } from 'react';
import { getDropboxDownloadUrl } from '../utils/api';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ isOpen, onClose, fileUrl, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other'>('other');
  const [loading, setLoading] = useState(true);
  const [displayUrl, setDisplayUrl] = useState('');

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
      setLoading(true);
      if (fileUrl) {
          const lower = fileUrl.toLowerCase();
          
          let cleanUrl = fileUrl;
          if (lower.includes('dropbox.com')) {
              cleanUrl = fileUrl.replace(/(\?|&)(dl=0|dl=1|raw=1)/g, '');
              cleanUrl += cleanUrl.includes('?') ? '&raw=1' : '?raw=1';
          }
          setDisplayUrl(cleanUrl);

          const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(lower) || 
                          lower.includes('imgbb') || 
                          lower.includes('alt=media');

          const isPdf = /\.(pdf)(\?.*)?$/i.test(lower) || 
                        cleanUrl.startsWith('blob:') ||
                        (lower.includes('dropbox') && !isImage && !/\.(doc|docx|ppt|pptx|xls|xlsx)(\?.*)?$/i.test(lower));

          if (isImage) {
              setFileType('image');
          } else if (isPdf) {
              setFileType('pdf');
          } else {
              setFileType('other');
          }
      }
  }, [fileUrl]);

  const handleIframeLoad = () => setLoading(false);

  if (!isOpen) return null;

  const isLocalBlob = fileUrl.startsWith('blob:');
  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(displayUrl)}`;
  const downloadLink = isLocalBlob ? fileUrl : getDropboxDownloadUrl(fileUrl);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/90 z-[100] flex justify-center items-center p-4 md:p-8 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative animate-fade-in-down border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col min-w-0">
             <h3 className="font-bold text-lg text-slate-900 truncate pr-4">{title}</h3>
             <p className="text-xs text-slate-500">Preview Mode</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-full hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
            title="Close Preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-grow bg-slate-100 relative flex items-center justify-center overflow-hidden">
            {loading && (
                <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center z-10 pointer-events-none bg-white/50 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                    <span className="font-bold text-indigo-900 animate-pulse">Loading Document...</span>
                </div>
            )}
            
            {fileType === 'image' ? (
                <img 
                    src={displayUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain p-4" 
                    onLoad={() => setLoading(false)}
                />
            ) : fileType === 'pdf' ? (
                <iframe 
                    src={displayUrl} 
                    className="w-full h-full border-none bg-white" 
                    title="PDF Viewer" 
                    onLoad={handleIframeLoad} 
                />
            ) : (
                 <iframe 
                    src={googleDocsUrl} 
                    className="w-full h-full border-none bg-white" 
                    title="Document Viewer" 
                    onLoad={handleIframeLoad} 
                 />
            )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center gap-4">
             <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
             >
                Close Preview
             </button>

             <a 
                href={downloadLink} 
                download={isLocalBlob ? title : undefined} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg hover:-translate-y-0.5"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download File
            </a>
        </div>
      </div>
    </div>
  );
};
