
import React, { useState } from 'react';
import { PastQuestion } from '../types';
import { downloadPDF, generatePDF } from '../utils/pdfGenerator';
import { PDFViewerModal } from './PDFViewerModal';
import { getDropboxDownloadUrl } from '../utils/api';

interface QuestionCardProps {
  question: PastQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

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
              return;
          }
      } else if (question.fileUrl) {
          // Use stored URL (usually has ?raw=1 from upload logic)
          url = question.fileUrl;
      }
      
      if (url) {
        setPreviewUrl(url);
        setIsPreviewOpen(true);
      }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (question.textContent) {
        e.preventDefault();
        downloadPDF(question.courseTitle, question.textContent, question.courseCode, question.year);
    }
    // For regular files, the anchor tag href handles it
  };

  const handleClosePreview = () => {
      setIsPreviewOpen(false);
      // Clean up blob URL if it was generated locally
      if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl('');
  }

  // Calculate the forced download URL
  const downloadLink = question.textContent ? '#' : getDropboxDownloadUrl(question.fileUrl);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col h-full group">
        <div className="flex justify-between items-start mb-2">
             <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                {question.year}
            </span>
            {question.textContent && <span className="text-[10px] font-bold text-emerald-600 border border-emerald-100 bg-emerald-50 px-1 rounded">AI GEN</span>}
        </div>
        
        <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black text-indigo-900 bg-indigo-50 px-2 py-1 rounded">{question.courseCode}</span>
        </div>

        <h4 className="text-sm font-bold text-slate-800 leading-snug mb-3 line-clamp-2 min-h-[2.5em]">
            {question.courseTitle}
        </h4>

        <div className="flex gap-2 mt-auto pt-2 border-t border-slate-50">
            <button onClick={handlePreview} className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded hover:bg-white hover:text-indigo-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Preview
            </button>
            {question.textContent ? (
                 <button onClick={handleDownload} className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    PDF
                 </button>
            ) : (
                 <a 
                    href={downloadLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-1 text-center"
                    onClick={(e) => e.stopPropagation()}
                 >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                 </a>
            )}
        </div>
      </div>
      
      <PDFViewerModal 
        isOpen={isPreviewOpen} 
        onClose={handleClosePreview} 
        fileUrl={previewUrl}
        title={`${question.courseCode} (${question.year})`}
      />
    </>
  );
};
