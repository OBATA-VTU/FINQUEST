
import React from 'react';
import { MOCK_LECTURERS } from '../constants';

export const LecturersPage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
       <div className="bg-slate-50 border-b border-slate-200 py-16">
         <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-serif text-slate-900 mb-4">Faculty Directory</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Distinguished scholars and industry experts shaping the future of finance at Adekunle Ajasin University.
            </p>
         </div>
       </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {MOCK_LECTURERS.map(lecturer => (
            <div key={lecturer.id} className="group bg-white border border-slate-200 rounded-xl p-6 hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col sm:flex-row gap-6">
              <div className="shrink-0 relative">
                 <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-slate-200">
                    <img 
                    src={lecturer.imageUrl}
                    alt={lecturer.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                 </div>
                 <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-1.5 rounded-full shadow-md">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                 </div>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{lecturer.name}</h3>
                        <p className="text-slate-500 font-medium">{lecturer.title}</p>
                    </div>
                </div>
                
                <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Research Interests</p>
                    <div className="flex flex-wrap gap-2">
                        {lecturer.specialization.split(', ').map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                     <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">View Profile</button>
                     <div className="flex gap-2 text-slate-400">
                        <svg className="w-5 h-5 cursor-pointer hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                     </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
