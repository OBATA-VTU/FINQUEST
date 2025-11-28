import React from 'react';
import { PastQuestion } from '../types';
import { downloadPDF, openPDFPreview } from '../utils/pdfGenerator';

interface QuestionCardProps {
  question: PastQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const handlePreview = (e: React.MouseEvent) => {
      e.preventDefault();
      if (question.textContent) {
          openPDFPreview(question.courseTitle, question.textContent, question.courseCode, question.year);
      } else if (question.fileUrl) {
          window.open(question.fileUrl, '_blank');
      }
  };

  const handleDownload = (e: React.MouseEvent) => {
    if (question.textContent) {
        e.preventDefault();
        downloadPDF(question.courseTitle, question.textContent, question.courseCode, question.year);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between hover:shadow-lg hover:border-indigo-300 transition-all duration-300">
      <div>
        <div className="flex justify-between items-start mb-2">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{question.courseCode}</span>
            <span className="text-sm font-medium text-slate-500">{question.year}</span>
        </div>
        <h4 className="text-md font-bold text-slate-800 leading-tight mb-4">
            {question.courseTitle}
        </h4>
        {question.textContent && (
            <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded mb-3">AI Generated</span>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handlePreview}
          title="Preview file"
          className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-3 rounded-md text-sm text-center hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="hidden sm:inline">Preview</span>
        </button>
        
        {question.textContent ? (
            <button
                onClick={handleDownload}
                title="Download Generated PDF"
                className="bg-indigo-500 text-white font-semibold py-2 px-3 rounded-md text-sm text-center hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download PDF</span>
            </button>
        ) : (
            <a
            href={question.fileUrl}
            download
            title="Download file"
            className="bg-indigo-500 text-white font-semibold py-2 px-3 rounded-md text-sm text-center hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex items-center justify-center gap-2"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
            </a>
        )}
      </div>
    </div>
  );
};