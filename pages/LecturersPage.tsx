import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Lecturer } from '../types';
import { Skeleton } from '../components/Skeleton';

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
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors font-sans">
       <div className="bg-indigo-900 dark:bg-slate-950 text-white py-20 text-center shadow-lg relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-t from-indigo-900 dark:from-slate-950 via-transparent to-transparent"></div>
         <div className="relative z-10 container mx-auto px-4">
            <span className="inline-block py-1 px-3 border border-white/20 rounded-full bg-white/5 backdrop-blur-sm text-indigo-200 text-xs font-bold tracking-[0.2em] uppercase mb-4">Faculty</span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 font-serif">Department Lecturers</h1>
            <p className="text-indigo-100 text-lg max-w-2xl mx-auto font-light">
                Distinguished scholars and industry experts shaping the future of finance at Adekunle Ajasin University.
            </p>
         </div>
       </div>

      <div className="container mx-auto px-4 py-16 -mt-10 relative z-20">
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-80 shadow-sm p-6 flex flex-col items-center space-y-4">
                         <Skeleton className="h-24 w-full rounded-xl opacity-20" />
                         <Skeleton variant="circle" className="w-24 h-24 -mt-12" />
                         <Skeleton variant="text" className="w-3/4" />
                         <Skeleton variant="text" className="w-1/2" />
                         <Skeleton className="h-20 w-full" />
                    </div>
                ))}
            </div>
        ) : lecturers.length === 0 ? (
             <div className="text-center py-10 text-slate-500 dark:text-slate-400">No lecturer profiles found. Admins need to add them.</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lecturers.map(lecturer => (
            <article key={lecturer.id} className="group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col relative">
              <div className="h-24 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 relative"></div>
              
              <div className="px-6 flex flex-col items-center -mt-12 flex-1">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 p-1 shadow-lg mb-4">
                     <div className="w-full h-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
                        <img src={lecturer.imageUrl} alt={lecturer.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                     </div>
                  </div>
                  
                  <div className="text-center w-full mb-6">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors font-serif mb-1">{lecturer.name}</h3>
                      <p className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-4">{lecturer.title}</p>
                      
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl w-full">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Specialization</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {lecturer.specialization ? lecturer.specialization.split(', ').map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs font-medium rounded border border-slate-200 dark:border-slate-500">{tag}</span>
                            )) : <span className="text-xs text-slate-400">Not specified</span>}
                        </div>
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