
import React, { useState } from 'react';
import { PastQuestion } from '../types';
import { downloadPDF, generatePDF } from '../utils/pdfGenerator';
import { PDFViewerModal } from './PDFViewerModal';

interface QuestionCardProps {
  question: PastQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handlePreview = (e: React.MouseEvent) => {
      e.preventDefault();
      
      let url = '';
      if (question.textContent) {
          const doc = generatePDF(question.courseTitle, question.textContent, question.courseCode, question.year);
          const pdfBlob = doc.output('blob');
          url = URL.createObjectURL(pdfBlob);
      } else if (question.fileUrl) {
          url = question.fileUrl;
      }

      if (url) {
        setPreviewUrl(url);
        setIsPreviewOpen(true);
      }
  };

  const handleDownload = (e: React.MouseEvent) => {
    if (question.textContent) {
        e.preventDefault();
        downloadPDF(question.courseTitle, question.textContent, question.courseCode, question.year);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-50 to-white -mr-8 -mt-8 rounded-full z-0 pointer-events-none group-hover:scale-150 transition-transform"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                  {question.year} SESSION
              </span>
              {question.textContent && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      AI
                  </span>
              )}
          </div>
          
          <h4 className="text-sm font-bold text-slate-800 leading-snug mb-4 line-clamp-2 min-h-[2.5rem]">
              {question.courseTitle}
          </h4>

          <div className="flex items-center gap-2 mt-auto">
            <button
                onClick={handlePreview}
                className="flex-1 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
                Preview
            </button>
            
            {question.textContent ? (
                <button
                    onClick={handleDownload}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                    Download
                </button>
            ) : (
                <a
                    href={question.fileUrl}
                    download
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                    Download
                </a>
            )}
          </div>
        </div>
      </div>
      
      <PDFViewerModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        fileUrl={previewUrl}
        title={`${question.courseCode} (${question.year})`}
      />
    </>
  );
};
