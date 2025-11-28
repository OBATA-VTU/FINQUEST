
import React from 'react';
import { MOCK_EXECUTIVES } from '../constants';

export const ExecutivesPage: React.FC = () => {
  const president = MOCK_EXECUTIVES.find(e => e.position.toLowerCase().includes('president') && !e.position.toLowerCase().includes('vice'));
  const otherExecs = MOCK_EXECUTIVES.filter(e => e !== president);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-indigo-900 text-white py-20 relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-10"></div>
         <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Meet Your Leaders</h1>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">The dedicated students working tirelessly to serve the Finance Department and elevate your academic experience.</p>
         </div>
      </div>

      <div className="container mx-auto px-4 py-16 -mt-10 relative z-20">
        
        {/* President Spotlight */}
        {president && (
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden mb-16 flex flex-col md:flex-row border border-slate-100">
                <div className="md:w-2/5 h-64 md:h-auto relative">
                    <img 
                        src={president.imageUrl} 
                        alt={president.name} 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent md:hidden flex items-end p-6">
                         <h3 className="text-white text-2xl font-bold">{president.name}</h3>
                    </div>
                </div>
                <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-center">
                    <div className="uppercase tracking-wide text-sm text-indigo-600 font-bold mb-2">{president.position}</div>
                    <h3 className="hidden md:block text-3xl font-bold text-slate-900 mb-4">{president.name}</h3>
                    <p className="text-slate-600 mb-6 italic">"Leading with integrity and vision to ensure every finance student has the resources they need to succeed."</p>
                    <div className="flex items-center gap-4">
                         <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">{president.level} Level</span>
                         <button className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">Contact &rarr;</button>
                    </div>
                </div>
            </div>
        )}

        {/* Other Executives Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {otherExecs.map(exec => (
            <div key={exec.id} className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col items-center p-8 text-center">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-rose-500 mb-6 group-hover:scale-105 transition-transform duration-300">
                 <img 
                    src={exec.imageUrl}
                    alt={exec.name} 
                    className="w-full h-full rounded-full object-cover border-4 border-white" 
                />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{exec.name}</h3>
              <p className="text-indigo-600 font-medium mb-3">{exec.position}</p>
              <div className="w-10 h-1 bg-slate-200 rounded-full mb-4 group-hover:bg-indigo-500 transition-colors"></div>
              <p className="text-sm text-slate-500">{exec.level} Level Student</p>
              
              <div className="mt-6 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                <a href="#" className="text-slate-400 hover:text-indigo-600"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg></a>
                <a href="#" className="text-slate-400 hover:text-blue-500"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg></a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
