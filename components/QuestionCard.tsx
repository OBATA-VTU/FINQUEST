
import React, { useState, useContext } from 'react';
import { PastQuestion } from '../types';
import { downloadPDF, generatePDF } from '../utils/pdfGenerator';
import { PDFViewerModal } from './PDFViewerModal';
import { getDropboxDownloadUrl, forceDownload } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { AuthContext } from '../contexts/AuthContext';

interface QuestionCardProps {
  question: PastQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const { showNotification } = useNotification();
  const auth = useContext(AuthContext);

  const isBookmarked = auth?.user?.savedQuestions?.includes(question.id);

  const handleBookmark = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!auth?.user) {
          showNotification("Please login to bookmark items.", "info");
          return;
      }
      auth.toggleBookmark(question.id);
  };

  const handlePreview = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      let url = '';
      
      // If AI generated text exists, generate a local blob
      if (question.textContent) {
          try {
            const doc = generatePDF(question.courseTitle, question.textContent, question.courseCode, question.year);
            const pdfBlob = doc.output('blob');
            url = URL.createObjectURL(pdfBlob);
          } catch (err) {
              console.error("Error generating PDF preview", err);
              showNotification("Could not generate preview.", "error");
              return;
          }
      } else if (question.fileUrl) {
          // Use stored URL. Ensure it is raw=1 for previewing content directly
          url = question.fileUrl;
          if (url.includes('dropbox.com')) {
              // Ensure we have the raw stream for preview, not the download or page
              if (url.includes('?dl=0')) url = url.replace('?dl=0', '?raw=1');
              else if (url.includes('?dl=1')) url = url.replace('?dl=1', '?raw=1');
              else if (!url.includes('?')) url = `${url}?raw=1`;
          }
      } else {
          showNotification("No preview available for this item.", "info");
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

    if (question.textContent) {
        downloadPDF(question.courseTitle, question.textContent, question.courseCode, question.year);
        return;
    }

    if (question.fileUrl) {
        const url = question.fileUrl;
        
        // Dropbox handling (standard download link)
        if (url.includes('dropbox.com')) {
             const dlUrl = getDropboxDownloadUrl(url);
             const link = document.createElement('a');
             link.href = dlUrl;
             link.setAttribute('download', '');
             link.target = "_blank"; // Fallback
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
        } else {
             // ImgBB / Other logic -> Force Download using Blob
             try {
                 const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
                 const filename = `${question.courseCode}_${question.year}_${question.courseTitle.substring(0, 10)}.${ext}`;
                 await forceDownload(url, filename);
             } catch (err) {
                 showNotification("Download started in new tab.", "info");
             }
        }
    }
  };

  const handleClosePreview = () => {
      setIsPreviewOpen(false);
      // Clean up blob URL if it was generated locally
      if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl('');
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-200 flex flex-col h-full group relative">
        <div className="flex justify-between items-start mb-2">
             <div className="flex gap-2 flex-wrap">
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                    {question.year}
                </span>
                {question.textContent && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">AI GEN</span>}
                {question.pages && question.pages.length > 1 && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded border border-indigo-100 dark:border-indigo-800">{question.pages.length} Pages</span>}
             </div>
             
             <button 
                onClick={handleBookmark}
                className={`transition-transform active:scale-90 ${isBookmarked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-400'}`}
                title={isBookmarked ? "Remove bookmark" : "Bookmark this"}
             >
                 {isBookmarked ? (
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                 ) : (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                 )}
             </button>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 rounded">{question.courseCode}</span>
        </div>

        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug mb-3 line-clamp-2 min-h-[2.5em]">
            {question.courseTitle}
        </h4>

        <div className="flex gap-2 mt-auto pt-2 border-t border-slate-50 dark:border-slate-700">
            <button onClick={handlePreview} className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded hover:bg-white dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-indigo-300 hover:shadow-sm border border-transparent hover:border-slate-200 transition flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Preview
            </button>
            <button 
                onClick={handleDownload} 
                className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-1 text-center"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {question.textContent ? 'PDF' : 'Download'}
            </button>
        </div>
      </div>
      
      <PDFViewerModal 
        isOpen={isPreviewOpen} 
        onClose={handleClosePreview} 
        fileUrl={previewUrl}
        pages={question.pages}
        title={`${question.courseCode} (${question.year})`}
      />
    </>
  );
};
