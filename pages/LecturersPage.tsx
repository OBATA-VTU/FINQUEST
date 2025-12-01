
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
    <div className="bg-white dark:bg-slate-900 min-h-screen transition-colors">
       <header className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-16">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {lecturers.map(lecturer => (
            <article key={lecturer.id} className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-300 flex flex-col sm:flex-row gap-6" itemScope itemType="https://schema.org/Person">
              <div className="shrink-0 relative">
                 <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700">
                    <img src={lecturer.imageUrl} alt={lecturer.name} itemProp="image" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                 </div>
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors" itemProp="name">{lecturer.name}</h3>
                 <p className="text-slate-500 dark:text-slate-400 font-medium" itemProp="jobTitle">{lecturer.title}</p>
                 <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Research Interests</p>
                    <div className="flex flex-wrap gap-2">
                        {lecturer.specialization ? lecturer.specialization.split(', ').map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-md border border-slate-200 dark:border-slate-600">{tag}</span>
                        )) : <span className="text-xs text-slate-400">Not specified</span>}
                    </div>
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
