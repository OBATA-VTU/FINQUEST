
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { forceDownload } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  pages?: string[]; // New prop for multiple image pages
  title: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ isOpen, onClose, fileUrl, pages, title }) => {
  const { showNotification } = useNotification();
  const modalRef = useRef<HTMLDivElement>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other'>('other');
  const [loading, setLoading] = useState(true);
  const [displayUrl, setDisplayUrl] = useState('');
  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
      setLoading(true);
      setErrorHeader(null);
      setCurrentPage(0);
      if (fileUrl) {
          const lower = fileUrl.toLowerCase();
          
          let cleanUrl = fileUrl;
          if (lower.includes('dropbox.com')) {
              cleanUrl = fileUrl.replace(/(\?|&)(dl=0|dl=1|raw=1)/g, '');
              cleanUrl += cleanUrl.includes('?') ? '&raw=1' : '?raw=1';
          }
          
          // Improved Google Drive handling
          if (lower.includes('drive.google.com')) {
              let fileId = '';
              const idMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || 
                              fileUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
              
              if (idMatch) {
                  fileId = idMatch[1];
                  cleanUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                  setFileType('pdf'); // Force iframe mode for Drive
              }
          }

          setDisplayUrl(cleanUrl);

          const hasMultiplePages = pages && pages.length > 0;
          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(lower) || 
                          lower.includes('imgbb') || 
                          lower.includes('alt=media') ||
                          lower.includes('drive.google.com/uc') ||
                          hasMultiplePages;

          const isPdf = /\.(pdf)(\?.*)?$/i.test(lower) || 
                        cleanUrl.startsWith('blob:') ||
                        (lower.includes('dropbox') && !isImage && !/\.(doc|docx|ppt|pptx|xls|xlsx)(\?.*)?$/i.test(lower)) ||
                        lower.includes('drive.google.com');

          if (isImage) {
              setFileType('image');
          } else if (isPdf) {
              setFileType('pdf');
          } else {
              setFileType('other');
          }
      }
  }, [fileUrl, pages]);

  const handleIframeLoad = () => {
      setLoading(false);
  };

  const handleDownload = async (e: React.MouseEvent) => {
      e.preventDefault();
      
      const isLocalBlob = fileUrl.startsWith('blob:');
      
      if (pages && pages.length > 1) {
          showNotification(`Downloading ${pages.length} images safely...`, "info");
          try {
              for (let i = 0; i < pages.length; i++) {
                  const url = pages[i];
                  await forceDownload(url, `${title.replace(/\s+/g, '_')}_page_${i + 1}.jpg`);
                  // Increase delay slightly to ensure browser handles multiple downloads better
                  await new Promise(r => setTimeout(r, 600));
              }
              showNotification("Multi-file download complete.", "success");
          } catch (err) {
              showNotification("Some files failed to save. Please try individual opening.", "error");
          }
          return;
      }

      if (isLocalBlob) {
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = `${title.replace(/\s+/g, '_')}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else if (fileUrl.includes('drive.google.com')) {
            let fileId = '';
            const idMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || 
                            fileUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
            if (idMatch) fileId = idMatch[1];
            const dlUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : fileUrl;
            window.open(dlUrl, '_blank');
      } else {
            const ext = fileUrl.split('.').pop()?.split('?')[0] || 'pdf';
            await forceDownload(fileUrl, `${title.replace(/\s+/g, '_')}.${ext}`);
      }
  };

  if (!isOpen) return null;

  // Use higher quality viewer if it is a general document
  const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(displayUrl)}&embedded=true`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/95 z-[100] flex justify-center items-center p-4 md:p-8 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div 
        ref={modalRef}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative border border-slate-200 dark:border-slate-800 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Simple & Clean */}
        <div className="flex justify-between items-center px-10 py-8 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-6 min-w-0">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
             </div>
             <div className="flex flex-col min-w-0">
                <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.4em] mb-1">Study Viewer {pages && pages.length > 0 && `• Page ${currentPage + 1} of ${pages.length}`}</p>
                <h3 className="font-serif font-black text-2xl text-slate-950 dark:text-white truncate">{title}</h3>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             {pages && pages.length > 1 && (
                 <div className="hidden md:flex items-center gap-2 mr-4 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                    <button 
                        disabled={currentPage === 0}
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        className="p-3 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-[10px] font-black w-14 text-center text-slate-500">PG {currentPage + 1}/{pages.length}</span>
                    <button 
                        disabled={currentPage === pages.length - 1}
                        onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                        className="p-3 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                    </button>
                 </div>
             )}

             <button 
                onClick={handleDownload}
                className="flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95"
             >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {pages && pages.length > 1 ? 'Save All Pages' : 'Save to Device'}
             </button>
             <button 
                onClick={onClose} 
                className="w-14 h-14 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-inner group"
                title="Close Viewer"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
          </div>
        </div>
        
        {/* Main Viewing Canvas */}
        <div className="flex-grow bg-[#f0f0f0] dark:bg-black relative flex items-center justify-center overflow-hidden">
            {loading && (
                <div className="absolute inset-0 flex flex-col gap-6 items-center justify-center z-10 bg-white dark:bg-slate-950">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-600/10 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 animate-pulse">Opening file...</span>
                        <button 
                            onClick={() => window.open(displayUrl, '_blank')}
                            className="text-[10px] font-black uppercase text-indigo-500 hover:underline transition-colors pointer-events-auto"
                        >
                            Open in Google Drive
                        </button>
                    </div>
                </div>
            )}
            
            {fileType === 'image' ? (
                <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                    {pages && pages.length > 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 py-10 custom-scrollbar space-y-10">
                            {pages.map((pageUrl, idx) => (
                                <div key={idx} className={`max-w-4xl w-full flex flex-col items-center ${idx === currentPage ? 'opacity-100 ring-4 ring-indigo-500' : 'opacity-40 grayscale'} transition-all`}>
                                    <img 
                                        src={pageUrl} 
                                        referrerPolicy="no-referrer"
                                        alt={`Page ${idx + 1}`} 
                                        className="w-full shadow-2xl rounded-xl border border-white/10"
                                        onLoad={() => idx === 0 && setLoading(false)}
                                    />
                                    <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {idx + 1}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <img 
                                src={displayUrl} 
                                referrerPolicy="no-referrer"
                                alt="Study Material" 
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-xl" 
                                onLoad={() => setLoading(false)}
                            />
                        </div>
                    )}

                    {/* Mobile Navigation Overlays */}
                    {pages && pages.length > 1 && (
                        <>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all md:hidden"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all md:hidden"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <iframe 
                    src={fileType === 'pdf' && !displayUrl.includes('drive.google.com') ? displayUrl : (displayUrl.includes('drive.google.com') ? displayUrl : googleDocsUrl)} 
                    className="w-full h-full border-none bg-white transition-opacity duration-1000" 
                    title="File Content" 
                    onLoad={handleIframeLoad} 
                />
            )}
        </div>
        
        {/* Simple Footer */}
        <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-4">
                 <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Student Portal</span>
             </div>

             <div className="flex items-center gap-4 w-full md:w-auto">
                 <button 
                    onClick={onClose}
                    className="flex-1 md:flex-none px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition border border-slate-100 dark:border-slate-700"
                 >
                    Close Viewer
                 </button>

                 <button 
                    onClick={handleDownload}
                    className="flex-1 md:hidden flex items-center justify-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl"
                 >
                    Download
                </button>
             </div>
        </div>
      </motion.div>
    </motion.div>

  );
};
