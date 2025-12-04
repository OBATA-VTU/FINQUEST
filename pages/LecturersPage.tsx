
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Lecturer } from '../types';

export const LecturersPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLecturers = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'lecturers'));
            setLecturers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecturer)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchLecturers();
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
       <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-16 shadow-sm">
         <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-serif text-slate-900 dark:text-white mb-4">Department Lecturers</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Distinguished scholars and industry experts shaping the future of finance at Adekunle Ajasin University.
            </p>
         </div>
       </header>

      <div className="container mx-auto px-4 py-16">
        {loading ? <div className="text-center py-10 dark:text-slate-400">Loading directory...</div> : lecturers.length === 0 ? (
             <div className="text-center py-10 text-slate-500 dark:text-slate-400">No lecturer profiles found. Admins need to add them.</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lecturers.map(lecturer => (
            <article key={lecturer.id} className="group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mb-4 border-4 border-white dark:border-slate-600 shadow-md">
                 <img src={lecturer.imageUrl} alt={lecturer.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors font-serif mb-1">{lecturer.name}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full mb-4">{lecturer.title}</p>
              
              <div className="w-full border-t border-slate-100 dark:border-slate-700 pt-4 mt-auto">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Area of Specialization</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {lecturer.specialization ? lecturer.specialization.split(', ').map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs rounded border border-indigo-100 dark:border-indigo-800">{tag}</span>
                    )) : <span className="text-xs text-slate-400">Not specified</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};
