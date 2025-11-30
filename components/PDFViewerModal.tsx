
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
          
          // STRICT FIX: Ensure we use 'raw=1' for embedding PDFs in iframe.
          // This forces Dropbox to serve the file content, not the preview page.
          let cleanUrl = fileUrl;
          if (lower.includes('dropbox.com')) {
              // Remove existing parameters
              cleanUrl = fileUrl.replace(/(\?|&)(dl=0|dl=1|raw=1)/g, '');
              // Append raw=1
              cleanUrl += cleanUrl.includes('?') ? '&raw=1' : '?raw=1';
          }
          setDisplayUrl(cleanUrl);

          // Detection Logic
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
  
  // Google Docs Viewer for Office Documents (Word, PPT, Excel)
  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(displayUrl)}`;

  // For the download button, we want the forced download link (dl=1)
  const downloadLink = isLocalBlob ? fileUrl : getDropboxDownloadUrl(fileUrl);

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
             <p className="text-xs text-slate-500 truncate">
                 {fileType === 'image' ? 'Image Preview' : fileType === 'pdf' ? 'PDF Viewer' : 'Document Preview'}
             </p>
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
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            )}
            
            {fileType === 'image' ? (
                <img 
                    src={displayUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain" 
                    onLoad={() => setLoading(false)}
                />
            ) : fileType === 'pdf' ? (
                // Use Native Iframe for PDFs to support Dropbox raw streams directly
                <iframe 
                    src={displayUrl} 
                    className="w-full h-full border-none" 
                    title="PDF Viewer" 
                    onLoad={handleIframeLoad} 
                />
            ) : (
                 // Use Google Docs Viewer for non-PDF documents (Word, PPT)
                 <iframe 
                    src={googleDocsUrl} 
                    className="w-full h-full border-none" 
                    title="Document Viewer" 
                    onLoad={handleIframeLoad} 
                 />
            )}
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
             <a 
                href={downloadLink} 
                download={isLocalBlob ? title : undefined} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Original
            </a>
        </div>
      </div>
    </div>
  );
};
