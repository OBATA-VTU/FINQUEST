import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PastQuestion } from '../types';
import { downloadPDF, generatePDF } from '../utils/pdfGenerator';
import { PDFViewerModal } from './PDFViewerModal';
import { forceDownload } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';

interface QuestionCardProps {
  question: PastQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const { showNotification } = useNotification();
  const auth = useContext(AuthContext);

  const isBookmarked = auth?.user?.savedQuestions?.includes(question.id);

  const handleBookmark = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!auth?.user) {
          showNotification("Identification required for bookmarking.", "info");
          return;
      }
      auth.toggleBookmark(question.id);
  };

  const handlePreview = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      let url = '';
      
      if (question.textContent) {
          try {
            const doc = generatePDF(question.courseTitle, question.textContent, question.courseCode, question.year);
            const pdfBlob = doc.output('blob');
            url = URL.createObjectURL(pdfBlob);
          } catch (err) {
              showNotification("Rendering pipeline failed.", "error");
              return;
          }
      } else if (question.fileUrl) {
          url = question.fileUrl;
      } else {
          showNotification("No preview assets located.", "info");
          return;
      }
      
      if (url) {
        setPreviewUrl(url);
        setIsPreviewOpen(true);
      }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isDownloading) return;
    setIsDownloading(true);

    try {
        if (question.textContent) {
            downloadPDF(question.courseTitle, question.textContent, question.courseCode, question.year);
            return;
        }

        if (question.fileUrl) {
            const url = question.fileUrl;
            
            if (url.includes('drive.google.com')) {
                 // Try to force direct download for Google Drive
                 const dlUrl = url.replace('file/d/', 'uc?export=download&id=').replace('/view?usp=sharing', '').replace('/view', '');
                 window.open(dlUrl, '_blank');
            } else {
                 try {
                     const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
                     const filename = `${question.courseCode}_${question.year}_FINSA.${ext}`;
                     showNotification("Extracting document...", "info");
                     await forceDownload(url, filename);
                 } catch (err) {
                     window.open(url, '_blank');
                 }
            }
        }
    } finally {
        setIsDownloading(false);
    }
  };

  const handleClosePreview = () => {
      setIsPreviewOpen(false);
      if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl('');
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 p-0 shadow-xl hover:shadow-3xl hover:border-indigo-500/30 transition-all duration-500 group flex flex-col h-full relative overflow-hidden"
    >
        {/* Card Header Pattern */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-900 via-indigo-600 to-slate-200"></div>
        
        {/* Side ID Tag */}
        <div className="absolute top-0 right-0 py-8 px-2 bg-slate-50 dark:bg-slate-800 border-l border-slate-100 dark:border-slate-700 h-full flex flex-col items-center justify-start gap-4">
            <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] font-black tracking-[0.4em] text-slate-300 dark:text-slate-600 uppercase italic">Digital Vault</span>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>

        <div className="p-8 pr-14 flex flex-col h-full">
            {/* Metadata Tier */}
            <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{question.category || 'Archive'}</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-serif font-black text-slate-950 dark:text-white">{question.year}</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level {question.level}</span>
                    </div>
                </div>
                
                <button 
                    onClick={handleBookmark}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${isBookmarked ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 hover:text-indigo-500 hover:border-indigo-200'}`}
                >
                    <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                </button>
            </div>

            {/* Core Subject Information */}
            <div className="mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{question.courseCode}</p>
                <h4 className="text-2xl font-serif font-black text-slate-950 dark:text-white leading-tight min-h-[2.5em] tracking-tight group-hover:text-indigo-600 transition-colors">
                    {question.courseTitle}
                </h4>
            </div>

            {/* Verification Stamp */}
            <div className="flex items-center gap-3 mb-10 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 relative overflow-hidden group/stamp">
                <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full flex items-center justify-center -rotate-12 border border-emerald-500/20 opacity-0 group-hover/stamp:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">VERIFIED</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-600 shadow-sm">
                    {question.uploadedByName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Assigned Staff</p>
                    <p className="text-[11px] font-black text-slate-950 dark:text-white truncate max-w-[140px] uppercase">{question.lecturer || 'DEPT. STAFF'}</p>
                </div>
            </div>

            {/* Operational Deck */}
            <div className="mt-auto grid grid-cols-2 gap-3">
                <button 
                    onClick={handlePreview} 
                    className="py-4 px-4 bg-slate-950 text-white dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    View
                </button>
                <button 
                    onClick={handleDownload} 
                    disabled={isDownloading}
                    className="py-4 px-4 bg-white dark:bg-slate-700 text-slate-950 dark:text-white border-2 border-slate-950 dark:border-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                    {isDownloading ? (
                        <div className="w-4 h-4 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    )}
                    {isDownloading ? 'Downloading' : 'Download'}
                </button>
            </div>
        </div>

        <AnimatePresence>
            {isPreviewOpen && (
                <PDFViewerModal 
                    isOpen={isPreviewOpen} 
                    onClose={handleClosePreview} 
                    fileUrl={previewUrl}
                    pages={question.pages}
                    title={`${question.courseCode}: ${question.courseTitle}`}
                />
            )}
        </AnimatePresence>
    </motion.div>
  );
};
