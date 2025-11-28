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
      <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col h-full group">
        <div className="flex justify-between items-start mb-2">
             <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                {question.year}
            </span>
            {question.textContent && <span className="text-[10px] font-bold text-emerald-600">AI GEN</span>}
        </div>
        
        <h4 className="text-sm font-bold text-slate-800 leading-snug mb-3 line-clamp-2">
            {question.courseTitle}
        </h4>

        <div className="flex gap-2 mt-auto pt-2">
            <button onClick={handlePreview} className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 rounded hover:bg-slate-100 border border-slate-100 hover:text-indigo-600 transition">Preview</button>
            {question.textContent ? (
                 <button onClick={handleDownload} className="flex-1 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition">Download</button>
            ) : (
                 <a href={question.fileUrl} download className="flex-1 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition text-center flex items-center justify-center">Download</a>
            )}
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