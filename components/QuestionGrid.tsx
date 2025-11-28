
import React from 'react';
import { PastQuestion } from '../types';
import { QuestionCard } from './QuestionCard';

interface QuestionGridProps {
  questions: PastQuestion[];
}

export const QuestionGrid: React.FC<QuestionGridProps> = ({ questions }) => {
  if (questions.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-slate-900">No questions found</h3>
        <p className="mt-1 text-sm text-slate-500">Try adjusting your search or selecting a different level.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {questions.map((question) => (
        <QuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
};
